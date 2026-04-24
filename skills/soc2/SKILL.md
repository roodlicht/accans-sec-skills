---
name: soc2
description: SOC 2 Type II prep — AICPA Trust Services Criteria (Security verplicht plus Availability/Confidentiality/Processing Integrity/Privacy), Common Criteria CC1–CC9, Type I vs Type II keuze, evidence-collection rhythm, auditor-friendly packaging, Complementary User Entity Controls.
---

# SOC 2 Type II Prep

> **Disclaimer**: deze skill ondersteunt voorbereiding op een SOC 2-examination maar vervangt geen AICPA-erkende auditor. Alleen een licensed CPA firm kan een SOC 2-report uitbrengen. Deze skill helpt bij pre-audit-readiness.

## Wanneer gebruiken

SOC 2 (System and Organization Controls 2) is een AICPA-framework voor service organizations die aantoont dat controls rond Security en aanverwante Trust Services Criteria effectief zijn. Populair in B2B SaaS omdat Amerikaanse klanten (en in toenemende mate EU-klanten) het als contractuele eis stellen.

Activeert bij:

- Een vraag als "waar beginnen we met SOC 2", "Type I of Type II", "welke TSC selecteren", "evidence voor SOC 2", "CUEC uitleggen aan klant", "overlap met ISO 27001".
- Een B2B-SaaS die een SOC 2-eis op een RFP of master service agreement tegenkomt.
- Een handoff vanuit `iso27001` voor dual-attestation-strategie.
- Voorbereiding op de jaarlijkse Type II-cyclus (observatie-periode + rapport).

### Wanneer NIET (handoff)

- EU-regulatory compliance (NIS2, DORA, AVG) → de betreffende skills. SOC 2 is niet wettelijk verplicht, wel contractueel.
- ISO 27001 als alternatief of aanvullend → `iso27001`.
- Risk-assessment-methodologie → `risk-register`.
- Policy-drafting zelf → `policy-drafter`.
- Evidence-technische-packaging → `audit-evidence`.
- Technische implementatie van controls → de respectieve security-skills.
- SOC 1 (financial reporting controls) ligt buiten scope — andere auditor-doelstelling.
- SOC 3 (publieke summary-versie) wordt in deze skill benoemd maar niet diep uitgewerkt.

## Aanpak

Zes fases. Fase 1 (TSC-selectie) bepaalt de scope van de hele audit; fase 4 (evidence-rhythm) is waar de meeste Type II-projecten stranden.

### 1. Scope en Trust Services Criteria-selectie

AICPA's Trust Services Criteria (TSC) hebben vijf categorieën. Eén is verplicht, vier zijn optioneel.

- **Security (Common Criteria CC1–CC9)** — verplicht in elke SOC 2. Dit is de basis en het gros van de controls.
- **Availability** — optioneel. Criteria rond uptime, monitoring, capacity. Relevant als je SLA's hebt.
- **Confidentiality** — optioneel. Rond klant-data (anders dan persoonsgegevens). Typisch bij enterprise SaaS met geheime klant-info.
- **Processing Integrity** — optioneel. Rond correctheid/volledigheid van verwerking. Relevant voor transactie-systemen.
- **Privacy** — optioneel. Rond persoonsgegevens; overlapt met AVG/GDPR. Voor EU-klanten is AVG-compliance meestal een separate aanpak.

Keuze-advies:

- **Minimum/pragmatisch**: Security alleen. Genoeg voor de meeste contractuele eisen.
- **B2B SaaS met SLA**: Security + Availability.
- **Data-processor voor klanten**: Security + Confidentiality.
- **Extra categorieën** voegen audit-scope en kosten toe; niet kiezen "voor de zekerheid".

**Scope-beschrijving**: welk product/dienst, welke infrastructuur, welke data-flows, welke locaties, welke sub-service-providers (cloud-providers, payment-processors, data-centers). Sub-service-providers vereisen of een carve-out (hun controls zijn niet in jouw report) of inclusive (wel).

### 2. Type I vs Type II

