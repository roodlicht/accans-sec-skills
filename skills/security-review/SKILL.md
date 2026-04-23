---
name: security-review
description: Security review workflow for a PR, feature or codebase — scope, automated scans, manual OWASP/CWE pattern-check, prioritize and report. Uses secure-coding as pattern library.
---

# Security Review

## Wanneer gebruiken

De skill triggert wanneer een afgebakend stuk code systematisch op security wordt nagelopen — met een rapport als eindproduct. Hij is de workflow; `secure-coding` is de pattern-bibliotheek waar hij in fase 4 op leunt.

Concreet:

- Gebruiker zegt "doe een security review op \<PR/branch/feature/service\>", "review deze code op security issues", "audit tegen OWASP Top 10", "is dit veilig om te mergen", "security-audit vóór productie".
- Een PR raakt auth, crypto, user-input handling, session-beheer, PII-opslag, deserialisatie, file-upload of externe integraties — reviewen is niet optioneel.
- Nieuwe services voordat ze live gaan; bestaande services die na een incident zijn aangeraakt.
- Periodieke audit (per kwartaal of per release-cyclus) op high-risk subsystems van een langlopende codebase.

### Wanneer NIET (handoff)

- **Automated pre-merge gate** → `security-gate` (command). Dat is een blocker met beleid; deze skill is een inhoudelijke review.
- **Design-niveau dreigingen vóór code bestaat** → `threat-modeler` (agent). STRIDE, attack trees en trust-boundary-diagrammen horen daar.
- **Offensive assessment met actieve exploitation** → pentest-skills (`web-exploit-triage`, `recon-agent`, `payload-crafter`). Deze skill exploit niet; hij signaleert.
- **Framework-deep review** → eerst de framework-skill (`django-security`, `spring-security`, `rails-security`, `nextjs-security`, `api-security`), dan terug naar deze skill voor het overkoepelende rapport.
- **Losse code-pattern-vraag** ("is deze query veilig?") → direct naar `secure-coding`. Deze skill is het proces rondom, niet de patterns zelf.
- **Alleen dep-vuln-triage** → `cve-triage`. Die weegt exploitability (reachable path, EPSS) fijner dan deze skill.
- **Alleen secrets in git-history** → `secrets-scanner`. Deze skill roept hem aan, niet andersom.

Deze skill roept achter elkaar `secrets-scanner`, `sast-orchestrator`, `cve-triage` aan in fase 3, en `verification-loop` als laatste stap vóór het rapport de deur uitgaat.

## Aanpak

Zeven fases. Sla er geen over; fases die "niet van toepassing lijken" zijn vaak precies waar issues onopgemerkt blijven. Bij zeer kleine PR-scope mag fase 2 kort zijn en fase 5 beperkt — maar de fase-structuur blijft.

### 1. Scope vastleggen

Vóór je ook maar één file opent: weet wat je reviewt en waarom.

- **Object van review.** PR-diff, branch-delta, specifieke directory, volledige service, een flow-doorsnede (bv. "alle code in het login-pad"). Noteer exact welke files/ranges in scope zijn.
- **Aanleiding.** Pre-merge, periodieke audit, post-incident, compliance-prep (ISO/SOC2/DORA). Dit bepaalt welke severities blockers zijn.
- **Diepte.** *Light* = alleen de diff-hunks en wat ze direct aanroepen. *Medium* = diff + eerste-orde callers + gerelateerde tests/config. *Deep* = hele subsystem met control/data-flow analysis. Licht is OK voor kleine, geïsoleerde PRs; alles wat auth/crypto/untrusted input raakt is minimaal medium.
- **Out-of-scope expliciet.** Infra/IaC buiten deze skill (handoff), UI-text changes, docs-only changes, third-party code buiten directe consumption-path.
- **Deadline.** Beïnvloedt hoeveel diepgang en of er een tweede reviewer bij moet.

Als de scope na deze fase niet op één regel samen te vatten is, is hij te breed. Smal maken of opsplitsen.

### 2. Recon: begrijp wat je bekijkt

Een review zonder mentaal model van het systeem is symptoom-zoeken. Bouw eerst het model.

