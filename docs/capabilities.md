# Capability index

What the catalog actually does, indexed by capability rather than by skill name. Use this to answer "can it do X?" — find the row, follow it to the skill that delivers.

Skills are grouped into 21 capability domains. Each row shows a concrete capability and the primary skill or agent that primes Claude for it. Some capabilities span multiple skills via handoff (called out where relevant).

## Code-level security

| Capability | Skill |
|---|---|
| Trust-boundary identification + input validation patterns | `secure-coding` |
| SQL injection / command injection / SSTI / LFI pattern review at code level | `secure-coding` · `security-review` |
| AuthN / AuthZ implementation review (OAuth2, OIDC, sessions, MFA) | `secure-coding` · `api-security` |
| Secrets handling, key management, crypto-algorithm guidance (Argon2, AES-256, Ed25519) | `secure-coding` |
| Security-review workflow for a PR or feature (scope → automated → manual → triage → report) | `security-review` |
| 7-phase code-review with OWASP Top 10 + CWE Top 25 lens | `security-review` |
| Pre-merge security gate combining secrets / SAST / dep-vuln checks | `security-gate` (command) |

## Static & dynamic analysis tooling

| Capability | Skill |
|---|---|
| Multi-tool SAST orchestration (Semgrep, CodeQL, Bandit, Brakeman, gosec) | `sast-orchestrator` |
| Custom Semgrep rule authoring + ruleset prioritization | `sast-orchestrator` |
| Baseline-and-tune workflow for legacy SAST findings | `sast-orchestrator` |
| DAST workflow (ZAP baseline + active scan, Burp config) | `dast-workflow` |
| Auth flow scanning + scope-confined active scans | `dast-workflow` |

## Framework-specific application security

| Capability | Skill |
|---|---|
| Django settings + ORM + CSRF + admin hardening | `django-security` |
| Spring Boot SecurityFilterChain + actuator lockdown + JWT validation + Spring4Shell-class checks | `spring-security` |
| Rails Brakeman triage + mass-assignment + ActiveRecord SQLi + Devise hardening | `rails-security` |
| Next.js middleware auth-bypass (CVE-2025-29927) + Server Actions + auth.js + remotePatterns SSRF | `nextjs-security` |

## API security

| Capability | Skill |
|---|---|
| OWASP API Security Top 10 2023 review (BOLA, BOPLA, broken auth, etc.) | `api-security` |
| OAuth 2.0 / OIDC misconfig audit (PKCE, redirect_uri, scope, state) | `api-security` |
| JWT validation review (alg-confusion, kid-injection, weak HMAC, expiry) | `api-security` |
| GraphQL hardening (introspection off, depth limit, complexity scoring, persisted queries) | `api-security` |
| SSRF defense + cloud metadata blocking | `api-security` |

## Infrastructure as code & cloud security

| Capability | Skill |
|---|---|
| Terraform / CloudFormation / Pulumi / Ansible IaC review | `iac-security` |
| Multi-tool IaC scanning (Checkov, tfsec, cfn-nag, KICS) | `iac-security` |
| OWASP IaC Top 10 (IaC-1 hardcoded secrets, IaC-3 logging gaps, IaC-7 IAM mis-config, etc.) | `iac-security` |
| Drift detection + policy-as-code (OPA, Sentinel) | `iac-security` |

## Container & Kubernetes security

| Capability | Skill |
|---|---|
| Distroless / chiseled / minimal base-image migration | `container-hardening` |
| Multi-stage Dockerfile + non-root + read-only rootfs hardening | `container-hardening` |
| Trivy / Grype / Syft image-scan integration + SBOM generation | `container-hardening` |
| Kubernetes RBAC review + Pod Security Standards (PSS) baseline/restricted | `k8s-security` |
| NetworkPolicy default-deny + Cilium L7 / Calico patterns | `k8s-security` |
| Secret management (sealed-secrets, External Secrets Operator, SPIRE/SPIFFE) | `k8s-security` |
| Runtime detection via Falco / Tetragon | `k8s-security` |

## CI/CD & supply chain

| Capability | Skill |
|---|---|
| GitHub Actions trust-model (`pull_request_target` vs `pull_request`) audit | `cicd-hardening` |
| SHA-pinning Actions + expression-injection hardening | `cicd-hardening` |
| OIDC federation: GitHub → AWS / GCP / Azure (no static keys) | `cicd-hardening` |
| Permissions minimization on `GITHUB_TOKEN` | `cicd-hardening` |
| Self-hosted runner isolation patterns | `cicd-hardening` |
| SBOM generation (CycloneDX / SPDX via syft, cdxgen) | `supply-chain` |
| SLSA L3 provenance via `slsa-github-generator` | `supply-chain` |
| sigstore / cosign keyless signing + Rekor verification | `supply-chain` |
| Dependency-confusion + typosquat defense (scoped packages, mirror registries) | `supply-chain` |
| Consumer-side admission control (Kyverno, sigstore policy-controller) | `supply-chain` |

