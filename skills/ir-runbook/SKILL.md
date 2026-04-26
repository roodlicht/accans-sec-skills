---
name: ir-runbook
description: Incident Response runbook — NIST SP 800-61 fases (Preparation/Detection-Analysis/Containment-Eradication-Recovery/Lessons-Learned), per-scenario playbooks (ransomware, BEC, data-exfil, credential-compromise, cloud), regulatory-rapportage (NIS2 24h/72h, AVG datalek 72h, DORA), comms-templates en post-incident-review.
---

# IR Runbook

> **Operational discipline**: een runbook stuurt mensen onder druk; ambiguïteit kost tijd. Houd procedures concreet en testbaar — een stap die niet uitvoerbaar is op 03:00 zonder eigen interpretatie is niet operationeel. Juridische en regulatory-aspecten (datalek-melding, NIS2-incident-rapportage, contract-clausules met klanten/leveranciers) zijn deel van de runbook maar vragen DPO/legal-input voor finale beslissingen — deze skill structureert, vervangt geen jurist tijdens incident.

## Wanneer gebruiken

Een incident is geen moment om procedures te ontwerpen. Deze skill helpt vooraf met runbook-opbouw en tijdens met scenario-keuze, fase-overgangen en regulatory-tijdlijnen.

Activeert bij:

- Een vraag als "schrijf een ransomware-runbook", "wat doen we bij een verdachte phish-melding van een gebruiker", "is dit een datalek onder AVG", "BEC-procedure ontwerpen", "post-incident-review structuur".
- Een actieve incident-response waar fase-bepaling of regulatory-vraag (NIS2 24h, AVG 72h, DORA 4h) duidelijkheid vraagt.
- Een handoff vanuit `secrets-scanner` (lek bevestigd, escalatie naar IR), `cve-triage` (CVE met aantoonbaar misbruik), `forensics-assist` (forensisch onderzoek loopt parallel met IR).
- Een tabletop-oefening waar je het runbook test.
- Periodieke runbook-review (minstens jaarlijks of na elk significant incident).

### Wanneer NIET (handoff)

- Beleidsmatige IR-policy zelf (purpose, scope, roles op management-niveau) → `policy-drafter`. Een IRP-policy is high-level eisen; deze runbook is de operationele uitvoering.
- Forensische onderzoeken (memory-analyse, disk-imaging, timeline-reconstructie) → `forensics-assist`. Loopt parallel.
- Detection-side: rule-tuning, alert-triage van het alarm dat het incident triggert → `detection-engineer`, `alert-tuning`, `log-triage`.
- Threat-intel + IOC-enrichment → `ioc-hunter`.
- Malware-analyse zelf → `malware-triage`.
- Audit-evidence-collectie van controls die het incident raakte → `audit-evidence`.
- Pentest-context (gepland) → pentest-skills, niet incident-response.

## Aanpak

Zes fases gebaseerd op NIST SP 800-61 Rev. 2, met regulatory-laag (fase 5) als NL/EU-specificum.

### 1. Preparation (vóór elk incident)

Wat moet klaar staan voordat het knalt:

- **Runbook-portfolio**: scenarios geïdentificeerd uit threat-intel + risk-register. Minimaal: ransomware, business-email-compromise (BEC), credential-compromise (single-account), cloud-credential-compromise, data-exfil, insider-threat-melding, supply-chain-incident bij vendor.
- **IR-team-roster** met rollen: incident commander, technical lead, forensics, comms-lead, legal/DPO-liaison, exec-bridge. Per rol primary + backup. 24/7 bereikbaarheid via paging.
- **Communicatie-channels**: out-of-band (vermijd compromised email tijdens incident), Signal/Wire group, dedicated bridge-link, status-page voor externe communicatie.
- **Tools-readiness**: SIEM-toegang, EDR-console-access, jump-hosts, backup-restore-procedures getest, evidence-storage-bestemming bekend.
- **Regulatory-contact-info paraat**: CSIRT-NL (NCSC-NL), AP voor datalek, sector-toezichthouder (RDI/DNB/AFM), CERT-NL contacts. Telefoonnummers en webformulier-URLs in runbook, niet "we zoeken het op".
- **Tabletop-cadens**: minstens jaarlijks per scenario, vaker voor high-impact (ransomware, cloud-cred-compromise).

### 2. Detection en Analysis

Eerste minuten/uren bepalen veel.

