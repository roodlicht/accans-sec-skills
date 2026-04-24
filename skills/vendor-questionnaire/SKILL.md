---
name: vendor-questionnaire
description: Vendor security questionnaire workflow — vendor-tiering, gestandaardiseerde vragenlijsten (CAIQ, SIG-Lite/Core, VSA), custom-authoring, evidence-reuse tegen bestaande attestations (SOC 2, ISO 27001), en ongoing vendor-risk monitoring.
---

# Vendor Security Questionnaire

> **Disclaimer**: deze skill ondersteunt security-inschatting van vendors. Contractuele en juridische review (data-processing-agreements, liability-clauses, jurisdictie) vereist legal. Deze skill vervangt geen contract-juridische expertise.

## Wanneer gebruiken

Vendor Security Questionnaires zijn het standaard-mechanisme waarmee organisaties de security-posture van hun third-party-providers beoordelen. Aan beide kanten: je stuurt ze (als afnemer) én ontvangt ze (als provider die aan B2B-klanten levert). Deze skill dekt beide rollen.

Activeert bij:

- Een vraag als "welke questionnaire gebruiken we voor deze vendor", "vul deze SIG-Lite in voor klant X", "CAIQ-antwoorden opbouwen", "wat is een redelijke questionnaire voor een low-risk SaaS", "evidence-reuse tussen vragenlijsten".
- Een nieuw vendor-onboarding-traject (sender-kant).
- Een inkomende security-vragenlijst van een klant (receiver-kant).
- Een handoff vanuit `supply-chain` (SBOM-kant), `dora` (Art 28-30 third-party risk), `nis2` (Art 21(4) supply-chain security), `policy-drafter` (vendor management policy).
- Jaarlijkse her-review van bestaande vendors.

### Wanneer NIET (handoff)

- Contract-drafting of legal-review → legal-team. Deze skill levert input voor contracten, geen contracten zelf.
- Policy-laag van vendor management → `policy-drafter`.
- Technische dep/supply-chain-evaluatie (SBOM, provenance) → `supply-chain`. Wel complementair.
- Risk-scoring-methodologie → `risk-register`.
- Compliance-specifieke attestation-productie → `iso27001`, `soc2`, `audit-evidence`.
- Privacy-specifieke vendor-beoordeling (sub-processors onder AVG Art 28) → `gdpr-pia`-context plus DPA-review.
- Fraud/financial-due-diligence → buiten scope, financial-controlling expertise.

## Aanpak

Zeven fases. Fase 1 (tiering) bepaalt alle vervolgstappen; fase 4 (evidence-reuse) is waar efficiëntie-winst zit.

### 1. Vendor-tiering

Niet elke vendor krijgt dezelfde aandacht. Tier bepaalt diepte van due-diligence.

**Tier-criteria** (meerdimensionaal):

- **Data-access**: welke data wordt verwerkt (PII? Financial? Gevoelige categorieën Art 9 AVG?)?
- **System-access**: heeft vendor toegang tot productie-systemen, admin-rollen, source-code?
- **Business-criticality**: hoe lang overleven we uitval van deze vendor?
- **Regulatory-scope**: is deze vendor onderdeel van een NIS2/DORA-onderworpen keten?

**Tier-definities** (voorbeeld 3-tier):

- **Tier-1 (critical)**: raakt PII of productie, essentieel voor core-operatie, regulatory-onderworpen. Full questionnaire + SOC 2/ISO 27001-evidence verplicht + annual review + on-site/remote audit-rechten.
- **Tier-2 (moderate)**: beperkte data-exposure of moderate business-impact. Mid-size questionnaire (SIG-Lite of CAIQ-Lite), attestation-evidence voldoende, biennial review.
- **Tier-3 (low)**: geen PII, geen productie-toegang, vervangbaar. Lightweight questionnaire (10-20 vragen), evidence-optional, triennial review.

Tiering-criteria documenteren als onderdeel van Vendor Management Policy (zie `policy-drafter`).

### 2. Gestandaardiseerde frameworks

Gebruik bestaande frameworks waar kan; custom bouwen is duur en dubbel werk.

