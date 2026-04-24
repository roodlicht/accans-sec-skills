---
name: sast-orchestrator
description: SAST orchestration for Semgrep, CodeQL and SonarQube. Covers tool selection, ruleset curation, PR-comment integration, noise reduction with baselines, and language-specific linters (bandit, gosec, brakeman, eslint-security) when they add coverage.
---

# SAST Orchestrator

## Wanneer gebruiken

Deze skill configureert statische-analyse-tooling en houdt de ruis laag genoeg dat findings nog actionable zijn. Hij is de engine achter fase 3 van `security-review` en de SAST-gate van `/security-gate`.

Activeert bij:

- Een vraag als "zet Semgrep op deze repo op", "welke CodeQL-query-suite gebruiken we", "onze SonarQube is vol met false positives", "SAST in CI integreren".
- Een bestaande SAST-output die getrieerd moet worden voordat hij naar developers gaat.
- PR-comment-configuratie waar de balans tussen inline-annotaties en silent failure moet worden vastgesteld.
- Een nieuwe repo waar SAST nog ontbreekt, of een bestaande waar de rulesets zijn gegroeid zonder hygiëne.
- Een handoff vanuit `security-review` fase 3 of de `security-gate` SAST-gate.

### Wanneer NIET (handoff)

- Secrets in code → `secrets-scanner`. SAST-tools hebben secret-regels maar zijn niet de scherpste laag.
- Vulnerabilities in dependencies → `cve-triage` en `supply-chain`. SCA is een aparte discipline.
- Runtime/dynamic analyse → `dast-workflow`. SAST ziet geen live auth-flow of response-headers.
- IaC-misconfig → `iac-security`. Hoewel tools als Semgrep IaC-regels hebben, is de specialisatie bij `iac-security` scherper.
- Framework-deep regels (Django, Rails, Spring, Next.js) → respectievelijk `django-security`, `rails-security`, `spring-security`, `nextjs-security`. Die skills kunnen deze skill aanroepen voor CI-integratie van hun framework-specifieke rulesets.
- Pure code-pattern-vragen zonder tool-context → `secure-coding`.

## Aanpak

Zes fases. Fase 2 en 3 zijn het hart (welke tools, welke regels). De rest is workflow-omheen.

### 1. Scope en inventaris

Weet wat je hebt voor je nieuwe tools toevoegt.

- **Talen en frameworks in de repo.** `tokei` of `cloc` voor taal-breakdown, `package.json`/`pyproject.toml`/`go.mod`/`pom.xml` voor frameworks. Bepaalt welke tools zinvol zijn.
- **Bestaande SAST-setup.** Wat draait er al (lokale linters, CI-jobs, GitHub Advanced Security)? Welke rulesets zijn actief? Wat is de gemiddelde hit-rate per PR?
- **Doel.** Blocker-catch (pre-merge gate), compliance-evidence (SOC2/ISO-audit), quality-trend (tech-debt dashboard), ontwikkelaar-feedback (inline tips). Het doel bepaalt tool-keuze en hoe aggressief je faalt op findings.
- **Deadline en appetite.** Een blocker-gate-setup is iets anders dan een eerste verkenning. Tune aggressiviteit daarop.

Uitkomst: een inventaris van talen plus bestaande checks plus doel. Zonder dat kies je tools op de tast.

### 2. Tool-keuze

Minimaliseer overlap. Drie tools die 80% overlappen vangt niet drie keer zoveel, wel drie keer zoveel ruis.

- **Semgrep** (open-source, Apache-2, pattern-based in YAML). Default-keuze voor breadth. Community-rulesets dekken OWASP-klassen in alle gangbare talen. CI-integratie via `semgrep-action` of `semgrep ci`. Semgrep Pro (commercial) voegt call-graph-based checks en reachability toe.
- **CodeQL** (GitHub, deels open-source, query-based in QL). Diepere taint-tracking en dataflow-analyse. Trager dan Semgrep, fijner in de analyse. Gratis voor public repos, vereist GitHub Advanced Security (betaald) voor private. Default voor deep-mode reviews en security-critical codebases.
- **SonarQube / SonarCloud** (SonarSource, commercial). Scanner plus server plus dashboard. Sterk in trend-tracking en code-quality (niet alleen security). Overkill als je alleen security-findings wil, goed als het team ook tech-debt wil tracken.

**Language-specific linters** (als aanvulling waar ze scherper zijn):

- **Bandit** (Python) — vangt Python-specifieke foot-guns die Semgrep ook ziet, maar met strakke pre-commit-integratie.
- **gosec** (Go) — idem voor Go.
- **Brakeman** (Rails) — Rails-specifieke checks die veel diepere Rails-kennis hebben dan general-purpose tools. Zie `rails-security` voor details.
- **eslint-plugin-security** + **eslint-plugin-security-node** (JS/TS) — inline in de standaard linter, geen extra CI-stap.
- **PMD** / **SpotBugs** met **FindSecBugs** (Java).
- **psalm** / **phpstan** + security-plugins (PHP).

