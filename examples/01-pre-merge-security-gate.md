# Example 1 — Pre-merge security gate

**Profile**: `core` + `appsec`. **Items chained**: `/security-gate` command → `secrets-scanner` + `sast-orchestrator` + `cve-triage` → `verification-loop`.

## Scenario

A developer opens a pull request that touches `src/auth/`, `src/api/upload.py`, and `package.json`. Reviewers want to know — before any human read — whether the change introduces secrets, dependency-vulns, or static-analysis blockers, and whether it is safe to merge.

## Walkthrough

The reviewer runs `/security-gate` against the PR's branch.

The command:

1. **Computes the diff** against `origin/main` and lists the changed files.
2. **Calls `secrets-scanner`** with scope = changed files + commit-delta on the branch. Tooling: `gitleaks detect --source . --log-opts="origin/main..HEAD"`. Verified hits become hard blockers.
3. **Calls `sast-orchestrator`** on the changed files. Threshold: any High or Critical finding in the diff, plus Medium findings inside `src/auth/` (because the diff touches an auth-sensitive path, per the PR scope).
4. **Calls `cve-triage`** on the changed lockfiles in `package.json` / `package-lock.json`. Blockers: any CVE on the CISA KEV catalog, or any reachable pre-auth RCE on this service.
5. **Honors policy exceptions** from `.security-gate.yaml` or PR-description-level allow-entries. Each entry must have a reason and an expiry date.
6. **Runs `verification-loop`** over the gate result. Layer 1 confirms scope coverage. Layer 2 verifies that no CVE-IDs are fabricated, no payload-level exploits leaked into the report, no "probably not reachable" claims without tool output.
7. **Emits a verdict**: PASS, PASS-WITH-WARNINGS, or FAIL, with each blocker's location, CWE/OWASP classification, and a fix-direction handoff to the deeper skill.

## Output the reviewer sees

```
security-gate — base: origin/main | modified: 12 files | flags: <none>

Secrets (secrets-scanner):   PASS — 0 verified hits
SAST   (sast-orchestrator):  FAIL — 1 High in src/auth/session.py:42 (CWE-285)
                                    1 Medium in src/api/upload.py:88 (CWE-434)
Deps   (cve-triage):         PASS — 0 blockers, 2 fix-sprint (non-blocking)
Policy exceptions:           0 applied

Verification-loop:
  Verdict:          pass
  Security-verdict: no red flags

VERDICT: FAIL

Blockers:
- SAST [src/auth/session.py:42] CWE-285 Improper Authorization
  Document ownership check before document-return.
  Detail: hand off to `security-review` for full remediation context.
- SAST [src/api/upload.py:88] CWE-434 Unrestricted File Upload
  Add MIME and magic-byte validation; restrict allowed file types.

Non-blocking findings (2):
- Deps CVE-2025-yyyy in axios@1.6.2 — fix-sprint (EPSS 0.03, not reachable)
- Deps CVE-2025-zzzz in lodash@4.17.20 — fix-quarter
```

## What this demonstrates

- **Cross-skill orchestration**: one command surfaces output from three independent specialist skills in a unified verdict, without forcing the user to invoke them individually.
- **Discipline**: `verification-loop` runs against the gate's own output before delivery — preventing fabricated CVE-IDs or scope creep from reaching the reviewer.
- **Policy boundary**: blocker thresholds are explicit and documented; exceptions require reason + expiry, surfaced in the report. Silent allowlists do not happen.
- **Handoff structure**: each finding cites the deeper skill (`security-review`, `secure-coding`, framework-specific) where remediation guidance lives. The gate decides; the deeper skills explain.
