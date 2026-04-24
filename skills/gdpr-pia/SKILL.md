---
name: gdpr-pia
description: Data Protection Impact Assessment (DPIA / GEB) workflow tegen AVG Art 35 — trigger-check (AP-criteria en WP 248), systematische beschrijving, noodzakelijkheid, risico-analyse vanuit het perspectief van de betrokkene, maatregelen en restrisico, voorafgaande raadpleging van de Autoriteit Persoonsgegevens.
---

# AVG / GDPR Data Protection Impact Assessment

> **Disclaimer**: dit is geen juridisch advies. Een DPIA is een juridisch-gevoelig document dat de organisatie blootstelt aan AP-toezicht en potentieel civiele claims. Deze skill structureert de analyse; definitieve kwalificaties (rechtmatige grondslag, proportionaliteits-weging, restrisico-acceptatie) horen met de FG/DPO en/of privacy-counsel.

## Wanneer gebruiken

Art 35 AVG verplicht een Data Protection Impact Assessment (DPIA, in NL ook "gegevensbeschermingseffectbeoordeling" of GEB) bij verwerkingen met hoog risico voor betrokkenen. Deze skill helpt bij trigger-check, opstellen, en voorafgaande raadpleging van de AP wanneer restrisico hoog blijft.

Activeert bij:

- Een vraag als "moet hier een DPIA voor komen", "is deze verwerking hoog-risico onder de AVG", "help me een DPIA opstellen", "hoe doen we de raadpleging van de AP", "DPIA-template".
- Nieuwe of substantieel-gewijzigde verwerking van persoonsgegevens: nieuwe SaaS-introductie, AI/ML-toepassing die profileert, camera-systemen, biometrie, gezondheidsdata, gegevens op grote schaal, monitoring van medewerkers, of verwerking in landen zonder adequaatheidsbesluit.
- Een handoff vanuit `risk-register` wanneer privacy-risico onderdeel is, of vanuit `vendor-questionnaire` als een processor nieuw in scope komt.
- Een FG/DPO-vraag tijdens toezicht- of audit-voorbereiding.

### Wanneer NIET (handoff)

- Datalek-meldingen (Art 33/34 AVG) → `ir-runbook` met aparte AP-meldprocedure. DPIA is preventief, datalekmelding is reactief.
- Verwerkersovereenkomsten (Art 28) onderhandelen → juridische expertise, eventueel `vendor-questionnaire` voor de security-kant.
- Internationale doorgifte (Hoofdstuk V AVG) buiten-EU/EER → aparte Transfer Impact Assessment (TIA), vereist Schrems II-analyse. Deze skill raakt het aan, dekt het niet volledig.
- Algemene beveiligingsmaatregelen (Art 32) buiten DPIA-context → `secure-coding`, `security-review`, etc.
- Technische implementatie van minimalisatie/pseudonymisatie → `secure-coding` + de toepasselijke framework-skill. Deze skill vraagt dát je het doet, niet hoe.
- Policy-drafting (privacybeleid, verwerkersregister-template) → `policy-drafter`.

## Aanpak

Zeven fases. Fase 1 (trigger-check) bepaalt of je überhaupt verder gaat; fase 6 (raadpleging AP) alleen bij restrisico-hoog.

### 1. Trigger-check: is een DPIA verplicht?

Art 35(1) AVG: DPIA verplicht bij "een hoog risico voor de rechten en vrijheden van natuurlijke personen". Drie routes naar die conclusie:

**Route A — de drie trigger-categorieën uit Art 35(3):**

- Systematische en uitgebreide beoordeling van persoonlijke aspecten op basis van geautomatiseerde verwerking (incl. profilering) met rechtsgevolgen of vergelijkbaar significante gevolgen.
- Grootschalige verwerking van bijzondere categorieën van persoonsgegevens (Art 9: o.a. gezondheid, ras, geloof, seksuele geaardheid, biometrie voor unieke identificatie, genetisch) of strafrechtelijke gegevens (Art 10).
- Stelselmatige grootschalige monitoring van openbaar toegankelijke ruimtes.

