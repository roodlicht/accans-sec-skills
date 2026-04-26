---
name: siem-query
description: SIEM query-builder workflow — Splunk SPL, Microsoft Sentinel/Defender KQL, Elastic EQL/KQL, met cross-translation-patterns, performance-tuning (data-models, summary-indexes, CCS), en query-by-detection-need. Bron-laag voor detection-engineer, log-triage en threat-hunt.
---

# SIEM Query Builder

> **Performance-discipline**: een correcte query die niet binnen redelijke tijd terugkomt is operationeel onbruikbaar. Veel SOC-tijd verloren-gaat in queries die onnodig veel data scannen. Tweede helft van deze skill is performance-discipline, niet alleen syntax.

## Wanneer gebruiken

Deze skill is de tooling-substrate onder `detection-engineer` (regels), `log-triage` (incident-onderzoek), `threat-hunt` (proactief) en `ioc-hunter` (enrichment-queries).

Activeert bij:

- Een vraag als "schrijf een SPL voor X", "vertaal deze KQL naar EQL", "waarom is mijn query traag", "welke index voor deze data", "summary-index opzetten".
- Cross-platform-migratie of multi-platform-organisatie waar dezelfde detection-logic in beide moet bestaan.
- Performance-tuning van bestaande queries die te traag zijn voor real-time alerting.
- Setup van data-modellen (Splunk CIM, Sentinel ASIM/Watchlist, Elastic ECS) voor consistente schema-overheen.

### Wanneer NIET (handoff)

- Detection-rule-design en lifecycle → `detection-engineer`, `alert-tuning`. Deze skill levert query-bouwstenen, die skills regelen lifecycle.
- Triage van actuele alerts/events → `log-triage`. Deze skill levert query, die analyseert resultaat.
- IOC-feed-management en threat-intel-enrichment → `ioc-hunter`.
- Threat-hunt-hypothese-design → `threat-hunt` (command).
- Forensische diepte → `forensics-assist`.
- Log-pipeline-engineering (collection, parsing, enrichment) → ops-team. Deze skill werkt met data zoals het SIEM ze biedt.

## Aanpak

Zes fases. Fase 3 (cross-translation) en fase 4 (performance) zijn waar SIEM-tijd écht zit.

### 1. Tool en context

Drie-mainstream-platforms in de meeste organisaties:

- **Splunk Enterprise / Cloud** — SPL (Search Processing Language). Pipe-style, function-rich, krachtig op massa-data met indexer/search-head architectuur.
- **Microsoft Sentinel + Microsoft Defender XDR** — KQL (Kusto Query Language). Modern, snel, sterke join-en-aggregation-syntax. Sentinel = log-source-side, Defender XDR = endpoint-side; gedeelde query-language.
- **Elastic Security** — EQL (Event Query Language) voor sequence-detection, KQL/Lucene voor zoekfilters, ESQL als nieuwere unified-language. Veel tooling rondom Elastic Common Schema (ECS).

Andere stacks: IBM QRadar (AQL), Sumo Logic, Chronicle (YARA-L), Devo. Concepten overlappen, syntax verschilt.

Per query-opdracht eerste vraag: welk platform target? Welke retention-window? Welke data-model? Welke tijdzone in events?

### 2. Query-construction-patterns

Per platform de canonieke shapes:

**Splunk SPL**:

```spl
index=cloudtrail eventName=ConsoleLogin
  | where 'additionalEventData.MFAUsed'="No"
  | stats count by userIdentity.userName, sourceIPAddress
  | where count > 5
```

Pipeline-mindset: filter eerst (`index=`, `sourcetype=`), dan transformeer (`stats`, `eval`, `lookup`), dan presenteer (`table`, `chart`).

Krachtige features: `tstats` (data-model-acceleration), `transaction` (event-correlation), `dedup`, `streamstats` (running-aggregates), `lookup` (CSV/KV-store enrichment), `metasearch` (alleen metadata, sneller).

**Sentinel/Defender KQL**:

```kql
SigninLogs
| where ResultType == 0 and AppDisplayName == "Office 365"
| where ConditionalAccessStatus == "success"
| summarize SignInCount = count() by UserPrincipalName, IPAddress, bin(TimeGenerated, 1h)
| where SignInCount > 10
```

Pipeline ook hier (`|`-style). Sterke punten: `summarize` met `bin()` voor time-bucketing, `join kind=` voor verschillende join-types, `let` voor variabelen, materialize voor caching.

Multi-table join: `union`, `join`, `lookup`. ASIM (Advanced SIEM Information Model) voor cross-source-normalisatie.

**Elastic EQL** (sequence-aware):

```eql
sequence by host.id with maxspan=5m
  [process where event.action == "fork" and process.name == "bash"]
  [network where event.action == "connection_attempted" and destination.port == 4444]
```

EQL is uniek in zijn out-of-the-box support voor event-sequences. Voor ad-hoc-zoeken is KQL/Lucene/ESQL praktischer.

ECS-veldnamen consistent: `event.action`, `process.name`, `host.id`, `user.name`. Migratie van non-ECS-data is een aparte taak.

### 3. Cross-translation-patterns

De drie talen hebben semantische overeenkomst maar verschillende syntax. Patroon per categorie:

| Concept | SPL | KQL | EQL/KQL-Elastic |
|---|---|---|---|
| Filter exact | `field="value"` | `field == "value"` | `field == "value"` |
| Wildcard | `field=value*` | `field has "value"` | `field : value*` |
| Negation | `NOT field=val` | `field != "val"` | `not field == "val"` |
| Time-bucket | `bin _time span=1h` | `bin(TimeGenerated, 1h)` | `histogram(@timestamp, fixed_interval=1h)` |
| Group-by-count | `stats count by field` | `summarize count() by field` | aggregations API |
| Distinct count | `dc(field)` | `dcount(field)` | cardinality |
| Top-N | `top N field` | `top N by count_` | top-hits |
| Join | `join field [...]` | `T1 \| join T2 on field` | enrich pipeline |
| Lookup | `lookup file field` | `lookup table on field` | enrich processor |

`sigma-cli` met de juiste backend (zie `detection-engineer`) automatiseert veel van dit. Reviewer-rol blijft: edge-cases (field-name-mapping, semantic-difference op `wildcard` vs `contains`) checken.

### 4. Performance-tuning

Een correcte-maar-trage query is operationeel niet bruikbaar. Top-categorieën:

- **Index/scope-fildering eerst**. SPL: `index=` direct. KQL: tabel-specifiek (`SigninLogs`, niet `union *`). Elastic: index-pattern aanscherpen.
- **Time-range-discipline**. Default last 24h, niet "all time". Elke uitbreiding bewust.
- **Field-extraction-eagerness vermijden**: SPL `extract` op massa-data is duur — gebruik regex-extracted-fields tijdens index-time waar mogelijk.
- **Subsearches tot een minimum**. SPL-subsearches draaien aparte search en hebben default 10k-result-limit. KQL `let` met materialize is vaak performanter.
- **Data-models gebruiken** (Splunk CIM, Sentinel ASIM, ECS). Een `tstats` op een geaccelereerd CIM-data-model is orde-grote sneller dan equivalent search-time-extraction.
- **Summary-indexes / scheduled-saved-searches** voor recurring-aggregations. Niet elke uur dezelfde count opnieuw berekenen — rollup-eens-per-uur.
- **Cross-cluster-search (CCS)** in Splunk en Elastic: bewust of je naar cross-cluster wil verbinden. Latency-cost.
- **JOIN-kosten**: KQL `join` order matters; smaller table left. Elastic's enrich-pipeline at index-time is vaak beter dan query-time-join.
- **Result-cardinaliteit**: een query die 10M rijen retourneert om er 100 te tonen heeft een filter-vergeten.

Profiling-hulp:

- Splunk: `Search Job Inspector` toont per-stage-tijd. `tstats` vs raw-search-vergelijking.
- Sentinel/Defender: query-takes-long-warnings + `set notruncation=true`-debug, `evaluate execute_query_stats(...)`.
- Elastic: profile API voor query-execution-plan.

### 5. Library-management

