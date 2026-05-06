# Example 4 — Ransomware incident response

**Profile**: `blue` (with handoffs to `core` and `grc`). **Items chained**: `ir-runbook` → `forensics-assist` → `malware-triage` → `ioc-hunter` → `detection-engineer` → `purple-ops`. Regulatory-rapportage chains to `nis2` / `gdpr-pia` / `dora` depending on scope.

> **Real-incident note**: this walkthrough is structural. During an actual incident, runbook adherence comes first; reflective improvement comes after. The skills cited here support rapid decision-making during the event and structured learning afterward — they do not replace your incident-commander's judgment.

## Scenario

A SaaS provider's monitoring fires: anomalous SMB traffic from a fileserver, followed by file-extension-rename patterns consistent with ransomware. The on-call SOC analyst pages the incident commander.

## Walkthrough

### Hour 0-1 — Detection + initial scoping via `ir-runbook`

The IR runbook's NIST SP 800-61 phases are already loaded. The on-call invokes the ransomware playbook.

**Phase 1 — Preparation** (already in place pre-incident): IR team roster on-call, communication channels (out-of-band Signal group), regulatory contacts paraat (CSIRT-NL, AP, sector-toezichthouder), tool-readiness for SIEM + EDR.

**Phase 2 — Detection + Analysis**:
- Severity-classification: SEV1 (existential, prod-critical fileserver compromised, mass file-encryption pattern).
- Initial scoping: which systems are affected (fileserver-01), which user accounts triggered the SMB-fan-out, which data-classifications are at risk (mix of PII + customer documents).
- Klok start: regulatory-clocks begin now.
  - AVG datalek: 72 hours from "kennisgenomen".
  - NIS2 (if essential or important entity): 24h early-warning, 72h notification, 1-month final report to CSIRT-NL + competent authority (RDI for most sectors).
  - DORA (if financial entity in EU): 4h initial classification, 72h intermediate, 1-month final to DNB / AFM.
- Communications-trigger: incident commander wakes the technical lead, comms-lead, legal/DPO-liaison, and exec-bridge. Out-of-band channel active.
- Evidence preservation: snapshot logs, memory, disk-images of fileserver-01 BEFORE containment. Containment can destroy evidence.

### Hour 1-3 — Containment + forensic capture via `ir-runbook` + `forensics-assist`

**Short-term containment**:
- Network-isolate fileserver-01 via EDR network-isolation (preserves memory; less destructive than power-off).
- Disable the user account whose credentials are likely compromised.
- Block-rules for any C2-IOCs identified in EDR alerts.
- Stop active ransomware processes — surgical, not host-wide kill.

**Long-term containment** (planned for the next 24-48 hours):
- Patch + reconfigure the entry-vector once identified.
- Tighten network segmentation around remaining fileservers.
- Validate backup-isolation: offline copies must be unreachable to the threat-actor.

**Forensics in parallel** via `forensics-assist`:
- Memory dump from fileserver-01 (WinPMEM if Windows, AVML if Linux) before containment locks-down further.
- Disk-image with hash-verification (pre and post; matching hashes confirm bit-identity).
- Chain-of-custody log: who collected, when, how transferred, who accessed.
- Volatility 3 plugins for process-state, network-connections, dlllist, malfind, hashdump.

### Hour 3-6 — Sample analysis via `malware-triage`

A suspicious binary is pulled from the encrypted fileserver. `malware-triage`:

1. **Hash-first check**: SHA-256 against VirusTotal, MalwareBazaar, internal historie. Possibly already known.
2. **Static-analysis pass**: file-type, strings (with `floss` for stack-encoded), PE imports, code-signing-status, YARA pre-match against community rule-sets.
3. **Sandbox-detonation**: CAPE Sandbox (on-prem default for confidential samples), avoiding public-VirusTotal upload because the sample may include customer-data fragments.
4. **Dynamic observations**: process-tree, filesystem-changes (particularly write-paths and rename-patterns), registry-changes, network-egress (DNS-queries, C2-hosts, JA3 / JA4 fingerprints), anti-VM detection.
5. **Family-classification**: a known ransomware-family or a variant. Attribution from a vendor-source if available.
6. **YARA-rule scaffolding** at pattern-level: family-detector for future scans across other potentially-affected systems. Tested against benign-binary corpus to control false-positives.
7. **TTP-mapping** to MITRE ATT&CK: T1486 (Data Encrypted for Impact), T1490 (Inhibit System Recovery via shadow-copy deletion), T1083 (File and Directory Discovery), T1059.001 (PowerShell), etc.

Output: family-classification, IOC-list, YARA-rule, ATT&CK-mapping. IOCs flow into `ioc-hunter`.

### Hour 4-8 — Hunt for spread via `ioc-hunter` + `siem-query` + `log-triage`

`ioc-hunter` ingests the malware-extracted IOCs (hashes, domains, IPs, mutexes, JA3 / JA4 fingerprints), assigns confidence-scores (high — directly observed in this incident), and pushes them into the SIEM lookup-tables and EDR.