**Route B — WP 248 rev.01 (EDPB-guidance, voorheen Artikel 29 Werkgroep).** Negen criteria waarvan **twee of meer** een DPIA aangeeft:

1. Evaluatie of scoring (incl. profilering).
2. Geautomatiseerde besluitvorming met rechtsgevolg of vergelijkbaar.
3. Stelselmatige monitoring.
4. Gevoelige gegevens of gegevens van zeer persoonlijke aard.
5. Op grote schaal verwerkt.
6. Matching of samenvoeging van datasets.
7. Gegevens over kwetsbare betrokkenen.
8. Innovatief gebruik of toepassing van nieuwe technologische of organisatorische oplossingen.
9. Verwerking die zelf betrokkenen belet een recht uit te oefenen of een contract te gebruiken.

**Route C — AP-lijst ex Art 35(4).** De Autoriteit Persoonsgegevens publiceert een lijst van verwerkingen waarvoor een DPIA expliciet verplicht is. `[verify actuele lijst op autoriteitpersoonsgegevens.nl]` — wijzigt periodiek. Bevat typisch: heimelijke observaties, grootschalige verwerking van gezondheidsgegevens, flexibele inzet-systemen, blacklists, etc.

Output van fase 1: één van drie uitkomsten — *verplicht* (door Art 35(3), 2+ criteria uit WP 248, of AP-lijst), *aanbevolen* (1 criterium plus twijfel), *niet verplicht* (duidelijk daaronder). Bij *niet verplicht*: motiveer en archiveer, want de AP kan ernaar vragen.

### 2. Systematische beschrijving van de verwerking

Art 35(7)(a). Feitelijke basis voor de rest van de DPIA.

- **Doel en grondslag** (Art 6 + Art 9 indien bijzondere categorieën).
- **Categorieën van betrokkenen**: klanten, medewerkers, kinderen, patiënten, etc. Let op kwetsbare categorieën.
- **Categorieën van persoonsgegevens**: gewoon / bijzonder / strafrechtelijk. Welke velden, met welke gevoeligheid.
- **Ontvangers**: interne afdelingen, verwerkers, derde partijen, overheid. Per ontvanger: wat krijgen ze en waarom.
- **Bewaartermijnen** per gegevenscategorie.
- **Technische en organisatorische context**: data-stromen (bronsysteem → pipeline → opslag → analyse → output), hosting-locaties, toegangspaden.
- **Doorgiftes buiten EER**: welk land, welke doorgifte-grond (Art 45 adequaatheid / Art 46 SCC / Art 49 uitzondering).

DFD-stijl-schema's helpen hier (zelfde aanpak als `threat-modeler` Vraag 1). Eén diagram plus inventaris-tabel.

### 3. Noodzakelijkheid en proportionaliteit

Art 35(7)(b). Dit is waar DPIA's vaak te licht over worden afgedaan.

- **Noodzakelijkheid**: is deze verwerking écht nodig voor het genoemde doel? Alternatieven overwogen? Minder invasieve varianten mogelijk (geaggregeerde data, pseudonymisering, kortere bewaring)?
- **Proportionaliteit**: staat de impact op betrokkenen in verhouding tot het gediend belang? Betrokkenheid van ketenpartners mee-gewogen? Zou een redelijk persoon deze verwerking begrijpen en accepteren in deze context?
- **Gegevensminimalisatie concreet**: welke velden zijn daadwerkelijk nodig, welke kunnen weg? Vaak schuivende grenzen tussen "nice to have" en "need".
- **Bewaartermijnen**: waarom precies deze termijn, niet korter? Is er een verplichte wettelijke termijn? Zo ja: welke.

Dit onderdeel moet kritisch zijn. Een DPIA die zegt "ja het is noodzakelijk" zonder alternatieven te benoemen is een DPIA die de AP zal terugsturen.

### 4. Risico-analyse — vanuit het perspectief van de betrokkene

