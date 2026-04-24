---
name: policy-drafter
description: Policy-drafting workflow voor security-policies — AUP, Incident Response Plan, Access Control, Data Classification, BCP, Change Management, Vendor Management, Crypto en Remote Work. Structuur met Purpose/Scope/Statement/Roles/Enforcement/Review, ISO 27001 Annex A.5 alignment, NL/EN-drafting.
---

# Policy Drafter

> **Disclaimer**: deze skill ondersteunt technische en operationele policy-drafting. Juridische review (arbeidsrecht-aspecten van AUP, privacyrecht-raakvlakken, contractuele doorwerking naar klanten) hoort bij legal/HR/DPO. Deze skill levert geen wettelijk geldige tekst.

## Wanneer gebruiken

Security-policies zijn de gedocumenteerde regels waartegen je ISMS, je compliance-audits en je dagelijkse operations gemeten worden. Deze skill helpt bij drafting, structuur-consistentie, review-workflows en clause-bibliotheken.

Activeert bij:

- Een vraag als "schrijf een AUP", "IRP-template", "access control policy", "review onze security-policies", "wat moet in een data classification policy", "hoe vaak policies herzien".
- Een handoff vanuit `iso27001` (Cl 5.2 Information Security Policy, Annex A.5-groep), `soc2` (CC1-CC2-CC5 policy-requirements), `nis2` (Art 21 eerste maatregel), `dora` (Art 6 framework).
- Een nieuwe organisatie of nieuwe product-lijn waar policy-stack nog ontbreekt.
- Jaarlijkse review-cyclus, of event-driven revisie (incident, organisatie-wijziging, nieuwe wetgeving).

### Wanneer NIET (handoff)

- Privacy-specifieke policies (privacy-statement, verwerkersovereenkomst, cookie-beleid) → `gdpr-pia`-context plus legal. Raakt aan deze skill maar vereist aparte juridische expertise.
- Technische implementatie van wat policies eisen → de security-skills (`secure-coding`, `security-review`, `container-hardening`, etc.).
- Contractuele policies richting vendors → `vendor-questionnaire` + legal.
- Risk-appetite-statement als onderdeel van risk-management → `risk-register`.
- Evidence-policy-alignment voor audits → `audit-evidence`.
- IR-operationele runbooks (stap-voor-stap respons) → `ir-runbook`. Deze skill dekt de policy-laag; het runbook is de uitvoering.

## Aanpak

Zes fases. Fase 2 (structuur) + fase 3 (drafting per type) zijn de kern.

### 1. Policy-stack inventariseren

Niet elke organisatie heeft elke policy nodig, maar een coherente stack voorkomt zowel gaps als overlap. Typische baseline:

- **Tier-1 (hoogst, board-goedgekeurd)**: Information Security Policy (de overkoepelende). Bij ISO 27001 is dit Cl 5.2-eis.
- **Tier-2 (topic-policies, CISO-goedgekeurd)**: Acceptable Use Policy, Access Control Policy, Data Classification Policy, Incident Response Plan, Business Continuity Plan, Vendor Management Policy, Change Management Policy, Cryptography Policy, Risk Management Policy.
- **Tier-3 (procedures en standaarden, dept-goedgekeurd)**: password-standard, secure-coding-standard, backup-procedure, onboarding-procedure.

Inventaris: welke policies bestaan, welke ontbreken tegen de gekozen framework (ISO 27001 Annex A.5, NIST CSF Govern-functie, SOC 2 CC5, NIS2 Art 21(1-2)). Gaps prioriteren op risk-impact, niet op gemak van schrijven.

### 2. Gedeelde structuur (tegen inconsistency)

Elke policy volgt dezelfde zes-sectie-structuur. Maakt review-auditeerbaar, vergelijkbaar, maintainable.

1. **Purpose**: waarom bestaat deze policy. Één alinea.
2. **Scope**: wie en wat. Expliciet: alle medewerkers/contractors/vendors; alle systemen/data/locaties; uitzonderingen.
3. **Policy Statement**: de regels zelf. Concreet, imperatief, zonder "should consider". "Users shall..." / "The organization must...".
4. **Roles and Responsibilities**: wie doet wat. RACI-stijl of bullet per rol.
5. **Compliance and Enforcement**: consequenties bij niet-naleven. HR-disciplinair voor medewerkers, contractueel voor vendors.
6. **Review and Revision**: review-cadens (meestal jaarlijks + event-driven), approver, versie-controle.