- **CAIQ (Consensus Assessments Initiative Questionnaire)** — Cloud Security Alliance. 261 vragen (v4.0.3) gealigned met Cloud Controls Matrix (CCM). Sterkst voor cloud-service-providers. Vrij beschikbaar.
- **SIG / SIG-Lite / SIG-Core (Standardized Information Gathering)** — Shared Assessments. SIG-Lite ~300 vragen, SIG-Core ~1500, full SIG ~3000. Breed toepasbaar, commercial licence voor volledige versie.
- **VSA (Vendor Security Alliance)** — VSAQ (core) + VSAQ-full. Compact alternatief gericht op moderne SaaS.
- **NIST SP 800-171 self-assessment** — voor vendors die met US-federal/DoD-data werken (CUI).
- **CRA assessment** — verwachte rol van vendors onder EU Cyber Resilience Act voor software-product-security.

Selectie-heuristiek: als vendor zelf een framework aanbiedt ("hier is onze ingevulde CAIQ + SOC 2 report"), accepteer dat eerst. Custom-questionnaire pas als bestaande frameworks echt gaten hebben voor jouw context.

### 3. Custom-questionnaire authoring (alleen indien nodig)

Voor organisatie-specifieke vragen buiten de standaard-frameworks. Houd het beperkt tot het écht-unieke.

- **Top-level clustering**: governance, identity/access, data-protection, ops/monitoring, incident-response, supply-chain, compliance, continuity.
- **Vraag-formulering**: closed questions met evidence-request (bv. "Do you enforce MFA for admin access? [Y/N]. If yes, provide evidence screenshot/policy reference"), niet open essays ("Please describe your security").
- **Lengte**: tier-afhankelijk. Tier-1 kan 100+ vragen; tier-3 niet meer dan 20. Vendor-fatigue is reëel.
- **Language**: NL of EN, niet beide (zie `policy-drafter` fase 4).

Custom-questionnaires moeten een stable, versioned document zijn, niet elke vendor een ad-hoc-variant.

### 4. Evidence-mapping en reuse

De meeste waarde in modern-day vendor-security zit in **niet opnieuw dezelfde vragen beantwoorden**.

- **Attestation-first**: als vendor SOC 2 Type II of ISO 27001 heeft, vraag die rapporten eerst. Mapping-tabel: CAIQ-vraag X mapt naar SOC 2 CC6.1-control. Antwoord: "See attached SOC 2 report, section CC6.1, evidence in Appendix".
- **Cross-walks**:
  - CAIQ ↔ CCM ↔ ISO 27001 Annex A: CSA publiceert mappings.
  - SIG ↔ ISO 27001: Shared Assessments publiceert.
  - NIST CSF ↔ ISO 27001: veel cross-walks publiek beschikbaar.
- **Evidence-library** (als receiver): maintain een gestructureerde repository met per control type evidence. Nieuw-inkomend questionnaire: 80% van antwoorden komt uit de library, 20% is queries-specifiek.
- **Trust-centers / SafeBase / Whistic / VendorSPT**: publiek-toegankelijke portals waar je je attestations, SBOM's, en policy-overviews host voor klanten. Verlaagt inkomende-questionnaire-last. Voor mature B2B-SaaS standaard.
- **CAIQ-based STAR** (CSA): publieke registry van CAIQ-ingevulde vendors. Check vóór je custom-questionnaire stuurt.

Ontbrekende evidence voor een specifieke vraag is op zich een finding: vendor claimt "ja" maar kan niet staven.

### 5. Review + risk-acceptance

Na ontvangen antwoorden:

- **Red-flag-pass**: auto-disqualifiers. Geen MFA op admin, geen encryption-at-rest voor PII, geen incident-response-plan, geen breach-notification-clause. Vendors die hier falen zijn niet onderhandelbaar tenzij de business-case enorm is en risk expliciet is geaccepteerd.
- **Scoring**: tier-aangepast scoren. Tier-1 met gaps = ga terug naar vendor met remediation-request. Tier-3 met minor gaps = acceptabel met compensating controls.
- **Risk-acceptance**: als gaps blijven, documenteer in `risk-register` met expliciete accept-beslissing, eigenaar, deadline voor her-review.
- **Contract-clauses** die uit vragenlijst volgen: breach-notification-timeline, right-to-audit, data-residency-garantie, sub-processor-approval-keten, exit-procedure met data-return/destruction. Specifiek voor DORA Art 30 verplicht voor financial entities.
- **Complementary User Entity Controls (CUECs)**: welke controls rekent vendor op aan jou? Documenteer en communiceer intern (zie `soc2` fase 5).