## Vulnerability management

| Capability | Skill |
|---|---|
| CVE triage with KEV / EPSS / reachability / exposure / controls / impact decision tree | `cve-triage` |
| Reachability analysis at function/method level | `cve-triage` |
| Compensating-control documentation + risk-acceptance routing | `cve-triage` |
| Secret discovery across code, history, logs, infrastructure | `secrets-scanner` |
| Multi-tool secret scanning (gitleaks, trufflehog, semgrep, GitHub native) | `secrets-scanner` |
| Provider-specific regex catalog (AWS AKIA, GitHub `ghp_`, Stripe `sk_live_`, Anthropic `sk-ant-api03-`, etc.) | `secrets-scanner` |
| Rotate-first incident response on confirmed leak | `secrets-scanner` |

## Threat modeling

| Capability | Skill |
|---|---|
| Shostack 4-Questions framework (what / what can go wrong / what to do / good job?) | `threat-modeler` (agent) |
| STRIDE per-element threat enumeration | `threat-modeler` (agent) |
| LINDDUN privacy-threat modeling | `threat-modeler` (agent) |
| DFD-based scope mapping + trust boundaries | `threat-modeler` (agent) |
| Mitigation ranking (avoid / mitigate / transfer / accept) | `threat-modeler` (agent) |

## Reconnaissance & external attack surface

| Capability | Skill |
|---|---|
| Scope-validated passive OSINT (crt.sh, Shodan, Censys, chaos, VirusTotal passive DNS) | `recon-agent` (agent) |
| Active recon (subfinder, naabu, nmap, httpx, wappalyzer-cli) within agreed time window | `recon-agent` (agent) |
| RoE / scope-discipline check before any technique | `recon-agent` (agent) |
| Subdomain takeover candidate identification | `recon-agent` (agent) |
| Attack-surface inventory + hypothesis-formulation handoff to triage | `recon-agent` (agent) |

## Web exploit triage & exploit chaining

| Capability | Skill |
|---|---|
| JWT alg-confusion / `none` alg / kid-injection / weak HMAC class triage | `web-exploit-triage` |
| Deserialization triage (Java ObjectInputStream, Python pickle, PHP unserialize, Ruby Marshal, .NET, Node) | `web-exploit-triage` |
| Prototype pollution detection at pattern level | `web-exploit-triage` |
| OAuth 2.0 misconfig triage (redirect URI bypass, missing PKCE/state) | `web-exploit-triage` |
| DOM XSS sink-source mapping | `web-exploit-triage` |
| Pattern-level XSS payload library per render context (HTML body, attribute, JS string, URL) | `payload-crafter` |
| SSTI engine fingerprint (Jinja2, Twig, JSP, ERB, Thymeleaf) | `payload-crafter` |
| LFI / path-traversal shapes (URL-encoding, double-encoding, PHP wrappers, Unicode bypass) | `payload-crafter` |
| SSRF protocol shapes (cloud metadata, gopher, dict, ldap, DNS-rebinding) | `payload-crafter` |
| WAF-bypass encoding patterns at syntax level | `payload-crafter` |
| Chain assembly: combining mediums into highs (Open Redirect + OAuth = ATO; SSRF + metadata = creds) | `exploit-chain` |
| Chain-aware CVSS-vector scoring + MITRE ATT&CK mapping | `exploit-chain` |
| Feasibility / stealth / impact assessment with disqualifier discipline | `exploit-chain` |

## Active Directory red-team

| Capability | Skill |
|---|---|
| BloodHound path analysis + edge-type triage (DACL, delegation, DCSync) | `ad-attacks` |
| Kerberoasting (T1558.003) + AS-REP roasting (T1558.004) | `ad-attacks` |
| Silver / Golden / Diamond ticket class identification | `ad-attacks` |
| Delegation flaws (unconstrained / constrained / RBCD) | `ad-attacks` |
| AD CS ESC1–ESC10+ pattern-level mapping (Certify / Certipy / PSPKIAudit) | `ad-attacks` |
| Tier-0 hygiene as the structural defense (Authentication Policies + Silos, PAW, gMSA) | `ad-attacks` |

## C2, OPSEC & post-exploitation

