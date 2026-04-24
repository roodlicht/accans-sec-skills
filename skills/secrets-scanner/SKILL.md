---
name: secrets-scanner
description: Detect and remediate leaked credentials in code and git-history — entropy/regex scanning with gitleaks/trufflehog/detect-secrets, rotate-first incident response, and pre-commit/CI gating to prevent reoccurrence.
---

# Secrets Scanner

## Wanneer gebruiken

Deze skill dekt drie scenario's: actief lek (incident), preventief scannen, en preventie-configuratie opzetten. De actie-volgorde verschilt sterk per scenario, dus fase 1 vraagt expliciet welke je doet.

Triggers:

- "Ik denk dat ik per ongeluk een key heb gecommit", "deze token lijkt uit te lekken", "check of er secrets in de repo staan".
- PR raakt files zoals `.env`, `.env.*`, `config/*.yaml`, `docker-compose*.yml`, `helm/values*.yaml`, `*.pem`, `*.key`, `credentials.json`, of nieuwe files onder `secrets/`, `vault/`.
- Setup van een nieuwe repo: pre-commit plus CI secret-gate installeren.
- Periodieke audit van git-history op een bestaande repo.
- Een finding uit `security-review` fase 3 (automated scan) die verdere triage vraagt.
- Anthropic/OpenAI-achtige token-patronen in logs, screenshots, of gedeelde notebooks.

### Wanneer NIET (handoff)

- Runtime secret-injection (Kubernetes Secrets, External Secrets Operator, sidecar-pattern) → `k8s-security` en `container-hardening`.
- Cloud IAM-policy review (wie mag welke key gebruiken) → `iac-security`.
- Secret-handling patterns in code (waar leeft de credential in geheugen, hoe wordt hij doorgegeven) → `secure-coding` fase 4.
- Vulnerability triage op dependencies die credentials lekken → `cve-triage`.
- Post-incident forensics bij aantoonbaar misbruik → `ir-runbook` en `forensics-assist`.

Bij een actief lek stopt deze skill niet: rotatie doet hij. Maar escaleer naar `ir-runbook` zodra er bewijs van misbruik is (CloudTrail-hits, abnormaal API-verkeer, data-egress).

## Aanpak

Zeven fases. **Fase 1 bepaalt de volgorde voor de rest**: bij een actief lek ga je direct naar fase 4 (rotatie), daarna pas 2/3/5/6. Bij scan/prevention: normale volgorde.

### 1. Urgentie bepalen

Eén vraag: is er een credential die nú actief in verkeerde handen kan zijn? De klok tikt vanaf het moment dat het geheim buiten controle is.

Klassificatie:

- **Actief lek, credential werkt nog**: onmiddellijk fase 4. Uren tellen. Alle andere fases later.
- **Lek bevestigd, credential-status onbekend of mogelijk dood**: fase 4 zodra kan, intussen fase 2/3 parallel om het volledige beeld te krijgen.
- **Vermoeden van lek**: fase 2 (detectie) eerst om te bevestigen, dan triage.
- **Geen lek, preventief scannen of setup**: fase 2 → 3 → 6. Fase 4 en 5 niet van toepassing.

Noteer de klassificatie expliciet. Hij bepaalt of fase-volgorde kan wachten op deliberate analyse of dat snelheid boven zorgvuldigheid gaat.

### 2. Detecteren

Tools in volgorde van voorkeur:

- **gitleaks** (MIT, Go). Scant working tree en volledige history. TOML ruleset, community-set dekt 140+ providers out of the box. Default keuze voor zowel incident als scan.
- **trufflehog** (AGPL / commercial). Unieke feature: `--only-verified` test gedetecteerde keys actief tegen de provider-API (AWS STS, Stripe, GitHub, etc.) en scheidt dode keys van levende. Verplicht bij incident-triage waar "werkt deze nog?" de kritieke vraag is.
- **detect-secrets** (Yelp, Apache-2). Sterkte: baseline/allowlist-workflow. Scan genereert een `.secrets.baseline` die git-diff-able is. Nieuwe findings springen eruit, oude known-safe worden niet steeds opnieuw gerapporteerd.
- **GitHub/GitLab native secret scanning + push protection**: altijd aanzetten. Complement, geen vervanging voor CI/local. De providers vangen alleen bekende formats en pas bij push.

