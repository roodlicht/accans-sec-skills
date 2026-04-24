---
name: verification-loop
description: Structured red-team pass over your own output — surface assumptions, gaps, failure modes and security red flags before shipping.
---

# Verification Loop

## Wanneer gebruiken

De skill triggert voor Claude zelf, niet voor de eindgebruiker. Activeer 'm als je op het punt staat non-triviale output af te leveren en er nog één pass in zit. Activeert bij:

- Een geschreven analyse, review, rapport, patch, threat-model, runbook of beleidsstuk waarvan je op het punt staat hem aan de gebruiker aan te bieden.
- Een expliciete vraag om een second-pass: "check je eigen werk", "zeker weten?", "zijn er gaten?", "red-team dit", "speel advocaat van de duivel".
- Een andere security-skill (bv. `security-review`, `threat-modeler`, `pentest-reporter`, `ir-runbook`, `gdpr-pia`) die zojuist output heeft geproduceerd. Deze loop is dan de laatste stap vóór levering.
- Je eigen redenering bevat passages die beginnen met "waarschijnlijk", "normaal gezien", "in praktijk" of "ik neem aan". Dat zijn aannames die in deze loop aan het licht moeten komen.

De pass gaat over wat Claude zojuist heeft geproduceerd, niet over input van de gebruiker. Deze skill is een meta-skill. Hij reviewt geen code of spec van derden, maar je eigen werk.

## Aanpak

De loop heeft twee lagen. **Laag 1** is universeel en staat op zichzelf. **Laag 2** voegt security-specifieke checks toe en is als zelfstandig blok verwijderbaar. In een niet-security-context kun je de hele sectie schrappen zonder dat Laag 1 breekt.

Werk sequentieel door de stappen. Verzamel bevindingen terwijl je doorloopt, en formuleer pas een verdict als alle stappen gedaan zijn. Geen stap overslaan omdat hij "niet van toepassing lijkt". De stappen die je wil overslaan zijn vaak precies waar de gaten zitten.

### Laag 1 — Universele self-review pass

1. **Scope-check.** Leg de oorspronkelijke vraag naast je output. Wat was gevraagd, wat heb je geleverd? Markeer elke passage die buiten scope uitwaaiert (scope-creep) en elke sub-vraag die onbeantwoord is gebleven (scope-gap). Een geleverde paragraaf die niet in directe dienst staat van de vraag is kandidaat voor schrappen, niet voor behouden.

2. **Aannames expliciteren.** Zoek in je output naar "waarschijnlijk", "normaal", "in de meeste gevallen", "ervan uitgaande dat", "vermoedelijk". Zet voor elke aanname op een rij: (a) welke aanname, (b) welke bron of check zou hem bevestigen, (c) wat breekt als hij fout is. Aannames waar (c) niets kritisch oplevert mogen blijven, mits ze als aanname gemarkeerd zijn. Aannames waar iets kritisch breekt zijn blockers tot ze geverifieerd zijn of expliciet gelabeld als "niet geverifieerd, risico X".

3. **Gap-analyse.** Bedenk drie vragen die een kritische lezer zou stellen waar je geen antwoord op geeft. Denk expliciet aan edge cases (lege input, zeer grote input, ontbrekende rechten), niet-happy paths (timeouts, partial failures, concurrent writes), en interacties met systemen die je niet hebt gezien (externe services, caches, middleware, auth-lagen). Als je geen drie vragen kunt bedenken, heb je nog niet hard genoeg gekeken.

4. **Adversariële lezer.** Lees je output één keer vanuit het perspectief van iemand die het oneens is met je conclusie. Welke formulering is het zwakst? Welke redeneerstap heeft de minste onderbouwing? Welke bron zou iemand afwijzen als niet-primair of niet-actueel? Noteer de drie zwakste punten en versterk of schrap ze voor levering.

5. **Faalmodi.** Als je output instructies, een patch of een runbook is: wat gebeurt er als iemand dit stap-voor-stap uitvoert en halverwege faalt? Is er een recovery-pad? Is de ordering reversibel, of wordt er werk vernietigd bij een afgebroken run? Als je output een analyse is: onder welke omstandigheden klopt de analyse niet?

6. **Interne consistentie.** Staan er twee uitspraken in je output die elkaar tegenspreken? Komen verwijzingen (naar files, line-numbers, secties, versies, bronnen) overeen met wat er daadwerkelijk staat? Als je eerder in het stuk een keuze maakte, volgt de rest die keuze ook?

7. **Verdict.** Kies één van:
   - **pass**: geen blockers, hoogstens kleine nuances.
   - **revise**: er zijn blockers die je zelf kunt oplossen vóór levering.
   - **rewrite**: scope klopt niet of de kernredenering is wankel. Opnieuw beginnen is goedkoper dan repareren.

### Laag 2 — Security red flags (optioneel, security-context)

> Deze sectie is additief en zelfstandig afpelbaar. In een niet-security-repo kan hij zonder consequenties voor Laag 1 worden verwijderd. De verdict-logica van Laag 1 blijft intact.

Pas deze checks toe bovenop Laag 1 wanneer de output security-claims bevat: CVE-verwijzingen, CVSS-scores, payloads, threat-modellen, compliance-interpretaties, exploit-stappen, risico-inschattingen, incident-response-instructies.

