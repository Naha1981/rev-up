# NahaLabs safe-release adapter, draft v1

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
- `python release_gate.py manifest --policy policy.json --checks checks.json --artifact ./candidate --commit FULL_SHA --rollback rollback.json --output release.json`
- `python release_gate.py verify --policy policy.json --manifest release.json --artifact ./candidate`
- `python release_gate.py promotion-plan --policy policy.json --manifest release.json --artifact ./candidate --approval approval.json`
- `python -m unittest -v`

## Integration requirements still open

- Generate reports from the real test runner, never hand-write passing reports.
- Retain raw reports and verify their evidence digests through the CI adapter. The generic consistency gate does not fetch evidence_reference or independently establish that tests ran.
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
