# CLAUDE.md — Werkinstructie voor Claude Code

Context voor Claude wanneer je in deze repo werkt. Lees dit volledig voor je iets aanpast.

## Waar je bent

Dit is `accans-sec-skills` — een catalogus van security-skills, -agents en -commands voor Claude Code / Cowork, plus een web-builder en een installer-CLI. Single source of truth is `catalog.json`. De catalog is volledig uitgewerkt (47 items over `core` / `appsec` / `pentest` / `blue` / `grc`). Werk in deze repo betreft typisch onderhoud, herijking, of het toevoegen van nieuwe items.

## Primaire taken

Drie soorten werk komen voor:

- **Onderhoud van bestaande items**: bijwerken bij nieuwe CVE's, framework-versie-bumps, gewijzigde wetgeving (NIS2/DORA-RTS-updates, Cyberbeveiligingswet-status). Houd `[verify]`-markers actueel.
- **Toevoegen van nieuwe items**: nieuwe categorie of vraag uit de praktijk die buiten een bestaande skill valt. Volg de scaffold-flow (zie Workflow hieronder).
- **Hercategorisatie of profiel-aanpassing**: alleen `catalog.json` aanraken, daarna `npm run check`.

Bij twijfel: `npm run validate` toont catalog ↔ disk-consistency en cross-reference-graph.

## Conventies

### Taal

- **SKILL.md body**: Nederlands. Accans-voertaal, informeel-professioneel. Geen jij-vorm in frontmatter description, wel in body waar natuurlijk.
- **description frontmatter**: Engelstalig, actief, 1–2 zinnen, trigger-words prominent. Dit is wat Claude's skill-matcher leest — investeer hier.
- **Technische termen**: Engelstalig laten waar gangbaar (SAST, DAST, SBOM, SSTI, OWASP Top 10). Niet vertalen.
- **Compliance-context**: NL/EU regels (NIS2, AVG, Cyberbeveiligingswet, Autoriteit Persoonsgegevens) krijgen voorrang boven US-equivalenten.

### Stijl

- Concreet boven abstract. Voorbeelden, commando's, CVE-nummers.
- Geen marketing-taal. Geen "robuuste", "uitgebreide", "geavanceerde" zonder onderbouwing.
- Lijstjes mogen, maar elke bullet is minimaal één zin met inhoud. Geen woordenlijstjes.
- Referentie-links altijd naar primaire bron (OWASP, NIST, MITRE, vendor-docs) — niet naar blog-samenvattingen.

### Structuur per skill

Iedere `SKILL.md` volgt de scaffold-template (Wanneer gebruiken → Aanpak → Output → Referenties → Categorieën). Vul ze allemaal. De **Aanpak**-sectie is het hart: genummerde fases die Claude kan volgen wanneer de skill triggert.

Richtlijn lengte:
- Skills: 150–400 regels markdown is normaal. Korter mag als de scope klein is, langer moet je kunnen rechtvaardigen.
- Agents: system prompt + scope + werkwijze + uitvoer. 80–200 regels.
- Commands: korter — wat doet het, welke stappen, welke argumenten. 40–120 regels.

## Workflow

### Een bestaand item bewerken

```bash
# Inhoud aanpassen in skills/<id>/SKILL.md (of agents/<id>.md / commands/<id>.md)
# Eventueel helper-bestanden toevoegen: skills/<id>/references/, skills/<id>/templates/
npm run check          # build + validate in één
open web/index.html    # visuele check — description leesbaar? scope duidelijk?
```

### Een nieuw item toevoegen

```bash
# 1. Entry in catalog.json (id, name, type, cat, profiles, desc)
# 2. Scaffold stub
npm run scaffold
# 3. Schrijf inhoud
# 4. Build + validate
npm run check
```

### Commit-ritme

Eén commit per afgeronde skill, niet per file-save. Commit-message:

```
skills/<id>: uitwerken <korte reden>

<optioneel: welke bronnen, welke keuzes, wat bewust niet in de skill zit>
```

Bijvoorbeeld:

```
skills/iac-security: uitwerken Terraform/CFN/Ansible/Pulumi

OWASP IaC Top 10 als kern. Checkov + tfsec voor Terraform,
cfn-lint + cfn-nag voor CloudFormation. Pulumi-sectie is
lichter omdat het toolchain-oppervlak kleiner is.
```

## Do's

- Lees vóór je begint de OWASP / NIST / MITRE bron die je aanhaalt. Geen doorverwezen samenvattingen.
- Check of er al een gerelateerde skill bestaat (bv. `security-review` raakt aan `secure-coding`). Dubbeling voorkomen.
- Bij framework-specifieke skills (Django, Spring, Rails, Next.js): toon minstens één CVE of bekende misconfig uit de afgelopen 3 jaar.
- GRC-skills (ISO27001, NIS2, DORA, AVG): verwijs naar de officiële tekst, niet naar consultancy-blogs.
- Als je twijfelt over scope, schrijf hem eerst op in een comment `<!-- scope-vraag: ... -->` en vraag erover.

