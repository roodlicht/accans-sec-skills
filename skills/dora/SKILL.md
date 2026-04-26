---
name: dora
description: EU Digital Operational Resilience Act (2022/2554) compliance — scope (financial entities + critical ICT TPPs), five pillars (ICT risk management, incident reporting, resilience testing incl. TLPT, third-party risk, information sharing), and Dutch oversight via DNB/AFM.
---

# DORA Compliance

> **Disclaimer**: geen juridisch advies. Deze skill ondersteunt technische gap-analyse tegen DORA en de onderliggende Regulatory Technical Standards. Juridische kwalificatie (entity-classificatie, contract-clausules, sanctie-risico) vereist financieel-recht expertise, doorgaans via compliance-afdeling of externe counsel.

## Wanneer gebruiken

De Digital Operational Resilience Act (EU-verordening 2022/2554) is van kracht sinds 17 januari 2025. Hij harmoniseert ICT-risk-management voor financiële entiteiten in de EU en breidt toezicht uit naar kritieke ICT-third-party providers. Als verordening (niet richtlijn) werkt DORA direct door in NL-recht zonder implementatiewet, wel met nationale toezichtsstructuur (DNB + AFM + ESAs).

Activeert bij:

- Een vraag als "DORA-gap analyse", "valt onze partij onder DORA", "hoe classificeren we een incident onder DORA", "wat is een TLPT", "DORA third-party register opzetten", "DNB-rapportage pipeline".
- Een financiële entiteit (bank, verzekeraar, investment firm, pensioenfonds, payment institution, crypto-asset service provider, crowdfunding platform, handelsplatform, etc.) die moet aantonen dat zij compliant is.
- Een ICT-service-provider die levert aan EU-financial en overweegt of hij "critical ICT third-party provider" wordt aangemerkt door de ESAs.
- Een handoff vanuit `iso27001` of `nis2`: DORA vervangt NIS2 voor financial (lex specialis) op de meeste punten maar niet alle.
- Een security-incident waar classificatie en rapportage-timing bepaald moeten worden.

### Wanneer NIET (handoff)

- Algemene EU-cybersecurity voor niet-financial → `nis2`. Let op: bij dual-scope (bv. payment-institution die ook digitale infrastructuur levert) kan beide van toepassing zijn.
- GDPR/AVG datalek-meldingen → `gdpr-pia`. DORA-rapportage is additief, niet vervangend.
- Technische ICT-risk-management-implementatie → de betreffende security-skills (`ir-runbook`, `detection-engineer`, `container-hardening`, etc.). DORA eist dát je dingen hebt, hoe zit daar.
- Threat-Led Penetration Testing uitvoering zelf → pentest-skills (`recon-agent`, `web-exploit-triage`, `c2-hygiene`, `pentest-reporter`). Deze skill beschrijft het TLPT-regime, niet hoe je een test uitvoert.
- Contract-juridische review → juridische expertise. Deze skill helpt bij technische clause-mapping (bv. welke exit-criteria contractueel moeten staan).

## Aanpak

Zeven fases, één per pijler plus scope-bepaling en verification-loop.

### 1. Scope-bepaling

DORA Art 2 lijst de financial entities expliciet: kredietinstellingen, betalingsinstellingen, e-money-instellingen, investment firms, crypto-asset service providers, central securities depositories, central counterparties, handelsplatformen, credit rating agencies, verzekeraars/herverzekeraars, bemiddelaars, pensioenfondsen, crowdfunding, etc. Plus **critical ICT third-party service providers** (CTPPs) aangewezen door de ESAs.

Reviewer-checks:

- Valt de organisatie onder één van de expliciete categorieën (Art 2(1))?
- Zijn er proportionality-uitzonderingen van toepassing (Art 4)? Microbedrijven hebben verlichte regimes voor sommige eisen, niet alle.
- Levert de organisatie ICT-services aan EU-financial? Dan mogelijk third-party scope, inclusief mogelijke CTPP-aanwijzing door ESA-oversight-framework.
- Is er overlap met NIS2? In principe geldt DORA als lex specialis; zie Art 1(2) voor uitzondering. NIS2 blijft van toepassing voor delen die niet door DORA gedekt zijn.

### 2. Pijler 1 — ICT Risk Management (Art 5–14)

Governance en framework-eisen. Kern-elementen:

- **Art 5 Governance**: management-orgaan is eindverantwoordelijk, moet het ICT-risk-management-framework goedkeuren en toezien, en moet voldoende ICT-expertise hebben. Jaarlijkse review verplicht.
- **Art 6 ICT-risk-management framework**: geschreven, goedgekeurd, rollen/verantwoordelijkheden benoemd, budget toegewezen, audit-trail voor beslissingen.
- **Art 7–9 Identificatie + bescherming**: ICT-assets-inventaris, classificatie, risico-assessment periodiek plus bij changes, info-security controls (toegang, segmentation, encryption, data-integrity).
- **Art 10–13 Detectie + respons + recovery**: anomaly-detection, logging, incident-response-plan, business-continuity-plan met RTO/RPO-doelen, recovery-testing, backup-strategieën.
- **Art 14 Lessons learned**: post-incident review verplicht, findings terug naar het framework.