1. **CVE- en CVSS-verificatie.** Voor elke CVE-ID die je noemt: staat die daadwerkelijk in de NVD? Klopt het jaartal met de timing van je verhaal? Past de beschrijving bij de context waarin je hem aanhaalt? Voor elke CVSS-score: heb je die geverifieerd via de NVD of FIRST-calculator, of aangenomen op basis van "klinkt plausibel"? Als je niet zeker bent, vervang "CVE-2023-12345 (CVSS 9.8)" door `[verify: CVE-ID en CVSS]` of laat de claim weg. Een niet-bestaande CVE is schadelijker dan geen CVE noemen, want hij ondermijnt het vertrouwen in de rest van je output.

2. **Payload-niveau.** Onderscheid patroon-payloads (illustratief, gericht op de klasse van kwetsbaarheid) van versie-specifieke exploits (kant-en-klaar inzetbaar tegen benoemde software-builds). Patroon-niveau (`<img src=x onerror=alert(1)>`, `{{7*7}}`, `../../etc/passwd`, `' OR 1=1 --`) is prima. Versie-specifieke exploit-chains tegen production-targets alleen in expliciet afgesproken sandbox- of labcontext. Zonder die context terugbrengen naar patroon-niveau met een `[lab: versie-specifiek uit te werken]` marker.

3. **Ongesubstantieerde praktijkclaims.** Scan je output op "in praktijk blijkt", "meestal zien we", "in de meeste engagements", "veel organisaties", "vaak vergeten teams". Elke dergelijke claim zonder primaire bron moet óf onderbouwd worden met een verwijzing (OWASP, NIST, MITRE, ENISA, vendor-advisory, recent publiek rapport), óf herformuleerd als hypothese ("een aannemelijk scenario is..."), óf geschrapt. Anekdote zonder bron is wegstrepen.

4. **Bron-kwaliteit.** Controleer of referenties naar primaire bronnen wijzen. OWASP cheat-sheets rechtstreeks, niet via medium-posts. Vendor-advisories rechtstreeks, niet via news-sites. ATT&CK-technieken met T-nummer, niet "ATT&CK zegt". Voor NL/EU-compliance (AVG, NIS2, DORA, Cyberbeveiligingswet): officiële wetstekst of toezichthouder (Autoriteit Persoonsgegevens, RDI, DNB), niet consultancy-samenvattingen.

5. **Scope-afbakening security vs. juridisch/operationeel.** Bevat de output compliance- of juridische interpretaties? Dan moet er een disclaimer staan dat het geen juridisch advies is. Bevat de output operationele IR-stappen of offensive techniques? Dan hoort er een "binnen geautoriseerde scope"-markering bij. Security-skills informeren, ze fungeren niet als eindoordeel voor juridisch advies of incident-commando.

6. **Security-verdict.** Bovenop het Laag-1-verdict, flag één van:
   - **geen red flags**: Laag 2 levert niets extra op.
   - **red flag — oplosbaar**: concrete security-issues die je nu kunt fixen voor levering (meestal CVE/CVSS-markers plaatsen, payload herformuleren, claim onderbouwen of schrappen).
   - **red flag — blokkerend**: de output kan niet zonder wijziging of goedkeuring worden geleverd (bv. een exploit-chain buiten afgesproken scope, of een feitelijke claim waarvan je de juistheid niet kunt garanderen en die materieel is voor de conclusie).

## Output

Het resultaat is geen nieuwe tekst voor de eindgebruiker, maar een intern rapport aan jezelf dat bepaalt wát je lévert. Structuur:

```
Verification-loop verdict: <pass | revise | rewrite>
[Security-verdict: <n.v.t. | geen red flags | red flag — oplosbaar | red flag — blokkerend>]

Laag 1:
- Scope: <samenvatting — wat binnen, wat creep, wat gap>
- Aannames: <lijst met risico-niveau per aanname>
- Gaps: <drie vragen die een kritische lezer zou stellen>
- Zwakste punten: <top 3 uit adversariële pass>
- Faalmodi: <lijst, of "n.v.t." bij pure analyse>
- Consistentie: <ok | conflicten: ...>

Laag 2 (indien van toepassing):
- CVE/CVSS: <geverifieerd | markers geplaatst | geen CVE's genoemd>
- Payloads: <patroon-niveau | versie-specifiek + context | n.v.t.>
- Praktijkclaims: <onderbouwd | herformuleerd | geschrapt | n.v.t.>
- Bronnen: <primair | gecorrigeerd | n.v.t.>
- Scope/disclaimer: <ok | toegevoegd | n.v.t.>

Acties voor levering:
1. ...
2. ...
```

Bij **pass** (en indien relevant **geen red flags**): lever de output zonder wijziging. Bij **revise**: voer de acties uit en lever daarna. Bij **rewrite**: lever niets. Herstart de taak met het scope-inzicht uit de loop als uitgangspunt.

Het rapport blijft intern tenzij de gebruiker er expliciet om vraagt. Geen verification-loop-output als onderdeel van normale deliverables plakken, dat is ruis voor de lezer.

## Referenties

- NIST SP 800-115 — [Technical Guide to Information Security Testing and Assessment](https://csrc.nist.gov/pubs/sp/800/115/final), §6 (post-testing activities, validation).
- NVD — [https://nvd.nist.gov/](https://nvd.nist.gov/). Primaire bron voor CVE-verificatie (Laag 2).
- FIRST CVSS v3.1 calculator — [https://www.first.org/cvss/calculator/3.1](https://www.first.org/cvss/calculator/3.1). Primaire bron voor score-verificatie (Laag 2).
- MITRE ATT&CK — [https://attack.mitre.org/](https://attack.mitre.org/). Primaire bron voor TTP-nomenclatuur als de output naar technieken verwijst (Laag 2).

## Categorieën

- core
