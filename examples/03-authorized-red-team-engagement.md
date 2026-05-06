# Example 3 — Authorized red-team engagement

**Profile**: `pentest`. **Items chained**: `recon-agent` → `web-exploit-triage` → `payload-crafter` → `exploit-chain` → `post-exploit` (with `c2-hygiene`) → `pentest-reporter` → `purple-ops` (handoff).

> **Hard scope**: every step in this walkthrough assumes a signed Rules of Engagement (RoE) document. Without RoE, none of these activities are legitimate. The catalog enforces this through pattern-level discipline (no version-specific weaponized exploits in any skill) and through repeated RoE-only disclaimers across pentest items. Real exploitation belongs in a contracted engagement-vault, not in a public skills catalog.

## Scenario

A red-team consultancy has signed an engagement with a mid-size SaaS provider. RoE: web-application + AD-internal scope, two-week window, off-peak active scanning, blue-team aware (purple-style, with a partial blackout period). Goal: reach a designated trophy file on a Tier-1 fileserver.

## Walkthrough

### Day 1 — Reconnaissance via `recon-agent`

The `recon-agent` sub-agent receives the scope: in-scope domains, IP ranges, exclusions (logout flows, password-reset endpoints during peak hours, third-party hosted assets).

Phases:

1. **Scope validation + RoE confirmation** — non-negotiable first step.
2. **Passive OSINT**: Certificate Transparency (crt.sh), Shodan, Censys, BinaryEdge, Wayback Machine, GitHub-search for org-mentions plus sensitive patterns. DNS records (MX, SPF, DKIM, DMARC, CAA).
3. **Active recon** within the agreed window: subdomain brute-force, port scanning at conservative rate-limits (T2-T3, not T5), tech-fingerprinting via `httpx` + `wappalyzer`, screenshot mapping via `gowitness`.
4. **Attack-surface synthesis**: deduplicated asset inventory, hypothesis candidates ("admin-panel auth without rate-limit evidence," "exposed Swagger spec," "outdated framework version with public CVEs in banner"), coverage-gaps documented.

Output: a scope-mapped surface report. Hypotheses route to `web-exploit-triage` and `ad-attacks` (the latter for any internal-AD recon once foothold exists; this engagement starts external).

### Day 2-3 — Web vulnerability triage via `web-exploit-triage`

Two hypothesis candidates surface for triage:

1. **JWT validation in the API**: a token endpoint that accepts both RS256 and HS256.
2. **OAuth flow**: redirect-URI registration appears to allow wildcards on a sub-domain.

For each, the `web-exploit-triage` skill walks the five-fact intake (what, scope, layer, auth-context, data/privilege-access), classifies the class (JWT / OAuth misconfig), and verifies exploitability at pattern-level.

Pattern-level verification, not weaponization: the triage produces evidence that the class applies, not a working exploit ready to fire at production. PoCs go to a lab clone or a client-provided sandbox.

### Day 4 — Payload patterns via `payload-crafter`

For verification probes, `payload-crafter` provides class-level payload shapes:

- JWT: pattern probes for `alg: none` acceptance, algorithm-confusion (RS256 token re-signed with HS256 using the public key).
- OAuth: redirect-URI bypass shapes (path-traversal, fragment-appending, URL-parser-discrepancy patterns).

These remain pattern-level. Production-targeted weaponized variants are not generated; they are constructed in the consultancy's internal engagement-vault from these patterns.

### Day 5 — Chain assembly via `exploit-chain`

Two findings, individually high but not critical, chain into a critical path:

- **Finding A**: OAuth redirect-URI wildcard allows redirection to attacker-controlled sub-domain.
- **Finding B**: Stored self-XSS in user-profile (low on its own, requires victim authentication).
- **Chain goal**: Account takeover of a privileged user.

The `exploit-chain` skill formalizes the chain at pattern level: each step (a) cites the underlying finding, (b) describes the input → output transition, and (c) lists disqualifiers (compensating controls that would break the chain). Feasibility-score is 2 of 3 — pattern-level verified in lab. CVSS-vector for the chain reflects pre-auth-reachable account-takeover (Critical).

