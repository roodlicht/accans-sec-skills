---
name: purple-ops
description: Purple-team operations — gestructureerde detection-validatie tegen MITRE ATT&CK door planned-emulatie, gemeten coverage-gaps, gemeenschappelijke red+blue-debrief en tracked closure via D3FEND-mapping. Bridge tussen pentest-bundel en blue-bundel.
---

# Purple Team Ops

> **Bridge-skill**: dit is een blue-én-pentest-categorie. Het echte werk is samenwerking — red simuleert TTP, blue probeert te detecteren, beide leren tegelijk. Geen surprise-engagements ("zien of we ze pakken zonder waarschuwing"); dat is red-team. Purple is gepland, gemeten, en gericht op gat-sluiting.

## Wanneer gebruiken

Een SOC kan eindeloze rules schrijven zonder ooit te weten of ze de juiste TTPs dekken. Een red-team kan eindeloos engagements doen zonder dat de defensieve kant er meer van leert dan "we zijn weer gepakt". Purple-ops is de discipline tussen beide: ATT&CK-mapped, herhaalbaar, gemeten.

Activeert bij:

- Een vraag als "zet een purple-team-cyclus op", "welke TTPs zijn we niet detecteren", "ATT&CK-coverage-meting", "valideer detection-rule X tegen real-emulatie", "post-pentest-debrief met SOC".
- Een handoff vanuit `pentest-reporter` (post-engagement-feedback richt naar detection-gap-aanpak), `detection-engineer` (rule-validatie), `alert-tuning` (coverage-gat geïdentificeerd na rule-retirement).
- Periodieke (kwartaal-half-jaar) maturity-meting van detection-stack.
- Compliance-context (NIS2 Art 21 effectiviteits-evaluatie, DORA Art 25 testing) — purple-cyclus levert evidence van "we testen onze controls".

### Wanneer NIET (handoff)

- Surprise-red-team-engagement zonder blue-vooraf-info → pentest-skills (`recon-agent`, `c2-hygiene`, `post-exploit`, `pentest-reporter`).
- Detection-rule schrijven zelf → `detection-engineer`.
- Alert-tuning op bestaande rules → `alert-tuning`.
- Threat-hunt op ontdekt-onbekend → `threat-hunt` (command).
- IOC-feed-werk → `ioc-hunter`.
- Forensics na incident → `forensics-assist`.
- IR zelf → `ir-runbook`.

## Aanpak

Zes fases als cyclus, niet eenmalig project. Elke run dekt een sub-set van ATT&CK; over kwartalen werk je naar bredere coverage.

### 1. Plan: scope, threat-actor-emulation, succes-criteria

- **Threat-actor-keuze**: emuleer een specifieke groep relevant voor jouw sector (FIN7 voor financial, APT28 voor geopolitical-target, RANSOM-cluster voor brede-impact). MITRE Adversary Emulation Plans als template.
- **TTP-subset**: niet hele kill-chain in elke cyclus. Focus op één tactic of een chain van 2-3 tactics. Bijvoorbeeld kwartaal-1 Initial Access + Execution; kwartaal-2 Persistence + Privilege Escalation.
- **Doelsystemen** in scope: lab? specifieke staging-omgeving? bewust-gekozen-productie-segment? RoE-akkoord voor elk.
- **Detection-coverage-doel**: welke ATT&CK-techniques claim je gedekt te hebben? DeTT&CT (NL Rabobank-CDC) of ATT&CK Navigator als baseline. Dit zijn de claims die je gaat testen.
- **Succes-criteria**: niet "we worden gepakt" — meetbaar: "techniek T1003.001 wordt binnen 5 minuten gedetecteerd door rule X met TP-confidence high; rule firet niet bij baseline-traffic". Kwalitatieve én kwantitatieve criteria.
- **Communicatie**: blue-team weet dát er een cyclus loopt en welke window. Niet welke specifieke TTPs op welk moment — die fingerprint moet blue zelf vinden.