Goed-gebouwde queries zijn herbruikbaar. Discipline om dat te behouden:

- **Detection-as-code repo** waar Sigma-rules + getranspileerde queries + saved-searches in versie-control staan. Niet alleen in SIEM-UI.
- **Macro's / functions / saved-searches**: SPL-macros, KQL functions (`function`-keyword), Elastic-painless-scripts. Hergebruik per veelvoorkomende sub-pattern (definieer "wat is een verdachte LSASS-access" eens, gebruik N rules).
- **Naming-conventie**: prefix-pattern voor saved-searches (`sec_`, `hunt_`, `dashboard_`) zodat doel direct duidelijk is.
- **Documentation per query**: doel, owner, last-tested-date, FP-notes. In commit-message of comment-block.

### 6. Verification-loop

Laag 1: scope (query dekt alle relevante velden + tijdvenster, geen onbedoelde scope-creep door wildcard-tabel-selectie?), aannames (data-model up-to-date, schema-velden bestaan?), gaps (FP-pad gecheckt, niet alleen TP-pad?). Laag 2: function-namen tegen actuele platform-docs (KQL en SPL voegen functies toe en deprecaten ze), geen verzonnen tabel-namen of veld-syntax, time-bucket-syntax correct, performance-claims onderbouwd via profiling-output.

## Output

```
Query-pakket — <doel>
Platform-target: <Splunk SPL | Sentinel KQL | Defender KQL | Elastic EQL/KQL | multi>
Data-source(s):  <indexen / tabellen / index-patterns>
Tijdvenster:     <default + customizable>

Query (primary):
  <volledige query-tekst>

Vertalingen (indien multi-platform):
  Splunk SPL: <...>
  KQL:        <...>
  EQL:        <...>

Performance-profiel:
  Test-run: <events scanned, runtime>
  Bottleneck:  <field-extraction / subsearch / join / etc>
  Optimalisatie toegepast: <data-model / summary / index-filter>

Edge-cases / FPs:
  - <known FP-pattern, hoe te filteren>
  - <field-name-issues bij vertaling tussen platforms>

Library-integratie:
  Saved als:    <macro/function/saved-search-naam>
  Detection-as-code path:  <repo-pad>

Handoffs:
  detection-engineer:  <indien query basis voor rule wordt>
  log-triage:          <indien query voor incident-investigatie is>
  threat-hunt:         <indien hunt-context>

Verification-loop: ...
```

## Referenties

- **Splunk Search Reference** — [https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/](https://docs.splunk.com/Documentation/Splunk/latest/SearchReference/). Volledige SPL-referentie.
- **Splunk Common Information Model (CIM)** — [https://docs.splunk.com/Documentation/CIM/latest/User/Overview](https://docs.splunk.com/Documentation/CIM/latest/User/Overview). Cross-source data-model.
- **Microsoft KQL quick reference** — [https://learn.microsoft.com/en-us/azure/data-explorer/kql-quick-reference](https://learn.microsoft.com/en-us/azure/data-explorer/kql-quick-reference).
- **Microsoft Sentinel ASIM** — [https://learn.microsoft.com/en-us/azure/sentinel/normalization](https://learn.microsoft.com/en-us/azure/sentinel/normalization). Cross-source normalisatie voor Sentinel.
- **Microsoft Defender XDR Hunting** — [https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-overview](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-overview).
- **Elastic Security Reference** — [https://www.elastic.co/guide/en/security/current/](https://www.elastic.co/guide/en/security/current/).
- **Elastic Common Schema (ECS)** — [https://www.elastic.co/guide/en/ecs/current/index.html](https://www.elastic.co/guide/en/ecs/current/index.html). Field-naming-standard.
- **Elastic ESQL** — [https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html). Newer unified query language.
- **Sigma project** — [https://github.com/SigmaHQ/sigma](https://github.com/SigmaHQ/sigma). Source-of-truth voor cross-platform rules.
- **uncoder.io** — [https://uncoder.io/](https://uncoder.io/). Browser-tool voor cross-platform query-translation; verifieer altijd output.

## Categorieën

- blue
