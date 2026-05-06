---
description: Pre-merge security gate on the current branch — runs secrets, SAST and dep-vuln checks on changed code, honors documented exceptions, returns a hard PASS/FAIL verdict.
argument-hint: "[base-ref] [--strict] [--skip=<gate>] [--full-deps]"
---

# /security-gate

Pre-merge blocker. Runs three gates (secrets, SAST, dep-vulns) on the changed code of the current branch and returns a pass/fail verdict with the blockers attached. This is not a review (`security-review` is the workflow with patterns and a report); this command decides: may this branch merge, yes or no?

The command orchestrates. The underlying skills (`secrets-scanner`, `sast-orchestrator`, `cve-triage`) do the work.

## Steps

1. **Determine scope.** Diff against the base ref (default `origin/main`):
   ```bash
   git fetch origin main --quiet
   git diff --name-only origin/main...HEAD
   git log --oneline origin/main..HEAD
   ```
   Note the list of changed files. Secrets and SAST gates run on this list. The dep gate runs on every changed lockfile, or on the full graph with `--full-deps`.

2. **Secrets gate.** Call `secrets-scanner`, scope = changed files + commit delta on this branch. Tooling: `gitleaks detect --source . --log-opts="origin/main..HEAD"` or equivalent. A verified hit is a blocker, no exceptions.

3. **SAST gate.** Call `sast-orchestrator` on the changed files. Blocker threshold: every High/Critical finding in the diff, or Medium findings within auth/crypto/IO/deserialization paths (you have those from `security-review` phase 2 recon as context).

4. **Dep-vuln gate.** Call `cve-triage` on the changed lockfiles. Blocker when: CVE on CISA KEV, or reachable pre-auth RCE (see `cve-triage` phase 3). With `--full-deps` you check the complete dep graph, not just what the diff adds.

5. **Honor policy exceptions.** Two sources, in this order:
   - Repo-level: `.security-gate.yaml` with `allow:` entries, each carrying `id` (CVE/rule-id/secret-hash), `reason`, and `expires` (YYYY-MM-DD). Missing `reason` or expired `expires` means the exception doesn't count.
   - PR-level: a line in the PR description in the form `security-gate: allow <id> reason: <...> expires: <YYYY-MM-DD>`.

   Mention every applied exception in the report, with reason and expiry. Without transparency it's no longer a gate.

6. **Verification-loop.** Run `verification-loop` over the gate result before the verdict. Layer 1 scope ("did all changed files go through all three gates?"), Layer 2 especially on substantiation: no fabricated CVE/CWE-IDs, no "probably not reachable" without tool output, EPSS number with a date.

7. **Formulate verdict.** One of:
   - **PASS**: all gates green, or only allowlist hits within valid policy exceptions.
   - **PASS-WITH-WARNINGS**: no blockers, but non-blocking findings (medium/low outside critical paths). With `--strict` this becomes FAIL.
   - **FAIL**: ≥ 1 blocker in any gate, or an invalid policy exception on a blocker finding.

## Arguments

- `<base-ref>` (optional, positional). Ref to diff against. Default `origin/main`. Use e.g. `origin/release-2026-Q2` when you're on a release branch.
- `--strict`. Promote medium findings to blocker. Result becomes FAIL if anything above low exists.
- `--skip=<gate>`. Skip one gate (`secrets`, `sast`, or `deps`). Requires the caller to give a reason in the accompanying message; otherwise the command fails with reason-required. Exceptions get listed in the report regardless.
- `--full-deps`. Dep gate over the full dep graph instead of just the diff. Use for release branches or periodic audits.

Without arguments: `origin/main` as base, all three gates, non-strict, diff scope for deps.

## Output

Short and actionable. No tool dumps; for depth, link out to the underlying skills.

```
security-gate — base: origin/main | modified: 7 files | flags: <none | --strict | --full-deps>

Secrets (secrets-scanner):   PASS — 0 verified hits
SAST   (sast-orchestrator):  FAIL — 1 High, 2 Medium (see blockers)
Deps   (cve-triage):         PASS — 0 blockers, 2 fix-sprint (non-blocking)
Policy exceptions:           1 applied (CVE-2024-xxxx, expires 2026-09-30)

Verification-loop:
  Verdict:          <pass | revise | rewrite>
  Security verdict: <no red flags | red flag — ...>

VERDICT: FAIL

Blockers:
- SAST [src/auth/session.py:42] CWE-285 Improper Authorization
  Check ownership before document-return. Detail: `security-review`.
- SAST [src/api/upload.py:88] CWE-434 Unrestricted File Upload
  Add MIME and magic-byte validation.

Non-blocking findings (2):
- Deps CVE-2025-yyyy in axios@1.6.2 — fix-sprint (EPSS 0.03, not reachable)
- Deps CVE-2025-zzzz in lodash@4.17.20 — fix-quarter
```

The line `VERDICT: …` is always present and is the canonical signal line for automation (search for the prefix). Without a `VERDICT:` line the command isn't done.

## When NOT to use

- For a substantive review → `security-review` (workflow with a report). This command decides; it doesn't reason deeper than required to decide.
- For design or architecture analysis → `threat-modeler` (agent).
- For incident response when something has actually leaked or been exploited → `ir-runbook`.
- When there's no base-ref to find (detached HEAD, orphan branch): the command fails with a clear error message. Fix the git state first.