- **Docs doorlopen.** README, architectuur-diagrammen, ADRs, API-docs. Vaak staat daar welke claims het systeem maakt (welke threats in scope zijn).
- **Entry points lokaliseren.** HTTP routes (`grep` op route-decorators, middleware-chain), CLI handlers, message-consumers, webhooks, scheduled jobs, event-triggers. Lijst ze op — dit zijn je trust-boundaries.
- **Sensitive call-sites markeren.** Zoek op common foot-gun patterns: `eval`, `exec`, `subprocess.*shell=True`, `pickle.loads`, `yaml.load` zonder SafeLoader, `ObjectInputStream`, `innerHTML`, `dangerouslySetInnerHTML`, `verify=False`, `disable-ssl`, hardcoded AWS/GitHub-token-formaten. Ze zijn niet per se fout, maar elk vraagt aandacht.
- **Config en secrets-hantering.** Waar komen credentials vandaan? Env-vars? Vault? Hardcoded? Config-file? Roteer-schema bekend?
- **Auth-model.** Wie is een gebruiker? Hoe wordt identiteit bewezen? Welke rollen/permissies? Waar wordt autorisatie gecheckt — middleware, per-endpoint, per-resource?

Uitkomst van deze fase: een bullet-lijst met entry points, trust boundaries, sensitive call-sites en auth-model-samenvatting. Dat is je kaart voor fases 4–5.

### 3. Automated scan: wat tools je gratis geven

Laat de machine de platte patronen vangen voordat je zelf gaat lezen. Handoffs:

- **Secrets** → `secrets-scanner` (gitleaks, trufflehog, detect-secrets). Scan zowel working-tree als git-history. Elke match is serieus tot tegendeel bewezen — een key uit git-history blijft gelekt ook als hij nu weg is.
- **SAST** → `sast-orchestrator` (Semgrep met community-ruleset + language-specific, CodeQL voor dieptecontrole, SonarQube voor trend). Draai minimaal Semgrep; CodeQL bij deep-mode reviews.
- **SCA / dep-vulns** → `cve-triage` (osv-scanner, grype, Dependabot/Renovate-alerts). Filter op reachable-path en EPSS voordat je ze als finding opvoert.
- **IaC/container/k8s indien in scope** → `iac-security`, `container-hardening`, `k8s-security`.

Triageer de ruwe tool-output meteen: false-positives wegstrepen met reden, real findings doorzetten naar fase 6. Geen volledige tool-output in het rapport plakken — dat is lui en onleesbaar.

### 4. Handmatige pattern-review

Loop de in fase 2 gemarkeerde call-sites na met de zes-fases-walk uit `secure-coding`: trust boundaries → input/output → identity → secrets/crypto → robuustheid → dependencies. Voor elke finding noteer je file, line, classificatie en een korte beschrijving.

Wat deze fase toevoegt bovenop fase 3: context. SAST weet niet dat `get_document(id)` door een admin-endpoint wordt aangeroepen zonder ownership-check; jij wel, want fase 2 heeft het auth-model uitgewerkt.

Aandachtspunten die SAST zelden vangt:

- **Autorisatie-gaps (IDOR).** Endpoint checkt authenticatie maar niet of de actor de resource mag zien/aanpassen. Klassiek bij `/api/<resource>/<id>` routes.
- **Auth-logica bugs.** Race-condition tussen `check` en `act`, login-side-channels (timing, error-verschil tussen "user niet" en "password fout"), password-reset flow die account-enumeratie toelaat.
- **Sessie-management.** Session niet geroteerd na privilege-change, logout invalidateert geen server-side state, cookie-flags (HttpOnly/Secure/SameSite) niet gezet.
- **Rate-limiting en abuse.** Login, password-reset, 2FA-verify, payment-retry — elk zonder rate-limit is een gratis bruteforce/abuse-target.
- **JWT-misconfig.** `alg: none` geaccepteerd, algorithm-confusion (HS256 met RSA-pubkey als secret), verlooptijd oneindig, geen `kid`-rotatie.
- **Deserialisatie + file-upload.** Pickle/YAML/Java-serialization op user-path, file-upload zonder MIME/magic-byte validatie, path-traversal in file-naam.