`siem-query` retrieves cross-system context: have these IOCs been seen elsewhere in the last 30 days? Spread to other endpoints? Was the initial-access vector a known-malicious IP that lit up earlier without escalation?

`log-triage` works the identity-providers in parallel: did the compromised account show anomalies in Azure AD / Okta sign-ins (impossible-travel, MFA-fatigue, illicit-consent-grants)? Cross-provider correlation surfaces if the same IP / token-trail appears in AWS CloudTrail or Google Workspace audit-logs. Account is disabled across all federated IdPs.

Spread-evaluation result: the IOCs surface in three other endpoints, each at varying stages of compromise. All four are isolated.

### Hour 8-24 — Eradication + recovery via `ir-runbook`

**Eradication**:
- Identify and remove every persistence marker (services, scheduled tasks, registry run-keys, WMI subscriptions, BITS jobs, scheduled-PowerShell-jobs).
- Reset all credentials that were on or used by compromised systems. Plus the credentials of anyone who logged into a compromised system in the past 30 days (precaution).
- Rebuild compromised endpoints from clean images; do not rely on best-effort cleanup.

**Recovery**:
- Phased restore from offline backups, validated for integrity (backup-files predate the encryption-event by enough margin).
- Heightened monitoring for the recovery period: anomaly-detection at higher sensitivity, dedicated SOC-eyes-on.
- Validation criteria pre-defined: detection-rules must show clean for N days before declaring recovery complete.

### Hour 24-72 — Regulatory reporting

Per the entity classification:

- **AVG datalek (Art 33)**: notification to AP within 72 hours of "kennisgenomen", with details from `ir-runbook` log + `forensics-assist` evidence on data-impact. Cross-references `gdpr-pia` for the DPIA-style risk-assessment to determine if Art 34 (notification to data-subjects) triggers.
- **NIS2 (Art 23)**: 24-hour early-warning already submitted at hour 12 (within window), 72-hour notification with severity + impact + IoC summary on track. Final report due in 1 month with root-cause analysis.
- **DORA (if applicable)**: more aggressive timeline — 4-hour classification submitted at hour 6.

All three regulatory streams are tracked by a single compliance-lead per entity, against a clock-table that started at detection-time.

### Day 5-14 — Post-incident review via `ir-runbook` + `purple-ops`

`ir-runbook` PIR (Post-Incident Review): timeline-reconstruction, what-went-well, what-didn't, action-items with owners and deadlines, runbook updates.

`purple-ops` cycle for detection-improvement:
- Each TTP observed during the incident → does our detection currently fire? If yes, MTTD is acceptable. If no, why not?
- Coverage-gaps → handoff to `detection-engineer` for rule-writing (Sigma-source + transpilation to Splunk SPL / Sentinel KQL).
- Re-test in a controlled atomic-red-team replay after rules are deployed. Confirm closure.

### Continuous — Detection rules written via `detection-engineer`

For each gap surfaced by `purple-ops`, `detection-engineer` produces:
- Sigma rule (canonical source).
- Transpiled SPL + KQL for the org's actual SIEM stacks.
- Test-harness validation: positive (atomic-red-team replay fires the rule) + negative (rule does not trigger on baseline-data above acceptable FP-rate).
- Deployment-notes: which log-source must be enabled (Sysmon-config-X, EDR-policy-Y).

## Final deliverables

- **Incident log** with timeline, SEV, scope, actions, owners, regulatory-clock states.
- **Forensics evidence package** (audit-grade; chain-of-custody documented for any potential follow-up forensics-grade work).
- **YARA rules** for the malware-family.
- **IOC additions** to the SIEM and EDR.
- **Regulatory submissions**: AVG datalek to AP, NIS2 reports to CSIRT-NL + RDI, DORA filings to DNB / AFM where applicable.
- **PIR report** with action-items.
- **New detection rules** plus closure-evidence via purple-ops re-test.
- **Runbook updates** for the lessons-learned items.

## What this demonstrates

- **Phase-discipline under pressure**: the catalog provides structure precisely when the SOC analyst is least able to invent it. NIST 800-61 phases as the backbone, with regulatory-clocks starting at detection.
- **Multi-regulator-aware**: NL/EU regulatory regimes (AVG, NIS2, DORA) coexist, and the catalog tracks all three timelines from a single source.
- **Forensics-grade vs audit-grade boundary**: `forensics-assist` is explicit that audit-grade evidence is a starting point; rechtbank-grade chain-of-custody requires specialized teams. Honest about what the skill provides.
- **Detection feedback-loop**: `malware-triage` → `ioc-hunter` → `detection-engineer` → `purple-ops` chain ensures that an incident becomes detection-coverage, not just a war-story.
- **No legal advice**: every regulatory-touching item references primary sources (EUR-Lex, AP guidance, DNB / AFM publications) and defers final classification to the DPO and legal counsel.