Art 35(7)(c). Kern-reframe: de risico's zijn voor de **betrokkene**, niet voor de organisatie. Dit is het verschil tussen een DPIA en een organisatie-risico-analyse.

Drie categorieën impact op betrokkenen:

- **Verlies van vertrouwelijkheid**: ongeautoriseerde toegang tot gegevens. Gevolg: discriminatie, identiteitsdiefstal, financiële schade, reputatieschade, stigmatisering.
- **Verlies van integriteit**: ongeautoriseerde wijziging van gegevens. Gevolg: verkeerde besluitvorming tegen betrokkene (krediet, uitkering, zorg).
- **Verlies van beschikbaarheid**: gegevens onbeschikbaar op moment dat ze nodig zijn. Gevolg: dienstverlening loopt vast, rechten niet uitoefenbaar.

Per dreiging: bronnen (interne actor, externe aanvaller, toeval, derde ontvanger), waarschijnlijkheid (hoog/middel/laag, met onderbouwing), ernst voor betrokkene (hoog/middel/laag, met concreet beschreven gevolg).

Output: een dreigings-register vergelijkbaar met `threat-modeler`, maar met **impact op betrokkene** als hoofddimensie, niet organisatie-impact.

### 5. Maatregelen en restrisico

Art 35(7)(d). Per dreiging:

- **Bestaande maatregelen**: wat is al aanwezig (technisch + organisatorisch). Verwijs naar Art 32 AVG (beveiliging) en de concrete implementatie (zie `secure-coding`, `security-review`, `iso27001` Annex A-controls).
- **Aanvullende maatregelen**: wat wordt toegevoegd op basis van deze DPIA. Welke dreiging mitigeren ze, en hoeveel reductie in waarschijnlijkheid/ernst.
- **Restrisico**: na alle maatregelen, wat blijft over? Hoog, middel of laag.

De combinatie van (ernst × waarschijnlijkheid) na maatregelen bepaalt of je naar fase 6 gaat.

### 6. Voorafgaande raadpleging AP (alleen bij restrisico-hoog)

Art 36 AVG. Als restrisico na maatregelen hoog blijft, móet de verwerkingsverantwoordelijke de AP voorafgaand aan de start consulteren.

Procedure:

- Formeel verzoek via het AP-meldformulier (online) met de volledige DPIA als bijlage plus aanvullende context (verantwoordelijkheden, betrokken FG/DPO, gekozen maatregelen, waarom restrisico niet verder te mitigeren is).
- AP heeft tot 8 weken om schriftelijk advies uit te brengen (verlengbaar met 6 weken bij complexiteit). Verwerking niet starten voordat advies is ontvangen of termijn is verstreken.
- AP-advies is bindend in de zin dat de AP handhavend kan optreden bij negeren. In praktijk werken organisaties gemeenschappelijk aan de geadviseerde aanpassingen.

De vraag "hoog-risico-restrisico" is zelf een kwalificatie. Bij twijfel: consulteren. Onderschatting is duurder dan overconsultatie.

### 7. Verification-loop en onderhoud

Laag 1: scope (alle gegevensstromen in de DPIA meegenomen, geen schaduwverwerking vergeten?), aannames (is de verwerkingsgrondslag écht solide, of stond er simpelweg "gerechtvaardigd belang" zonder afweging?), gaps (route-A-trigger-check gedaan, niet alleen route-B geteld?). Laag 2: AVG-artikel-nummers kloppen, `[verify]`-markers op elke verwijzing naar "AP-lijst van verplichte DPIA's" want die lijst wordt bijgewerkt, WP 248 rev.01 correct geattribueerd (EDPB-approved), geen verzonnen AP-rechtbank-uitspraken.

**DPIA is geen statisch document.** Bij wezenlijke wijziging in verwerking (nieuwe dataset toegevoegd, nieuwe ontvanger, nieuwe technologie) is een nieuwe of aangevulde DPIA verplicht. Jaarlijkse review zelfs zonder wijziging is best practice.

## Output

