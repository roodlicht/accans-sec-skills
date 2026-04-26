---
name: ioc-hunter
description: Threat-intel IOC workflow — feed-curatie (MISP/OpenCTI/vendor/ENISA/CISA), deduplicatie, confidence-scoring (TLP, source-reputation, age, sightings), enrichment-pipeline naar SIEM/EDR, retro-hunt op N-dagen-window, en lifecycle (expiry + retirement).
---

# IOC Hunter

> **Bron-discipline en TLP-respect**: IOCs hebben een share-policy (TLP-RED/AMBER/GREEN/CLEAR). Doorgeven aan partijen waar het feed-contract het niet toestaat is een breach van trust en in sommige contracten ook van licentie. Sharing waar wel toegestaan (intra-industry ISAC, CSIRT-NL, sector-PAC) is een netto-positieve gewoonte.

## Wanneer gebruiken

IOCs (Indicators of Compromise) zijn de tactische laag van threat-intel: hashes, IPs, domains, URLs, mutexes, certificate-fingerprints, JA3/JA4-strings. Deze skill helpt feeds beheren, dedup en confidence-scoren, in SIEM/EDR pluggen en retro-hunten.

Activeert bij:

- Een vraag als "voeg deze IOC-feed toe aan onze stack", "is deze hash bekend", "retro-hunt afgelopen 30 dagen op deze IOCs", "hoe scoren we IOC-confidence", "MISP-instance opzetten".
- Een handoff vanuit `detection-engineer` (rule heeft IOC-input nodig), `log-triage` of `threat-hunt`-command (enrichment van findings), `malware-triage` (extracted IOCs willen worden geïntegreerd).
- Een nieuwe APT-campaign-publicatie waarvan de IOCs willen worden geprocessd.
- Periodieke (kwartaal) feed-hygiene-review: welke feeds leveren waarde, welke niet.

### Wanneer NIET (handoff)

- Detection-rule schrijven die de IOC consumeert → `detection-engineer`. Deze skill levert de IOC-input.
- Triage van de alert die door een IOC-match firet → `log-triage`.
- Threat-hunt als sessie zelf → `threat-hunt`-command.
- Malware-sample-analyse die IOCs produceert → `malware-triage`.
- Forensische bevestiging van IOC-impact → `forensics-assist`.
- Strategische CTI (actor-profiles, geopolitical-context) ligt buiten deze skill — vraagt apart CTI-werk dat hier niet in scope is.
- Vulnerability-feed (CVEs) → `cve-triage`.

## Aanpak

Zes fases. Fase 2 (confidence-scoring) en fase 5 (retro-hunt) zijn de plekken waar IOC-werk operationele waarde levert.

### 1. Feed-curatie

Welke feeds verdienen je SIEM-bandwidth? Niet alle.

**Bron-categorieën**:

- **Government / national-CERT**: CISA AIS, NCSC-NL, ENISA-feeds, BSI (DE), ANSSI (FR). Hoog-vertrouwd, soms vertraagd.
- **ISAC / sector-PAC**: FI-ISAC NL voor financial, MS-ISAC voor government. Sector-specifieke relevantie.
- **Commercial CTI**: Mandiant, Recorded Future, CrowdStrike Intelligence, Mandiant Advantage, IntSights/Rapid7, Group-IB. Hoge kwaliteit, hoge prijs.
- **Open-source/community**: AlienVault OTX, abuse.ch (URLhaus, MalwareBazaar, ThreatFox), Spamhaus, Emerging Threats. Mixed kwaliteit, vrij of low-cost.
- **Vendor-specifieke threat-intel**: Microsoft Security Graph, Cisco Talos, Palo Alto Unit 42 — vaak ingebakken in product-licentie.
- **Internal sources**: eigen incidents leveren de hoogst-vertrouwde IOCs voor je organisatie. Categoriseer als "internal" met aparte TTL.

**Curatie-criteria**:

- Coverage: dekt het feed sectoren/regio's die je raken?
- Freshness: hoe snel na incident verschijnt een IOC in de feed?
- Validity: welke % van IOCs is na 30/60/90 dagen nog true-positive?
- False-positive-history: bekende noisy feeds (bv. NRD-feeds die alle nieuwe-domeinen flaggen) hebben aparte cadens nodig.
- Format: STIX 2.1 / OpenIOC / MISP-event-format / CSV. STIX is de de-facto standard.

Een feed die niet wordt gebruikt voor matching of retro-hunt verdient niet zijn ingest-plek. Periodiek terugschalen.

### 2. Deduplicatie en confidence-scoring

Eén IP kan in 5 feeds opduiken. Eén hash met 12 sources is niet 12× waardevoller dan eén met 1 source — wel iets. Confidence-model:

- **Source-reputation-score** per feed (intern bijgehouden op basis van TP-rate-historie). Hoog-betrouwbare bron = hogere weight.
- **Age**: hoe ouder een IOC, hoe minder relevant. Default-decay: na 30 dagen halveert confidence; na 90 dagen retirement-kandidaat tenzij APT-context. Sommige IOC-types vergrijzen sneller (IPs > domains > hashes voor sustained-malware).
- **Sightings**: aantal keren door verschillende-bronnen gerapporteerd. Beïnvloedt confidence positief, niet lineair.
- **TLP**: niet zozeer confidence maar share-restrictie. TLP-RED = alleen specifiek-publiek, TLP-AMBER = beperkt-extern, TLP-GREEN = community, TLP-CLEAR = open. Sharing-discipline: TLP nooit opwaardeerd zonder bron-toestemming.
- **Type-specifiek**:
  - **Hashes** (SHA-256 voorkeur): hoogste-precision, lange leven mits hash niet wijzigt. False-positive-risk laag.
  - **IPs**: short-lived in cloud-context (CDN-shared, ephemeral-cloud-resources). Confidence snel verlagen, retire na 14-30 dagen tenzij bevestigd APT-infrastructure.
  - **Domains**: middel-leven; sinkholing en takedowns versnellen retirement. Watch voor wildcard-feed-noise.
  - **URLs**: short-lived, exploit-kit-rotatie. Snel retire.
  - **JA3/JA4 fingerprints**: TLS-handshake-fingerprint, sustained mits malware-bouwer dezelfde TLS-stack gebruikt.
  - **Email-adressen / sender-domains**: medium-leven, BEC-context.
  - **Mutexes**: implementatie-detail, sustained.
  - **Yara-rules**: pattern niet IOC, maar functioneel verwante laag — zie `malware-triage`.

**Dedup**-implementatie: MISP/OpenCTI doen dit native als events worden gemerged op same-attribute. Custom-stack vereist eigen normalisatie (canonical-form van IPs, lowercased domains, hash-format-normalisatie).

### 3. Storage en sharing-laag

- **MISP** (open-source) — de-facto-standaard voor threat-sharing-platforms in EU. Event-based, multi-tenant, sharing-policy per event/attribute. Sterk in NL/EU community via FI-ISAC en CSIRT-NL.
- **OpenCTI** (open-source) — moderner, knowledge-graph-georiënteerd, betere visualisatie. Importeert STIX 2.1 native.
- **Anomali ThreatStream**, **EclecticIQ**, **Recorded Future** — commercial alternatives.
- **Commercial-platform-keuze** is meestal contractueel met CTI-feed-vendor. Open-source self-hosted (MISP) is haalbaar voor middelgrote orgs.

**Sharing-richting**:

- **In-bound**: integreer feeds via MISP-sync, STIX/TAXII feeds, OpenCTI-connector, of API-pulls.
- **Out-bound**: wat genereer je zelf en deel je terug? Internal-IOCs uit incidents, dunigge bevestigde detections. NL FI-ISAC en CSIRT-NL nemen contributies. Anonimiseer waar TLP-policy het vereist.

### 4. Enrichment-pipeline naar SIEM en EDR

Een IOC die nergens matcht is dood gewicht. Pipeline om ze actief te krijgen:

- **SIEM-ingestion**: feeds naar lookup-tables (Splunk lookup-files, Sentinel watchlists, Elastic enrich-policies). Fresh-feed = fresh lookup. Default refresh-cadens hourly tot daily afhankelijk van feed-update-tempo.
- **EDR-ingestion**: native IOC-modules in Microsoft Defender, CrowdStrike Falcon, SentinelOne, Carbon Black accepteren IOCs als blocklist of detection-trigger. Verschil tussen detect-only en auto-block per type.
- **Network-tooling**: firewall-blocklists (IP/domain), DNS-RPZ (recursive policy zone) voor domain-blocking, proxy/SWG-categorisatie.
- **Email-gateway**: sender-domains, hashes voor attachments. Microsoft 365 Defender, Proofpoint, Mimecast.

Enrichment-discipline: niet elke feed in elke laag. Hoog-confidence-actor-feeds → block-action; lager-confidence-feeds → detect-only met SIEM-alert. Te-aggressief-blocken op zwakke feeds is operational-disruption.

### 5. Retro-hunt en lifecycle

- **Retro-hunt op nieuwe IOCs**: bij elke nieuwe high-confidence-feed-update een sweep over laatste N dagen logs (typisch 30-90 dagen, afhankelijk van retention en compute-budget). Met `siem-query` als bouwsteen.
- **Hits-triage**: een retro-hit is geen confirmed compromise — kan benign-historical-traffic zijn. Pad naar bevestiging via `log-triage` (was de actor verdacht?) en `forensics-assist` (was er post-actie?).
- **IOC-lifecycle**:
  - **Active**: in scoring binnen, in lookup-tables.
  - **Aging**: confidence dalend, in detect-only mode.
  - **Retired**: out-of-active-detection. Bewaar in archief voor latere retro-hunt.
  - **Re-promote**: oude IOC duikt opnieuw op in nieuwe feed of incident → re-active met fresh-confidence.