- **Type I**: point-in-time. Auditor beoordeelt ontwerp van controls op één datum. Sneller (weken), goedkoper, waarde beperkt — zegt alleen dat je controls designed hebt, niet dat ze werken. Typische start-keuze voor een eerste jaar.
- **Type II**: period van 3–12 maanden, vaak 6 of 12. Auditor beoordeelt zowel design als operating effectiveness — haalt bewijs uit de periode. Dit is wat klanten écht willen. Annual cycle na de eerste keer.

Strategie-patroon: Type I na 3–6 maanden implementatie om eerste contract-drempels te halen, dan meteen observatie-periode inzetten voor Type II in jaar-2. Na jaar-2 elke year een Type II.

### 3. Common Criteria (CC1–CC9) plus additional categories

Common Criteria (2017, geüpdatet naar 2022) voor Security:

- **CC1 Control Environment**: tone at the top, integrity/ethics-commitment, board oversight, management philosophy, organizational structure, HR policies.
- **CC2 Communication and Information**: internal and external communications, information quality.
- **CC3 Risk Assessment**: objectives specified, risks identified, fraud assessed, change evaluated.
- **CC4 Monitoring Activities**: ongoing monitoring, internal/external evaluations, deficiencies communicated.
- **CC5 Control Activities**: controls developed, technology controls, policies deployed.
- **CC6 Logical and Physical Access Controls**: access controls, authentication, authorization, data transmission, physical access, environmental protection, data disposal.
- **CC7 System Operations**: vulnerability management, change management, incident management, backup/recovery.
- **CC8 Change Management**: changes authorized, tested, approved before deployment.
- **CC9 Risk Mitigation**: risk mitigation strategies, vendor/BCP.

Elke CC heeft sub-criteria (bv. CC6.1, CC6.2, ...). Aanbevolen: download de AICPA Trust Services Criteria document voor de volledige boom.

Additional categorieën voegen eigen criteria toe boven op de CC-basis: Availability (A1.1–A1.3), Confidentiality (C1.1–C1.2), Processing Integrity (PI1.1–PI1.5), Privacy (P1.1–P8.1).

Per criterion een **control** benoemen (hoe adresseer je het), plus **evidence** (bewijs dat de control werkt).

### 4. Evidence-collection rhythm

Type II staat of valt op operating-effectiveness evidence. Dit is waar teams tijdens de observatie-periode (vaak niet merken dat ze) falen.

Evidence-typen:

- **Inspection**: documenten (policies, incident-tickets, access-review-rapporten, change-management-tickets).
- **Observation**: auditor ziet de activiteit gebeuren (bv. iemand door 2FA loggen).
- **Inquiry**: interview met control-owner.
- **Re-performance**: auditor draait de control zelf opnieuw.
- **Automated evidence**: system-logs, configuration-snapshots.

Evidence-cadens per control-type:

- **Dagelijks gelogd**: authenticated-access, backup-success, change-deploy-log.
- **Wekelijks/maandelijks**: vuln-scan-output, patch-compliance, incident-review.
- **Kwartaalfrequentie**: access-review (user-accounts), risk-assessment-update, vendor-review.
- **Jaarlijks**: policy-review, penetration-test, BCP-test, full risk-reassessment.

Discipline: gedurende de observatie-periode evidence **centraliseren** in een repository waar auditor bij kan. Niet wachten tot de audit-week om het te verzamelen. Compliance-platformen (Vanta, Drata, Secureframe, Anecdotes, SafeBase) automatiseren een groot deel hiervan — overwegen voor Type II efficiëntie.

Per control een evidence-description die aangeeft: wat, waar, wie produceert, hoe vaak, waar opgeslagen.

### 5. Auditor-prep en report-packaging

- **Pre-audit**: auditor selecteren (licensed CPA firm, bij voorkeur met SaaS-ervaring). Engagement letter tekent scope, TSC's, observatie-periode, deliverable. Kickoff-meeting met control-owners.
- **Interim review** (optioneel, voor long observation periods): auditor doet halverwege periode een snelle pass om gaps te identificeren die je nog kunt fixen.
- **Audit-week**: auditor test evidence-samples, interviewt control-owners, documenteert findings.
- **Report-draft**: auditor levert draft SOC 2 report met: management assertion, system description, trust services criteria + controls + test-resultaten, eventuele exceptions/nonconformities.
- **Management response** op findings, remediation-plan.
- **Final report** uitgegeven. Geldig tot volgende cycle.