Metadata-header per policy: titel, policy-ID, versie, datum van uitgifte, datum van volgende review, approver, eigenaar.

Common miss: "Policy Statement" wordt vaag ("we take security seriously"). Dat is geen policy, dat is marketing. Test: kan een auditor deze policy gebruiken om te bepalen of iemand hem heeft overtreden? Zo nee, herschrijf.

### 3. Per-policy guidance (clause-libraries)

Kort per type. Gedetailleerde templates via referenties (SANS, NIST, NCSC-NL) in plaats van hier overschrijven.

- **Acceptable Use Policy (AUP)**. Covers: toegestaan gebruik van bedrijfs-assets, password-handling, e-mail/internet-gebruik, remote work, social media, reporting verdachte activiteit, privacy-verwachtingen van de medewerker. NL-specifiek: AVG-aspecten van monitoring (Art 88 AVG geeft NL ruimte, UAVG vult in) — verwijs naar legal. Voorbeeld-clauses: "Medewerkers mogen bedrijfs-assets niet gebruiken voor [lijst]. Incidental persoonlijk gebruik is toegestaan voor zover..."
- **Access Control Policy**. Covers: identity lifecycle (joiner/mover/leaver), role-based access, privileged-access-management, access-review-cyclus, MFA-vereisten, session-timeouts. Aligns met ISO 27001 Annex A.5.15-A.5.18, A.8.2-A.8.5.
- **Data Classification Policy**. Covers: classificatie-niveaus (typisch 3-4: Public, Internal, Confidential, Restricted/Secret), handling-rules per niveau (opslag, transmission, destruction), labeling-regels. Aligns met A.5.12-A.5.14.
- **Incident Response Plan (IRP)**. Covers: definities (incident vs event), severity-levels, escalation-paden, roles in IR-team, communication-eisen (intern + extern + regulator), post-incident-review. Dit is de policy-laag; het operationele runbook zit in `ir-runbook`.
- **Business Continuity Plan (BCP)**. Covers: business-impact-analysis (BIA), RTO/RPO per service, recovery-procedures op high-level, testing-cadens. Technische uitvoering in DR-playbooks; deze policy zet de eisen.
- **Vendor Management Policy**. Covers: onboarding-due-diligence, contract-clauses (aligned met `vendor-questionnaire`), ongoing-monitoring, offboarding-procedure, concentration-limits. Aligns met DORA Art 28-30 voor financial, NIS2 Art 21(4) voor overige.
- **Change Management Policy**. Covers: change-types (standard/normal/emergency), approval-thresholds, testing-vereisten, rollback-planning. Aligns met A.8.32, en relevant voor SOC 2 CC8.
- **Cryptography Policy**. Covers: approved algorithms en key-lengths (AES-256, RSA-3072+, Ed25519, ECDSA-P256+), key-management-lifecycle, crypto-agility voor post-quantum transitie. Aligns met A.8.24, FIPS 140-3 context.
- **Remote Work Policy**. Covers: approved devices en networks, VPN-eisen, physical-security-eisen thuis, data-handling op devices, meldplicht diefstal/verlies.
- **Clean Desk / Clear Screen Policy**. Covers: fysieke discipline voor gevoelige stukken, lock-on-away-policy, print-regels.

### 4. Drafting-discipline

- **Taal**: kies één primary-taal (NL voor NL-operatie, EN voor international), wees consistent. Tweetalige policies verdubbelen review-last en maken inconsistent-risk als één versie wordt bijgewerkt maar de andere niet.
- **Leesbaarheid**: korte zinnen, actieve stem, definities in een glossary-sectie of aan het begin. Vermijd juridisch jargon waar operationeel duidelijker werkt.
- **Concreet over vaag**: "Passwords must be at least 14 characters" > "Passwords must be sufficiently complex". Elke vage clause is future audit-friction.
- **Verwijzingen**: naar andere policies (niet copy-paste), naar framework-refs (ISO 27001 Annex A-codes), naar externe wetten/standaarden. Zorg dat verwijzingen actueel blijven met policy-updates.
- **Exception-procedure**: elke policy heeft een pad voor afwijkingen met CISO-approval plus deadline-voor-re-compliance. Zonder exception-procedure ontstaan informele werkaround-cultuur.