| Capability | Skill |
|---|---|
| Redirector architecture (HTTP/HTTPS/DNS/DoH) | `c2-hygiene` |
| Beacon traffic-shaping (sleep + jitter + working-hours scheduling + channel rotation) | `c2-hygiene` |
| TLS-fingerprint discipline (JA3/JA4) + domain aging | `c2-hygiene` |
| Operator-side OPSEC checklist + cleanup-readiness | `c2-hygiene` |
| Phishing-sim with RoE + pretext ethics + AVG monitoring context (NL/EU) | `phishing-sim` |
| Post-exploitation methodology mapped to all relevant ATT&CK tactics (TA0003–TA0008) | `post-exploit` |
| Privilege escalation patterns per platform (Linux / Windows / cloud) | `post-exploit` |
| Credential access (LSASS, SAM, DPAPI, Kerberoasting, cloud-metadata creds) | `post-exploit` |
| Lateral movement (SSH-key reuse, Pass-the-Hash, WMI/PsExec class, cloud assumed-role chain) | `post-exploit` |
| Persistence patterns + cleanup discipline | `post-exploit` |
| Defense evasion at pattern level (LotL, AMSI/ETW class, process injection T1055) | `post-exploit` |

## Pentest reporting

| Capability | Skill |
|---|---|
| Three-audience report architecture (technical / exec summary / remediation roadmap) | `pentest-reporter` |
| CVSS v3.1 + v4.0 vector building | `pentest-reporter` |
| Reproducible-PoC discipline + redaction | `pentest-reporter` |
| Retest section + sign-off attestation | `pentest-reporter` |
| MITRE ATT&CK mapping per finding | `pentest-reporter` |

## Detection engineering & SOC

| Capability | Skill |
|---|---|
| Sigma rule authoring + sigma-cli translation to SPL/KQL/EQL | `detection-engineer` (agent) |
| Test-harness validation (atomic-red-team, MITRE Caldera) | `detection-engineer` (agent) |
| Baseline FP-rate + per-rule deployment metadata | `detection-engineer` (agent) |
| ATT&CK coverage mapping + DeTT&CT integration (NL Rabobank-CDC) | `detection-engineer` (agent) |
| Identity-log triage per provider (AWS CloudTrail, Entra ID, Google Workspace, Okta) | `log-triage` |
| Cross-provider correlation patterns (impossible travel + GuardDuty match within window) | `log-triage` |
| MFA-fatigue / illicit-consent / token-replay detection | `log-triage` |
| Splunk SPL / Sentinel KQL / Elastic EQL query construction with cross-translation | `siem-query` |
| Performance tuning (data models, summary indexes, CCS) | `siem-query` |
| IOC feed curation (MISP, OpenCTI, abuse.ch, ENISA, CISA AIS) | `ioc-hunter` |
| Confidence scoring (TLP, source reputation, age, sightings) | `ioc-hunter` |
| Retro-hunt over N-day window + IOC lifecycle (active / aging / retired / re-promote) | `ioc-hunter` |
| Sandbox-output triage (CAPE, ANY.RUN, Joe Sandbox, Hybrid-Analysis) | `malware-triage` |
| YARA rule scaffolding at pattern level + TLP-tagged sharing | `malware-triage` |
| TTP extraction + ATT&CK mapping from sandbox output | `malware-triage` |
| Volatility 3 memory analysis (pslist, malfind, netscan, registry-from-memory) | `forensics-assist` |
| Plaso / log2timeline timeline reconstruction | `forensics-assist` |
| Per-OS artifact inventory (MFT, registry hives, Prefetch / Linux journald / macOS unified-logs) | `forensics-assist` |
| Volume triage + FP-pattern identification + suppression discipline | `alert-tuning` |
| Rule lifecycle (retire / refresh / promote / demote / retain) | `alert-tuning` |

## Incident response

| Capability | Skill |
|---|---|
| NIST SP 800-61 Rev. 2 phase model (Preparation → Detection → Containment → Eradication → Recovery → Lessons) | `ir-runbook` |
| Per-scenario playbooks (ransomware, BEC, data exfil, credential compromise, cloud) | `ir-runbook` |
| Regulatory clock tracking (NIS2 24h/72h/1m, AVG breach 72h, DORA 4h/72h/1m) | `ir-runbook` |
| Post-incident review (PIR) with timeline + lessons + threat-intel sharing | `ir-runbook` |

## Threat hunting & purple team

| Capability | Skill |
|---|---|
| Hypothesis-driven hunt session scaffolding | `threat-hunt` (command) |
| Three hypothesis sources (TTP-driven, IOC-driven, anomaly-driven) | `threat-hunt` (command) |
| ATT&CK-mapped purple-team cycles with measured coverage gaps | `purple-ops` |
| Detection-validation via atomic-red-team / Caldera replay | `purple-ops` |
| D3FEND defensive countermapping for blind spots | `purple-ops` |