### 6. Ongoing monitoring

Eén-shot vendor-assessment is onvoldoende. Vendors veranderen; risk-exposure ook.

- **Re-assessment-cadens** per tier (annual tier-1, biennial tier-2, triennial tier-3).
- **Event-triggers**: incident bij vendor (public breach), significant-organisational-change, contract-renewal, change in data-scope.
- **Continuous-monitoring-tools**: BitSight, SecurityScorecard, Panorays, UpGuard. Leveren outside-in risk-ratings (DNS-config, cert-hygiene, leaked-credentials, patch-cadens). Geen vervanging voor questionnaire maar wel red-flag-detector tussen formele reviews in.
- **Register**: aligned met DORA Art 28(3) register-of-information voor financial entities (ingediend bij DNB/AFM), of equivalent voor niet-financial.

### 7. Verification-loop

Laag 1: scope (alle tier-1-vendors geassessed, geen shadow-IT-vendors via P-card vergeten?), aannames (vendor-attestations nog geldig, niet verlopen?), gaps (sub-processors in kaart, niet alleen top-level vendor?). Laag 2: framework-versienummers (CAIQ v4.0.x, SIG-jaar) correct, cross-walk-claims onderbouwd met CSA/Shared-Assessments-publicaties, geen verzonnen SOC 2-mapping-codes, contract-clause-terminologie technisch en niet legally-overshooting.

## Output

Twee modes: sender (questionnaire uitsturen + antwoorden reviewen) of receiver (inkomende questionnaire beantwoorden).

**Sender-mode**:

```
Vendor security assessment — <vendor>
Tier: <1 | 2 | 3> | Onboarding-datum: <...> | Laatste review: <...>

Questionnaire:
  Framework:          <CAIQ v4 | SIG-Lite | custom>
  Verstuurd:          <datum>
  Ontvangen:          <datum, N antwoorden>

Attestations:
  SOC 2 Type II:      <aanwezig, periode, issuer>
  ISO 27001:          <aanwezig, scope, vervaldatum>
  Andere:             <DORA CTPP, FedRAMP, ...>

Findings:
  Red flags:          <lijst, blocker voor onboarding?>
  Gaps (niet-blocker):<lijst met compensating controls of acceptance>
  Evidence-gaps:      <claims zonder bewijs>

Contract-clauses (aligned met findings):
  Breach-notification:<timing>
  Right-to-audit:     <scope>
  Data-residency:     <regio-lock>
  Sub-processor:      <approval-keten>
  Exit:               <return/destruction-procedure>

Decision:
  Onboard:            <ja | met voorwaarden | nee>
  Risk accepted:      <register-ID in risk-register>

Verification-loop: ...
```

**Receiver-mode**: gestructureerde antwoord-package met verwijzingen naar evidence-library-items, cross-walked naar de gevraagde framework-codes.

## Referenties

- **CSA CAIQ** — [https://cloudsecurityalliance.org/research/cloud-controls-matrix](https://cloudsecurityalliance.org/research/cloud-controls-matrix). CAIQ + CCM, vrij downloadbaar, cross-walks naar andere frameworks.
- **CSA STAR Registry** — [https://cloudsecurityalliance.org/star/registry](https://cloudsecurityalliance.org/star/registry). Publiek register van CAIQ-ingevulde providers.
- **Shared Assessments SIG** — [https://sharedassessments.org/sig/](https://sharedassessments.org/sig/). SIG-familie questionnaires, commercial.
- **Vendor Security Alliance** — [https://www.vendorsecurityalliance.org/](https://www.vendorsecurityalliance.org/). VSAQ-core en VSAQ-full.
- **NIST SP 800-171** — [https://csrc.nist.gov/pubs/sp/800/171/r3/final](https://csrc.nist.gov/pubs/sp/800/171/r3/final). Voor CUI-handling assessment.
- **EU Cyber Resilience Act** — [https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act). Relevant voor vendor-assessment van software-products vanaf inwerkingtreding.
- **NIST SP 800-161 Rev. 1** — [https://csrc.nist.gov/pubs/sp/800/161/r1/final](https://csrc.nist.gov/pubs/sp/800/161/r1/final). Cybersecurity Supply Chain Risk Management practices.

## Categorieën

- grc
