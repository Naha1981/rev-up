# NahaLabs safe-release adapter, draft v4

Status: prepared and self-tested, not connected to any production release. Nothing here deploys code or calls a network service.

## Contract

1. An app owner reviews a versioned coverage policy. Required checks list every supported journey, not only tests that already exist. Unknown coverage blocks release.
2. Build once. Hash the artifact directory. Run the app's unit/API/browser/isolation/migration/rollback checks against that candidate. Reports record the full commit, artifact digest, assertion count, evidence reference/digest and completion time.
3. Create a manifest only if every required check passed. Include the exact account/service, schema/config revision, isolated preview resources, default-off pilot and rollback target/rehearsal.
4. Reverify the candidate immediately before promotion. Any added, removed or changed file, policy/config change, missing/failed/skipped/old check or mismatched target blocks the plan.
5. A separate accountable release operator reviews the original owner's exact-build Go + Sure. An approval JSON document is only a routing record; it does not authenticate the user or grant permission.
6. The promotion command in this package is deliberately PLAN_ONLY. It has no deploy credentials. An app-specific trusted adapter must promote this exact artifact without rebuilding, confirm the live version/hash and append live proof. No automatic promotion is enabled by this package.
7. App/feature flags default off. Only the approved pilot allowlist sees the candidate. Use compatible schema changes. One-step code rollback does not revert data or messages.

## Commands

- `python release_gate.py artifact-digest --artifact ./candidate`
- `python release_gate.py manifest --policy policy.json --checks checks.json --artifact ./candidate --commit FULL_SHA --rollback rollback.json --output release.json --evidence-root ./evidence`
- `python release_gate.py verify --policy policy.json --manifest release.json --artifact ./candidate --evidence-root ./evidence`
- `python release_gate.py promotion-plan --policy policy.json --manifest release.json --artifact ./candidate --approval approval.json --evidence-root ./evidence`
- `python release_gate.py evidence-files --checks checks.json --evidence-root ./evidence`
- `python -m unittest -v`

## Integration requirements still open

- Generate reports from the real test runner, never hand-write passing reports.
- Retain reports in a confined evidence directory. In v4, manifest, verify and promotion-plan ALL require --evidence-root and recheck nonempty report bytes/digests with path/symlink confinement. The standalone evidence-files check remains available. Bytes still do not establish execution authenticity. Rollback rehearsal digest currently has metadata validation only, not mandatory byte validation.
- Store manifest/evidence in a write-restricted release job. Hashes detect changes but are not signatures and cannot stop a person who can replace both the data and digest.
- Do not put production credentials in PR jobs. Run untrusted changes without privileged secrets.
- The current generic artifact hash covers files, not an OCI image digest. A Docker adapter must bind the registry image digest rather than hash a rebuilt image.
- Lock the app's actual release path. A passing gate is not enforcement if a human or alternate workflow can still deploy around it.
- Identify real database/resource IDs and reject aliases pointing to production. The generic check only rejects identical supplied identifiers; it cannot prove that different aliases are isolated.
- Add app-specific live verification and one-step rollback implementations after target inventory and owner approval.
- Rehearse restore separately. No destructive DB changes or irreversible external effects in preview.

## Free-only

Use standard free/open-source test runners and disposable local/CI data. Respect hosting/CI allowance caps. Do not enable paid preview environments, paid Supabase branches, billing or upgrades. Stop when a free limit is reached.

The bundled tests use explicit synthetic fixtures and are not evidence that any app is safe or released.

## v3 local review, 8 Nov

- Preview config uses an explicit allowed-key set. Unknown binding families, nested environment overrides, singular route aliases and cron/queue triggers fail closed. Add each new family only after reviewing real target isolation. This is not a complete Wrangler schema validator.
- Evidence bytes can now be independently compared with claimed report digests using the evidence-files command. Valid bytes alone do not authenticate the author or establish passing tests.
- 59 synthetic self-tests pass, including table-driven rejection cases. No app integration, push, provision or deployment is performed.

## v4 bounded review, 8 November

- Closed the optional evidence-files bypass in every manifest/verify/plan path. Missing, removed or changed test evidence blocks the plan. This remains a PLAN_ONLY package, not a deployment system.
- `junit_collect.py` parses retained Node/Pytest/Vitest-compatible JUnit XML. It rejects failing/error/skipped/disabled/unexecuted cases, duplicate or missing case identities, malformed/DTD XML, suite-count mismatch and a mismatch against an explicitly supplied expected-case registry. Unsupported dialects fail closed and need review.
- A check's `assertions` field records executed JUnit **test cases**, not assertion-statement count. Collector time is collection time, not an independently authenticated test completion time. Trusted CI must bind fresh execution, exact source, artifact and reviewed registry; do not ingest old XML and call it new proof.
- Example: `python junit_collect.py --junit evidence/unit.xml --expected-cases reviewed-unit-cases.json --check unit --commit FULL_SHA --artifact-sha256 SHA256 --evidence-reference unit.xml --output unit-check.json`.
- The 74-case LittleLedger XML in the handoff is an actual isolated source-test run, not a released build or browser/API/capacity result. Its discovered registry is explicitly NOT REVIEWED. The current worktree is dirty and has no candidate commit: no gate-passing app report or manifest was made from it.
- 77 unique synthetic adapter tests pass (59 prior, 4 mandatory-evidence checks, 14 JUnit rejection/acceptance checks). Do not count these as app coverage.
