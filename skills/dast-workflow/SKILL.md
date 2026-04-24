---
name: dast-workflow
description: Dynamic Application Security Testing workflow — OWASP ZAP automation (baseline/full/API scans), Burp Suite Professional playbooks, Burp Collaborator for out-of-band detection, auth-state orchestration, and CI integration with scope-safe active scanning.
---

# DAST Workflow

## Wanneer gebruiken

DAST test een draaiende applicatie van buitenaf. Waar `sast-orchestrator` code leest, stuurt DAST HTTP-requests en kijkt naar response-patronen. Dat dekt runtime-behavior dat SAST niet ziet (auth-flows, session-handling, header-config, misconfig van reverse-proxy, DoS-gevoeligheid).

Activeert bij:

- Een vraag als "zet ZAP op onze staging", "draai een baseline-scan", "review deze Burp-output", "hoe logt de scanner in", "DAST in CI".
- Een nieuw deploy-bare omgeving (staging, QA, security-sandbox) die security-getest moet worden voor production-promotion.
- Een periodieke scan op staging of een pre-release regressie-run.
- Een handoff vanuit `security-review` waar runtime-gedrag moet worden geverifieerd (bv. zijn de security-headers daadwerkelijk aanwezig in response?).
- Een bug-bounty-voorbereiding: scan eerst met DAST om het laaghangende fruit uit te roeien vóór je betalende hunters aanzet.

### Wanneer NIET (handoff)

- Statische code-analyse → `sast-orchestrator`. DAST ziet geen source.
- Infrastructuur (Terraform/K8s/Docker) → `iac-security` / `k8s-security` / `container-hardening`.
- Pre-deploy threat-model op design-niveau → `threat-modeler`.
- OWASP API Top 10 als inhoudelijk raamwerk → `api-security`. DAST-tools dekken API-scans, deze skill orchestreert, die skill levert de inhoudelijke checklist.
- Actieve offensive pentest met exploitation → `web-exploit-triage` + `payload-crafter` + `recon-agent`. DAST signaleert, pentest exploiteert.
- Triage van dep-vulns uit een runtime-scan → `cve-triage`.
- Productie-scans: deze skill stuurt expliciet naar staging-achtige omgevingen. Production-DAST vereist extra controls en ops-afstemming (zie fase 1).

## Aanpak

Zeven fases. Fase 1 (scope + environment) en fase 3 (auth-state) zijn het hart. Beide zijn de plekken waar DAST-projecten stranden.

### 1. Scope en environment

DAST scans hebben reële blast-radius: ze vuren duizenden-tot-miljoenen requests, raken side-effects (emails verzonden, betalingen getriggerd, notifications), en kunnen de target-app DoS-en. Scope vastleggen is geen formaliteit.

- **Environment**: staging met productie-like data-schema maar geen echte klantdata is de sweet spot. Production-DAST alleen met: expliciete ops-goedkeuring, off-peak window, rate-limiting op de scanner, en een kill-switch.
- **In-scope hosts**: expliciet allowlist (`*.staging.example.com` beter dan `example.com` wildcard). DAST-tools zullen anders naar externe hosts spideren die niet van jou zijn.
- **Out-of-scope paden**: logout (veroorzaakt sessie-teardown mid-scan), destructive actions (`DELETE /users/{id}`, `POST /admin/wipe-data`), third-party-embedded content, rate-limited auth-endpoints (tenzij je ze gericht test).
- **Data-effect**: welke actions hebben side-effects? Email-dispatch, payment-creation, webhook-triggers. Zet test-accounts klaar met eigen e-mail-adressen en gebruik sandbox-mode van payment-providers.
- **Rate-limiting**: scanner-concurrency op 5–10 threads, delay tussen requests, respecteer 429-responses. Een DAST-scan die je test-env platlegt is niet het doel.

Schriftelijke scope-spec met deze velden is vereist vóór scan-start, vergelijkbaar met een pentest-RoE. Voor interne scans kan dat een commit-comment zijn, voor shared staging liefst expliciet signed-off.

### 2. Tool-keuze: ZAP, Burp, andere

Twee dominante tools voor web-DAST; kies op basis van context.

- **OWASP ZAP** (Apache-2, OSS). Default-keuze voor CI-integratie en open-source workflows. Headless-mode via `zap-cli` of Automation Framework, volledig scriptbaar. Three scan-modes: baseline (passive only, ~2 min), full (passive + active, ~30–60 min), API (op basis van OpenAPI/Swagger-import).
- **Burp Suite Professional** (PortSwigger, commercial). Sterker in interactive testing en exploratory work. Burp Collaborator voor out-of-band (OOB) detection — essentieel voor blind SSRF, blind XSS, blind SQL-injection. Minder geschikt voor headless CI (Burp Enterprise is daar de variant voor).
- **Burp Suite Enterprise** (commercial). CI-integratie, dashboards. Prijziger maar schaalt beter dan ZAP in grote orgs.
- **Other**: Nuclei (template-based, goed voor vuln-specifiek scannen op basis van CVE-templates), Acunetix/Invicti/Netsparker (commercial enterprise, minder Rails/Node-gericht), Arachni (maintenance).