DPIA-rapport, niet slechts samenvatting. Structuur (zie ook het AP-template als referentie):

```
Data Protection Impact Assessment — <verwerking>
Versie: 1.0 | Datum: YYYY-MM-DD | Opgesteld door: <naam + functie, met FG/DPO: <naam>>

1. Trigger en scope
   Trigger:       <Art 35(3) / WP 248 / AP-lijst — specifieke criteria>
   Aanleiding:    <nieuwe verwerking | wijziging | herziening>
   Verwerkings-verantwoordelijke: <entity>
   Verwerker(s): <lijst met AVG-Art 28-overeenkomst>

2. Systematische beschrijving
   Doel:          <expliciet>
   Grondslag:     <Art 6(1)(a-f), bij bijzondere ook Art 9(2)>
   Betrokkenen:   <categorieën, incl. kwetsbare>
   Gegevens:      <categorieën, velden, gevoeligheid>
   Ontvangers:    <lijst + rol>
   Bewaring:      <per categorie, met rationale>
   Doorgifte:     <EER | derde land met grond + waarborgen>
   DFD / diagram: <visueel of tekstueel>

3. Noodzakelijkheid en proportionaliteit
   Noodzakelijkheid:   <argumentatie met alternatieven-review>
   Proportionaliteit:  <afweging>
   Minimalisatie:      <welke velden, pseudonymisatie, anonymisatie>
   Bewaartermijn-onderbouwing: <...>

4. Risico-analyse (perspectief betrokkene)
   Per dreiging: bron, waarschijnlijkheid, ernst, concreet gevolg voor betrokkene.

5. Maatregelen
   Per dreiging: bestaande + aanvullende maatregelen, post-mitigation waarschijnlijkheid/ernst.
   Restrisico-conclusie: hoog | middel | laag.

6. Voorafgaande raadpleging AP
   Vereist?:      <ja bij restrisico-hoog | nee>
   Status:        <ingediend datum | advies ontvangen datum | n.v.t.>

7. Goedkeuring + onderhoud
   Approver:      <eindverantwoordelijke + FG/DPO-akkoord>
   Review-datum:  <jaarlijks + bij wijziging>

Verification-loop: ...
```

## Referenties

- **AVG (Verordening (EU) 2016/679)** — [https://eur-lex.europa.eu/eli/reg/2016/679](https://eur-lex.europa.eu/eli/reg/2016/679). Officiële tekst; art 35 en art 36 zijn primair.
- **Uitvoeringswet AVG (UAVG)** — [https://wetten.overheid.nl/BWBR0040940](https://wetten.overheid.nl/BWBR0040940). NL-uitvoeringswet.
- **Autoriteit Persoonsgegevens — DPIA-pagina** — [https://www.autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/data-protection-impact-assessment-dpia](https://www.autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/data-protection-impact-assessment-dpia).
- **AP — Lijst verplichte DPIA's** — [https://www.autoriteitpersoonsgegevens.nl/](https://www.autoriteitpersoonsgegevens.nl/). Zoek op "lijst dpia". `[verify actuele versie]`.
- **EDPB — WP 248 rev.01 DPIA Guidelines** — [https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-data-protection-impact-assessment-dpia_en](https://edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-data-protection-impact-assessment-dpia_en). EDPB-goedgekeurde guidance.
- **CNIL PIA-software** — [https://www.cnil.fr/en/open-source-pia-software-helps-carry-out-data-protection-impact-assessment](https://www.cnil.fr/en/open-source-pia-software-helps-carry-out-data-protection-impact-assessment). Open-source tool voor PIA-opstelling, vrij te gebruiken buiten Frankrijk.
- **EDPB Guidelines 03/2022 — transparency-vereisten** — [https://edpb.europa.eu/](https://edpb.europa.eu/).
- **Schrems II (C-311/18)** — [https://curia.europa.eu/juris/documents.jsf?num=C-311/18](https://curia.europa.eu/juris/documents.jsf?num=C-311/18). Voor internationale-doorgifte-afwegingen.

## Categorieën

- grc
