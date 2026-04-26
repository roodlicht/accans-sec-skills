---
description: Hypothesis-driven threat-hunt session scaffolding — scope, hypothese-formulering, data-source-binding, query-handoff naar siem-query, IOC-input via ioc-hunter, en gestructureerde writeup met findings en handoffs naar detection-engineer.
argument-hint: "[hypothese] [--window=<N>d] [--scope=<service>] [--source=<ttp|ioc|anomaly>]"
---

# /threat-hunt

Start een gestructureerde, hypothese-gedreven hunt-sessie. Anders dan alert-triage zoekt een hunt naar wat je nog niet detecteert. Output is óf bevestigd-incident (handoff naar `ir-runbook`), óf nieuwe-detection-rule-input (handoff naar `detection-engineer`), óf documented-no-find (input voor coverage-baseline).

Het commando orchestreert; onderliggende skills (`siem-query`, `ioc-hunter`, `log-triage`) doen het werk.

## Stappen

1. **Hypothese-formulering.** Zonder testbare hypothese geen hunt. Drie bronnen voor hypothesen:
   - **TTP-driven**: gebaseerd op ATT&CK-technique uit recente threat-intel (bv. "we vermoeden T1003.001 LSASS-dumping zonder detection").
   - **IOC-driven**: nieuwe high-confidence IOCs uit `ioc-hunter` retro-checken in onze data.
   - **Anomaly-driven**: iets ongebruikelijks in metrics of logs, "gut-feel"-hunt.
   Formuleer als toetsbare uitspraak: "Als TTP X plaatsvond, zien we patroon Y in log-bron Z binnen window W". Niet "iets vreemds".

2. **Scope vastleggen.** Welk service / cluster / segment? Welk tijdvenster? Default `--window=30d`. Bij IOC-input liefst korter (hoge confidence + recente IOC = klein-window). Bij TTP-driven of anomaly-driven groter venster.

3. **Data-source binding.** Welke logs heb ik nodig om de hypothese te toetsen? Per hypothese:
   - LSASS-dumping → Sysmon-EID-10 (process-access), EDR-process-events, Windows Security 4688/4624.
   - Cloud credential abuse → CloudTrail / Entra Sign-ins / Workspace audit.
   - Beacon-traffic-anomaly → DNS, proxy, NetFlow, SSL-fingerprint.
   - Persistence add → Sysmon-EID-12/13/14 (registry), scheduled-task-events.
   Verifieer dat de log-source actief is voor de scope plus retention dekt het venster.

4. **Query-bouw.** Roep `siem-query` aan voor query-construction op het target-platform. IOC-input via `ioc-hunter`. Performance-aware (zie `siem-query` fase 4) — een hunt-query die 6 uur loopt is operationeel onbruikbaar.

5. **Triage van resultaten.**
   - **Confirmed-suspect**: handoff naar `ir-runbook` of `log-triage` voor diepere analyse.
   - **Anomalous-explainable**: documenteer voor baseline. Soms levert het input voor `alert-tuning` (rule die te-vaak-zou-firen) of `detection-engineer` (rule die juist deze anomaly kan vangen zonder noise).
   - **Geen hits**: hypothese disproved binnen scope. Niet hetzelfde als "we zijn safe" — documenteer wat je hebt afgesloten.

6. **Verification-loop** voor de hunt-output. Laag 1 scope (alle relevante log-bronnen mee?), aannames (data-completeness binnen window?). Laag 2 (geen verzonnen ATT&CK-T-IDs of IOC-bron-claims, geen "we zien geen X dus X gebeurt niet" — afwezigheid-van-evidence niet als evidence-of-absence presenteren).

7. **Writeup en handoff.** Hunt-rapport in onderstaande structuur. Handoff naar de juiste skill of incident.

## Argumenten

- `<hypothese>` (positioneel, optioneel) — vrije-tekst-hypothese als startprompt. Bij ontbreken vraagt het commando om hypothese in de eerste interactie.
- `--window=<N>d` — tijdvenster voor query (default 30d). Korter bij IOC-driven, langer bij TTP-driven.
- `--scope=<service>` — afgebakend doel (specifieke cluster, namespace, tenant). Default: alles met log-coverage.
- `--source=<ttp|ioc|anomaly>` — type hypothese, beïnvloedt fase-2-data-source-keuze.
- `--platform=<splunk|sentinel|defender|elastic>` — target-SIEM voor query-build. Default: gebruik primary-SIEM van de organisatie.

Zonder argumenten: vraagt eerst om hypothese, default window 30d, alle scope.

## Output

Hunt-rapport, korter dan een full-pentest-rapport, structureel.

```
Threat-hunt session — <hypothese-titel>
Datum: YYYY-MM-DD | Hunter: <naam>
Source-type: <TTP-driven | IOC-driven | anomaly-driven>
Hypothese: <toetsbare uitspraak>

Scope:
  Window:           <start → eind>
  Services:         <lijst>
  Data-sources:     <met retention-bevestiging>

Queries uitgevoerd (handoff siem-query):
  1. <query-doel> — <platform-query of summary>
     Resultaat: <N events, runtime>
  2. ...

IOCs gebruikt (handoff ioc-hunter):
  <hashes / IPs / domains> — confidence + bron

Triage van resultaten:
  Confirmed-suspect:        <events + handoff ir-runbook>
  Anomalous-explainable:    <events + uitleg>
  Geen hits:                <hypothese disproved binnen scope>

Conclusie:
  Hypothese-status:         <bevestigd | disproved | partially>
  Implicatie voor stack:    <welke detection-gap of welk gerust gevoel>

Handoffs:
  ir-runbook:         <indien confirmed>
  detection-engineer: <indien gat → nieuwe rule>
  alert-tuning:       <indien anomaly te FP-prone is voor rule>
  ioc-hunter:         <nieuwe IOCs uit confirmed-finding>
  policy-drafter:     <indien gap een policy-aanvulling vraagt>

Verification-loop:
  Verdict:          <pass | revise>
  Security-verdict: <geen red flags | red flag — ...>
```

Geen-hits-output is geen falen. Een hunt die binnen scope geen evidence vindt levert een coverage-claim ("voor TTP-X, in window-W, op data-Z geen sporen"). Dat is bruikbaar voor compliance-evidence (NIS2 Art 21 effectiviteits-evaluatie) en voor `purple-ops`-coverage-matrix.

## Wanneer NIET

- Voor het schrijven van een nieuwe detection-rule → `detection-engineer`. Dit commando levert hunt-output die rule-input wordt, niet het rule-zelf.
- Voor SIEM-query-bouw zonder hypothese → `siem-query` direct.
- Voor incident-investigation op een al-getriggerd alert → `log-triage` of `ir-runbook`.
- Voor red-team-emulation gericht op detection-validatie → `purple-ops`.
- Voor IOC-feed-curatie zonder hunt-context → `ioc-hunter`.
