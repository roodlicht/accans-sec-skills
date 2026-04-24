---
name: nis2
description: EU NIS2 Directive (2022/2555) gap analysis — scope determination (essential vs important entities across 18 sectors), governance obligations (Art 20), 10 baseline risk-management measures (Art 21), incident reporting timelines (Art 23), and Dutch implementation via the Cyberbeveiligingswet.
---

# NIS2 Gap Analysis

> **Disclaimer**: deze skill is geen juridisch advies. Hij helpt bij scoping en technische gap-analyse tegen de tekst van de richtlijn. Definitieve juridische kwalificatie (entity-classificatie, sancties-risico, contractuele gevolgen) vereist advies van een jurist met NIS2-ervaring, eventueel met compliance-afdeling of externe counsel.

## Wanneer gebruiken

De NIS2-richtlijn (EU 2022/2555) verving NIS1 en is op 17 oktober 2024 van kracht geworden. Nederland implementeert via de Cyberbeveiligingswet (`[verify voor actuele status — wetstraject is in beweging geweest door 2024 en 2025]`). Deze skill dekt beide: EU-richtlijntekst als primaire bron, NL-implementatie als toepassing.

Activeert bij:

- Een vraag als "valt onze organisatie onder NIS2", "wat moeten we doen voor NIS2", "NIS2 gap-analyse", "hebben we een incident-meldingsplicht", "wat zijn de 10 maatregelen".
- Een organisatie die overweegt of zij essential of important entity is (sectoren in bijlagen I en II), of wier leveranciers die status hebben (contractuele doorwerking).
- Een handoff vanuit `iso27001` of `risk-register`: NIS2 Art 21 mapt op ISO 27001-Annex A en op NIST CSF.
- Een incident waar de vraag "moeten we dit melden aan CSIRT-NL" opkomt.

### Wanneer NIET (handoff)

- Technische implementatie van de 10 maatregelen op code/system-niveau → de betreffende security-skills (`secure-coding`, `sast-orchestrator`, `ir-runbook`, etc.). NIS2 vraagt dát je dingen doet; hoe je ze doet zit in die skills.
- DORA-compliance voor financiële entiteiten → `dora`. DORA is lex specialis voor financial, NIS2 is horizontaal. Bij financiële organisaties kunnen beide tegelijk van toepassing zijn.
- GDPR/AVG meldingen (datalekken) → `gdpr-pia` plus AVG Art 33/34. NIS2-incidentmelding is additief, niet vervangend.
- ISO 27001-certificering als doel → `iso27001`. NIS2 eist geen certificering.
- Contractuele supply-chain-verplichtingen met technische uitwerking → `vendor-questionnaire` en `supply-chain`.
- Beleidsdocument-drafting → `policy-drafter`.

## Aanpak

Zes fases. Fase 1 is wettelijk het zwaarst (scope-bepaling), fases 2–4 zijn de kern-verplichtingen, fase 5 vertaalt naar NL-implementatie, fase 6 is de verification-loop.

### 1. Scope-bepaling: essential vs important entity

NIS2 onderscheidt twee categorieën met verschillende toezichtsregimes:

- **Essential entities (Annex I)**: energie, transport, banken, financiële-marktinfrastructuur, gezondheid, drinkwater, afvalwater, digitale infrastructuur (DNS/TLD/IXP/data-centers/cloud), ICT service management business-to-business, publieke administratie, ruimtevaart.
- **Important entities (Annex II)**: post en koerier, afvalbeheer, chemicaliën, voedsel, fabricage (geselecteerde sub-sectoren), digital providers (online marketplaces, search engines, social networking), research.

Daarbinnen gelden **size-caps** (Art 2): in beginsel alleen medium- en large-sized organisaties (>50 FTE of >€10M omzet), met uitzonderingen voor kritieke kleine organisaties (DNS-providers, TLD-registries, trust service providers, etc. zijn in-scope ongeacht grootte).

Reviewer-checks:

- Welke sector (Annex I/II en sub-code)?
- Size-criterium overschreden?
- Gekwalificeerd als "providing services in de EU"? Non-EU vestiging kan nog steeds in-scope zijn als ze diensten levert aan EU-klanten.
- Subsidiaries/holdings: NIS2 werkt op entity-niveau, niet group-niveau. Parent company kan buiten scope zijn terwijl een dochter in-scope is.

Twijfelgevallen documenteren met verwijzing naar specifieke Annex-entries. Onduidelijkheid over essential vs important heeft reële consequenties (proactive vs reactive toezicht, hoogte boetes).

### 2. Governance (Art 20)

