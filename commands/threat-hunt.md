---
description: Hypothesis-driven threat-hunt session scaffolding — scope, hypothesis formulation, data-source binding, query handoff to siem-query, IOC input via ioc-hunter, and structured writeup with findings and handoffs to detection-engineer.
argument-hint: "[hypothesis] [--window=<N>d] [--scope=<service>] [--source=<ttp|ioc|anomaly>]"
---

# /threat-hunt

Start a structured, hypothesis-driven hunt session. Unlike alert triage, a hunt looks for what you do not yet detect. Output is either confirmed-incident (handoff to `ir-runbook`), or new-detection-rule input (handoff to `detection-engineer`), or documented no-find (input for the coverage baseline).

The command orchestrates; underlying skills (`siem-query`, `ioc-hunter`, `log-triage`) do the work.

## Steps

1. **Hypothesis formulation.** No testable hypothesis, no hunt. Three sources for hypotheses:
   - **TTP-driven**: based on an ATT&CK technique from recent threat intel (e.g. "we suspect T1003.001 LSASS dumping without detection").
   - **IOC-driven**: retro-check new high-confidence IOCs from `ioc-hunter` against our data.
   - **Anomaly-driven**: something unusual in metrics or logs, "gut-feel" hunt.
   Phrase it as a testable statement: "If TTP X happened, we see pattern Y in log source Z within window W". Not "something weird".

2. **Set scope.** Which service / cluster / segment? Which time window? Default `--window=30d`. With IOC input, prefer shorter (high confidence + recent IOC = small window). With TTP-driven or anomaly-driven, larger window.

3. **Data-source binding.** Which logs do I need to test the hypothesis? Per hypothesis:
   - LSASS dumping → Sysmon EID 10 (process access), EDR process events, Windows Security 4688/4624.
   - Cloud credential abuse → CloudTrail / Entra Sign-ins / Workspace audit.
   - Beacon-traffic anomaly → DNS, proxy, NetFlow, SSL fingerprint.
   - Persistence add → Sysmon EID 12/13/14 (registry), scheduled-task events.
   Verify the log source is active for the scope and that retention covers the window.

4. **Query building.** Call `siem-query` for query construction on the target platform. IOC input via `ioc-hunter`. Performance-aware (see `siem-query` phase 4) — a hunt query that runs 6 hours is operationally unusable.

5. **Triage of results.**
   - **Confirmed-suspect**: handoff to `ir-runbook` or `log-triage` for deeper analysis.
   - **Anomalous-explainable**: document for the baseline. Sometimes it provides input for `alert-tuning` (a rule that would fire too often) or `detection-engineer` (a rule that can catch this anomaly without noise).
   - **No hits**: hypothesis disproved within scope. Not the same as "we are safe" — document what you closed off.

6. **Verification-loop** for the hunt output. Layer 1 scope (all relevant log sources included?), assumptions (data completeness within the window?). Layer 2 (no invented ATT&CK T-IDs or IOC source claims, no "we don't see X so X isn't happening" — do not present absence-of-evidence as evidence-of-absence).

7. **Writeup and handoff.** Hunt report in the structure below. Handoff to the right skill or incident.

## Arguments

- `<hypothesis>` (positional, optional) — free-text hypothesis as a starting prompt. If absent, the command asks for the hypothesis on the first interaction.
- `--window=<N>d` — time window for the query (default 30d). Shorter for IOC-driven, longer for TTP-driven.
- `--scope=<service>` — bounded target (specific cluster, namespace, tenant). Default: everything with log coverage.
- `--source=<ttp|ioc|anomaly>` — hypothesis type, drives the phase-2 data-source choice.
- `--platform=<splunk|sentinel|defender|elastic>` — target SIEM for query building. Default: use the organization's primary SIEM.

Without arguments: asks first for the hypothesis, default window 30d, all scope.

## Output

A hunt report, shorter than a full pentest report, structured.

```
Threat-hunt session — <hypothesis title>
Date: YYYY-MM-DD | Hunter: <name>
Source type: <TTP-driven | IOC-driven | anomaly-driven>
Hypothesis: <testable statement>

Scope:
  Window:           <start → end>
  Services:         <list>
  Data sources:     <with retention confirmed>

Queries executed (handoff to siem-query):
  1. <query goal> — <platform query or summary>
     Result: <N events, runtime>
  2. ...

IOCs used (handoff to ioc-hunter):
  <hashes / IPs / domains> — confidence + source

Triage of results:
  Confirmed-suspect:        <events + handoff to ir-runbook>
  Anomalous-explainable:    <events + explanation>
  No hits:                  <hypothesis disproved within scope>

Conclusion:
  Hypothesis status:         <confirmed | disproved | partially>
  Implication for the stack: <which detection gap or which reassurance>

Handoffs:
  ir-runbook:         <if confirmed>
  detection-engineer: <if gap → new rule>
  alert-tuning:       <if anomaly is too FP-prone for a rule>
  ioc-hunter:         <new IOCs from a confirmed finding>
  policy-drafter:     <if a gap requires a policy addition>

Verification-loop:
  Verdict:          <pass | revise>
  Security verdict: <no red flags | red flag — ...>
```

A no-hits output is not a failure. A hunt that finds no evidence within scope produces a coverage claim ("for TTP X, in window W, on data Z, no traces"). That is usable for compliance evidence (NIS2 Art 21 effectiveness evaluation) and for the `purple-ops` coverage matrix.

## When NOT

- For writing a new detection rule → `detection-engineer`. This command produces hunt output that becomes rule input, not the rule itself.
- For SIEM query building without a hypothesis → `siem-query` directly.
- For incident investigation on an already-triggered alert → `log-triage` or `ir-runbook`.
- For red-team emulation aimed at detection validation → `purple-ops`.
- For IOC feed curation without a hunt context → `ioc-hunter`.