### 2. Execute: emulation met atomic-red-team / Caldera / handmatig

- **atomic-red-team** (Red Canary, MIT) — atomic-tests per ATT&CK-techniek. Klein, scriptable, replay-able. Default-keuze voor unit-style-emulation.
  ```bash
  # Voorbeeld atomic-test voor T1003.001 LSASS-dumping
  Invoke-AtomicTest T1003.001
  ```
- **MITRE Caldera** — full scenario-emulation met agent op endpoints. Past bij multi-step-chains.
- **Hand-driven emulation** voor TTPs zonder atomic-equivalent of voor doelgerichte-target-omgeving. Documenteer wat je deed precies.
- **Replay-discipline**: elke uitvoering documenteren (timestamp, target, parameters, resultaat). Output gaat naar evidence-store.
- **Cleanup-discipline**: atomic-tests hebben cleanup-commands; voer altijd na-run. Caldera-agents na cyclus verwijderen. Persistence niet achterlaten.

### 3. Measure: detection vs blind, MTTD, false-positive-context

Per uitgevoerde TTP:

- **Detection-status**: gedetecteerd (welke rule, hoe snel) / partial (rule firet maar te laag-severity) / blind (geen alert).
- **MTTD (Mean Time To Detect)** voor gedekte TTPs: tijd tussen execution en alert-generation. Doel: korter dan attacker-dwell-time-in-real-incident.
- **MTTR (Mean Time To Respond)** voor gedekte TTPs: tijd tussen alert en blue-team-actie. Onderdeel van capability-meting.
- **False-positive-impact** in dezelfde periode: rule die nu firet, hoe vaak op baseline? Te veel FPs maakt rule operationeel onbruikbaar zelfs als hij correct firet op emulatie.
- **Coverage-shift**: hoeveel % van geclaimde-coverage is gevalideerd? Nieuwe gaps?

Output: per-TTP-rij in coverage-matrix met "gevalideerd-detect" / "gevalideerd-blind" / "niet-getest".

### 4. Close gaps: detection-engineering-cycle

Per blind-spot een actie:

- **Quick-win**: bestaande SIEM-data laat detection toe maar er is geen rule. Handoff naar `detection-engineer` voor Sigma/SPL/KQL-rule.
- **Data-gap**: SIEM heeft niet de juiste log-source. Handoff naar log-pipeline-team voor enablement (Sysmon-config, EDR-policy, audit-policy-uitbreiding).
- **Tooling-gap**: rule-bouw mogelijk maar SIEM-platform-limitatie. Roadmap-input voor tooling-evolutie.
- **Compensating-control**: detection blijft moeilijk, maar D3FEND-defensive technique (preventie of mitigatie) sluit het gat. Bijvoorbeeld: T1003.001 LSASS-dump moeilijk-detecteerbaar bij elke variant; LSASS Credential Guard maakt het irrelevant.

D3FEND-mapping is hier kern: per ATT&CK-technique de defensive techniques die hem mitigeren. Niet elke gap moet via detection — sommige via prevention.

### 5. Re-test en track closure

Een gat is pas dicht als je het opnieuw test en gevalideerd-detect ziet.

- **Re-test-cyclus**: na detection-rule-deployment, opnieuw atomic-test draaien. Bevestiging: rule firet, FP-rate acceptabel, MTTD binnen target.
- **Closure-tracking** in coverage-matrix: per TTP de status updateren (validated → re-validated met datum).
- **Regression-check** periodiek: eerder-gevalideerde detections nog steeds firende? Schema-drift in log-sources, EDR-policy-wijzigingen, of rule-tuning kunnen retroactief detection-coverage breken.

### 6. Verification-loop en program-niveau-metrics