- **Triage-criteria**: is het een echt incident of een false-positive? Aanvankelijke severity-assessment. Vier severity-levels gangbaar: SEV1 (existentieel: ransomware op productie, mass-exfil, prod-down), SEV2 (significante impact: single-system-compromise, beperkte exfil), SEV3 (lokaal containable: phish-click zonder credential-overdracht), SEV4 (informational, monitoring).
- **Initial scoping**: welke systems geraakt, welke data-classificatie, welke users betrokken. Niet wachten tot je 100% zekerheid hebt — werk met "best knowledge at time".
- **Klok start**: voor regulatory-tijdlijnen (NIS2 24h vanaf detection, AVG 72h vanaf "kennisgenomen", DORA 4h vanaf classification). Documenteer detection-tijd want het is de start van rapportage-clocks.
- **Communications-trigger**: SEV1/SEV2 wakker je IC + technical lead onmiddellijk; SEV3 binnen kantooruren.
- **Evidence-preservation**: snapshot logs, memory, disk-images vóór containment (containment kan evidence vernietigen). Zie `forensics-assist`.

Output van deze fase: incident-ticket met scope, severity, IC, eerste hypotheses.

### 3. Containment

Korte-termijn (stop-bleeding) plus lange-termijn (sustainable).

**Korte-termijn containment** (minuten tot uren):

- **Network-isolation**: getroffen hosts off-network (firewall/EDR-network-isolate). Minder destructief dan power-off, behoudt memory-state.
- **Account-disablement** voor compromised credentials. Rotate keys via `secrets-scanner` fase 4.
- **Block-rules** voor C2-IOCs in firewall/DNS/SIEM.
- **Stop attack-progression**: kill processen, stop services die actief misbruikt worden.

**Lange-termijn containment** (uren tot dagen):

- **Patch + reconfig** vóór recovery. Anders is het herhaling-incident binnen weken.
- **Network-segmentation versterken** waar het hadden moeten zijn.
- **Backup-isolation** verzekeren als ransomware speelt — offline-copies onbereikbaar voor aanvaller.

Per scenario verschilt prioriteit. Ransomware: backups isoleren + payload-spread stoppen; BEC: account-revoke + email-rule-cleanup; data-exfil: egress-block + identify-uplevel-paths.

### 4. Eradication en Recovery

- **Eradication**: aanvaller-tools/persistence verwijderen. Niet alleen het ene compromised account fixen — search-en-destroy alle persistence (zie `post-exploit` fase 5 voor wat aanvallers achterlaten). EDR-baseline-rebuild, password-reset waar persistence cred-based is, image-rebuilds waar persistence on-disk is.
- **Recovery**: gefaseerd brengen van services online, monitoring-versterking tijdens come-back, gevalideerde-clean-state per restored system. Geen "we zien dat er nu niets gebeurt dus alles is goed" — actief monitoren met heightened-detection.
- **Validatie-criteria** vooraf bepaald: hoe weet je dat de threat weg is? Welke detection-rules moeten N dagen niet triggeren? Welke logs moeten clean zijn?

### 5. Regulatory-rapportage en compliance-laag

NL/EU-specifiek met meerdere overlap-regimes:

- **AVG datalek (Art 33)**: 72 uur na "kennisgenomen". Aan AP via meldformulier. Daarbij Art 34: betrokkenen informeren bij hoog risico (vaak overlapt met grote incidents). Zie `gdpr-pia` voor context.
- **NIS2 (Art 23)**: drie-fasen 24h/72h/1-maand voor essential en important entities, naar CSIRT-NL plus competent authority (vaak RDI). Zie `nis2`.
- **DORA (Art 17–23)**: voor financial entities. Major-incident-classificatie via RTS-thresholds, daarna 4h initial / 72h intermediate / 1 maand final naar DNB/AFM. Zie `dora`.
- **Sector-specifieke regels**: zorg (Wkkgz), kritieke-infra-aanvulling, telecoms-eis. Per sector inventariseren.
- **Contract-clausules**: vele B2B-contracten eisen klant-notificatie binnen X uur bij security-incidents die hun data raken. Inventariseren in fase-1-prep.

Discipline tijdens incident: één persoon (vaak de DPO of compliance-lead) tracked klok per regime. Late melding kan op zich tot enforcement-actie leiden, los van het incident-impact.

### 6. Lessons Learned en post-incident-review (PIR)

Binnen 1-2 weken na recovery:

- **PIR-meeting** met alle betrokkenen plus management. Geen blame; focus op proces-leren.
- **Timeline-reconstructie**: wat gebeurde wanneer, wie wist wat, welke beslissingen werden genomen.
- **Wat ging goed**: detection-trigger werkte, comms-channel was bereikbaar, etc. Bewust documenteren — anders verdwijnt institutional knowledge.
- **Wat ging niet goed**: gemiste detection, onduidelijkheid over rolverdeling, vertraging in regulatory-melding.
- **Action-items** met owners en deadlines. Niet "we moeten x verbeteren" maar "DevOps lead implementeert offline-backup-validatie binnen 6 weken".
- **Update runbook én policy** op basis van findings. Volgende incident moet niet dezelfde leerpunten opleveren.
- **Threat-intel uitgaan**: anonimiseerde IOCs en TTPs delen via FI-ISAC/CSIRT-NL waar passend (zie `dora` Pillar 5 voor financial; vrijwillig voor anderen).

