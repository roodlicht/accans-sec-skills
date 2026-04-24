---
name: risk-register
description: Risk-management workflow — risk identification, qualitative en quantitative analyse (likelihood × impact, FAIR-basis), evaluatie tegen risk-appetite, treatment (avoid/mitigate/transfer/accept), heatmaps en trend, met ISO 31000 en ISO 27005 als methodologie-basis.
---

# Risk Register

> **Disclaimer**: risk-management is een management-verantwoordelijkheid. Deze skill helpt bij methodologie en documentatie; risk-appetite, acceptance-decisies en treatment-keuzes vragen eigenaarschap bij het management-orgaan.

## Wanneer gebruiken

Deze skill is methodologisch, niet framework-specifiek. Hij wordt aangeroepen vanuit vrijwel elke andere GRC-skill — `iso27001` (Cl 6.1), `soc2` (CC3 Risk Assessment), `nis2` (Art 21 eerste maatregel), `dora` (Art 5-14), `gdpr-pia` (Art 35 via risk-analysis-fase). Ook stand-alone toepasbaar voor generic business-risk-management.

Activeert bij:

- Een vraag als "hoe doen we risk-scoring", "welke methodologie voor risk-assessment", "heatmap opbouwen", "wat is risk-appetite", "FAIR vs ISO 27005", "wanneer accepteren we een risico".
- Een handoff vanuit compliance-skills wanneer een risk-assessment nodig is.
- Een periodieke (kwartaal/jaar) risk-review.
- Nieuw product/dienst/project dat een risk-assessment als voorwaarde heeft.
- Een incident waar achteraf blijkt dat de kans/impact-inschatting scheef stond — revisie-traject.

### Wanneer NIET (handoff)

- Framework-specifieke compliance-mapping → de betreffende GRC-skill. Deze skill levert de risk-methode, die skills de compliance-wrapping.
- Technische threat-modeling op design-niveau → `threat-modeler`. Een DFD-plus-STRIDE-exercitie voor een specifiek systeem is geen enterprise-risk-assessment. Ze vullen elkaar aan: threat-modeler produceert input voor risk-register.
- DPIA specifiek → `gdpr-pia`. DPIA is risk-analyse vanuit betrokkenen-perspectief, andere lens.
- Security-finding-triage uit scans → `cve-triage` en `security-review` hebben eigen severity-modellen. Die gaan over technical-findings, deze skill gaat over enterprise-niveau risico's.
- Ops-incident-handling → `ir-runbook`. Incidents zijn gerealiseerde risico's; deze skill is anticipatief.
- Financial-risk specifiek (krediet, marktrisico) ligt buiten scope — andere vak-expertise.

## Aanpak

Zeven fases. Fases 2–5 vormen de ISO 31000-cyclus; fases 1 en 6 randvoorwaarden, fase 7 verification.

### 1. Methodologie en register-opzet

Beslissingen vooraf die de rest van de cyclus kaderen.

- **Framework-basis**: ISO 31000:2018 voor principes, ISO 27005:2022 voor infosec-specifieke invulling, NIST SP 800-30 als alternatief met sterke US-overheids-adoption, FAIR voor kwantitatieve monetaire risk-analyse. Keuze één van deze plus eventueel FAIR als overlay voor kritieke risico's.
- **Taxonomie**: hoe benoem je risico's? Asset-based (per systeem/dataset), threat-based (per aanvals-klasse), scenario-based (per bedrijfsimpact-scenario), of hybrid. Infosec-context typisch scenario-based ("leak van klantdata") aangevuld met asset-hooks.
- **Register-format**: spreadsheet, GRC-tool (ServiceNow, Archer, OneTrust, Drata, SafeBase), of maatwerk-db. Spreadsheet is prima tot ~100 risks; schaal daarboven vereist tooling.
- **Velden per risk**: ID, titel, beschrijving (threat + vulnerability + consequence), eigenaar, categorie (strategic/operational/financial/compliance/infosec), likelihood-score, impact-score, inherent-risk, geselecteerde treatment, residual-risk, controls, review-datum, status.
- **Schaal**: 3x3, 5x5, of 10x10. 5x5 is de sweet spot — 3x3 mist nuance, 10x10 geeft valse precisie.

### 2. Risk-identification

Sources van risk-input:

