---
name: audit-evidence
description: Evidence collection en packaging voor security-audits — evidence-types (inspection/observation/inquiry/re-performance/automated), cadens per control, chain-of-custody, period-tagging, WORM-storage en retention, auditor-delivery. Bruikbaar voor SOC 2, ISO 27001, NIS2, DORA en interne audits.
---

# Audit Evidence Collector

> **Disclaimer**: deze skill dekt operationele evidence-collectie. Legal holds, forensics-grade chain-of-custody voor rechtszaken, en juridisch bewijsgewicht vereisen aparte expertise (forensics-assist/legal). Deze skill richt op compliance-audit-grade bewijs.

## Wanneer gebruiken

Elke audit draait op evidence. Compliance-frameworks zijn de "wat moet je"; deze skill is de "hoe bewijs je het". Hij is de tegenhanger van wat `iso27001` fase 5 en `soc2` fase 4 vragen: een systematische collectie die een auditor kan consumeren zonder zes weken heen-en-weer-vragen.

Activeert bij:

- Een vraag als "hoe verzamelen we evidence voor SOC 2 Type II", "wat is control-evidence", "bewijs-packaging voor auditor", "chain-of-custody voor audit", "automated evidence-collectie opzetten", "hoe lang bewaren we audit-evidence".
- Voorbereiding op een externe audit: SOC 2, ISO 27001 Stage 2, PCI-DSS, interne-audit volgens ISMS Cl 9.2.
- Een handoff vanuit `iso27001`, `soc2`, `nis2`, `dora` waar bewijs-eisen concreet moeten worden ingevuld.
- Een vendor-security-review die evidence-output richting klanten vraagt (zie `vendor-questionnaire` receiver-mode).
- Een post-incident-review waar evidence over controls moet worden gereconstrueerd.

### Wanneer NIET (handoff)

- Forensics-grade evidence voor rechtbank of incident-response → `forensics-assist` plus legal. Audit-evidence is lichter.
- Legal hold procedures → legal.
- Policy-drafting zelf → `policy-drafter`.
- Risk-register-data-collection → `risk-register`.
- Technische implementatie van logging/monitoring die evidence genereert → `secure-coding`, `k8s-security`, `log-triage`, `siem-query`.
- Vendor-attestation-review (je ontvangt hun SOC 2) → `vendor-questionnaire`.

## Aanpak

Zeven fases. Fases 2–4 vormen de collection-discipline; fase 5 is storage/retention; fase 6 is auditor-delivery.

### 1. Evidence-inventaris per control

Elke control heeft een evidence-signature. Start met een matrix: control-ID → evidence-type(s) → producent → frequentie → bewaarlocatie.

Voorbeeld-rij voor een SOC 2 CC6.1-achtige access-control:

- Control: "User access is authorized before provisioning".
- Evidence-types: ticket-log (access-requests met approval-signature), quarterly access-review-rapport (met exceptions geregistreerd), automated config-snapshot van IAM-roles.
- Producenten: HR-onboarding-tool, IAM-admin, CI/config-drift-detection.
- Frequentie: per-event (ticket), quarterly (review), daily (snapshot).
- Bewaarlocatie: GRC-platform / evidence-repo.

Doe dit per actieve control. Een framework met 100 controls levert een matrix van 100-300 evidence-items. Dit is eenmalig werk plus onderhoud bij control-wijziging.

### 2. Evidence-types en AICPA-taxonomie

AICPA onderscheidt vijf evidence-typen (relevant voor SOC 2, breder toepasbaar):

- **Inspection**: geschreven document-review. Policies, tickets, access-review-rapporten, change-management-approvals, meeting-notulen. Meest gangbare evidence voor statische controls.
- **Observation**: auditor ziet iets gebeuren. "Toon me hoe een user wordt gedeactiveerd". Minder gebruikt sinds remote-audits, wel nog voor fysieke controls.
- **Inquiry**: interview met control-owner. Zelden alleen-staand bewijs — moet worden ondersteund door inspection of observation.
- **Re-performance**: auditor doet de control zelf opnieuw, vergelijkt resultaat. "Geef me vijf willekeurige access-review-entries, ik valideer zelf in de IAM-console of ze kloppen".
- **Automated evidence** (modern toevoeging): system-generated logs en config-snapshots die zonder menselijke tussenkomst worden geproduceerd. Hoogste betrouwbaarheid voor operating-effectiveness.

