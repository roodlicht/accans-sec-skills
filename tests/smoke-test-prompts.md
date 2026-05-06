# Smoke-test prompts

A set of prompts designed to exercise the catalog's matcher across the five profiles. Each prompt is paired with the skill, agent, or command that should fire (the *expected trigger*).

These tests are not automated — they are intended for manual self-evaluation in a Claude environment that has the catalog installed (`./bin/sec-install --profile full --dest .claude` or the curl-pipe equivalent).

## How to use

1. Install the catalog (a profile or `--profile full`).
2. In a fresh Claude conversation, paste a prompt verbatim.
3. Observe which skill, agent, or command Claude invokes.
4. Compare to the *expected trigger* column. If Claude invokes the wrong item, refines too late, or fails to trigger anything, file an issue with the prompt and the observed behavior.

A "pass" means: Claude routes to the expected item within the first or second message, and the response demonstrates that the skill's `Aanpak` (or equivalent) is being followed.

## Prompts

### Core (7 items)

| # | Prompt | Expected trigger |
|---|---|---|
| 1 | "Run a security review on the PR diff of branch `feature/upload`." | `security-review` |
| 2 | "Is this SQL query safe: `cursor.execute(f'SELECT * FROM users WHERE id = {user_id}')`?" | `secure-coding` (phase 2) |
| 3 | "We have 500 Dependabot alerts. How do we prioritize?" | `cve-triage` |
| 4 | "Someone accidentally pushed an AWS access key into the repo — what now?" | `secrets-scanner` (phase 1: incident mode) |
| 5 | "Do a red-team pass over your previous answer; check assumptions and gaps." | `verification-loop` |
| 6 | "Threat-model this new payment service with Stripe integration." | `threat-modeler` (agent) |
| 7 | "/security-gate" (slash command) | `security-gate` (command) |

### AppSec (12 items, plus core)

| # | Prompt | Expected trigger |
|---|---|---|
| 8 | "Configure Semgrep + CodeQL in our CI with sane defaults." | `sast-orchestrator` |
| 9 | "Set up a ZAP baseline scan against our staging." | `dast-workflow` |
| 10 | "Review our Terraform modules for IAM misconfig." | `iac-security` |
| 11 | "Our Dockerfile runs as root and we want distroless. Migration plan?" | `container-hardening` |
| 12 | "Can you set up a default-deny NetworkPolicy for the payments namespace?" | `k8s-security` |
| 13 | "Review this REST API against OWASP API Top 10 risks." | `api-security` |
| 14 | "How do we generate SLSA-L3 provenance for our npm package release?" | `supply-chain` |
| 15 | "Our Django app needs to be hardened for production. Deploy checklist?" | `django-security` |
| 16 | "Spring Boot actuator endpoints expose too much — fix?" | `spring-security` |
| 17 | "Brakeman triage of this Rails app." | `rails-security` |
| 18 | "Review the auth flow in our Next.js Server Actions." | `nextjs-security` |
| 19 | "Set up GitHub Actions OIDC to AWS." | `cicd-hardening` |

### Pentest (9 items, plus core overlap)

| # | Prompt | Expected trigger |
|---|---|---|
| 20 | "Map de attack surface van example.com — autorisatie staat in scope.txt." | `recon-agent` (agent) |
| 21 | "We hebben drie Mediums gevonden: open redirect, OAuth state weakness, en stored XSS in admin. Chain ze." | `exploit-chain` |
| 22 | "Geef me een SSTI-test-payload voor Jinja2-context." | `payload-crafter` |
| 23 | "Triage deze BloodHound-output op shortest-paths-to-DA." | `ad-attacks` |
| 24 | "Is deze JWT-config kwetsbaar voor algorithm-confusion?" | `web-exploit-triage` |
| 25 | "Zet een C2 redirector op met sleep + jitter discipline." | `c2-hygiene` |
| 26 | "Plan een phishing-sim voor 200 medewerkers, ethical scope." | `phishing-sim` |
| 27 | "We hebben foothold op een Linux-host als unprivileged user — privesc-paden?" | `post-exploit` |
| 28 | "Schrijf het pentest-rapport voor engagement X-2026." | `pentest-reporter` |

### Blue (10 items)

| # | Prompt | Expected trigger |
|---|---|---|
| 29 | "Stel een ransomware-runbook op voor onze SaaS-stack." | `ir-runbook` |
| 30 | "Schrijf een Sigma-rule voor LSASS-dumping en vertaal naar Sentinel KQL." | `detection-engineer` (agent) |
| 31 | "We hebben 5000 alerts/dag in Splunk — tuning-plan?" | `alert-tuning` |
| 32 | "Triage deze CloudTrail-events: meerdere AssumeRole-calls van een user na werktijd." | `log-triage` |
| 33 | "Schrijf me een SPL-query die outbound DNS-traffic naar new-domains filtert." | `siem-query` |
| 34 | "We willen onze IOC-feeds dedupliceren en MISP opzetten." | `ioc-hunter` |
| 35 | "Sample uit een sandbox-rapport — kun je TTPs extracten en mappen op ATT&CK?" | `malware-triage` |
| 36 | "We hebben een Volatility-dump van een verdachte host. Welke plugins draaien?" | `forensics-assist` |
| 37 | "Plan een purple-team cyclus rondom Kerberoasting (T1558.003)." | `purple-ops` |
| 38 | "/threat-hunt" (slash-command) | `threat-hunt` (command) |

### GRC (9 items)

| # | Prompt | Expected trigger |
|---|---|---|
| 39 | "ISO 27001:2022 Stage 2 voorbereiden — wat moet in de SoA?" | `iso27001` |
| 40 | "Wat is de overlap tussen SOC 2 Type II en ISO 27001 voor dual-attestation?" | `soc2` |
| 41 | "Vallen wij onder NIS2? We zijn een SaaS in fintech, 80 FTE." | `nis2` |
| 42 | "DORA Pillar 4 third-party risk register opzetten — DNB toezicht." | `dora` |
| 43 | "Moet er een DPIA komen voor onze nieuwe AI-feature die klantgedrag scoort?" | `gdpr-pia` |
| 44 | "Risk-register-methodologie kiezen tussen ISO 31000, NIST 800-30 en FAIR." | `risk-register` |
| 45 | "Schrijf een Acceptable Use Policy template aligned met ISO Annex A.5.10." | `policy-drafter` |
| 46 | "Vendor-onboarding voor een nieuwe SaaS — welke vragenlijst?" | `vendor-questionnaire` |
| 47 | "Hoe pakken we evidence-collection aan voor SOC 2 Type II observation period?" | `audit-evidence` |

## Evaluation

Run a fresh test against the catalog after substantive changes (new items, refactors, frontmatter description tweaks). The matcher is sensitive to phrasing — if a prompt no longer triggers, that is meaningful signal.

When reporting failures, include:

- The exact prompt (verbatim).
- The Claude environment (Claude Code version, OS, which profile installed).
- Which item Claude invoked instead, if any.
- A guess at why (e.g., overlap with a sibling skill, ambiguous phrasing, missing trigger-word).

We do not currently publish a pass-rate. The matcher is downstream of the skills system itself, and pass-rates depend on Claude version. The point of this list is to keep regressions visible, not to advertise a number.
