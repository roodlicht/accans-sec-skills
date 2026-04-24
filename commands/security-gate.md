---
description: Pre-merge security gate on the current branch — runs secrets, SAST and dep-vuln checks on changed code, honors documented exceptions, returns a hard PASS/FAIL verdict.
argument-hint: "[base-ref] [--strict] [--skip=<gate>] [--full-deps]"
---

# /security-gate

Pre-merge blocker. Draait drie gates (secrets, SAST, dep-vulns) op de changed-code van de huidige branch en levert een pass/fail-verdict met blockers erbij. Dit is geen review (`security-review` is de workflow met patterns en rapport), dit commando beslist: mag deze branch de merge in, ja of nee?

Het commando orchestreert. De onderliggende skills (`secrets-scanner`, `sast-orchestrator`, `cve-triage`) doen het werk.

## Stappen

1. **Scope bepalen.** Diff tegen de base-ref (default `origin/main`):
   ```bash
   git fetch origin main --quiet
   git diff --name-only origin/main...HEAD
   git log --oneline origin/main..HEAD
   ```
   Noteer de lijst gewijzigde files. Secrets- en SAST-gates draaien op deze lijst. De dep-gate draait op elke gewijzigde lockfile, of op de volledige graph bij `--full-deps`.

2. **Secrets-gate.** Roep `secrets-scanner` aan, scope = changed files + commit-delta op deze branch. Tooling: `gitleaks detect --source . --log-opts="origin/main..HEAD"` of equivalent. Verified hit is een blocker, geen uitzondering.

3. **SAST-gate.** Roep `sast-orchestrator` aan op de changed files. Blocker-threshold: elke High/Critical finding in de diff, of Medium-findings binnen auth/crypto/IO/deserialisatie-paden (die heb je uit `security-review` fase 2-recon als context).

4. **Dep-vuln-gate.** Roep `cve-triage` aan op de gewijzigde lockfiles. Blocker wanneer: CVE op CISA KEV, of reachable pre-auth RCE (zie `cve-triage` fase 3). Bij `--full-deps` check je de complete dep-graph, niet alleen wat de diff toevoegt.

5. **Policy-uitzonderingen honoreren.** Twee bronnen, in deze volgorde:
   - Repo-level: `.security-gate.yaml` met `allow:` entries die elk `id` (CVE/rule-id/secret-hash), `reason` en `expires` (YYYY-MM-DD) moeten bevatten. Missend `reason` of verlopen `expires` betekent dat de uitzondering niet telt.
   - PR-level: een regel in de PR-description in de vorm `security-gate: allow <id> reason: <...> expires: <YYYY-MM-DD>`.

   Elke toegepaste uitzondering noemen in het rapport, met reden en expiry. Zonder transparantie is het geen gate meer.

6. **Verification-loop.** Pas `verification-loop` toe op het gate-resultaat vóór het verdict. Laag 1 scope ("alle changed files langs alle drie gates gegaan?"), Laag 2 vooral op onderbouwing: geen verzonnen CVE/CWE-ID's, geen "waarschijnlijk niet reachable" zonder tool-output, EPSS-cijfer met datum.

7. **Verdict formuleren.** Eén van:
   - **PASS**: alle gates groen, of alleen allowlist-hits binnen geldige policy-uitzonderingen.
   - **PASS-WITH-WARNINGS**: geen blockers, wel niet-blokkerende findings (medium/low buiten kritieke paden). Met `--strict` wordt dit FAIL.
   - **FAIL**: ≥ 1 blocker in een van de gates, of een ongeldige policy-uitzondering op een blocker-finding.

## Argumenten

- `<base-ref>` (optioneel, positioneel). Ref om tegen te diffen. Default `origin/main`. Gebruik bijvoorbeeld `origin/release-2026-Q2` wanneer je op een release-branch zit.
- `--strict`. Promoveer medium-findings tot blocker. Resultaat wordt FAIL als er iets boven low staat.
- `--skip=<gate>`. Sla één gate over (`secrets`, `sast`, of `deps`). Vereist dat de aanroeper een reden in de begeleidende boodschap meegeeft, anders faalt het commando met reason-required. Uitzonderingen worden sowieso in het rapport genoemd.
- `--full-deps`. Dep-gate over de volledige dep-graph in plaats van alleen de diff. Gebruik bij release-branches of periodieke audits.

Zonder argumenten: `origin/main` als base, alle drie gates, non-strict, diff-scope voor deps.

## Output

Kort en actionable. Geen tool-dumps. Voor diepte verwijs door naar de onderliggende skills.

```
security-gate — base: origin/main | modified: 7 files | flags: <none | --strict | --full-deps>

Secrets (secrets-scanner):   PASS — 0 verified hits
SAST   (sast-orchestrator):  FAIL — 1 High, 2 Medium (zie blockers)
Deps   (cve-triage):         PASS — 0 blockers, 2 fix-sprint (niet-blokkerend)
Policy-uitzonderingen:       1 toegepast (CVE-2024-xxxx, expires 2026-09-30)

Verification-loop:
  Verdict:          <pass | revise | rewrite>
  Security-verdict: <geen red flags | red flag — ...>

VERDICT: FAIL

Blockers:
- SAST [src/auth/session.py:42] CWE-285 Improper Authorization
  Check ownership vóór document-return. Detail: `security-review`.
- SAST [src/api/upload.py:88] CWE-434 Unrestricted File Upload
  MIME- en magic-byte-check toevoegen.

Niet-blokkerende findings (2):
- Deps CVE-2025-yyyy in axios@1.6.2 — fix-sprint (EPSS 0.03, niet reachable)
- Deps CVE-2025-zzzz in lodash@4.17.20 — fix-quarter
```

Regel `VERDICT: …` staat altijd aanwezig en is de canonieke signal-regel voor automation (zoek op die prefix). Zonder een `VERDICT:`-regel is het commando niet afgerond.

## Wanneer NIET

- Voor een inhoudelijke review → `security-review` (workflow met rapport). Dit commando beslist, het rationaliseert niet dieper dan nodig om te beslissen.
- Voor design-/architectuur-analyse → `threat-modeler` (agent).
- Voor incident-response als er daadwerkelijk iets gelekt of geëxploiteerd is → `ir-runbook`.
- Als er geen base-ref te vinden is (detached HEAD, orphan branch): commando faalt met duidelijke foutmelding. Fix eerst de git-state.