Het management is aansprakelijk voor cybersecurity. Dit is een substantiële verschuiving ten opzichte van NIS1.

- **Art 20(1)**: het management-orgaan moet cybersecurity-risicomaatregelen goedkeuren én op naleving toezien.
- **Art 20(2)**: management moet opleiding volgen en medewerkers moeten vergelijkbare training krijgen.
- Aansprakelijkheid: directieleden kunnen persoonlijk worden aangesproken op grove nalatigheid in cybersecurity. In NL-implementatie wordt de exacte invulling via de Cyberbeveiligingswet bepaald.

Document-eisen voor reviewer:

- Risk-management charter dat aantoonbaar door board is goedgekeurd.
- Minstens één jaarlijkse cyber-briefing aan board, met agenda-items en presentatie.
- Security-awareness-training voor alle medewerkers, trainings-log bijhouden.

### 3. De tien baseline-maatregelen (Art 21)

NIS2 Art 21(2) lijst tien categorieën minimum-maatregelen. Elke in-scope organisatie moet aantoonbaar deze tien geadresseerd hebben:

1. **Beleid voor risico-analyse en informatiebeveiliging** (policy-drafter / risk-register).
2. **Incident-afhandeling** (ir-runbook, detection-engineer).
3. **Business continuity** — back-ups, disaster recovery, crisis management.
4. **Supply-chain security** — inclusief relaties met directe leveranciers (vendor-questionnaire, supply-chain).
5. **Security in netwerk- en informatiesystemen-acquisitie, -ontwikkeling en -onderhoud** — vulnerability handling (cve-triage, secure-coding, sast-orchestrator).
6. **Beleid en procedures voor effectiviteits-evaluatie** van cybersecurity-maatregelen (audit-evidence).
7. **Basale cyber-hygiëne** en security-awareness-training.
8. **Beleid en procedures voor cryptografie**, indien toepasselijk ook encryption.
9. **Personeel-security, toegangsbeleid, asset-management**.
10. **MFA of continu-authenticatie, secure voice/video/text-communicatie, noodcommunicatie**.

Deze tien zijn opzettelijk framework-agnostisch geformuleerd. Mapping naar concrete frameworks:

- ISO 27001:2022 Annex A dekt alle tien.
- NIST CSF 2.0 (Govern/Identify/Protect/Detect/Respond/Recover) dekt alle tien, met Govern-functie als extra dekking voor Art 20.
- CIS Controls v8: 18 controls dekken de tien thema's.

Gap-analyse-workflow: per maatregel de huidige staat benoemen (beleid + bewijs + gaps), koppelen aan een framework-control-ID, eigenaar en deadline.

### 4. Incident-rapportage (Art 23)

Drie-fasen tijdlijn voor "significant incidents" (kennelijke impact op dienstverlening, of exploitatie van kwetsbaarheid van derde partij):

- **24 uur**: early-warning naar CSIRT/competent authority. Vermeldt of er sprake is van malicious intent of grensoverschrijdende impact.
- **72 uur**: incident-notification met severity + impact-assessment + indicators of compromise (voor zover bekend).
- **1 maand**: final report met root-cause + getroffen maatregelen + impact.

NL-specifiek: CSIRT-NL (Computer Security Incident Response Team, onder NCSC-NL / ministerie JenV). Competent authority verschilt per sector — voor de meeste niet-overheid valt toezicht onder de Rijksinspectie Digitale Infrastructuur (RDI) na inwerkingtreding Cyberbeveiligingswet. `[verify huidige competent authority per sector]`.

Reviewer-workflow voor ir-runbooks:

- Is er een procedure voor 24h early-warning? Wie besluit, wie stelt op?
- Is er een template voor 72h-notification met verplichte velden?
- Is er een follow-up discipline voor de 1-maand rapportage?
- Wie traint medewerkers op "dit lijkt een NIS2-incident, escaleren"?

### 5. Nederlandse implementatie: Cyberbeveiligingswet (CBW)

De Cyberbeveiligingswet zet NIS2 om naar Nederlands recht. `[verify actuele status — per publicatie van deze skill was het wetstraject nog in beweging; check kamerstukken-overzicht bij tweedekamer.nl]`. Praktische gevolgen die je in de gaten houdt:

- **Registratieplicht**: in-scope entities moeten zich registreren bij de RDI (voor de meeste sectoren) of sector-specifieke toezichthouder.
- **Sancties**: Art 34 van de richtlijn noemt maximumboetes van €10M of 2% wereldwijde jaaromzet voor essential, €7M of 1.4% voor important. CBW operationaliseert deze.
- **Toezicht-modaliteiten**: essential entities zijn onderworpen aan ex-ante toezicht (inspecties, audits), important entities ex-post (na aanleiding).
- **Informatie-delen**: de CBW faciliteert deling van threat-intel via CSIRT-NL, met anonimiseringsoptie.