- **Threat-modeling** (handoff naar `threat-modeler`): technische dreigingen op design/code-niveau.
- **Incidents en near-misses**: wat is er al gebeurd of bijna gebeurd? Hoogste-kwaliteit risk-data is altijd eigen historie.
- **Threat intelligence**: ENISA threat landscape, MITRE ATT&CK, ISAC-feeds, vendor-advisories. Zie ook `ioc-hunter`.
- **Workshops** met stakeholders over business-impact-scenario's.
- **Frameworks**: NIS2 Art 21 / OWASP Top 10 / CIS Controls dienen als checklist voor "zijn we deze categorie vergeten".
- **Supplier-register**: third-party risks raken vaak pas op deze laag zichtbaar.

Kwaliteits-check: een goed-geformuleerd risk heeft **threat + vulnerability + consequence** in één zin. "Een ransomware-actor exploiteert een onverstookte RDP-endpoint en encrypt productie-data, wat X dagen downtime en ~€Y schade veroorzaakt" — niet "Ransomware".

### 3. Analyse: qualitative en quantitative

**Qualitative** (ISO 27005-stijl): likelihood 1-5, impact 1-5, score = product.

Likelihood-criteria expliciet:

- 1 Verwaarloosbaar: < 1× per 5 jaar, nooit eerder voorgekomen in vergelijkbare organisaties.
- 2 Laag: < 1× per 2 jaar.
- 3 Matig: 1× per jaar ballpark, voorgekomen in sector.
- 4 Hoog: meer dan eens per jaar, bekend patroon.
- 5 Zeker: elke maand of vaker, aanhoudend.

Impact-criteria expliciet (multi-dimensional, neem ernstigste):

- Financial: € bedragen met omvang-context.
- Operational: downtime-uren met criticality.
- Regulatory: boetes, enforcement-actie, consent decree.
- Reputational: media-reach, klantverlies, trust-erosie.
- Safety / human: fysieke of mentale schade (voor processen waar dat raakt).

**Quantitative** (FAIR): monetaire verwachtings-distributies. Loss Event Frequency × Loss Magnitude, waar elke variabele een range is met distributie (Beta-PERT of Monte Carlo). Uitkomst: "risico X tussen €A en €B met 90% confidence".

Wanneer welke: qualitative default voor breed register, FAIR voor top-5 kritieke risks waar board-beslissing over treatment-budget speelt.

Inherent risk: zonder controls. Residual risk: met huidige controls. Beide documenteren; het verschil toont control-effectiviteit.

### 4. Evaluatie: risk-appetite en tolerance

Een risk-score is niet genoeg. Je moet een lijn hebben waarvoor hij wel of niet acceptabel is.

- **Risk-appetite**: high-level statement van board — hoeveel risico acceptabel is per categorie. Voorbeeld: "Zero tolerance for regulatory non-compliance incidents that result in enforcement action; moderate tolerance for operational disruptions with <4 hour recovery."
- **Risk-tolerance**: concrete numerieke drempels per dimensie. Bijvoorbeeld: "Operational risks with impact ≥ 4 require immediate treatment; impact 3 may be accepted with CISO sign-off."
- **Risk-capacity**: maximaal absorbeerbaar risico (bedrijfs-kritiek, niet appetite). Typically much higher than appetite.

Risks boven tolerance moeten naar treatment (fase 5). Risks onder tolerance kunnen accepted of in het register blijven monitoring.

Bij ontbrekende appetite-statement: deze skill levert niet pas een rapport af, hij forceert een gesprek. Zonder appetite is elke risk-score los geld.

### 5. Treatment

Vier opties (ISO 31000, parallel aan `threat-modeler` fase 3):

- **Avoid**: niet doen, feature schrappen, activiteit stoppen. Sterkst mitigerend, soms zakelijk onhaalbaar.
- **Modify / Mitigate**: controls toevoegen om likelihood of impact te reduceren. Zie de technische skills voor implementatie.
- **Share / Transfer**: contractueel (SLA, cyber-insurance, third-party-service) of operational (outsourcing). Transfer verplaatst risico, elimineert niet.
- **Retain / Accept**: expliciete keuze om risico te lopen, met document en deadline voor re-review.

**Per treatment-keuze**: eigenaar, deadline, budget, expected residual risk post-treatment, review-datum.

Treatment-plan is een levend document. Voortgang op elk treatment-pad tracken als project; resource-allocatie zichtbaar maken aan management.

### 6. Monitoring en review

Risk-register is geen jaarlijkse exercitie maar een continu proces.