### Day 6-7 — Foothold + post-exploitation via `post-exploit`

Foothold achieved as a privileged user account. `post-exploit` structures the next steps along MITRE ATT&CK:

- **Privilege Escalation (TA0004)**: the account is application-privileged but not OS-privileged; identify attack paths to OS-level. Pattern names only — sudo-misconfig, scheduled-task-writable, cron-path. No version-specific kernel exploit.
- **Credential Access (TA0006)**: extract scoped credentials from application configuration (without reusing them outside engagement scope). LSASS-class techniques considered if Windows endpoint becomes reachable; pattern-name only.
- **Discovery (TA0007)** + **Lateral Movement (TA0008)**: AD discovery via `ad-attacks` skill (BloodHound path-analysis), lateral movement via SSH key reuse if present.
- **Persistence (TA0003)**: deferred. The RoE limits persistence to a single time-bounded marker; cleanup is mandatory before delivery.
- **Defense Evasion (TA0005)** with defensive lens: each technique used is documented against the signal it would have left. Input for `purple-ops` later.

Throughout this phase, `c2-hygiene` provides the operational backbone: redirector architecture (HTTP-S + DNS), TLS/JA4-fingerprint discipline, traffic-shaping (sleep + jitter, working-hours-only), OPSEC checklist. No specific framework configurations or beacon-strings; pattern-level only.

### Day 8 — Cleanup + reporting via `pentest-reporter`

Before delivery:

- **Cleanup**: every persistence marker removed, every test account deleted, every credential rotated by the client, every artifact removed from temp paths. Cleanup-checklist documented for the report.
- **Pentest-reporter** assembles three deliverables: technical report (full reproduction steps, CVSS-scored findings), executive summary (risk-led, three-five page), remediation roadmap (effort × severity matrix).

Each finding follows the consistent template: title, ID, severity, CVSS v3.1 vector, CWE / OWASP mapping, affected endpoints, description, impact, reproduction, recommendation, references, status. Cross-references to `secure-coding`, `api-security`, and `ad-attacks` for remediation depth.

### Day 9 — Purple-team handoff via `purple-ops`

Post-engagement, the consultancy joins a session with the client's blue-team. `purple-ops` structures the debrief:

- **Detection-coverage matrix**: for each TTP used during the engagement, document whether detection fired, the time-to-detect, and the specific log-source / rule that should have caught it.
- **Gap categorization**: quick-win (rule writeable on existing data), data-gap (log-source absent), tooling-gap (SIEM-platform limitation), compensating-control (D3FEND defensive technique).
- **Re-test plan**: blue-team writes detection rules for identified gaps; red-team replays the same TTPs in a controlled re-test to confirm closure.

Output goes to `detection-engineer` for rule-writing and to `ir-runbook` for any playbook updates that the engagement surfaced.

## Final deliverables

- **Technical report** — for engineering, full reproduction details for confirmed findings.
- **Executive summary** — for management, risk-led with three program-level recommendations.
- **Remediation roadmap** — for product owners, prioritized matrix of effort × severity.
- **Attestation letter** — short confirmation for client's compliance use.
- **Detection-opportunity tabel** — for blue-team via purple-ops.
- **Cleanup-evidence package** — confirming every persistence-marker and test-account removed.

## What this demonstrates

- **Pattern-level discipline holds across an entire engagement**: at no point does a weaponized version-specific exploit become part of the deliverable or sit in the catalog.
- **Cross-skill flow is explicit**: each phase has a designated skill, with documented handoffs.
- **Detection-opportunity is part of the work, not an afterthought**: every offensive step records what the defender should have seen, feeding directly into purple-team improvement.
- **Cleanup is non-optional**: the catalog enforces this through `post-exploit` fase 7 (cleanup checklist) and `pentest-reporter` (cleanup-evidence package as a deliverable).