## Don'ts

- **Niet bluffen op CVE-nummers, CVSS-scores of exploit-details.** Niet-bestaande CVE's zijn worse-than-useless. Bij twijfel: laat het weg of zet een `[verify]`-marker.
- **Geen offensive payloads die direct exploitable zijn tegen specifieke software-versies** zonder sandbox-context. Payload-libraries op patroon-niveau ja, kant-en-klare 0-days tegen production-targets nee.
- **Geen "in praktijk blijkt dat..." zonder bron.** Anecdote zonder referentie = wegstrepen.
- **`description`-frontmatter niet opzwellen.** Als de description langer is dan 2 zinnen is hij te lang — hij moet door de skill-matcher snel geparsed worden.
- **Niet buiten scope uitwaaieren.** `django-security` gaat over Django; algemene Python security hoort in `secure-coding`.

## Speciale skills

Een paar items vereisen extra aandacht:

- **`verification-loop`** — dit is de meta-skill die Claude over zijn eigen output heen laat gaan. Komt in elk profiel voor. Structuur is hybride: een universele self-review pass (laag 1 — scope, aannames, gaps, adversariële lezer, faalmodi, consistentie) en daaronder een security-red-flag-sectie (laag 2 — CVE/CVSS-verificatie, payload-niveau, ongesubstantieerde praktijkclaims, bron-kwaliteit). Laag 2 moet als zelfstandig blok verwijderbaar zijn zonder laag 1 te breken — zodat de skill buiten deze repo in een niet-security-context herbruikbaar blijft.
- **`threat-modeler`** (agent) — moet een zelfstandige sub-agent zijn. System prompt duidelijk scopen op STRIDE / attack trees / mitigation ranking, anders wordt het een generieke security-agent.
- **`security-gate`** (command) — de pre-merge blocker. Moet uitvoerbaar zijn als `/security-gate` in Claude Code; argument-hint in frontmatter klopt.
- **`gdpr-pia` / `nis2` / `dora`** — juridisch gevoelig. Disclaim in de skill dat dit geen juridisch advies is, en verwijs naar de officiële NL/EU-bronnen.

## Categorieën en profielen

Niet aanraken tenzij bewust. `cat` is voor de UI-tab-filter, `profiles` is voor de install-presets. Een item toevoegen aan een profiel betekent dat `./bin/sec-install --profile <naam>` het automatisch meepakt — dus wees selectief met `core` en `full`.

Als je een bestaand item hercategoriseert, update **alleen** `catalog.json` en run `npm run build`. De manifest-scanner ziet de wijziging vanzelf.

## Als je een nieuw item klaar hebt

1. Geen `_Status: stub_`-regel laten staan (validate vangt dit anders).
2. `description` frontmatter scherp: trigger-words prominent, 1–2 zinnen, Engels.
3. `npm run check` (build + validate). Geen errors, ideally geen warnings.
4. Open `web/index.html`, zoek je item in de grid, lees de card-description — klopt het?
5. Commit met de conventie hierboven.

## Handige commando's

```bash
npm run scaffold        # alleen ontbrekende files aanmaken (idempotent)
npm run build           # manifest + HTML-injectie
npm run validate        # catalog ↔ disk + frontmatter + reference-graph
npm run check           # build + validate gecombineerd
npm run package         # bouwt dist/ voor static-site-deploy
npm run list            # alle items via CLI
npm run profiles        # alle profielen + counts

./bin/sec-install --profile core --dry-run              # zie wat zou installeren
./bin/sec-install --profile full --dest .claude         # repo-scoped install ter test
./bin/sec-install <id> [<id>...] --dest /tmp/fake       # losse items testen

# Curl-pipeable variant (voor gehoste deploy, zelfde flags als bin/sec-install):
bash install.sh --base-url http://localhost:8765 --profile core --dry-run
```

## Wat uitdrukkelijk niet de taak is

- Dit is geen security-tool-wrapper — we bouwen geen scanners, we schrijven kennis voor een taalmodel.
- We hergebruiken geen copyrighted materiaal woordelijk (OWASP cheat-sheets, vendor-docs). Samenvatten en verwijzen.
- We bouwen hier geen audit-trail of tenant-isolatie. Die horen in een product, niet in een skills-catalogus.

Vragen of twijfel over scope → markeer met `<!-- vraag: ... -->` in de stub en vraag 'm voor je verder schrijft.