Report-distribution: SOC 2 Type II reports zijn vertrouwelijk. Delen met klanten via NDA. Voor publieke delen: SOC 3 is de geredigeerde variant.

**Complementary User Entity Controls (CUECs)**: controls waarvoor jouw klanten verantwoordelijk zijn (bv. "klant is verantwoordelijk voor password-management van end-users binnen hun tenant"). Deze staan expliciet in het rapport. Klanten kijken hiernaar om te weten wat hun kant is.

### 6. Verification-loop en continuous compliance

Laag 1: TSC-keuze vastgelegd met rationale?, alle geselecteerde CCs/additional criteria adresseren een control met eigenaar?, evidence-repository aanwezig en gevuld over de hele periode?, CUECs naar klanten gecommuniceerd?. Laag 2: AICPA-trust-services-criteria-naamgeving klopt, `[verify]`-markers op CC-nummering want criteria-updates verschijnen, overlap-claims met ISO 27001 onderbouwd via cross-walks (niet geïmproviseerd), auditor-firm-claims niet als aanbeveling zonder kwalificatie.

**Continuous compliance**: Type II is een jaarlijkse cyclus. De observatie-periode stopt niet voor je volgende periode begint — de evidence blijft draaien. Platforms automatiseren dit; zonder platform is het een full-time job voor minstens één compliance-lead in een middelgrote org.

## Output

```
SOC 2 readiness — <service/product>
Auditor: <firm, indien geëngageerd> | Type: <I | II> | Periode: <datums>

TSC-selectie:
  Security (CC1-9):      verplicht — status per CC: ...
  Availability:          <ja/nee>, rationale
  Confidentiality:       <ja/nee>, rationale
  Processing Integrity:  <ja/nee>, rationale
  Privacy:               <ja/nee>, rationale

Scope:
  Product(en):           <...>
  Infrastructure:        <cloud-provider(s) + regions>
  Sub-service-providers: <lijst + carve-out/inclusive>
  Geographic:            <...>

Common Criteria coverage:
  CC1 Control Environment:  <N/X controls, evidence-status>
  CC2 Communication:        ...
  CC3 Risk Assessment:      ...
  CC4 Monitoring:           ...
  CC5 Control Activities:   ...
  CC6 Access Controls:      ...
  CC7 System Operations:    ...
  CC8 Change Management:    ...
  CC9 Risk Mitigation:      ...

Evidence-status:
  Centralised repo:         <platform | manual | gap>
  Cadence-compliance:       <daily/weekly/monthly/quarterly streams>
  Gaps in observation-periode: <lijst>

Pre-audit readiness:
  Pre-audit walkthrough:    <datum | gepland | gap>
  Interim review gepland:   <ja/nee>
  Identified findings:      <lijst + remediation-status>

CUECs voor klanten:
  Geformuleerd:             <ja/nee>
  Communicated:             <hoe>

Prioriteiten:
  <fix-now/fix-sprint/fix-quarter>

Verification-loop: ...
```

## Referenties

- **AICPA Trust Services Criteria** — [https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022). Officiële TSC-document inclusief 2022-revisie.
- **AICPA SOC 2 overview** — [https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2). Officiële landing page.
- **AICPA SOC 2 Reporting Guide** — via AICPA store. Voor auditors en service organizations.
- **Cloud Security Alliance — STAR** — [https://cloudsecurityalliance.org/star](https://cloudsecurityalliance.org/star). Overlap SOC 2 + CSA-Cloud Controls Matrix.
- **ISO 27001 <-> SOC 2 cross-walk** — [https://www.aicpa-cima.com/](https://www.aicpa-cima.com/) zoek op SOC 2 mapping. Handig voor dual-attestation-strategie.
- **OSCAL** — [https://pages.nist.gov/OSCAL/](https://pages.nist.gov/OSCAL/). NIST-format voor machine-leesbare compliance-content; bruikbaar voor automated evidence-collection.
- **NIST CSF 2.0** — [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework). Frequent gebruikte mapping-basis tussen SOC 2 en andere frameworks.

## Categorieën

- grc