**Heuristiek**: begin met ZAP in CI voor baseline-passive per PR. Draai ZAP full-scan op een schema tegen staging. Burp Professional voor diepgaand werk door security-engineer op specifieke features. Enterprise-variant als je 20+ apps te scannen hebt.

### 3. Auth-state orchestration

De grootste DAST-faal-mode: scanner raakt onauth-gebied en mist alles wat achter de login zit. Auth-state opzetten is per app-specifiek maar volgt patterns.

**ZAP-auth-modes** (in volgorde van bruikbaarheid):

- **Script-based auth** (Zest of JavaScript) — definieer login-flow stap voor stap. Voor complexe flows (CSRF-token-refresh, multi-step).
- **Form-based auth** — standaard login-pagina met username+password fields. Snel op te zetten.
- **JSON auth** — voor SPAs die via JSON posten. Geef endpoint + request-body + response-field voor token.
- **HTTP auth** (Basic/Digest/NTLM) — zeldzaam in moderne apps.
- **Manual / export van browser-state** — Burp heeft sessiemanagement-rules, ZAP kan cookies importeren. Voor cases waar je login niet scriptable krijgt.

**Logged-in-indicator** — hoe weet de scanner dat de sessie nog actief is? Regex op een header (`X-User-ID`), op body-content (`Logout`), of een probe-URL die 200 geeft bij auth en 401 bij niet-auth. Zonder indicator loopt de scanner door met verlopen sessie en produceert nonsens.

**Logged-out-indicator** — redirect naar `/login`, 401, of body-tekst. Trigger voor auto-reauth.

**Token-refresh** — OAuth2/JWT sessies verlopen. Script die refresh-token uitwisselt voor nieuwe access-token. ZAP's auth-script kan dit; Burp via session-handling-rules.

**Exclude-set uitbreiden** — als logout in scope blijft wordt je sessie vernietigd mid-scan. Markeer expliciet: `/logout`, `/signout`, alles met `logout` in pad.

Test je auth-setup handmatig met één request voor je de scan start. Scanner-logs die zeggen "2000 URLs gescand" zeggen niets als ze allemaal 302-redirect-naar-login zijn.

### 4. Scan-strategie

Niet elke scan is dezelfde scan. Kies bewust wat je doet.

- **Baseline (passive only)** — ZAP fetch + passive analyze zonder actief payloaden. Vangt: security-headers ontbrekend, cookie-flags fout, verbose error-pages, informatie-disclosure. Snel (~2 min), veilig voor CI per PR. Dit is de CI-default.
- **Full scan (passive + active)** — ZAP active-scan stuurt XSS/SQLi/path-traversal-payloads. Langer (30–90 min, afhankelijk van app-grootte), zwaarder op target. Schedule weekend/nightly op staging.
- **API scan** — OpenAPI-spec import, doorloop elke endpoint. Combineert met fase 3 auth-state voor geauthenticeerde API-tests.
- **Targeted** — specifiek endpoint of flow na een nieuwe feature. Handmatig configureren in Burp of via ZAP Automation Framework.

Payloads vooraf kalibreren:

- **Safe actives**: reflected XSS, basic SQLi, path-traversal, command-injection, open redirect. Standaard ZAP-set is OK voor deze.
- **Potentially destructive**: het `postgresql` en `mysql`-injection-pakket kan unintentioneel data wijzigen als de app prepared-statements mist. Uitzetten tegen omgevingen die je niet kunt herstellen.
- **DoS-class**: slowloris, buffer-overflow-probes. Niet actief zonder expliciete afspraak.

### 5. Triage van findings

DAST-scans genereren veel findings waarvan de meerderheid false-positive is.

- **Baseline-hygiëne**: na eerste scan een baseline-file (ZAP `--report-file` met daarna `-z "-config json.report.file=<file>"` of Burp-equivalent). Volgende runs: diff tegen baseline, alleen nieuwe findings surface-en.
- **False-positive-patterns**: reflected-XSS-claims op endpoints die het payload terugsturen in een JSON-body met `Content-Type: application/json` — browser rendert het niet als HTML. SQLi-claims op endpoints die 500-error geven op alle input, niet alleen SQL-syntax. Server-header-based version-disclosures op endpoints die bewust een version-header teruggeven.
- **Verify-by-hand**: voor elke ernstige finding: reproduce handmatig met curl of Burp Repeater. Een DAST-tool die `High: SQL Injection` zegt zonder dat je een werkend payload hebt, is een speculatie.
- **Koppel aan CWE + OWASP**: findings in het rapport mappen naar bekende categorieën (zie `security-review` fase 6). DAST-tools doen dit meestal automatisch; verifieer de mapping klopt.

### 6. CI-integratie

