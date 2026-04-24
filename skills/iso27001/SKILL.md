---
name: iso27001
description: ISO/IEC 27001:2022 ISMS implementation and certification-prep — clauses 4-10 (context, leadership, planning, support, operation, evaluation, improvement), Annex A 93 controls over vier thema's, Statement of Applicability, Stage 1/Stage 2 audit-prep en certification-cycle.
---

# ISO 27001 Mapper

> **Disclaimer**: deze skill ondersteunt technische en organisatorische implementatie, geen juridisch of certificering-advies. Finale certificering is een onafhankelijke auditor-beoordeling; deze skill helpt je voorbereiden maar vervangt geen accredited auditor.

## Wanneer gebruiken

ISO/IEC 27001:2022 is de internationale certificeerbare standaard voor een Information Security Management System (ISMS). De 2022-revisie vervangt 2013 met een herziene Annex A (113 → 93 controls, hergroepeerd in vier thema's). Deze skill helpt bij ISMS-opzet, control-mapping, en Stage 1/Stage 2 audit-voorbereiding.

Activeert bij:

- Een vraag als "opzet ISO 27001 traject", "wat moet in de SoA", "welke controls voor onze scope", "Stage 2 audit voorbereiden", "gap tegen 2022-revisie".
- Een organisatie die certificering overweegt of al in een certificerings-cyclus zit (jaarlijkse surveillance, 3-jaarlijks hercertificering).
- Een handoff vanuit `nis2` of `dora`: beide eisen een ISMS en Annex A dekt hun technische-maatregelen-laag.
- Een vraag vanuit `soc2`-context over mapping of dubbelaudit-strategie.
- Contract-eis van een klant: "jullie moeten ISO 27001 zijn".

### Wanneer NIET (handoff)

- EU-regulatory compliance (NIS2, DORA, AVG) → de betreffende skills. ISO 27001 helpt, is niet wettelijk verplicht.
- SOC 2 Type II → `soc2`. Veel overlap in controls, ander audit-model.
- Risk-assessment-methodologie → `risk-register`. ISO 27001 eist risk-management (Cl 6.1, 8.2-8.3), de methodologie zit in die skill.
- Policy-drafting → `policy-drafter`.
- Evidence-packaging voor audits → `audit-evidence`.
- Technische implementatie van controls (bv. encryption, access control) → de respectieve security-skills.
- Privacy-specifieke ISO 27701 (privacy-extensie van 27001) ligt buiten scope; verwijs naar een dedicated PIMS-skill indien opgezet.

## Aanpak

Zes fases. Fase 1 (scope) is het zwaarste strategisch; fases 3-4 (controls + risk) het zwaarste operationeel.

### 1. Scope en ISMS-grens

ISO 27001 Cl 4.3 eist een bewust gekozen ISMS-scope. Wat binnen de ISMS valt wordt geauditeerd en gecertificeerd; wat buiten valt niet.

- **Organisatorische scope**: hele entity, business-unit, specifieke product-lijn, of specifieke dienst. Vaak begint men met de SaaS-dienst of het B2B-product en breidt later uit.
- **Geografische scope**: één locatie, meerdere, alle. Remote-workers expliciet in-scope of out?
- **Technologische scope**: welke systemen, netwerken, applicaties, clouds. Shadow IT en ongedocumenteerde systemen veroorzaken audit-findings.
- **Interfaces en afhankelijkheden** (Cl 4.3): welke systemen die buiten scope vallen leveren input aan wat in scope is? Die interfaces moeten gedocumenteerd en beheerd.

Out-of-scope argumentatie moet verdedigbaar zijn tegen een auditor. "Onze R&D-omgeving is buiten scope omdat ..." — met een reden die geen gatenkaas is.

Scope vastleggen in een scope-statement (documented information, Cl 4.3). Één alinea, publicable op je certificaat.

### 2. ISMS-clausules 4–10

De genummerde hoofdstukken van de norm vormen het management-system. Elke clausule eist documented information plus bewijs van implementatie.

- **Cl 4 Context**: externe/interne issues (PESTLE-stijl), interested parties plus hun requirements, ISMS-scope.
- **Cl 5 Leadership**: top-management commitment, policy (Cl 5.2), rollen en verantwoordelijkheden. Bij audit: agenda's van management reviews, geïdentificeerde accountability per rol.
- **Cl 6 Planning**: risk-assessment-methode, risk-treatment (zie fase 4), infosec-objectives met measurability.
- **Cl 7 Support**: resources, competence, awareness, communicatie, documented information (doc-control).
- **Cl 8 Operation**: daadwerkelijke risk-assessment-runs en treatment-plan-executie.
- **Cl 9 Performance evaluation**: monitoring/meting, internal audit (zie fase 5), management review.
- **Cl 10 Improvement**: nonconformities plus corrective action, continuous improvement.

Common gaps bij Stage 2-audits: Cl 5.2-policy onvoldoende door top-management zichtbaar gecommitteerd, Cl 9.3 management review zonder bewijs van input-items zoals vereist, Cl 10 nonconformities-register dun of ontbrekend.

### 3. Annex A — 93 controls over vier thema's

ISO 27001:2022 Annex A groepeert controls in vier thema's:

- **A.5 Organizational controls** (37 controls): policies, roles, threat intelligence, supplier relationships, compliance, etc.
- **A.6 People controls** (8 controls): screening, terms, awareness, disciplinary, remote working, confidentiality.
- **A.7 Physical controls** (14 controls): secure areas, physical entry, office/room/facilities, working in secure areas, clear desk/screen, equipment siting, security of assets off-premises, storage media, supporting utilities, cabling, maintenance, removal of assets, disposal, unattended user equipment.
- **A.8 Technological controls** (34 controls): user endpoint, privileged access, authentication, identity management, information access, source code, secure development, test data, configuration, info deletion, data masking, DLP, backup, redundancy, logging, monitoring, clock sync, separation of networks, web filtering, cryptography, secure system engineering, outsourced dev, separation of dev/test/prod, vulnerability management, secure coding, testing, installation, change management, development lifecycle, configuration, capacity, ...

Elke control in A.5-A.8 heeft een **control-statement** (wat), **purpose** (waarom), **guidance** (hoe). Guidance is niet normative, wel sterk geadviseerd voor audit.

### 4. Risk-assessment en Statement of Applicability

**Risk-assessment** (Cl 6.1.2) vereist:

- Een risk-assessment-methodologie die consistent uitvoerbaar is (reproducible).
- Asset-identificatie of een ander erkend model (scenario-based, threat-based).
- Likelihood + impact-beoordeling met geschreven criteria.
- Risk-acceptance-criteria expliciet.

Verwijs naar `risk-register` voor methodologie; ISO 27005 is de ISO-specifieke infosec-risk-management standaard die past bij 27001.

**Statement of Applicability (SoA)** (Cl 6.1.3.d) is het centrale document: een lijst van alle 93 Annex A-controls met per control:

- Applicable: ja / nee.
- Indien nee: rationale voor exclusie (bv. "A.7.14 Secure disposal of storage media — niet van toepassing want we hosten in cloud, disposal is provider-verantwoordelijkheid"). Rationale moet auditor-overtuigend zijn.
- Indien ja: implementation-status (implemented / partial / planned) met verwijzing naar bewijs-locatie.

SoA is levend document. Wijzigt bij risk-re-assessment, scope-wijziging, nieuwe bedreigingen. Versie-beheer verplicht.

**Risk-treatment-plan** (Cl 6.1.3.e): per geïdentificeerd risk: gekozen treatment (avoid/modify/share/retain, de ISO-termen voor avoid/mitigate/transfer/accept), controls uit Annex A die toegepast worden, eigenaar, deadline, status.

### 5. Audit-voorbereiding: Stage 1 en Stage 2

Externe certification-audit heeft twee stages:

- **Stage 1 (documentation review)**: auditor leest ISMS-documenten plus SoA, beoordeelt completeness en design-adequaatheid. Levert major/minor findings plus recommendations. Output: "go to Stage 2" of "verbeteren en opnieuw". Duurt 1-3 dagen on-site of remote.
- **Stage 2 (implementation audit)**: auditor test bewijs dat de ISMS werkt. Interviews, documentatie-steekproef, walk-throughs, evidence-verification. Duurt 2-5+ dagen afhankelijk van scope. Findings als nonconformity (major/minor/observation). Major = certificaat uitgesteld tot gesloten, minor = correctief binnen 90 dagen.

Na certificering:

- **Surveillance-audit** jaarlijks, minder diep dan Stage 2, focus op veranderingen en eerder-gevonden issues.
- **Recertification-audit** elke 3 jaar, vergelijkbaar met Stage 2.

Voorbereidings-discipline: intern audit-programma (Cl 9.2) plus management-review (Cl 9.3) minstens één cyclus vóór Stage 2. Findings van interne audit vooraf oplossen.

Zie `audit-evidence` voor evidence-packaging per control.

### 6. Mapping naar andere frameworks en verification-loop

ISO 27001 is het fundament voor andere frameworks:

- **NIS2 Art 21 ↔ Annex A**: publicly available mappings (ENISA) — 27001 dekt alle 10 NIS2-maatregelen.
- **DORA ↔ 27001**: ICT-risk-management framework-eis is impliciet 27001-compatibel.
- **SOC 2 ↔ 27001**: grote overlap in controls, andere audit-model. Dual-attestation mogelijk met één ISMS.
- **NIST CSF 2.0 ↔ 27001**: cross-walks beschikbaar.

Laag 1: scope-statement eenduidig?, alle 93 Annex A-controls in SoA geadresseerd (ja/nee)?, risk-treatment-plan dekt alle boven-tolerance risks?, interne-audit-log compleet voor cyclus?. Laag 2: Annex A-control-nummers tegen de 2022-versie geverifieerd (niet tegen 2013!), ISO-clausule-verwijzingen correct, aanspraken op NIS2/DORA-mapping onderbouwd met ENISA-documenten of eigen cross-walk, niet geïmproviseerd.

## Output

```
ISO 27001:2022 assessment — <entity/scope>
Doel: <certificering Stage 1 | Stage 2 | surveillance | hercertificering | gap-analyse zonder audit>

ISMS-scope:
  Organisatorisch:  <entity/unit/product>
  Geografisch:      <locaties>
  Technologisch:    <systemen/clouds>
  Interfaces:       <in-kaart | gap>

Clausules 4-10 status:
  Cl 4 Context:           <compleet | gaps: ...>
  Cl 5 Leadership:        ...
  Cl 6 Planning:          ...
  Cl 7 Support:           ...
  Cl 8 Operation:         ...
  Cl 9 Performance:       ...
  Cl 10 Improvement:      ...

Annex A 93 controls (SoA-status):
  A.5 Organizational:    <N/37 implemented, N/37 partial, N/37 gap>
  A.6 People:            ...
  A.7 Physical:          ...
  A.8 Technological:     ...
  Exclusies (niet-applicable): <N, rationale-kwaliteit: sterk/zwak>

Risk-management:
  Methodologie:           <gebruikt + bron>
  Risk-treatment-plan:    <coverage, eigenaren>
  SoA-versie + datum:     <...>

Audit-readiness:
  Stage 1 ready:          <ja/nee met gaps>
  Stage 2 ready:          <ja/nee met gaps>
  Interne audit uitgevoerd: <datum>
  Management review:      <datum>

Mapping (optional):
  NIS2 Art 21 coverage:  <%>
  SOC 2 TSC overlap:      <summary>

Prioriteiten:
  <fix-now / fix-sprint / fix-quarter>

Verification-loop: ...
```

## Referenties

- **ISO/IEC 27001:2022** — [https://www.iso.org/standard/27001](https://www.iso.org/standard/27001). Officiële standaard (betaald). NEN verkoopt NL-versie.
- **ISO/IEC 27002:2022** — [https://www.iso.org/standard/75652.html](https://www.iso.org/standard/75652.html). Guidance-companion voor Annex A-controls, geen certificeer-eis maar praktisch onmisbaar.
- **ISO/IEC 27005:2022** — [https://www.iso.org/standard/80585.html](https://www.iso.org/standard/80585.html). Infosec risk-management, past bij 27001.
- **ENISA — NIS2 mapping** — [https://www.enisa.europa.eu/topics/nis-directive](https://www.enisa.europa.eu/topics/nis-directive). Voor cross-walks naar NIS2 Art 21.
- **IAF — International Accreditation Forum** — [https://iaf.nu/](https://iaf.nu/). Voor erkende certification-bodies.
- **Raad voor Accreditatie (RvA)** — [https://www.rva.nl/](https://www.rva.nl/). NL-accreditation-body voor certificerende instellingen.
- **NEN** — [https://www.nen.nl/](https://www.nen.nl/). Nederlandse distributeur van ISO-normen, inclusief NL-vertalingen.
- **BSI 27001 toolkit-docs** (vendor-docs met schappelijke kwaliteit) — voorbeelden van SoA-templates.

## Categorieën

- grc