Per control mix: inspection-evidence voor design-adequaatheid, automated/re-performance voor operating-effectiveness.

### 3. Evidence-kwaliteit: fresh, traceable, reproducible

Evidence van slechte kwaliteit is evidence die niet telt. Drie criteria:

- **Fresh**: binnen de observatie-periode geproduceerd, met datum/tijd-stempel dat verifieerbaar is. Een screenshot zonder timestamp is half-waardig. Logs met tamper-prone timestamps (writable NTP) zijn lager-waardig.
- **Traceable**: volledige keten van subject → control → evidence zichtbaar. "Deze screenshot is van gebruiker X op datum Y in systeem Z" moet expliciet. Gestripte metadata verlaagt waarde.
- **Reproducible**: een auditor kan het opnieuw vragen en krijgt vergelijkbare evidence. Eén-malig handmatig bij elkaar-gescharreld bewijs wekt twijfel over controle-operating-effectiveness.

**Anti-pattern**: evidence "gemaakt voor de audit" in de week vóór de auditor komt. Zichtbaar aan geclusterde timestamps. Auditors herkennen dit en downgrade de control naar design-only of nonconformity.

**Automated is vrijwel altijd beter** dan handmatige evidence. Scheelt operational burden en heeft betere freshness/traceability.

### 4. Chain-of-custody en period-tagging

Voor compliance-audit-evidence is volledige forensic chain-of-custody overkill. Lichtgewicht variant:

- **Producer-attribution**: wie/wat produceerde het stuk evidence (user-ID, system-ID, API-endpoint)?
- **Collection-point**: hoe werd het naar de evidence-repo verplaatst (automated pipeline, manual upload via specific tool)?
- **Storage-immutability**: geen wijzigingen mogelijk na collection. Hash-verificatie achteraf indien nodig.
- **Access-log** op de evidence zelf: wie keek erna, wanneer. Helpt als auditor vraagt "hoe weet ik dat dit niet achteraf is aangepast".

**Period-tagging**: elke evidence-item moet kunnen worden gekoppeld aan de audit-periode waarin hij is verzameld. Type I = point-in-time, maar voor Type II (3-12 maanden) moet je per item weten in welke week/maand het valt. Tagging als metadata-veld: `observation-period: 2025-Q3`.

Bij multi-audit context (simultane SOC 2 + ISO 27001): één evidence-item kan meerdere tags krijgen, mapped naar verschillende control-IDs. Eén collection, meerdere uses.

### 5. Storage en retention

- **Repository-keuze**: GRC-platform (Vanta, Drata, Secureframe, Archer, OneTrust) met ingebouwde evidence-management, of eigen-gebouwd (SharePoint/Confluence met versioning-plus-metadata). Platform wint op schaal bij ≥ 25 actieve controls met recurring cadens; handmatig is haalbaar tot ~15.
- **Immutability**: write-once-read-many (WORM) waar kritisch (SOC 1-raakvlak, financial). Voor SOC 2/ISO 27001 is versioned-plus-access-controlled voldoende.
- **Retention-periodes**: minimaal 1 audit-cycle plus 1 jaar. Voor financial (DORA, SOX-raakvlakken): 7 jaar gangbaar. Voor privacy-gerelateerde evidence met persoonsgegevens: AVG-minimalisatie-principe conflicteert — retention alleen zo lang als compliance vereist, daarna verwijderen. Documenteer.
- **Backup en recovery**: evidence-loss net voor audit is existentieel. Geofilled backups, recovery-test.
- **Access-control**: tier-appropriate. Control-owners kunnen produceren/uploaden; auditors (intern en extern) kunnen lezen; niemand kan retroactive wijzigen.

### 6. Auditor-delivery

Auditor wil evidence in een structuur die zijn testing-workflow matcht.