Laag 1: scope (subset TTPs gepland gedekt? alle blind-spots geadresseerd of expliciet geaccepteerd?), aannames (atomic-tests representeren werkelijke aanvaller-gedrag, geen lab-only-shortcuts?), gaps (D3FEND-counters meegenomen of alleen detection-pad?). Laag 2: ATT&CK-T-IDs correct, atomic-test-IDs werkelijk in atomic-red-team-repo, MTTD/MTTR-cijfers uit SIEM-source-of-truth, coverage-claims onderbouwd via DeTT&CT-output of ATT&CK-Navigator-export.

**Program-niveau-metrics over kwartalen**:

- Coverage-trend (ATT&CK-techniques validated-detect / total-relevant).
- MTTD-trend per severity-class.
- New-blind-spots-rate (regressies).
- Closure-time per blind-spot (tijd van identificatie tot re-validation).

## Output

```
Purple-team cyclus rapport — <kwartaal/cyclus-naam>
Periode: <start → eind>
Threat-actor-emulation: <APT/group + bron-emulation-plan>
Scope-tactics: <T-A##: ... + T-A##: ...>

Plan:
  TTPs in scope:    <T-IDs lijst>
  Doelsystemen:     <lab/staging/scope-segmenten>
  Succes-criteria:  <per TTP: detect-window + FP-acceptance>

Execute:
  Per TTP:
    Test-method:     <atomic-red-team / Caldera / handmatig>
    Test-ID:         <T-id ref>
    Run-timestamp:   <UTC>
    Target:          <system>
    Cleanup-status:  <ok>

Measure (coverage-matrix):
  TTP | Detected? | Rule-id | MTTD | FP-context | Verdict (validated/blind/partial)

Close gaps:
  Per blind-spot:
    Type:           <quick-win / data-gap / tooling-gap / compensating>
    Actie:          <handoff naar detection-engineer / pipeline-team / D3FEND-control>
    Eigenaar:       <naam>
    Deadline:       <datum>

Re-test:
  Per geslote-gap:
    Re-test datum:  <...>
    Resultaat:      <validated-detect | partial | nog open>

Program-niveau metrics:
  Coverage-trend:    <% validated-detect>
  MTTD-trend:        <minuten>
  Open-gaps:         N
  Closed-deze-cyclus: N

Handoffs:
  detection-engineer: <nieuwe regels / refinements>
  alert-tuning:       <FP-tuning op net-gevalideerde regels>
  ir-runbook:         <playbook-update voor ATT&CK-context>
  policy-drafter:     <indien D3FEND-control policy-eis raakt>

Verification-loop: ...
```

## Referenties

- **MITRE ATT&CK** — [https://attack.mitre.org/](https://attack.mitre.org/). Common framework.
- **MITRE D3FEND** — [https://d3fend.mitre.org/](https://d3fend.mitre.org/). Defensive-technique-mapping.
- **MITRE ATT&CK Navigator** — [https://mitre-attack.github.io/attack-navigator/](https://mitre-attack.github.io/attack-navigator/). Coverage-visualisatie.
- **MITRE Adversary Emulation Plans** — [https://github.com/center-for-threat-informed-defense/adversary_emulation_library](https://github.com/center-for-threat-informed-defense/adversary_emulation_library). Per-actor-plans.
- **atomic-red-team** — [https://github.com/redcanaryco/atomic-red-team](https://github.com/redcanaryco/atomic-red-team). Per-technique replay-modules.
- **MITRE Caldera** — [https://github.com/mitre/caldera](https://github.com/mitre/caldera). Adversary-emulation-platform.
- **DeTT&CT** — [https://github.com/rabobank-cdc/DeTTECT](https://github.com/rabobank-cdc/DeTTECT). NL-tooling voor data-source en coverage-mapping.
- **Center for Threat-Informed Defense** — [https://ctid.mitre-engenuity.org/](https://ctid.mitre-engenuity.org/). Onderzoek + tooling.
- **SANS Purple Team Maturity Model** — [https://www.sans.org/](https://www.sans.org/). Maturity-rubric.
- **Detection Engineering Maturity Matrix** — community resource voor zelf-assessment.

## Categorieën

- blue
- pentest