## GRC: ISO / SOC

| Capability | Skill |
|---|---|
| ISO 27001:2022 ISMS clauses 4–10 + Annex A 93 controls Stage 1/Stage 2 audit prep | `iso27001` |
| Statement of Applicability (SoA) authoring with auditor-defensible exclusion rationale | `iso27001` |
| ISO 27001 ↔ NIS2 / NIST CSF / SOC 2 cross-walks | `iso27001` |
| SOC 2 Type II prep with AICPA Trust Services Criteria CC1–CC9 | `soc2` |
| Type I vs Type II strategy + Complementary User Entity Controls (CUECs) | `soc2` |
| Evidence-collection cadence per control (daily/weekly/monthly/quarterly) | `audit-evidence` |

## GRC: NL/EU regulatory

| Capability | Skill |
|---|---|
| EU NIS2 Directive (2022/2555) scope determination (essential vs important across 18 sectors) | `nis2` |
| 10 baseline measures (Art 21) + governance (Art 20) + incident reporting (Art 23 24h/72h/1m) | `nis2` |
| Cyberbeveiligingswet (NL implementation) + RDI / CSIRT-NL routing | `nis2` |
| EU DORA Regulation (2022/2554) five pillars (ICT risk, incidents, resilience testing, third-party, info-sharing) | `dora` |
| TLPT regime (Art 26-27) + TIBER-NL trajectory under DNB | `dora` |
| Register of Information (Art 28(3)) for ICT third-party contracts (DNB/AFM filing) | `dora` |
| AVG / GDPR DPIA / GEB workflow against Art 35 (trigger check + AP list + WP 248) | `gdpr-pia` |
| Risk analysis from the data-subject perspective (loss of confidentiality / integrity / availability) | `gdpr-pia` |
| Prior consultation procedure with the Autoriteit Persoonsgegevens (Art 36) | `gdpr-pia` |

## GRC: risk + policy + vendor + audit

| Capability | Skill |
|---|---|
| Risk register methodology (ISO 31000, ISO 27005, NIST 800-30, FAIR) | `risk-register` |
| Qualitative + quantitative analysis with risk-appetite + tolerance | `risk-register` |
| Policy stack (Tier-1 InfoSec policy, Tier-2 topic policies, Tier-3 procedures) | `policy-drafter` |
| Six-section policy structure (Purpose / Scope / Statement / Roles / Compliance / Review) | `policy-drafter` |
| Per-policy clause libraries (AUP, IRP, BCP, Vendor Mgmt, Crypto, Remote Work) | `policy-drafter` |
| Vendor tiering + framework selection (CAIQ, SIG-Lite/Core, VSA, NIST 800-171) | `vendor-questionnaire` |
| Evidence reuse across attestations (SOC 2, ISO 27001, FedRAMP) + cross-walks | `vendor-questionnaire` |
| Continuous vendor monitoring (BitSight, SecurityScorecard) + DORA Art 28 register | `vendor-questionnaire` |
| Five evidence types (inspection, observation, inquiry, re-performance, automated) | `audit-evidence` |
| Period tagging + chain-of-custody + WORM-storage discipline | `audit-evidence` |

## Verification & quality

| Capability | Skill |
|---|---|
| Universal Layer-1 self-review (scope, assumptions, gaps, adversarial reader, failure modes, consistency) | `verification-loop` |
| Removable Layer-2 security red-flag pass (CVE/CVSS verify, payload-level, source quality, NL/EU-claim verify) | `verification-loop` |

---

## Coverage

This index lists ~150 distinct capabilities across 21 domains and the 47 catalog items. It is intentionally not exhaustive — many skills carry sub-capabilities mentioned only in their phase descriptions or output blocks. When in doubt, read the underlying `SKILL.md`.

**What this catalog explicitly does NOT cover** (by design):

- Court-grade forensic chain of custody → out of scope; specialized forensics teams do that work. `forensics-assist` produces audit/IR-grade evidence only.
- Version-specific weaponized exploits → never; pattern-level discipline is the rule across every offensive item. PoCs against production targets require an explicit RoE clause.
- Legal advice → never; GRC items summarize frameworks and cite primary sources. Final qualification (entity classification, sanctions risk, contractual interpretation) requires a qualified jurist or DPO.
- Reverse engineering at debugger / IDA Pro / Ghidra depth → out of scope of `malware-triage`, which targets sandbox-driven triage only.
- US-specific regulatory frameworks (FedRAMP, FISMA, HIPAA) → not the focus; mentions exist where relevant for cross-walking, but NL/EU is the primary anchor.