### 5. Design- en business-logic review

Issues die pas zichtbaar worden als je systeem-niveau denkt. Niet alle reviews halen deze fase — licht/medium-scope mag dit overslaan mits fase 1 dat expliciet vastlegt.

- **Authorization-model holistisch.** Zijn er privilege-escalation-paden? Kan een gebruiker van tenant A data van tenant B raken via een indirect endpoint? Zijn admin-functies bereikbaar via een niet-admin route (cross-role pollution)?
- **Business-logic flaws.** Workflow-bypass (direct naar stap 5 zonder 1–4 te doorlopen), negatieve bedragen, coupon-stacking, dubbele refunds, replay op idempotency-keys.
- **Race conditions en TOCTOU.** Check-then-act op resource-state (bv. "is user nog premium" → "voer premium-actie uit"), concurrent writes zonder locking, double-spend-achtige patronen in financial flows.
- **State-machine gaten.** Welke transities zijn afgedwongen? Wat gebeurt bij een API-call in een state waarin die niet verwacht wordt?
- **Trust-boundary scheiding.** Draait per-user code in dezelfde process-space als cross-tenant admin-code? Welke config-waardes zijn tenant-scoped, welke globaal?

Als design-diepte echt nodig is (bv. nieuwe architectuur, nieuwe integratie met externe system): handoff naar `threat-modeler` voor een STRIDE-pass. Deze skill noteert dan in het rapport "threat-model aanbevolen voor X, uitgevoerd door <agent/persoon>".

### 6. Prioriteren

Severity bepaal je op basis van impact × likelihood × compenserende controls. CVSS v3.1 is het formele systeem, maar voor dev-teams werkt een blocker/high/medium/low-label vaak sneller — gebruik beide als het rapport naar zowel engineering als compliance gaat.

**Severity-matrix:**

- **Blocker.** Pre-auth RCE, authenticatie-bypass, secret/credential-exposure die systeemtoegang geeft, mass PII-leak, SQLi met OS-command reach, reachable dep-vuln met publieke exploit op een externally-exposed pad. **Niet mergen, niet deployen.**
- **High.** Authenticated RCE, IDOR op PII of financiële data, stored XSS in admin-context, SSRF naar cloud-metadata-endpoint, hardcoded productie-credential, JWT signature-verification uit, deserialisatie van user-controlled input in een kritiek pad. **Merge geblokkeerd tot fix.**
- **Medium.** Reflected XSS buiten admin-context, self-XSS, missing rate-limit op auth-endpoint, verbose errors met interne paden, weak-but-not-broken crypto-keuze, outdated lib zonder reachable exploit, missing security-headers in sensitive routes. **Fix in deze of de volgende sprint.**
- **Low.** Missing HSTS/CSP/X-Content-Type-Options, version-disclosure, verbose logging zonder PII, ontbrekende best-practice zonder directe risico-verhoging. **Backlog-ticket; geen merge-blocker.**

Exploitability weegt mee: een blocker die achter een non-routeable intern netwerk zit kan tot high zakken; een medium die publiek bereikbaar en ongeauthenticeerd is kan tot high stijgen. Documenteer de weging — anders is het onverdedigbaar.

CVE-ID of CWE-ID altijd erbij als je kunt. Zie `verification-loop` Laag 2 voor CVE/CVSS-verificatie — geen verzonnen ID's.

### 7. Rapporteren + verification-loop

Bouw het concept-rapport in de structuur hieronder. Draai dan `verification-loop` erover:

- **Laag 1**: scope-check (matcht rapport de in fase 1 afgesproken scope?), aannames (elke claim "reachable" / "exploitable" onderbouwd?), gap-analyse (welke entry points uit fase 2 zijn onbesproken?), adversariële lezer (wat zou de indiener als zwakste finding aanvallen?), faalmodi (werken je fix-suggesties?), consistentie (severities intern coherent?).
- **Laag 2**: CVE/CVSS-verificatie tegen NVD/FIRST, payload-niveau (geen kant-en-klare exploits voor productie-targets in het rapport), claims onderbouwen, primaire bronnen.

Pas aan. Lever pas wanneer verdict pass (of revise met fixes toegepast).

## Output