Selectie-heuristiek: één breadth-tool (Semgrep) altijd. CodeQL voor deep-mode en security-critical. SonarQube alleen als quality-trend ook een doel is. Language-specific als de breadth-tool bewezen te oppervlakkig is (bv. Rails zonder Brakeman mist veel).

### 3. Ruleset-curatie

Default rulesets van tools zijn een startpunt, geen eindpunt. Curatie betekent: aanzetten wat waardevol is, uitzetten wat niet bij deze codebase past, en eigen regels schrijven voor org-specifieke foot-guns.

**Semgrep** registry-rulesets (via `rules:` of `config:` directive):

- `p/security-audit` — brede security-set voor alle talen.
- `p/owasp-top-ten` — focust op OWASP-categorieën, maps naar A0x.
- `p/ci` — subset die niet te traag is voor elke PR.
- `p/<language>` — taal-specifiek (bv. `p/python`, `p/javascript`, `p/java`, `p/go`, `p/typescript`, `p/ruby`).
- `p/r2c-security-audit` — r2c-curated security-set, iets andere mix dan OWASP.

Custom Semgrep-regels in `.semgrep/` schrijven voor org-patronen (bv. "gebruik niet `requests.get` zonder timeout", "gebruik altijd onze interne `log_pii()` wrapper"). Zie Semgrep-playground voor ontwikkeling.

**CodeQL** query-suites:

- `security-extended` — standaard-set plus extra-strengere queries.
- `security-and-quality` — security plus code-quality queries; groter, meer ruis.

Custom CodeQL-queries in `.github/codeql/` als org-specifieke patterns te diep zijn voor Semgrep-patroonmatching.

**SonarQube**: Quality Profile selecteren (built-in "Sonar way" of eigen). Security Hotspots en Vulnerabilities zijn de security-relevante categorieën; Code Smells is quality, niet security, separaat rapporteren.

Regel-tuning per codebase: sommige regels triggeren altijd false positive op patronen die in deze codebase bewust zijn (bv. `subprocess.run` met vaste arguments in een admin-tool). Documenteer uitzetten, nooit wildcardend.

### 4. CI-integratie en PR-comments

Tools in CI draaien is standaard. De moeite zit in hoe developers de output zien.

**Semgrep in GitHub Actions** (minimaal):

```yaml
# .github/workflows/semgrep.yml
name: semgrep
on:
  pull_request:
    branches: [main]
jobs:
  semgrep:
    runs-on: ubuntu-latest
    container: returntocorp/semgrep
    steps:
      - uses: actions/checkout@v4
      - run: semgrep ci --config p/security-audit --config p/owasp-top-ten
```

PR-comments: Semgrep App (commercial) of een third-party action als `reviewdog` kunnen findings als GitHub review-comments posten op de exacte regel. Alternatief: Semgrep als SARIF uploaden naar GitHub code-scanning; dan verschijnen findings in de Security-tab plus als inline annotations.

**CodeQL in GitHub Actions**:

```yaml
# .github/workflows/codeql.yml
name: codeql
on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: python, javascript
          queries: security-extended
      - uses: github/codeql-action/analyze@v3
```

CodeQL findings landen automatisch in de Security-tab. Inline annotaties op de PR via de github/codeql-action.

**SonarQube**: scanner als CI-step, server-side rules, kwaliteits-gate config. PR-decoration via de SonarQube-app installeren op GitHub/GitLab.