- **Review-cadens**: kwartaalreview van top risks met owners, jaarlijks volledige herziening, ad-hoc bij significant-event (nieuw product, incident, wetgeving-wijziging).
- **Trending**: hoe zijn de top-10 risks veranderd over 4 kwartalen? Nieuwe risks erbij, oude weg, score-shifts?
- **Heatmap**: 5x5-matrix likelihood × impact, telling per cel. Standaard-visualisatie richting board.
- **KRIs (Key Risk Indicators)**: metrics die vroege signalen geven dat een risk bewegend is. Bijvoorbeeld: aantal high-severity-vulnerabilities open > 30 dagen als leading indicator voor "incident-waarschijnlijkheid stijgt".
- **Post-incident review** koppelt gerealiseerde impact terug naar register: klopte de inschatting? Pas bij aan voor toekomst.

### 7. Verification-loop

Laag 1: scope (alle categorieën dekken — strategic, operational, financial, compliance, infosec, reputational?), aannames (risk-appetite-statements bestaan, anders is evaluatie irrationeel), gaps (third-party / supply-chain apart meegenomen, of onzichtbaar afhankelijk van internals?), consistentie (treatment-plan-deadlines gaan nergens naartoe zonder eigenaarschap). Laag 2: methodologie-verwijzingen (ISO 31000, 27005, NIST 800-30, FAIR) correct geattribueerd, geen valse precisie (FAIR-uitkomsten zonder Monte Carlo-grond zijn geen FAIR), heatmaps vertonen geen 10-dimensionaal rapport gereduceerd tot 1 cel.

## Output

```
Risk-register — <entity/scope>
Methodologie: <ISO 31000 + 27005 | NIST 800-30 | FAIR overlay>
Schaal:       <3x3 | 5x5 | 10x10>
Datum:        YYYY-MM-DD | Review-cyclus: <kwartaal/jaar>

Risk-appetite-statement:
  <board-goedgekeurde tekst, per categorie>

Register-samenvatting:
  Totaal:     N risks
  Top 10:     gerangschikt op residual-risk-score
  Verdeling:  per categorie + per treatment-keuze

Per risk:
  ID:           R-NNN
  Titel:        <threat + vulnerability + consequence in één zin>
  Eigenaar:     <naam + rol>
  Categorie:    <strategic/operational/financial/compliance/infosec/reputational>
  Inherent:     likelihood × impact = N
  Controls:     <huidige controls met effectiviteit>
  Residual:     likelihood × impact = N
  Treatment:    <avoid|modify|share|retain>
  Actie-plan:   <eigenaar, deadline, budget>
  Review:       <datum>

Top-risks heatmap:
  <5x5 matrix, cel-telling>

Trend (t.o.v. vorig kwartaal):
  Nieuwe risks:   N
  Geaccepteerde/geretireerde: N
  Score-shifts:   <up/down met reden>

KRIs:
  <indicator: drempel: huidige waarde: trend>

Verification-loop: ...
```

## Referenties

- **ISO 31000:2018** — [https://www.iso.org/standard/65694.html](https://www.iso.org/standard/65694.html). Risk management principles and guidelines, non-certifiable framework.
- **ISO/IEC 27005:2022** — [https://www.iso.org/standard/80585.html](https://www.iso.org/standard/80585.html). Infosec-specifieke uitwerking van 27001-risk-management.
- **NIST SP 800-30 Rev. 1** — [https://csrc.nist.gov/pubs/sp/800/30/r1/final](https://csrc.nist.gov/pubs/sp/800/30/r1/final). Risk Assessment Guide.
- **NIST SP 800-39** — [https://csrc.nist.gov/pubs/sp/800/39/final](https://csrc.nist.gov/pubs/sp/800/39/final). Managing Information Security Risk.
- **FAIR Institute** — [https://www.fairinstitute.org/](https://www.fairinstitute.org/). Kwantitatieve risk-methodologie.
- **The Open Group FAIR Standard** — [https://www.opengroup.org/fair](https://www.opengroup.org/fair). Officiële standaard voor FAIR.
- **ENISA Threat Landscape** — [https://www.enisa.europa.eu/topics/cyber-threats/threats-and-trends](https://www.enisa.europa.eu/topics/cyber-threats/threats-and-trends). Jaarlijks rapport, nuttig voor risk-identification-input.
- **COSO ERM Framework** — [https://www.coso.org/](https://www.coso.org/). Enterprise Risk Management framework, breder dan infosec.

## Categorieën

- grc