- **Expiry-discipline**: feed-IOCs hebben default-TTL die uit feed-policy komt. Internal-IOCs met handmatige expiry (default 90 dagen, herzienbaar).

### 6. Verification-loop

Laag 1: scope (feeds curatie up-to-date, geen feeds die niemand meer leest?), aannames (IOC-source-reputation-scoring gebaseerd op data, niet op gut-feel?), gaps (TLP-policy-respect bij sharing-out, retro-hunt-cadens op nieuwe high-conf feeds?). Laag 2: feed-bronnen actief (meerdere CTI-vendors fuseren of stoppen — verifieer URLs en API-status), TLP-classificatie correct (TLP 2.0 sinds 2022, oude TLP-AMBER+STRICT bestaat niet meer als zodanig), STIX-versie consistent (STIX 2.1 default in 2024+).

## Output

Twee modes: feed-management (vooraf, levend) en hunt-rapport (na retro-hunt of investigation).

**Feed-management-mode**:

```
IOC feed inventory
Datum: YYYY-MM-DD | Reviewer: <naam>

Feeds actief:
  Naam | Categorie | Format | Update-cadens | Source-reputation | TLP-policy

Per feed:
  Coverage:           <regio's, sectoren>
  Freshness:          <gemiddelde delay tussen incident en publicatie>
  Validity-rate:      <% TPs after 30/60/90 days>
  TP-rate-trend:      <stable / dalend / stijgend>
  Beslissing:         <retain / downgrade / replace / drop>

Sharing-out:
  Internal-IOCs gegenereerd: <N>
  Gedeeld via: <FI-ISAC NL / MISP-sync / CSIRT-NL>
  TLP-classificatie: <per IOC>

Coverage-gaps:
  <welke threat-clusters niet gedekt door huidige feeds>
```

**Hunt-rapport** (na retro-hunt op nieuwe IOC-set):

```
IOC retro-hunt — <feed-update / campaign-naam>
Window: laatste N dagen | Datum: YYYY-MM-DD

Input-IOCs:
  Hashes: N | IPs: N | Domains: N | URLs: N | JA3/JA4: N

Hits per type:
  Hash:    N (true-positive: M, false-positive: K, pending-triage: L)
  IP:      N (...)
  Domain:  N (...)
  URL:     N (...)

Confirmed sightings:
  - <IOC + match-context + system + timestamp + handoff>

Pending triage:
  - <IOC + reason for uncertainty + next-step>

Handoffs:
  ir-runbook:         <indien confirmed-compromise>
  log-triage:         <pending-triage diepte>
  detection-engineer: <indien IOCs basis voor nieuwe rule>
  forensics-assist:   <indien post-incident-onderzoek nodig>

Verification-loop: ...
```

## Referenties

- **MISP** — [https://www.misp-project.org/](https://www.misp-project.org/). De-facto threat-sharing-platform, open-source, veel gebruikt in EU/NL.
- **OpenCTI** — [https://www.opencti.io/](https://www.opencti.io/). Modern threat-intel-platform met knowledge-graph.
- **STIX 2.1** — [https://oasis-open.github.io/cti-documentation/](https://oasis-open.github.io/cti-documentation/). Structured Threat Information Expression standard.
- **TAXII 2.1** — [https://oasis-open.github.io/cti-documentation/taxii/intro](https://oasis-open.github.io/cti-documentation/taxii/intro). Transport mechanism voor STIX.
- **TLP 2.0** — [https://www.first.org/tlp/](https://www.first.org/tlp/). Traffic Light Protocol, FIRST-onderhouden.
- **abuse.ch** (URLhaus, MalwareBazaar, ThreatFox) — [https://abuse.ch/](https://abuse.ch/). Open-source IOC-feeds.
- **AlienVault OTX** — [https://otx.alienvault.com/](https://otx.alienvault.com/). Community pulse-based feeds.
- **CISA AIS** — [https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/automated-indicator-sharing-ais](https://www.cisa.gov/topics/cyber-threats-and-advisories/information-sharing/automated-indicator-sharing-ais).
- **NCSC-NL Threat Intel** — [https://www.ncsc.nl/](https://www.ncsc.nl/).
- **MITRE ATT&CK** — [https://attack.mitre.org/](https://attack.mitre.org/). Voor mapping IOCs naar TTPs.

## Categorieën

- blue