Detectie-methoden in samenhang:

- **Provider-specific regex** (voorbeelden van public format-prefixes: `AKIA` voor AWS access keys, `ghp_` / `gho_` / `ghs_` voor GitHub, `xox[abpr]-` voor Slack, `sk_live_` voor Stripe, `AIza` voor Google API-keys, `sk-ant-api03-` voor Anthropic, `npm_` voor npm). Hoge precision. Referentie-lijst: GitHub Secret Scanning patterns documentation.
- **Shannon-entropy op base64/hex-achtige strings**. Tool-default thresholds gebruiken, niet zelf tunen. Trufflehog en gitleaks hebben empirisch gekalibreerde waarden per context. Hoge recall, lage precision, triage altijd nodig.
- **Keyword + context** (`password\s*=`, `api_key:`, `BEGIN PRIVATE KEY`). Vangt hardcoded-in-source en README-ongelukken.

Commando-referentie:

```bash
# gitleaks — volledige repo, working tree + history
gitleaks detect --source . --verbose --report-path gitleaks-report.json

# gitleaks — alleen staged (pre-commit gebruik)
gitleaks protect --staged --verbose

# trufflehog — git history, alleen verified levende credentials
trufflehog git file://. --only-verified

# trufflehog — GitHub org scan (incident-context)
trufflehog github --org=<org> --only-verified

# detect-secrets — baseline opbouwen + auditeren
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline
```

Voor non-git bronnen (logs, tarballs, backup-dumps): gitleaks heeft `detect --no-git`, trufflehog heeft `filesystem` en `s3` subcommandos. Dezelfde ruleset, andere source.

### 3. Classificeren

Elke hit is pas een finding als je het volgende hebt bepaald:

- **Soort credential.** Cloud (AWS/GCP/Azure), SaaS (Stripe, SendGrid, Slack, Twilio), VCS (GitHub PAT, GitLab token, BitBucket app-password), eigen systeem (DB-wachtwoord, interne API-key), crypto (private key, signing key), identity (JWT, session cookie).
- **Exposure-oppervlak.** Private repo, public repo, public Docker image, public website asset, leaked logfile, backup-tarball op S3 met public ACL, screenshot op support-ticket, gist. **Public = assume harvested.** Search-engines, GitHub-event-archief, GH-Archive.org en derde-partij scrapers indexeren in minuten.
- **Nog actief?** trufflehog `--only-verified` of handmatige call tegen een read-only provider-endpoint (bv. `aws sts get-caller-identity` met de key geconfigureerd).
- **Blast radius.** Read-only API-key, write access, billing, admin, root-account? Bij onbekende scope: assume de maximale scope tot tegendeel bewezen is.
- **Exposure-window.** Eerste commit: `git log -p --all -S '<unique-part-of-secret>'`. Of via `git blame` op het file indien het nog aanwezig is. Eindtijd: nu, of moment van revoke.

Severity (parallel aan `security-review` fase 6):

- **Blocker.** Productie cloud-admin key, root-DB credential, payment/signing key, code-signing key. Rotatie onmiddellijk, alles laten vallen.
- **High.** Scoped prod API-keys, SaaS met data/money-impact, PATs met repo-write op org-repos.
- **Medium.** Dev/staging-keys, read-only tokens met beperkte scope, verlopen-maar-nog-geldige sessie-tokens.
- **Low.** Test-fixtures met duidelijk fake-waardes, expired tokens, public demo-keys. Documenteer, verwijder uit history bij volgende cleanup, geen rotatie-urgentie.

### 4. Rotatie-first remediation

**Volgorde is wet.** Roteer eerst, dan communiceer, dan cleanup. Anti-pattern: git-history schoonmaken en vergeten te roteren. Cosmetica voor een credential die al geharvest is.