### 5. Review + approval workflow + publicatie

- **Review-cadens**: jaarlijks minimum. Event-driven herziening bij (a) significant security-incident, (b) organisatie-wijziging (M&A, scope-verandering), (c) nieuwe wet/regel (NIS2-inwerkingtreding, AVG-wijziging), (d) significant technology-verandering.
- **Approval-keten**: tier-1 naar board, tier-2 naar CISO, tier-3 naar department head. Elke approval gedocumenteerd (meeting-notulen of signed approval-memo).
- **Publicatie**: interne policy-portal (Confluence, SharePoint, dedicated GRC-platform). Zoekbaar, versioned, toegankelijk voor alle in-scope personen. Mobiel bereikbaar voor remote-workers.
- **Awareness en training**: elke policy-update genereert een communicatie-moment. Training voor high-impact-policies (AUP, IRP) jaarlijks verplicht met tracking. SOC 2 CC2-bewijs.
- **Version-history** en **change-log**: wat veranderde tussen versies en waarom. Kritiek bij audit-vragen over waarom een bepaalde clause is toegevoegd.

### 6. Verification-loop

Laag 1: scope (alle tier-1 en relevante tier-2-policies aanwezig voor de gekozen frameworks?), aannames (policy-statements zijn concreet genoeg om te auditten?), gaps (exception-procedure voor elke policy?), consistentie (terminologie consistent tussen policies, elk RACI matcht). Laag 2: geen verzonnen ISO Annex A-codes, framework-mapping klopt (bv. AUP mapt op A.5.1, A.6.2, A.5.10), NL-wettelijke verwijzingen (AVG, UAVG, Arbo) correct, geen pretentie dat een technisch standaard-document wettelijk bindend is buiten de organisatie.

## Output

Twee modes: policy-drafting (nieuwe policy produceren) of policy-review (bestaande policy beoordelen).

**Drafting-mode** levert een concept-policy-document volgens de zes-sectie-structuur, plus metadata-header, plus een referentie-lijst voor de review.

**Review-mode**:

```
Policy review — <policy-naam + versie>
Eigenaar: <...> | Laatste review: <datum> | Volgende review: <datum>

Structuur-check (zes secties):
  Purpose:          <aanwezig + kwaliteit>
  Scope:            <duidelijk afgebakend | vaag>
  Policy Statement: <concreet | vaag>
  Roles & Resp:     <RACI helder | gap>
  Compliance:       <enforcement-mechanism duidelijk | gap>
  Review/Revision:  <cadens + approver>

Content-findings:
  - Vage statements: <lijst met citaten>
  - Inconsistenties met andere policies: <lijst>
  - Framework-gaps (ISO/SOC2/NIS2/DORA): <codes>
  - Legal-review-nodig: <onderwerpen, met handoff>

Update-recommendations:
  <concrete wijzigingen met rationale>

Verification-loop: ...
```

## Referenties

- **SANS Policy Templates** — [https://www.sans.org/information-security-policy/](https://www.sans.org/information-security-policy/). Vrij beschikbare templates, goed startpunt, mag worden aangepast.
- **NIST SP 800-53 Rev. 5** — [https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final). Control-catalogus waar policies naar refereren.
- **NIST SP 800-100** — [https://csrc.nist.gov/pubs/sp/800/100/final](https://csrc.nist.gov/pubs/sp/800/100/final). Information Security Handbook, policy-structuur-guidance.
- **ISO/IEC 27002:2022** — [https://www.iso.org/standard/75652.html](https://www.iso.org/standard/75652.html). Guidance-companion voor Annex A-controls, nuttig voor policy-context.
- **NCSC-NL — Handreikingen** — [https://www.ncsc.nl/](https://www.ncsc.nl/). NL-specifieke guidance, soms template-taal.
- **BIO (Baseline Informatiebeveiliging Overheid)** — [https://bio-overheid.nl/](https://bio-overheid.nl/). Voor NL-overheid en ketenpartners, praktische template-basis.
- **ENISA — Information security policies** — [https://www.enisa.europa.eu/](https://www.enisa.europa.eu/). Publicaties met voorbeeld-policies.

## Categorieën

- grc