Mapping: ISO 27001:2022 Annex A dekt grotendeels Art 6-13. NIST CSF 2.0 dekt volledige spanwijdte. Gebruik je bestaande framework als basis en map specifiek naar DORA-artikelen voor gap-analyse.

### 3. Pijler 2 — Incident Reporting (Art 17–23)

Drietraps rapportage vergelijkbaar met NIS2, maar met eigen thresholds en regime:

- **Classificatie (Art 18)**: major ICT-related incident wanneer criteria uit RTS overschreden (aantal klanten geraakt, duur, geografische impact, reputationele impact, data-impact, financial impact). De `[RTS on classification of major ICT-related incidents]` (Commission Delegated Regulation die de thresholds vastlegt): verify actuele versie.
- **Initial notification**: binnen **4 uur** na classificatie als major, en uiterlijk **24 uur** na eerste vaststelling van incident. Afwijkend van NIS2 (24h early-warning), korter.
- **Intermediate report**: binnen 72 uur na initial, met meer detail.
- **Final report**: binnen één maand, met root-cause, impact, en lessons learned.

Rapportage gaat naar de competent authority (NL: DNB voor banken/betalingsinstellingen/e-money, AFM voor handelsplatformen/investment firms/crowdfunding, etc.). ESAs ontvangen aggregate data.

Daarnaast: **significant cyber-threat**-rapportage (vrijwillig, Art 19). Ondanks "vrijwillig" in de tekst is dit in praktijk een concurrency-vraag: als je peers het doen, valt niet-rapporteren op.

### 4. Pijler 3 — Digital Operational Resilience Testing (Art 24–27)

Twee niveaus:

- **Basic testing (Art 25)**: verplicht voor alle in-scope entities. Jaarlijks, via assessment-methodologieën: vulnerability assessments/scans, penetration tests, source-code reviews, network security assessments, scenario-based tests. Onafhankelijke interne of externe testers.
- **Threat-Led Penetration Testing (TLPT, Art 26–27)**: verplicht voor "significant" entities (door ESAs aangewezen op basis van systemic importance + size). Driejaarlijkse testing met red-teaming tegen productie-critical-functions. Volgt TIBER-EU-framework of gelijkwaardige nationale equivalent (in NL: TIBER-NL onder DNB). Testers moeten erkend zijn (CREST, CBEST, TIBER-gecertificeerd).

TLPT-traject (hoog niveau):

1. **Preparation**: scope-definitie, threat-intelligence, test-plan, coordination met nationaal TIBER-office.
2. **Testing**: red team voert aanval uit tegen productie-critical-functions, met beperkte blue-team-wetenschap ("white team" van insiders faciliteert).
3. **Closure**: debrief, remediation plan, attestation naar competent authority.

Zie `recon-agent`, `c2-hygiene`, `post-exploit`, `pentest-reporter` voor uitvoering. Deze skill beschrijft alleen het regime.

### 5. Pijler 4 — ICT Third-Party Risk Management (Art 28–30)

Waarschijnlijk de meest operationele impact voor de meeste financiële entiteiten, want het raakt elk contract.

- **Art 28 ICT-third-party strategy**: document waarin criteria staan voor selectie, due diligence, contract-management, exit.
- **Art 28(3) Register of information**: machine-leesbaar register van alle contracten met ICT-third-parties, in te dienen bij competent authority. Formaat via ITS (Implementing Technical Standard) gestandaardiseerd. Bevat: provider-identificatie, service-beschrijving, contract-key-data, data-processed, sub-outsourcing, concentration-metrics.
- **Art 29 Pre-contractual assessment**: due diligence op supplier: risk-assessment, lokaliteit data, sub-outsourcing chain, concentration-risk.
- **Art 30 Contract-clauses (verplichte elementen)**:
  - Volledige beschrijving functies + service-levels.
  - Locatie waar data verwerkt wordt plus lokaliteit van provider.
  - Security-verplichtingen inclusief melding bij incidenten.
  - Assistance-verplichtingen bij ICT-incidents van de financial entity.
  - Exit-strategieën met termijn en transitie-ondersteuning.
  - Access/audit rights voor financial entity en competent authority.
  - Termination-rights onder specifieke omstandigheden.
- **Critical ICT Third-Party Providers (CTPPs)**: aangewezen door ESAs. Onderworpen aan rechtstreeks oversight-framework (Art 31+). Zowel CTPP als haar financial-klanten hebben additional obligations.