Blocker-gedrag: laat de job falen op New findings boven een bepaalde severity (bv. semgrep's `--severity=ERROR` + exit-code check). Existing findings vóór invoering van de tool niet als blocker behandelen; zie fase 5 (baseline).

### 5. Noise-reductie

Te veel findings = findings worden genegeerd. Dit is het vak.

- **Baseline bij invoering.** Eerste run registreert alle bestaande findings als "known", gate faalt alleen op nieuwe. Semgrep: `--baseline-ref=main` of `semgrep-managed` baselines. CodeQL: het GitHub Advanced Security-dashboard markeert nieuwe vs. bestaande. SonarQube: "new code" analyse per PR.
- **In-code suppressies** met reden. Semgrep: `// nosemgrep: rule-id reason` (regel-niveau). CodeQL: `// lgtm[rule-id]` of `// codeql[rule-id]` + review-comment. SonarQube: `// NOSONAR reason`. Nooit wildcard-suppressies, altijd rule-id en reden.
- **Rule-disabling.** Rules die structureel false-positive zijn op deze codebase uitzetten in tool-config, met korte rationale in commit-message. Periodiek herzien (elk kwartaal, of bij grote refactors).
- **Severity-hergroepering.** Sommige default severities kloppen niet voor deze repo. Bv. een rule die Info-level is default maar hier Critical omdat het auth-flow raakt: promoten. In Semgrep via `severity` override, in CodeQL via query-packs.
- **Ignore-paths.** `.semgrepignore`, `paths-ignore` in CodeQL config. Generated code (`vendor/`, `node_modules/`, `migrations/`), test-fixtures, en third-party copies horen hier typisch thuis.
- **Exit-criteria.** De gate faalt wanneer: nieuwe finding High/Critical, of new Medium in kritiek pad (auth/crypto/IO). Bestaande findings worden niet geblokkeerd maar wel zichtbaar. Passing rate op PRs moet minimaal 70% zijn; zit je onder, dan is de tuning nog niet af.

### 6. Verification-loop

Pas `verification-loop` toe op de configuratie voor je hem op een team loslaat.

- Laag 1: scope (alle talen in de repo gedekt? alle kritieke paden in de ignore-path-lijst uitgesloten?), aannames (rulesets die je aanzette zijn actueel en bestaan echt), gaps (secrets en deps verwezen naar hun eigen skills?), consistentie (severities tussen tools vergelijkbaar?).
- Laag 2: rule-ID's en ruleset-namen echt, CWE-/OWASP-references verifieerbaar, geen custom regels die beweren een specifieke CVE te detecteren zonder PoC.

## Output

Bij nieuwe setup: CI-workflow-files, tool-configs en een korte toelichting. Bij triage-opdracht op bestaande output: een gecategoriseerd rapport.

**Setup-mode**:

```
SAST-setup — <repo>
Talen: <list>
Doel:  <gate | compliance | quality | feedback>

Geselecteerde tools:
- Semgrep (breadth)          — rulesets: p/security-audit, p/owasp-top-ten, p/<lang>
- CodeQL (deep)              — suite: security-extended (indien GHAS beschikbaar)
- <optionele quality tool>   — <SonarQube | disabled>
- Language-specific:          <bandit | gosec | brakeman | eslint-security>

Geleverd:
- .github/workflows/semgrep.yml
- .github/workflows/codeql.yml (indien CodeQL)
- .semgrep/<org>-rules.yml (custom regels, indien gewenst)
- .semgrepignore / paths-ignore in CodeQL
- Baseline-instructie: eerste run op main voordat gate aan gaat
- PR-comment-strategie: <inline via SARIF | apart comment via reviewdog | alleen Security-tab>
- Exit-criteria: <severity-threshold, new-only-logica>

Verification-loop:
  Verdict: ...
  Security-verdict: ...
```

**Triage-mode** (bestaande output screenen):

```
SAST-triage — <tool>, <N findings>
Na triage:
  Real blockers:       n1
  Real non-blockers:   n2
  False positives:     n3  (met per-rule reden)
  Uit te zetten regels: <rule-IDs + rationale>

Per real finding:
- Rule: <tool>/<rule-id> — CWE-<N>
- Locatie: <file:line>
- Ernst: <blocker | high | medium | low>
- Reden dat dit real is (niet false positive)
- Fix-suggestie of handoff

Doorgezet naar security-review: <N findings>
Genegeerd met documentatie: <N, met redenen>
```

Geen ruwe tool-dumps in de deliverable. Die zijn voor de CI-log, niet voor de reviewer.

## Referenties

- Semgrep docs — [https://semgrep.dev/docs/](https://semgrep.dev/docs/). Tool-docs, rule-syntax, CI-integratie.
- Semgrep Registry — [https://semgrep.dev/r](https://semgrep.dev/r). Zoek-interface voor rulesets en individuele regels.
- CodeQL docs — [https://codeql.github.com/docs/](https://codeql.github.com/docs/). Queries, query-suites, dataflow-analyse.
- GitHub Code Scanning — [https://docs.github.com/en/code-security/code-scanning](https://docs.github.com/en/code-security/code-scanning). Hoe SARIF-findings in de UI landen.
- SonarQube Rules — [https://rules.sonarsource.com/](https://rules.sonarsource.com/). Rule-inventaris per taal.
- OWASP Benchmark — [https://owasp.org/www-project-benchmark/](https://owasp.org/www-project-benchmark/). SAST-tool-vergelijking (let op: gedateerd, maar methodologisch nog relevant).
- SARIF-spec — [https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html](https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html). Interchange-format voor scan-output, draagt findings tussen tools.
- Bandit — [https://github.com/PyCQA/bandit](https://github.com/PyCQA/bandit). Python-specifieke linter.
- gosec — [https://github.com/securego/gosec](https://github.com/securego/gosec). Go-specifieke linter.
- Brakeman — [https://brakemanscanner.org/](https://brakemanscanner.org/). Rails-specifieke SAST.

## Categorieën

- appsec
