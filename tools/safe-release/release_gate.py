#!/usr/bin/env python3
"""Local safe-release evidence gate. No credentials, network calls or deployment side effects.

An app-specific CI adapter must supply actual reports and an independently reviewed
policy. This program checks consistency, not the truth of self-authored reports.
"""
import argparse
import datetime as dt
import hashlib
import json
import pathlib
import re
import sys

VERSION = 1
HEX = re.compile(r"^[0-9a-f]{64}$")
COMMIT = re.compile(r"^[0-9a-f]{40}$")

class Blocked(ValueError):
    pass

def require(condition, message):
    if not condition:
        raise Blocked(message)

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()

def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()

def read(path):
    return json.loads(pathlib.Path(path).read_text())

def sha_file(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def inventory(directory):
    root = pathlib.Path(directory).resolve()
    require(root.is_dir(), "artifact directory missing")
    files = {}
    for path in sorted(root.rglob("*")):
        require(not path.is_symlink(), "artifact symlinks are forbidden")
        if path.is_file():
            relative = path.relative_to(root).as_posix()
            require(not any(p.startswith(".env") or p in (".git", ".vault") for p in path.relative_to(root).parts), "private files in artifact")
            files[relative] = {"sha256": sha_file(path), "bytes": path.stat().st_size}
    require(bool(files), "empty artifact")
    return files

def policy_check(policy):
    require(policy.get("schema") == VERSION, "unsupported policy")
    for key in ("app", "target", "account", "service", "schema_revision", "config_revision"):
        require(isinstance(policy.get(key), str) and bool(policy[key].strip()), "missing policy " + key)
    require(policy.get("coverage_reviewed") is True, "coverage not reviewed")
    required = policy.get("required_checks")
    require(isinstance(required, list) and len(required) > 0, "no required checks")
    require(all(isinstance(x, str) and x for x in required) and len(set(required)) == len(required), "invalid/duplicate required checks")
    require(policy.get("production_resources") and policy.get("preview_resources"), "resource inventory missing")
    require(all(isinstance(x,str) and x for x in policy["production_resources"] + policy["preview_resources"]), "invalid resources")
    require(set(policy["production_resources"]).isdisjoint(policy["preview_resources"]), "preview shares a production resource")
    require(policy.get("preview_external_effects") == "disabled", "preview external effects must be disabled")
    require(policy.get("migration_strategy") in ("none", "expand-contract"), "unsafe migration strategy")
    require(policy.get("pilot_mode") == "allowlist-default-off", "pilot must default off")
    require(policy.get("auto_promote") is False, "automatic production promotion forbidden")
    require(isinstance(policy.get("max_proof_age_hours"), (int,float)) and 0 < policy["max_proof_age_hours"] <= 168, "invalid proof age")

def parse_time(value):
    require(isinstance(value,str), "missing time")
    try:
        t = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        require(t.tzinfo is not None, "time must include timezone")
        return t
    except (ValueError, TypeError) as e:
        raise Blocked("invalid proof time") from e

def reports_check(policy, reports, commit, artifact_hash):
    require(isinstance(reports, list), "checks must be a list")
    names = [r.get("check") for r in reports]
    require(len(names) == len(set(names)), "duplicate check results")
    require(set(names) == set(policy["required_checks"]), "missing or unexpected check")
    for report in reports:
        require(report.get("status") == "passed", "check did not pass: " + str(report.get("check")))
        require(report.get("commit") == commit, "check commit mismatch")
        require(report.get("artifact_sha256") == artifact_hash, "check artifact mismatch")
        require(isinstance(report.get("assertions"),int) and not isinstance(report["assertions"],bool) and report["assertions"] > 0, "zero assertions")
        require(isinstance(report.get("evidence_sha256"), str) and HEX.fullmatch(report["evidence_sha256"]), "missing evidence digest")
        require(isinstance(report.get("evidence_reference"), str) and bool(report["evidence_reference"]), "missing evidence reference")
        age = (dt.datetime.now(dt.timezone.utc) - parse_time(report.get("finished_at"))).total_seconds()
        require(-60 <= age <= policy["max_proof_age_hours"] * 3600, "stale or future check")

def make_manifest(policy, reports, commit, directory, rollback, evidence_root=None):
    policy_check(policy)
    require(bool(COMMIT.fullmatch(commit)), "full commit SHA required")
    files = inventory(directory)
    artifact_hash = digest(files)
    reports_check(policy, reports, commit, artifact_hash)
    require(evidence_root is not None, "evidence root is mandatory")
    evidence_files_check(reports, evidence_root)
    require(isinstance(rollback, dict), "rollback inventory missing")
    for key in ("version", "artifact_sha256", "account", "service", "rehearsal_evidence_sha256"):
        require(bool(rollback.get(key)), "missing rollback " + key)
    require(HEX.fullmatch(rollback["artifact_sha256"]) and HEX.fullmatch(rollback["rehearsal_evidence_sha256"]), "invalid rollback digest")
    require(rollback["account"] == policy["account"] and rollback["service"] == policy["service"], "rollback target mismatch")
    body = {"schema": VERSION, "created_at": dt.datetime.now(dt.timezone.utc).isoformat(), "commit": commit,
            "app": policy["app"], "policy": policy, "policy_sha256": digest(policy),
            "artifact_sha256": artifact_hash, "files": files, "checks": reports, "rollback": rollback}
    return {"manifest": body, "manifest_sha256": digest(body)}

def verify(envelope, directory, policy, evidence_root=None):
    body = envelope["manifest"]
    require(digest(body) == envelope.get("manifest_sha256"), "manifest changed")
    require(body.get("schema") == VERSION, "unsupported manifest")
    policy_check(policy)
    require(body.get("policy") == policy and body.get("policy_sha256") == digest(policy), "policy changed")
    files = inventory(directory)
    require(files == body.get("files") and digest(files) == body.get("artifact_sha256"), "artifact changed")
    require(bool(COMMIT.fullmatch(body.get("commit", ""))), "invalid commit")
    reports_check(policy, body.get("checks"), body["commit"], body["artifact_sha256"])
    require(evidence_root is not None, "evidence root is mandatory")
    evidence_files_check(body["checks"], evidence_root)
    require(body["rollback"]["account"] == policy["account"] and body["rollback"]["service"] == policy["service"], "rollback target changed")
    return body

def promotion_plan(envelope, directory, policy, approval, evidence_root=None):
    body = verify(envelope, directory, policy, evidence_root)
    # This is a routing/evidence record, NOT independent authentication of a user.
    # The accountable release operator must inspect the original channel evidence.
    require(approval.get("decision") == "Go + Sure", "exact production approval missing")
    require(approval.get("manifest_sha256") == envelope["manifest_sha256"], "approval is for another build")
    require(approval.get("account") == policy["account"] and approval.get("service") == policy["service"], "approval target mismatch")
    require(approval.get("original_message_reference") and approval.get("operator_reviewed_original") is True, "original approval must be reviewed")
    require(approval.get("revalidated_current_state") is True, "current target state not revalidated")
    expires = parse_time(approval.get("expires_at"))
    require(expires > dt.datetime.now(dt.timezone.utc), "approval expired")
    return {"mode": "PLAN_ONLY", "app": body["app"], "account": policy["account"], "service": policy["service"],
            "artifact_sha256": body["artifact_sha256"], "manifest_sha256": envelope["manifest_sha256"],
            "pilot": "allowlist-default-off", "rollback_version": body["rollback"]["version"],
            "warning": "No deploy was performed. An app-specific trusted promotion adapter must consume this plan and recheck owner authority."}

def evidence_files_check(reports, directory):
    """Bind claimed report digests to local evidence bytes, not their authenticity."""
    root = pathlib.Path(directory)
    require(root.is_dir() and not root.is_symlink(), "evidence root missing or symlinked")
    root = root.resolve()
    require(isinstance(reports, list) and bool(reports), "evidence reports missing")
    seen = set()
    for report in reports:
        require(isinstance(report, dict), "invalid evidence report")
        name = report.get("check")
        require(isinstance(name, str) and name and name not in seen, "invalid or duplicate evidence check")
        seen.add(name)
        ref = report.get("evidence_reference")
        require(isinstance(ref, str) and ref and "\\" not in ref, "invalid evidence path")
        relative = pathlib.PurePosixPath(ref)
        require(not relative.is_absolute() and all(p not in (".", "..") for p in ref.split("/")) and ":" not in ref, "evidence path must be confined relative file")
        path = root
        for part in relative.parts:
            path = path / part
            require(not path.is_symlink(), "evidence symlinks forbidden")
        require(path.is_file() and path.resolve().is_relative_to(root), "evidence file missing or outside root")
        expected = report.get("evidence_sha256")
        require(isinstance(expected, str) and bool(HEX.fullmatch(expected)), "invalid evidence digest")
        require(sha_file(path) == expected, "evidence bytes changed for " + name)
        require(path.stat().st_size > 0, "empty evidence file")
    return {"evidence_bytes_verified": len(seen), "authentic_test_execution": "UNVERIFIED", "deployment_ready": False}

def preview_config_check(production, preview):
    # Intentionally narrow. New bindings, nested env overrides or triggers must
    # receive an explicit isolation review, not silently bypass this checker.
    allowed = {"$schema", "name", "main", "compatibility_date", "compatibility_flags", "workers_dev",
               "preview_urls", "routes", "vars", "assets", "d1_databases", "kv_namespaces", "r2_buckets", "services"}
    require(not (set(preview) - allowed), "unreviewed preview config keys: " + ",".join(sorted(set(preview) - allowed)))
    require(bool(preview.get("name")) and preview.get("name") != production.get("name"), "preview worker equals production")
    require(preview.get("routes") == [], "preview must have no production/custom routes")
    require(preview.get("workers_dev") is True, "preview requires its own workers.dev target")
    require(preview.get("vars", {}).get("NODE_ENV") == "test", "preview NODE_ENV must be test")
    require(preview.get("vars", {}).get("RELEASE_ENV") == "synthetic-preview", "preview marker missing")
    prod_ids = set()
    preview_ids = set()
    for config, ids in ((production, prod_ids), (preview, preview_ids)):
        for family, key in (("d1_databases", "database_id"), ("kv_namespaces", "id"), ("r2_buckets", "bucket_name"), ("services", "service")):
            for binding in config.get(family, []):
                value = binding.get(key)
                require(bool(value), "binding resource identifier missing")
                ids.add((family, value))
    require(prod_ids.isdisjoint(preview_ids), "preview shares production binding")
    # Secrets are external state. Absence from JSON is not evidence of isolation.
    return {"config_safe": True, "preview_worker": preview["name"], "secrets_and_database_target": "UNVERIFIED", "deployment_ready": False}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    preview = sub.add_parser("preview-config")
    preview.add_argument("--production-config", required=True)
    preview.add_argument("--preview-config", required=True)
    evidence = sub.add_parser("evidence-files")
    evidence.add_argument("--checks", required=True)
    evidence.add_argument("--evidence-root", required=True)
    snap = sub.add_parser("artifact-digest"); snap.add_argument("--artifact", required=True)
    create = sub.add_parser("manifest")
    for flag in ("policy", "checks", "artifact", "commit", "rollback", "output", "evidence-root"): create.add_argument("--" + flag, required=True)
    for command in ("verify", "promotion-plan"):
        p = sub.add_parser(command)
        for flag in ("policy", "manifest", "artifact", "evidence-root"): p.add_argument("--" + flag, required=True)
        if command == "promotion-plan": p.add_argument("--approval", required=True)
    args = parser.parse_args()
    try:
        if args.command == "preview-config": result = preview_config_check(read(args.production_config), read(args.preview_config))
        elif args.command == "evidence-files": result = evidence_files_check(read(args.checks), args.evidence_root)
        elif args.command == "artifact-digest": result = {"artifact_sha256": digest(inventory(args.artifact))}
        elif args.command == "manifest":
            result = make_manifest(read(args.policy), read(args.checks), args.commit, args.artifact, read(args.rollback), args.evidence_root)
            output = pathlib.Path(args.output)
            require(not output.resolve().is_relative_to(pathlib.Path(args.artifact).resolve()), "manifest output cannot be inside artifact")
            output.write_text(json.dumps(result, indent=2) + "\n")
        elif args.command == "verify":
            body = verify(read(args.manifest), args.artifact, read(args.policy), args.evidence_root); result = {"verified": True, "artifact_sha256": body["artifact_sha256"]}
        else: result = promotion_plan(read(args.manifest), args.artifact, read(args.policy), read(args.approval), args.evidence_root)
        print(json.dumps(result, indent=2))
    except (Blocked, KeyError, TypeError, ValueError, OSError) as e:
        print("BLOCKED: " + str(e), file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