1. **Roteer of revoke bij de provider.** AWS: `aws iam delete-access-key` + nieuwe aanmaken, of CLI-rollen via `aws iam update-access-key`. GitHub: Settings → Developer settings → PAT → Revoke. Stripe: Dashboard → Developers → API keys → Roll. Anthropic/OpenAI: console → revoke plus nieuwe genereren. DB: `ALTER USER … WITH PASSWORD …` of drop en recreate-user. Voor signing/KMS-keys: schedule deletion met window, niet instant-delete.
2. **Check provider-logs op misbruik** met de exposure-window als venster. AWS CloudTrail filteren op `userIdentity.accessKeyId`, GitHub Audit Log op PAT-owner, Stripe events, SaaS audit-exports. Bij aantoonbaar misbruik: escaleer naar `ir-runbook` (de secret is dan niet meer het verhaal, de inbreuk wel).
3. **Vervang in alle plekken waar de oude credential gebruikt werd.** CI-secrets, production hosts, teamleden-configs. Liefst naar een vault tillen in deze stap, want een rotatie-incident is een goede katalysator om secrets uit source te halen.
4. **Incident-log.** Wat, waar, wanneer gelekt, wanneer gedetecteerd, wanneer geroteerd, wie heeft geacteerd, welke systemen geraakt. Voor compliance-doelen minimaal deze set, bij bewijs van misbruik meer detail onder `ir-runbook`.

### 5. Git-history cleanup (optioneel, destructief)

Alleen uitvoeren als alle drie waar zijn: credential is aantoonbaar gerevoked, repo is privé of exposure-window was kort genoeg dat removal praktisch zin heeft, en het team accepteert een force-push plus coordinatie-moment.

Tools:

- **git-filter-repo** (modern, snel, actief onderhouden). Python, maar standalone executable. Vervangt `git filter-branch`, dat deprecated is.
- **BFG Repo-Cleaner** (Java, snelste op grote histories met veel commits).

Commando's:

```bash
# git-filter-repo — file volledig verwijderen uit history
git filter-repo --invert-paths --path path/to/secret-file

# git-filter-repo — tekst vervangen (patterns.txt: één regex per regel)
git filter-repo --replace-text patterns.txt

# BFG — zelfde idee
bfg --replace-text patterns.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Daarna synchroniseren
git push --force --all
git push --force --tags
```

Coordinatie: al je collega's moeten opnieuw clonen of careful reset doen. Oude clones behouden de history. Public forks van GitHub blijven de history houden. Je kunt GitHub Support vragen om caches te invalideren, maar dat is geen garantie.

**Realiteit-check.** Voor public repos of publieke images: GitHub events, wayback-archief, GH-Archive.org, scraped copies op derde-partij sites. History-cleanup verlaagt alleen casual-discovery, het elimineert niet het leken-feit. Compliance of policy kan cleanup nog steeds vereisen ondanks die realiteit.

### 6. Preventie instellen

Meerlaags. Eén hek faalt altijd, de combinatie vangt de meeste fouten.

**Pre-commit hook** (developer-machine, eerste hek). Gebruikt het `pre-commit` framework (Python) of husky (Node):

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.x.y   # pin op latest stable bij install
    hooks:
      - id: gitleaks
```

Developers kunnen altijd `git commit --no-verify` draaien. Pre-commit is behulpzaam, geen gate. CI is de backstop.

**CI-gate** (GitHub Actions voorbeeld):

```yaml
- name: secret scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Laat de stap falen op findings. Whitelist alleen via `.gitleaksignore` met commit-hash plus reden per entry. Geen wildcards of path-globs die hele directories overslaan.

**Repo-settings**:

- GitHub: Settings → Code security → Secret scanning aan, **Push protection aan**. Push protection blokkeert bekende patterns voordat ze de server raken.
- GitLab: Secret Detection template in `.gitlab-ci.yml`.
- `.gitignore` expliciet voor `.env`, `.env.*` (behalve `.env.example`), `*.pem`, `*.key`, `*.p12`, `id_rsa*`, `credentials.json`, `config/local.*`, `**/secrets/**`.
- `.env.example` gecommit met lege/placeholder-waardes zodat developers weten welke env-vars er zijn zonder de echte te kennen.

**Runtime secret-store** (hoort niet in source, ook niet in CI-config als plain text):

- Cloud-native: AWS Secrets Manager, GCP Secret Manager, Azure Key Vault. IAM-gated, rotatie-schema mogelijk.
- Platform: HashiCorp Vault, Doppler, Infisical.
- Kubernetes: External Secrets Operator met een van bovenstaande als backend. Native K8s Secrets als enige laag zijn onvoldoende, die zijn base64-encoded, niet encrypted, en RBAC bepaalt wie ze kan lezen. Zie `k8s-security`.

**Onboarding-checklist**:

- Nieuwe devs: waar secrets te krijgen, welke klassen credentials bestaan, wat er gebeurt als je iets committed (incident-procedure).
- Code-review standaard: elke config-change wordt op secrets gescand voor merge.

### 7. Verification-loop

**Incident-mode**: Laag 1 scope-check (alle systemen geroteerd? alle teamleden geïnformeerd? alle CI-pipelines bijgewerkt?), aannames (credential daadwerkelijk gerevoked of alleen "ik heb op revoke geklikt"?), gaps (backups, read-replicas, cached configs meegenomen?). Laag 2 red flags vooral op claims: "key is dood" alleen als je het via trufflehog of provider-test hebt bevestigd. Geen aangenomen rotatie.

**Prevention-mode**: Laag 1 gaps (dekken de gates zowel staging als prod? werken ze op nieuwe branches?), Laag 2 bron-kwaliteit (regex uit GitHub Secret Scanning docs, niet uit een willekeurige blog).

## Output

**Incident-mode**:

```
Secret leak incident — <korte ID>
Gedetecteerd: YYYY-MM-DD HH:MM | Status: <actief | gecontained | afgesloten>

Credential:
  Type: <AWS access key | GitHub PAT | Stripe live key | ...>
  Scope/blast radius: <bekend detail | aangenomen maximaal>
  Exposure-window: <eerste commit SHA/datum> → <gedetecteerd of verwijderd>
  Exposure-oppervlak: <private repo | public repo | image | log | ...>
  Verified active: <ja | nee | onbekend — methode>

Actiepad:
  [x] Roteer/revoke bij provider — YYYY-MM-DD HH:MM door <actor>
  [x] Provider-logs gecheckt — <schoon | bijlage met hits>
  [x] Vervangen in <CI, hosts, teamleden-configs>
  [x|-] Git-history cleanup — <klaar | skip met reden | in progress>
  [ ] Incident retrospective

Verification-loop:
  Verdict: <pass | revise | rewrite>
  Security-verdict: <geen red flags | red flag — ...>
```

**Prevention-mode**: concrete deliverables, geen narrative-rapport. Geleverde artefacten:

- `.pre-commit-config.yaml` (of husky-equivalent).
- CI-workflow file (`.github/workflows/secret-scan.yml` of `.gitlab-ci.yml`-fragment).
- `.gitignore`-toevoegingen.
- `.gitleaks.toml` als er org-specifieke patterns (interne prefixes, domain-names) bij moeten.
- `.secrets.baseline` bij detect-secrets-keuze.
- Repo-settings-checklist (push protection, secret scanning, required status checks).
- Test-instructie: commit een canary-string als `AKIAIOSFODNN7EXAMPLE` (AWS' eigen documentation-placeholder) en verifieer dat pre-commit én CI de push blokkeren.

Geen rapport afleveren zonder rotatie-status voor incidents. Zonder rotatie is het geen remediatie, dat moet expliciet in het rapport staan.

## Referenties

- OWASP Secrets Management Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html). Canonieke storage/lifecycle-guidance.
- NIST SP 800-57 Part 1 Rev 5 — [https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final). Key management recommendations voor rotatie-ritme en lifecycle.
- GitHub Secret Scanning patterns — [https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns](https://docs.github.com/en/code-security/secret-scanning/introduction/supported-secret-scanning-patterns). Primaire bron voor vendor-token-formats.
- gitleaks — [https://github.com/gitleaks/gitleaks](https://github.com/gitleaks/gitleaks). TOML rules, lokaal + CI + pre-commit.
- trufflehog — [https://github.com/trufflesecurity/trufflehog](https://github.com/trufflesecurity/trufflehog). `--only-verified` voor actieve validation tijdens incidents.
- detect-secrets — [https://github.com/Yelp/detect-secrets](https://github.com/Yelp/detect-secrets). Baseline-workflow voor repos met historische findings.
- git-filter-repo — [https://github.com/newren/git-filter-repo](https://github.com/newren/git-filter-repo). Modern history-rewrite, vervangt filter-branch.
- BFG Repo-Cleaner — [https://rtyley.github.io/bfg-repo-cleaner/](https://rtyley.github.io/bfg-repo-cleaner/). Snellere optie voor grote histories.
- pre-commit framework — [https://pre-commit.com/](https://pre-commit.com/). Host voor de gitleaks/detect-secrets hooks.

## Categorieën

- core
- appsec