Rapport-template:

```
Security review — <scope>
Datum: YYYY-MM-DD | Reviewer: <naam/tool> | Diepte: <light|medium|deep>

Scope:
  In: <files, ranges, flow>
  Uit: <expliciet out-of-scope>
  Aanleiding: <pre-merge | periodic | post-incident | compliance>

Executive summary (3–5 regels):
  <status in één zin>
  Blockers: N | High: N | Medium: N | Low: N
  Advies: <merge | merge-na-fixes | niet mergen | bredere scope nodig>

Automated scan (samenvatting, geen dumps):
  Secrets (secrets-scanner): <N findings, X bevestigd>
  SAST (sast-orchestrator): <N findings na triage>
  SCA (cve-triage): <N reachable, EPSS-gewogen>
  IaC/container/k8s (indien): <N findings>

Findings (gesorteerd op severity, blockers eerst):

## [BLOCKER] <korte titel>
  Locatie: <file:line[–line]>
  Classificatie: CWE-<N> | OWASP A0<x> | CVSS v3.1 <score> (<vector>)
  Patroon: <naam, bv. "pickle.loads op user-body">
  Impact: <wat kan aanvaller concreet?>
  Reproductie: <stappen of curl-voorbeeld; geen versie-specifieke exploit>
  Fix: <concrete patch-richting, liefst code-alternatief>
  Compenserend: <bestaande controls die impact beperken, indien van toepassing>
  Handoff: <indien specialist nodig: threat-modeler, sast-orchestrator, etc.>

## [HIGH] ...
## [MEDIUM] ...
## [LOW] ...

Open vragen voor indiener:
  - <vraag over intentie/context>
  - <verificatie-verzoek dat reviewer niet zelf kan uitvoeren>

Niet-bevindingen expliciet:
  - <patroon dat opviel maar geen finding is, met reden — voorkomt dat de
    volgende reviewer er weer over valt>

Verification-loop:
  Verdict: <pass | revise | rewrite>
  Security-verdict: <geen red flags | red flag — oplosbaar | red flag — blokkerend>
```

Richtlijnen voor het rapport zelf:

- Findings zijn actionable of ze zijn ruis. Elke finding heeft een locatie en een fix-richting.
- Reproductie moet werken binnen de afgesproken scope (geen publieke 0-day-chains voor productie-targets; zie `verification-loop` Laag 2).
- "Niet-bevindingen" expliciet noemen voorkomt dat de volgende reviewer dezelfde tijd kwijt is. Twee regels per stuk is genoeg.
- Geen lange theoretische uitleg over "wat is XSS"; link naar OWASP Cheat Sheets en ga door.

Het rapport gaat naar de PR-auteur of service-owner, niet naar "stakeholders in het algemeen". Schrijf ervoor.

## Referenties

- OWASP Top 10 2021 — [https://owasp.org/Top10/](https://owasp.org/Top10/). Primaire categorieën; elke finding mapt naar een A0x.
- OWASP API Security Top 10 — [https://owasp.org/API-Security/editions/2023/en/0x11-t10/](https://owasp.org/API-Security/editions/2023/en/0x11-t10/). Voor API-scope reviews parallel aan of in plaats van Top 10.
- OWASP ASVS v4 — [https://owasp.org/www-project-application-security-verification-standard/](https://owasp.org/www-project-application-security-verification-standard/). Gebruik als requirement-checklist bij deep-mode reviews.
- OWASP Code Review Guide v2 — [https://owasp.org/www-project-code-review-guide/](https://owasp.org/www-project-code-review-guide/). Methodologie-basis voor deze workflow.
- CWE Top 25 — [https://cwe.mitre.org/top25/](https://cwe.mitre.org/top25/). Voor CWE-classificatie van findings.
- NIST SP 800-53r5 — [https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final). Control-families (AC, SI, SC) voor finding-mapping bij compliance-context.
- FIRST CVSS v3.1 — [https://www.first.org/cvss/v3-1/specification-document](https://www.first.org/cvss/v3-1/specification-document) en calculator [https://www.first.org/cvss/calculator/3.1](https://www.first.org/cvss/calculator/3.1).

## Categorieën

- core
- appsec
