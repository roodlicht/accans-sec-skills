---
name: phishing-sim
description: Phishing-simulation campaign workflow — RoE en ethisch-scope-template, populatie-segmentatie, pretexting-patronen (HR/IT/finance/vendor/calendar), infrastructure (sender-domain, SPF/DKIM/DMARC, tracking), klikrate-en-credential-success-metrics, opt-out en duty-of-care, NL/EU AVG-context voor medewerker-monitoring.
---

# Phishing Simulation

> **Awareness-doel + ethical-template**: phishing-sims richten zich op het verbeteren van organisatie-bewustzijn, niet op het belachelijk maken van individuen. Geen ad-hoc spear-phishing tegen specifieke personen zonder schriftelijk akkoord van management én HR. Geen pretexts die fundamenteel mistrust zaaien (familie-noodgevallen, ziekte van collega's, gefingeerde HR-disciplinaire-zaken). NL/EU-context: medewerker-monitoring valt onder AVG plus arbeidsrecht; consultatie ondernemingsraad en/of werknemers-vertegenwoordiging is meestal verplicht voorafgaand aan campaigns. Deze skill structureert; juridische beoordeling hoort bij legal/HR/DPO.

## Wanneer gebruiken

Phishing-sims zijn de standaard voor organisatie-awareness en initial-access-testing in red-team-engagements. Ze zijn ook het eenvoudigst tot wantrouwen-bron worden bij slecht-uitgevoerde campaigns. Discipline op pretext-keuze, opt-out en post-campagne-feedback is geen extra — het is de campaign.

Activeert bij:

- Een vraag als "design een phishing-campagne", "welke pretexting-patronen zijn redelijk", "SPF/DKIM/DMARC voor onze sending-infra", "klikrate-baselines", "post-campagne-debrief", "hoe doen we dit AVG-correct".
- Een red-team engagement waar initial-access via phishing nodig is en RoE expliciet credential-harvesting of malware-delivery toelaat.
- Een security-awareness-programma met periodieke (kwartaal/half-jaar) sims als training-vehicle.
- Een handoff vanuit `recon-agent` (employee-OSINT-output als input voor target-list).
- Een compliance-vraag uit `nis2` Art 21 (cyber-hygiëne, awareness-training) of `iso27001` Annex A.6.3 (awareness).

### Wanneer NIET (handoff)

- Post-foothold actie na succesvolle phish → `post-exploit`, `c2-hygiene`, `ad-attacks`. Deze skill stopt bij click/credential-capture/payload-delivery.
- Web-app-exploit-context (de phishing-link landt op een gecontroleerde web-app) → `web-exploit-triage`, `payload-crafter`.
- Reporting → `pentest-reporter`.
- AVG/juridische-review zelf → DPO + legal. Deze skill noemt verplichtingen, levert geen advies.
- Vendor-procurement (Knowbe4 / Cofense / Hoxhunt-keuze) → buiten scope; deze skill levert methodologie, geen vendor-comparison.
- Detection-tuning op phishing-emails-in-inbox → `detection-engineer`, `siem-query`.
- Forensics na een succesvol echte-aanvaller-phish → `ir-runbook`, `forensics-assist`.

## Aanpak

Zes fases. Fase 1 (RoE + ethical-template) en fase 6 (debrief + opt-out + duty-of-care) zijn de borging tegen "campagne wordt awareness-incident".

### 1. Rules of Engagement en ethical-template

Vóór elk campagne-design ligt een document waarin staat:

- **Doel** van de sim. Awareness-training, baseline-meting, red-team-initial-access, of compliance-evidence?
- **Doelgroep** en uitsluitingen. Welke afdelingen, welke senioriteits-niveaus. Wie moet niet (medewerkers in re-integratie, mensen die recent burnout-melding hebben gedaan, externe contractors zonder formele werknemer-status). HR-input verplicht.
- **Toegestane pretexts** (zie fase 3) en uitgesloten pretexts. Standaard-uitsluitingen: medische gevallen, ziekte van collega, fictieve disciplinaire HR-acties, persoonlijke financiële schade-emails, relaties-gerelateerde berichten, kindermisbruik-meldingen, etc. Lijst dichttimmeren vóór campaign.
- **Tijd-window**. Werkuren? Off-hours uitgesloten? Vakantieperiodes? Meestal: niet sturen vóór maandag 9h of na vrijdag 17h, niet in de week voor of na bekende rust-momenten.
- **Opt-out-procedure**. Iedereen heeft een pad om uit toekomstige sims te worden gehaald, zonder gevolgen. Communiceer dit pre-campaign in algemene awareness-update.
- **Reactie-procedure** voor wie reageert (klikt, credentials invoert, attachment opent). Onmiddellijk een training-pagina in plaats van straf-feedback.
- **Reactie-procedure** voor wie het herkent en meldt. Positieve bevestiging — dat is de gedragsverandering die je zoekt.
- **Toezichthouder-akkoord**: in NL betekent dit consultatie ondernemingsraad (als die er is) plus DPO-akkoord plus management-tekening. Sommige sectoren (zorg, overheid) hebben aanvullende eisen.
- **Data-handling**. Welke data verzamel je (klik, credential, IP, user-agent)? Hoe lang bewaard? Aggregaten openbaar, individueel-gegevens niet — dat is de standaard.

Zonder dit document geen campaign. Het is geen administratie, het is de scheiding tussen training en HR-overtreding.

### 2. Populatie-segmentatie

Niet één campaign voor 5000 mensen. Segmentatie verhoogt realisme én vermindert collateral.

- **Per role**: HR-style-pretext naar HR niet-effectief (ze herkennen het); IT-style-pretext naar IT idem. Cross-role pretexts zijn meer realistisch.
- **Per technical-level**: low-tech-mensen verwachten andere triggers dan dev-team. Aanpasbaarheid van pretext aan target-vocabulary.
- **Per locatie / taal**: NL-medewerkers Nederlandstalige email; internationale offices in lokale taal of Engels-met-tone-aanpassing.
- **Cohort-rotatie**: niet altijd dezelfde groep. Spread over kwartaal-cohorten zodat elke medewerker ~1× per jaar geraakt wordt.

### 3. Pretexting-patronen op klasse-niveau

Klasse-niveau, niet copy-paste-templates. Per categorie de archetypal vorm en het spectrum van licht-naar-ethisch-grens.

- **HR-administratie**: salaris-aanpassing, contract-update, vakantieaanvraag-bevestiging, arbo-melding-procedure-update. **Toegestaan**: generieke administratieve flow. **Uitgesloten**: gefingeerde individuele HR-acties tegen target ("u bent beoordeeld...").
- **IT / helpdesk**: password-reset-prompt, MFA-enroll, security-update-installatie, mailbox-quota. **Toegestaan**: organisatie-brede berichten. **Uitgesloten**: imitatie van met-naam-bekend-IT-personeel zonder akkoord van die persoon.
- **Finance / facturen**: leverancier-factuur, betaling-bevestiging, expense-report-correctie. **Toegestaan**: redelijke bedragen, generic vendor. **Uitgesloten**: bedragen die echte angst veroorzaken (€10k spoed-betaling), namen van echte leveranciers zonder akkoord.
- **Vendor / klant**: shipment-update, support-ticket-update, software-license-renewal. **Toegestaan**: generic. **Uitgesloten**: echte vendor-impersonation zonder hun vooraf-akkoord (juridisch trademark-gebied).
- **Calendar / collaboration**: meeting-invitation, document-share-notification (Sharepoint/Drive/Dropbox style), Teams/Slack-mention. Klassieke 2024-2026 pretexts; let op exacte UI-imitatie (juridisch licht trademark-gebied).
- **Authentic-looking but generic**: "Your account access requires verification" — werkt verbazend goed, omdat 'het generic is dat doet' het de aandacht ontwijkt.

Voor red-team-context met expliciet akkoord kan spear-phishing met OSINT-input uit `recon-agent` (LinkedIn-titel, project-referentie). Maar elke spear-target heeft expliciete pre-akkoord van management plus (waar mogelijk) de target zelf.

### 4. Infrastructuur: sending, landing, tracking

- **Sender-domain**:
  - Aged en geregistreerd weken voor campagne (zie `c2-hygiene` fase 3).
  - SPF, DKIM, DMARC volledig ingesteld om soft-fail-flagging te vermijden. Doel is dat email aankomt, niet wordt gereject. (Ironie: campagne-emails moeten zelf 100% AVG/email-standaard-conform zijn.)
  - Cohort/lookalike-domain dat lijkt-op-maar-niet-is target-domain ('rnicrosoft.com', 'cornpany.com'). Trademark-impact afwegen.
- **Landing-page**:
  - Geen echte credential-capture op productie-passwords; gebruik een trainingspagina die zegt "dit was een sim" met educatie-content. Of, in red-team-context, gecontroleerde credential-capture met onmiddelijke vernietiging na verificatie.
  - HTTPS verplicht (anders flagging by browser).
  - Mobile-responsive — meeste klikken komen van phone.
- **Tracking**: 
  - Open-tracking via 1px-image of unique-link-per-recipient.
  - Click-tracking met unique URL per recipient.
  - Aggregaat-data prima, individueel-data alleen voor wie expliciet gehost-toestemming heeft. Anonimiseer post-campaign.
- **Hosting**: payload-laag op aparte server, aparte van email-sender en aparte van team-server.

NL/EU AVG-context voor monitoring: data over individueel-klikgedrag is persoonsgegeven onder AVG. Verwerking mogelijk op basis van gerechtvaardigd belang (AVG Art 6(1)(f)) mits balans-test gedocumenteerd. DPO-consultatie verplicht. Bij tracking-data: aggregeer ZSM, individueel-data niet langer bewaren dan strikt nodig.

### 5. Uitvoering en metrics

Tijdens uitvoer:

- **Kanaal-monitoring**: aantal aankomsten in inbox vs spam-folder (delivery-rate). Zonder delivery is er geen meting.
- **Klikrate** (CTR): % targets dat link opent.
- **Credential-success-rate**: % dat credentials invult (wanneer die laag aanwezig is).
- **Reporting-rate**: % dat email als verdacht meldt aan helpdesk/SOC. Dit is de belangrijkste metric — het meet de gedragsverandering.
- **Time-to-report**: gemiddelde tijd tussen verzending en eerste melding. Korter = beter.
- **Helpdesk/SOC-load**: aantal meldingen per uur. Schaalt mee met campaign-grootte; brief helpdesk vooraf zodat ze niet eraan ten onder gaan.

Real-time check vóór escalatie: als klikrate explodeert (>40%) of reporting-rate stilstaat (<5%), pauzeer en heroverweeg pretext. Iets klopt niet.

### 6. Debrief, training, opt-out, duty-of-care

Na campaign:

- **Per-target follow-up** voor wie klikte: directe educatie-pagina, opt-in voor 5-minuten-training-module. Geen straf, geen "naam-en-shame".
- **Per-target erkenning** voor wie correct meldde: dank-mail of intern-erkenning (als de persoon dat zelf prefereert).
- **Aggregaat-rapport** naar management en betrokken teams: percentages, geen namen, trends-vergeleken-met-vorige campaign.
- **Lessons learned**: welke pretext werkte (hoog), waarom. Welke werkte niet (laag), waarom. Input voor volgende campagne én voor security-awareness-curriculum.
- **Opt-out-update**: wie expliciet aangaf niet meer mee te willen → exclusion-lijst voor toekomst.
- **Detection-feedback** naar SOC/detection-engineer: welke email-kenmerken hadden gedetecteerd kunnen worden door secure-email-gateway, hoe was bypass mogelijk?
- **Bewuste cleanup van data**: tracking-data anonimiseren of verwijderen na rapport-delivery, conform fase-1-data-handling-afspraken.

Duty-of-care: als tijdens of na campagne iemand uitzonderlijk emotioneel reageert (klacht, ziek-melding-link-met-campagne, escalatie naar HR), pauzeer campagne, betrek HR + DPO, voer evaluatie uit. Geen verdediging vanuit "het was maar een sim". Patronen tellen.

### Verification-loop

Laag 1: scope (RoE-document compleet en getekend? uitsluitingslijst geverifieerd? OR-consultatie afgerond?), aannames (data-handling AVG-conform onderbouwd?), gaps (debrief-procedure operationeel klaar vóór verzending?). Laag 2: AVG-artikel-verwijzingen kloppen, CFAA/Computervredebreuk-context (NL Wetboek van Strafrecht art 138ab) niet ten onrechte als afgedekt geclaimd, geen verzonnen vendor-policy-uitspraken, klikrate-baselines niet als "studies bewijzen X" zonder bron geserveerd.

## Output

```
Phishing-sim plan / rapport — <campagne-naam>
Doel: <awareness-baseline | red-team-initial-access | compliance-evidence>
Periode: <start → eind> | RoE-tekening: <datum + akkoorden>

Scope:
  Doelgroep:           <segmenten + N>
  Uitsluitingen:       <lijst>
  Toegestane pretexts: <categorieën uit fase 3>
  Uitgesloten pretexts:<expliciete lijst>
  AVG-grond:           <gerechtvaardigd belang met balans-test ref>
  OR/DPO-akkoord:      <ja/datum>

Uitvoer:
  Pretext gebruikt:           <categorie + versie-ref>
  Sender-domain:              <FQDN, age, SPF/DKIM/DMARC>
  Landing-page:               <doel-URL + training-content>
  Track-mechanisme:           <pixel/unique-link>
  Aantal verzonden:           N
  Delivered (inbox):          N
  Spam-folder:                N

Metrics:
  CTR:                  <%>
  Credential-success:   <%>
  Reporting-rate:       <%>
  Time-to-first-report: <minuten>
  Helpdesk-load:        <pieken>

Per-target follow-up:
  Educatie-pagina-completion:   <% van klikkers>
  Opt-out-verzoeken ontvangen:  <N>
  Escalaties naar HR/DPO:       <N + type>

Lessons learned:
  Wat werkte:           <pretext-element + waarom>
  Wat niet:             <element + reden>
  Input volgende sim:   <aanpassing voor cohort N+1>

Detection-feedback (handoff detection-engineer):
  Email-headers/inhoud die SEG kon vangen: <lijst>

Cleanup:
  Tracking-data anonimisering: <datum>
  Sender-domain decommissioning: <datum>

Verification-loop: ...
```

## Referenties

- **NIST SP 800-50** — [https://csrc.nist.gov/pubs/sp/800/50/r1/final](https://csrc.nist.gov/pubs/sp/800/50/r1/final). Building an Information Security Awareness and Training Program.
- **ENISA Awareness Material** — [https://www.enisa.europa.eu/topics/awareness-and-training](https://www.enisa.europa.eu/topics/awareness-and-training).
- **Autoriteit Persoonsgegevens — werknemer-monitoring** — [https://www.autoriteitpersoonsgegevens.nl/themas/werk-uitkering/werknemers/de-werknemer-volgen](https://www.autoriteitpersoonsgegevens.nl/themas/werk-uitkering/werknemers/de-werknemer-volgen). NL-context voor AVG bij sims.
- **AVG Art 6, Art 88, Art 35** — [https://eur-lex.europa.eu/eli/reg/2016/679](https://eur-lex.europa.eu/eli/reg/2016/679). Verwerkingsgrondslag, werknemer-context, DPIA.
- **NIST Phish Scale** — [https://www.nist.gov/itl/applied-cybersecurity/nist-phish-scale-method-rating-human-phishing-detection-difficulty](https://www.nist.gov/itl/applied-cybersecurity/nist-phish-scale-method-rating-human-phishing-detection-difficulty). Difficulty-rating-methodology voor pretexts.
- **MITRE ATT&CK — Initial Access (TA0001) / Phishing (T1566)** — [https://attack.mitre.org/techniques/T1566/](https://attack.mitre.org/techniques/T1566/).
- **NCSC-NL — Phishing-richtlijnen** — [https://www.ncsc.nl/](https://www.ncsc.nl/).
- **DMARC.org** — [https://dmarc.org/](https://dmarc.org/). Sender-authenticatie-spec.

## Categorieën

- pentest