Workflow voor deze skill: contract-portfolio langslopen, per contract checken of alle Art 30-elementen aanwezig zijn, register-of-information opbouwen/onderhouden, concentration-metrics berekenen (% van critical functions afhankelijk van één provider).

### 6. Pijler 5 — Information Sharing (Art 45)

Vrijwillige uitwisseling van cyber-threat-informatie tussen financial entities, via trusted communities (ISACs). Niet-verplicht, maar expliciet toegestaan en juridisch beschermd: voor organisaties die twijfelen of sharing juridisch mag, is DORA het ja-antwoord.

NL-ISAC-structuur: FI-ISAC NL en sectoren-specifieke platforms. Operationele koppeling aan threat-intel-feeds (zie `ioc-hunter`).

### 7. Verification-loop

Laag 1: scope (alle in-scope entities meegenomen, inclusief groepsstructuur?), aannames (RTS/ITS-versies up-to-date?), gap-analyse (alle vijf pijlers geadresseerd zonder stille uitsluitingen?). Laag 2: artikel-nummers uit verordening 2022/2554 kloppen, RTS/ITS-verwijzingen actueel (deze worden door de ESAs bijgewerkt), NL-toezichthouder-rolverdeling (DNB vs AFM) correct per type activiteit, TIBER-framework-namen correct.

## Output

```
DORA-compliance assessment — <entity>
Datum: YYYY-MM-DD | DORA van kracht sinds: 2025-01-17

Scope:
  Entity-categorie (Art 2):  <bank | verzekeraar | ... | CTPP | n.v.t.>
  Proportionality:           <full | verlicht — rationale>
  NL-toezichthouder:         <DNB | AFM | n.v.t.>

Pijler 1 — ICT Risk Management:
  Framework-document:        <aanwezig | gap>
  Board-approval + review:   <datum + cadens>
  Asset-inventaris + classif:<coverage%>
  Incident response plan:    <aanwezig | gap>
  BCP met RTO/RPO:           <getest datum | nooit>

Pijler 2 — Incident Reporting:
  Classificatie-procedure:   <aanwezig | gap>
  4h-notification pipeline:  <getest | nooit>
  Authority-contact:         <DNB/AFM-gegevens aanwezig>

Pijler 3 — Resilience Testing:
  Jaarlijkse basic testing:  <laatst: datum, scope>
  TLPT-verplicht?:           <ja (significant) | nee>
  TIBER-NL-traject status:   <gepland | uitgevoerd | n.v.t.>

Pijler 4 — Third-Party Risk:
  Strategy-document:         <aanwezig | gap>
  Register of Information:   <compleet | gaps: ...>
  Contract-clauses Art 30:   <coverage% per element>
  CTPP-afhankelijkheden:     <lijst critical providers>
  Concentration-metrics:     <% per critical function>

Pijler 5 — Info Sharing:
  ISAC-membership:           <FI-ISAC NL | anders | geen>
  Threat-intel-pipeline:     <actief | passief | n.v.t.>

Prioriteiten:
  <fix-now / fix-sprint / fix-quarter met DORA-artikel-ref>

Verification-loop: ...
```

## Referenties

- **EU Regulation 2022/2554** (DORA) — [https://eur-lex.europa.eu/eli/reg/2022/2554](https://eur-lex.europa.eu/eli/reg/2022/2554). Primaire tekst.
- **ESAs Joint Committee — DORA implementation** — [https://www.esma.europa.eu/policy-activities/digital-finance/digital-operational-resilience-act-dora](https://www.esma.europa.eu/policy-activities/digital-finance/digital-operational-resilience-act-dora). Alle RTS/ITS-publicaties verzameld.
- **DNB — DORA-pagina** — [https://www.dnb.nl/](https://www.dnb.nl/). Zoek op "DORA" voor NL-specifieke verwachtingen voor banken/PSP/EMI.
- **AFM — DORA** — [https://www.afm.nl/](https://www.afm.nl/). Voor investment firms, handelsplatformen, crowdfunding.
- **TIBER-EU** — [https://www.ecb.europa.eu/paym/cyber-resilience/tiber-eu/html/index.en.html](https://www.ecb.europa.eu/paym/cyber-resilience/tiber-eu/html/index.en.html). Framework voor TLPT.
- **TIBER-NL** — [https://www.dnb.nl/voor-de-sector/tiber/](https://www.dnb.nl/voor-de-sector/tiber/). Nederlandse implementatie van TIBER.
- **EBA — DORA** — [https://www.eba.europa.eu/regulation-and-policy/digital-operational-resilience](https://www.eba.europa.eu/regulation-and-policy/digital-operational-resilience). EBA-specifieke guidance voor banken.
- **EIOPA — DORA** — [https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en](https://www.eiopa.europa.eu/digital-operational-resilience-act-dora_en). Voor verzekeraars.
- **Register of Information ITS** — `[verify actuele versie via ESAs-website]`. Template en verplichte velden voor Art 28(3).

## Categorieën

- grc