Raadpleeg ter verificatie de actuele versie van de wet (wetten.overheid.nl zodra in werking) en parallel publicaties van NCTV/NCSC-NL over implementatie-guidance.

### 6. Verification-loop

Laag 1: scope (alle relevante entities binnen organisatie meegenomen? Alle 10 maatregelen geadresseerd, geen stilzwijgende gaps?), aannames (status Cyberbeveiligingswet op datum van het rapport correct?), gap-analyse (welke maatregelen zouden een auditor het zwakst vinden?). Laag 2: article-nummers uit richtlijn 2022/2555 kloppen, geen verzonnen Annex-entries, NL-specifieke namen (RDI, CSIRT-NL, NCSC-NL, NCTV) correct gespeld en actueel gerolverdeeld, `[verify]`-markers geplaatst waar wetgeving in beweging is.

## Output

```
NIS2 gap-analyse — <organisatie/entity>
Datum: YYYY-MM-DD | NIS2-datum van kracht: 2024-10-17 | NL CBW-status: [verify]

Scope:
  Sector (Annex I/II):    <sector + sub-code>
  Size-criterium:         <medium | large | klein met uitzondering>
  Classificatie:          <essential | important | buiten scope>
  Rationale:              <1-3 zinnen, artikel-verwijzingen>

Governance (Art 20):
  Board-approved cyber charter:    <ja/nee + datum>
  Jaarlijkse board-briefing:       <ja/nee + laatste datum>
  Awareness-training medewerkers:  <coverage%, log aanwezig>

Tien baseline-maatregelen (Art 21):
  1. Risk-analyse + infosec-beleid:  <staat | bewijs | gap>
  2. Incident-afhandeling:            ...
  3. Business continuity:             ...
  4. Supply-chain security:           ...
  5. Acquisition/development/maintenance: ...
  6. Effectiviteits-evaluatie:        ...
  7. Cyber-hygiëne + training:        ...
  8. Cryptografie:                    ...
  9. Personeel + toegang + assets:    ...
 10. MFA + secure comms:              ...

Incident-rapportage (Art 23):
  24h-procedure:         <aanwezig | gap>
  72h-notification:      <template aanwezig | gap>
  1-maand final report:  <procedure aanwezig | gap>
  CSIRT-NL-contact:      <geregistreerd | pending>

NL-implementatie:
  RDI-registratie:       <verplicht + gedaan | n.v.t.>
  Sector-toezichthouder: <welke>
  Sancties-scope:        <max-boetes per categorie>

Prioriteiten (fix-now/fix-sprint/fix-quarter):
  <lijst>

Verification-loop: ...
```

## Referenties

- **EU Directive 2022/2555** (NIS2) — [https://eur-lex.europa.eu/eli/dir/2022/2555](https://eur-lex.europa.eu/eli/dir/2022/2555). Officiële tekst, NL-taalversie beschikbaar via taalselectie.
- **ENISA NIS2** — [https://www.enisa.europa.eu/topics/nis-directive](https://www.enisa.europa.eu/topics/nis-directive). Guidance-publicaties en implementatie-toolkit.
- **NCSC-NL** — [https://www.ncsc.nl/](https://www.ncsc.nl/). Nationaal CSIRT plus guidance.
- **NCTV** — [https://www.nctv.nl/](https://www.nctv.nl/). Beleids-context voor NL-cybersecurity-wetgeving.
- **Rijksinspectie Digitale Infrastructuur (RDI)** — [https://www.rdi.nl/](https://www.rdi.nl/). Toezichthouder voor meerdere NIS2-sectoren.
- **Cyberbeveiligingswet — wetstraject** — [https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen](https://www.tweedekamer.nl/kamerstukken/wetsvoorstellen). Zoek op "Cyberbeveiligingswet" voor de meest actuele versie.
- **Europese Commissie — NIS2 overview** — [https://digital-strategy.ec.europa.eu/en/policies/nis2-directive](https://digital-strategy.ec.europa.eu/en/policies/nis2-directive).
- **ISO/IEC 27001:2022** — [https://www.iso.org/standard/27001](https://www.iso.org/standard/27001). Mapping-doel voor Art 21-maatregelen.
- **NIST Cybersecurity Framework 2.0** — [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework). Alternatieve mapping-basis.

## Categorieën

- grc