- **Per PR**: ZAP baseline-scan tegen een ephemeral preview-environment (Vercel preview, Heroku review-app, ephemeral K8s namespace). Fail op nieuwe High-findings in de diff-scope.
  ```yaml
  # GitHub Actions voorbeeld
  - uses: zaproxy/action-baseline@v0.13.0
    with:
      target: ${{ env.PREVIEW_URL }}
      rules_file_name: .zap/rules.tsv
      cmd_options: '-a'
  ```
- **Nightly of weekly**: ZAP full-scan of Burp Enterprise tegen staging. Findings naar security-issue-tracker, niet naar PR-comments (te veel ruis).
- **Rules-file** (`.zap/rules.tsv`) om false-positive-rule-IDs te suppressen met rationale per entry.
- **Auth-state in CI**: een test-user dedicated voor scans, credentials in CI-secret (zie `cicd-hardening` fase 3). Rotatie na incident, niet op schema.
- **SLA op findings**: koppel output aan `cve-triage`-achtige triage-matrix — nieuwe High in production-relevante endpoint is fix-sprint, baseline-hygiene (bv. missing HSTS) is fix-quarter.

### 7. Verification-loop

Laag 1: scope (alle in-scope hosts gescand, geen out-of-scope onbedoeld geraakt, auth-state werkte tijdens de scan?), aannames ("we zijn authenticated" alleen als logged-in-indicator daadwerkelijk matcht), gaps (welke pages werden níet gecrawld en waarom, zitten daar unmet assumptions?), consistentie (findings-severities matchen tussen DAST-rapport en security-review-taxonomie?).

Laag 2: geen verzonnen CVE-IDs uit scan-output, payloads op patroon-niveau in het rapport (geen kant-en-klare exploits voor productie-targets), false-positive-claims onderbouwd met concrete herhaal-test (de "we hebben het handmatig geverifieerd"-claim moet waar zijn).

## Output

```
DAST-scan — <app>, <environment>
Tool:            <ZAP x.y | Burp Pro | Burp Enterprise | Nuclei>
Scan-type:       <baseline | full | API | targeted>
Duur:            <HH:MM>, requests verstuurd: <N>

Scope:
  In:            <host(s)>
  Uit:           <paden, bv. /logout, /admin/wipe-*>
  Auth:          <mode, test-user, logged-in-indicator geverifieerd>

Findings (pre-triage totaal):
  High:          N    (bevestigd: X, FP: Y, verify pending: Z)
  Medium:        N
  Low:           N
  Informational: N (niet rapporteren tenzij opvallend)

Bevestigd voor delivery (handmatig geverifieerd):
## [HIGH] <korte titel>
  Locatie:       <URL + method>
  Classificatie: CWE-<N> | OWASP A0<x>
  Reproductie:   <curl of Burp-Repeater-request>
  Impact:        <wat kan aanvaller>
  Fix:           <concrete richting; handoff naar framework-skill of secure-coding>

## [MEDIUM] ...

Baseline-hygiene (security-headers e.d.):
  HSTS: <present/absent>
  CSP:  <present + strictness>
  etc.

Handoffs:
  Dep-vulns gedetecteerd via runtime: <cve-triage>
  Vermoedelijke design-issue:         <threat-modeler>
  Exploitation-depth nodig:           <web-exploit-triage>

Verification-loop: ...
```

Ruwe tool-rapport (ZAP-HTML, Burp-XML) als bijlage, niet inline. Reviewer leest de samenvatting, klikt door voor detail.

## Referenties

- OWASP ZAP — [https://www.zaproxy.org/](https://www.zaproxy.org/). Tool, docs, Automation Framework.
- ZAP Automation Framework — [https://www.zaproxy.org/docs/automate/automation-framework/](https://www.zaproxy.org/docs/automate/automation-framework/). YAML-based CI-scan-configuratie.
- PortSwigger Burp Suite — [https://portswigger.net/burp](https://portswigger.net/burp). Professional en Enterprise docs.
- Burp Collaborator — [https://portswigger.net/burp/documentation/collaborator](https://portswigger.net/burp/documentation/collaborator). Out-of-band detection voor blind-injection-klasses.
- OWASP Web Security Testing Guide (WSTG) — [https://owasp.org/www-project-web-security-testing-guide/](https://owasp.org/www-project-web-security-testing-guide/). Methodologie-backbone voor web-testing.
- OWASP Automated Threat Handbook — [https://owasp.org/www-project-automated-threats-to-web-applications/](https://owasp.org/www-project-automated-threats-to-web-applications/). Referentie voor scan-gerelateerde threat-klasses.
- NIST SP 800-115 — [https://csrc.nist.gov/pubs/sp/800/115/final](https://csrc.nist.gov/pubs/sp/800/115/final). Technical Guide to Information Security Testing; §5 covers dynamic testing.
- Nuclei — [https://github.com/projectdiscovery/nuclei](https://github.com/projectdiscovery/nuclei). Template-based scanner, complement aan ZAP/Burp.
- zaproxy/action-baseline — [https://github.com/marketplace/actions/zap-baseline-scan](https://github.com/marketplace/actions/zap-baseline-scan). Kant-en-klare GitHub Actions voor CI.

## Categorieën

- appsec