### 7. Verification-loop voor runbook-onderhoud

Niet voor het incident zelf, voor de runbook-revisie:

Laag 1: scope (alle scenario's gedekt, of zit ons threat-model op een gat?), aannames (contact-info actueel? backup-procedure laatst getest wanneer?), gaps (eviction-procedures voor cloud-providers anders dan AWS gedekt?). Laag 2: regulatory-tijdlijnen kloppen (NIS2/AVG/DORA-uren niet door elkaar), CSIRT-NL/AP/RDI-procedure-stappen actueel, geen verzonnen wettekst-referenties.

## Output

Twee modes: runbook-document (vooraf, levend document) of incident-log (tijdens, real-time).

**Runbook-document** structuur:

```
IR Runbook — versie X.Y, geldig tot YYYY-MM-DD
Eigenaar: <CISO/IRT-lead> | Laatste tabletop: <datum>

1. Preparation
   IR-team roster (primary + backup)
   Comms-channels (out-of-band)
   Regulatory contacts (CSIRT-NL, AP, sector)
   Tooling-access (SIEM, EDR, jump-hosts)

2. Per scenario (ransomware, BEC, data-exfil, cred-comp, cloud-comp, etc.):
   Detection-triggers
   Initial actions (eerste 30 min)
   Severity-criteria
   Communication-flow
   Containment-steps (short + long term)
   Eradication-checklist
   Recovery-validation-criteria
   Regulatory-rapportage-trigger
   Per-step expected duration

3. Communication-templates
   Internal: status-update naar IRT-bridge
   Internal: comms naar wider org
   External: status-page wording
   Klant-notificatie (per contract)
   Regulator-notificatie (AVG, NIS2, DORA)

4. Tabletop-archief
   Per oefening: scenario, deelnemers, lessons learned

Verification-loop: ...
```

**Incident-log** (tijdens):

```
Incident-log — INC-YYYY-NNNN
IC: <naam> | Detection-tijd: <UTC> | Severity: <SEV1-4>

Timeline:
  HH:MM — actie/beslissing — door wie

Scope:
  Affected systems: <lijst>
  Affected data: <classificatie>
  Affected users: <N>

Regulatory-clocks:
  AVG datalek (72h): <start, deadline, status>
  NIS2 (24h/72h/1m): <indien essential/important>
  DORA (4h/72h/1m): <indien financial>
  Klant-notificatie: <per contract>

Containment:
  Korte-termijn: <stappen + tijdstempel>
  Lange-termijn: <plan>

Eradication-status:
  <persistence-checks doorgelopen, status>

Recovery:
  Validatie-criteria: <welke gemeten>
  Online-fasering: <volgorde + tijden>

Open vragen / blockers:
  - <...>

Verification-loop: ...
```

## Referenties

- **NIST SP 800-61 Rev. 2** — [https://csrc.nist.gov/pubs/sp/800/61/r2/final](https://csrc.nist.gov/pubs/sp/800/61/r2/final). Computer Security Incident Handling Guide; canonical fases.
- **ENISA Incident Response Guidelines** — [https://www.enisa.europa.eu/topics/incident-response](https://www.enisa.europa.eu/topics/incident-response).
- **NCSC-NL** — [https://www.ncsc.nl/](https://www.ncsc.nl/). NL-CSIRT-procedures plus playbooks.
- **AP — Datalek melden** — [https://www.autoriteitpersoonsgegevens.nl/themas/beveiliging/datalekken](https://www.autoriteitpersoonsgegevens.nl/themas/beveiliging/datalekken). AVG Art 33/34-procedure.
- **EU Directive 2022/2555 (NIS2) Art 23** — [https://eur-lex.europa.eu/eli/dir/2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555). Incident-rapportage-tijdlijn.
- **EU Regulation 2022/2554 (DORA) Art 17–23** — [https://eur-lex.europa.eu/eli/reg/2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554). Major-incident-rapportage.
- **MITRE ATT&CK** — [https://attack.mitre.org/](https://attack.mitre.org/). Voor TTP-classificatie tijdens analysis.
- **SANS Reading Room — IR** — [https://www.sans.org/reading-room/](https://www.sans.org/reading-room/). Per-scenario-playbook-templates.

## Categorieën

- blue