- **Evidence-request-list (ERL)**: auditor levert doorgaans een lijst vooraf met "ik wil zien X, Y, Z". Map elk ERL-item naar repo-locaties. Bevestig aanwezigheid vóór de audit-week, niet tijdens.
- **Indexering per control**: elke evidence-request hangt aan een specifieke control-ID. Delivery: auditor krijgt access tot de subset relevant voor zijn engagement.
- **Sampling-basis**: auditor vraagt typisch random-samples van populations (bv. "geef me 10 willekeurige change-tickets uit afgelopen kwartaal"). Jij levert, auditor traceert back om te verifiëren dat de populatie correct is. Het mechanisme hoe je samplet moet reproduceerbaar zijn; sampling "met knipoog" wordt bij re-sampling zichtbaar.
- **Exceptions**: controls die operationeel niet perfect liepen (een access-review overgeslagen, een change zonder approval). Proactief documenteren met root-cause en correctieve actie. Auditor vindt ze anders zelf en impact op rapport is groter.
- **Remote vs on-site**: remote-audit standaard sinds 2020. Auditor krijgt gecontroleerde access tot een ruimte (screen-share, virtual evidence-room, gated cloud-share). Vermijd emailing ongemarkeerde evidence — versplintert keten en leidt tot security-findings op je eigen evidence-hygiene.

### 7. Verification-loop

Laag 1: scope (alle actieve controls hebben evidence-signatures?, alle evidence-items periode-getagged?, elke evidence-item heeft een producer-trace?), aannames ("automated evidence" werkelijk automated, niet manueel gescheduled?), gaps (exceptions gedocumenteerd met root-cause, niet stilzwijgend weggewerkt?). Laag 2: AICPA-evidence-type-terminologie correct, framework-specifieke retention-eisen niet verzonnen (DORA/NIS2/AVG-periodes hebben concrete juridische basis, verifieer), geen claim dat "WORM" is ingericht zonder dat het daadwerkelijk write-once is.

## Output

```
Evidence package — <audit-type + periode>
Auditor: <firm indien engaged> | Framework: <SOC 2 Type II | ISO 27001 Stage 2 | ...>
Observation-periode: <start → eind> | Delivery-datum: <...>

Evidence-matrix:
  Controls in scope:    N
  Evidence-items:       M
  Coverage:             <% controls met complete evidence>
  Automated evidence:   <% automated vs manual>

Per control-groep (aligned met framework):
  CC1 / Cl 4-5 / ...:   N items, alle compleet | gaps: ...
  CC6 / Cl 8 / A.8.x:   ...
  ...

Evidence-kwaliteit:
  Fresh (within periode): <%>
  Traceable:             <%>
  Reproducible:          <%>

Chain + metadata:
  Producer-attribution: <alle items | gaps: ...>
  Period-tagging:       <alle items | gaps: ...>
  Immutability:         <WORM | versioned | ad-hoc>

Storage + retention:
  Repository:           <platform-naam of custom>
  Retention-policy:     <beleid + datum van volgende purge>
  Access-log actief:    <ja/nee>

Exceptions register:
  Aantal:               N
  Root-cause per item: <...>
  Correctief uitgevoerd: <status>

Delivery-mode:
  ERL-mapping:          <gereed | work-in-progress>
  Virtual data-room:    <toegang-link + credentials via separate channel>

Verification-loop: ...
```

## Referenties

- **AICPA Audit Evidence Standards (AU-C 500)** — [https://us.aicpa.org/research/standards/auditattest](https://us.aicpa.org/research/standards/auditattest). Auditor-guidance over evidence-typen en sufficient appropriate evidence.
- **AICPA SOC 2 Guide** — via AICPA store. Behandelt evidence-eisen per Trust Service Criterion.
- **ISO/IEC 27001:2022 Cl 9.2 + 9.3** — internal audit + management review. Verwacht evidence-gebaseerde beslissingen.
- **ISO/IEC 27008:2019** — [https://www.iso.org/standard/67397.html](https://www.iso.org/standard/67397.html). Guidelines for assessors on ISMS controls.
- **NIST SP 800-53A Rev. 5** — [https://csrc.nist.gov/pubs/sp/800/53/a/r5/final](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final). Assessing Security and Privacy Controls, evidence-gathering methods.
- **OSCAL** — [https://pages.nist.gov/OSCAL/](https://pages.nist.gov/OSCAL/). NIST-format voor machine-leesbare assessment-plans, evidence-records, en findings.
- **Shared Assessments Audit Program Evaluation Tool** — [https://sharedassessments.org/](https://sharedassessments.org/). Voor vendor-audit-evidence-alignment.

## Categorieën

- grc
