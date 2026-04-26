---
name: alert-tuning
description: SOC alert-tuning workflow — false-positive reductie via gerichte suppressies (rule-id + reden + expiry), baseline-learning, rule-retirement, severity-recalibration, en metrics (alert-volume, mean-time-to-triage, fatigue-index). Voorkomt detection-collapse zonder coverage-verlies.
---

# Alert Tuning

> **Discipline-balans**: te weinig tuning = analyst-fatigue + missed real alerts in de stortvloed. Te veel tuning = silent-failure waar je rules niets meer detecteren maar niemand het merkt. Suppressies altijd met rule-id + reden + expiry, nooit wildcard-permanent. Periodieke review verplicht.

## Wanneer gebruiken

Een SOC die niet tuned, drown-t in alerts. Een SOC die te aggressief tuned, mist incidents. Deze skill is de discipline tussen die twee.

Activeert bij:

- Een vraag als "we hebben 5000 alerts per dag, hoe moet dat minder", "hoe suppressen we deze rule netjes", "rule X firet nu nooit, klopt dat", "review onze tuning-stack".
- Een baseline-meting voor het in productie nemen van een nieuwe rule (zie `detection-engineer` fase 4).
- Periodieke (kwartaal) review-cyclus van actieve rules.
- Een handoff vanuit `detection-engineer` (rule met te hoge FP-rate vraagt tuning).
- Een SOC-MTTR-meting waar tuning-actie als root-cause is geïdentificeerd.

### Wanneer NIET (handoff)

- Nieuwe rule schrijven → `detection-engineer`. Deze skill werkt op bestaande rules.
- Triage van een specifieke alert in real-time → `log-triage`, `siem-query`. Deze skill is over rule-niveau, niet alert-instance.
- IOC-feed-curatie zelf → `ioc-hunter`.
- Threat-hunt om niet-gedetecteerde TTPs te vinden → `threat-hunt` (command).
- Detection-coverage-mapping → `detection-engineer` of DeTT&CT.

## Aanpak

Zes fases. Fase 1 (volume-triage) is altijd het startpunt; fase 5 (lifecycle-discipline) is wat bestaande tuning-stacks van langzaam-rotten redt.

### 1. Volume-triage en hot-list

Begin met data, niet meningen.

- **Top-N rules per alert-volume**: laatste 30 dagen, gerangschikt. 80/20 verdeling: typisch produceert 10-20% van rules 80% van alerts.
- **Mean-time-to-triage per rule**: hoe lang duurt het tot een analyst tot conclusie komt? Hoge MTT plus hoge volume = pijnpunt.
- **True-positive-rate per rule** (waar getrackt): TP / (TP + FP). Onder 5% TP-rate = sterk-tuning-kandidaat.
- **Analyst-fatigue-signaal**: alerts met "snooze"-acties, alerts die niet binnen SLA worden opgepakt, alerts die met copy-paste-comments worden gesloten.

Output: hot-list van rules met onevenredig veel volume of slecht-converterende-tot-incidents. Top-10 voor deze cyclus.

### 2. FP-pattern-identification per hot-rule

Per rule op de hot-list: wat veroorzaakt de FPs? Niet "te aggressief" — specifiek welke pattern.

Veelvoorkomende FP-categorieën:

- **Legitimate process / user / system**: backup-tools, AV-scanners, deployment-pipelines, monitoring-agents, scheduled health-checks.
- **Geographic / time-based legitimate**: travel-pattern-trigger op global-team, normaal-after-hours-werk in 24/7-team.
- **Stale config**: rule voor specifiek aanvalspatroon dat sindsdien intern is geremedieerd, dus alleen het ruisige FP-aandeel blijft over.
- **Schema-drift**: log-source heeft nieuwe veldwaarden, rule matcht oude waarden — alle nieuwe events triggeren als "rare" terwijl ze normaal zijn.
- **Threshold te scherp**: rule firet bij N=3, terwijl baseline al regelmatig N=4 ziet.

Per FP-categorie een aanpak (zie fase 3).

### 3. Suppressie-discipline

Niet alle FPs los je op met suppressie — sommige met rule-refactor. Dit is de keuze.

**Suppressie geschikt** als:

- FP komt van een specifieke, identificeerbare bron (één service-account, één range).
- De legitieme activity is te-divers-om-in-rule-conditions te vangen.
- Rule blijft inhoudelijk valid voor andere bronnen.

**Refactor de rule** als:

- FP komt van een fundamentele design-fout in de detection-logica.
- De rule is verouderd voor de huidige threat-pattern.
- Suppressie-list zou onhoudbaar groot worden.

**Suppressie-format** (consistent over rules):

```yaml
suppression:
  rule_id: T1003-001-LSASS-Access
  match:
    SourceImage: '\windows\system32\msmpeng.exe'
  reason: "Microsoft Defender Antimalware Service legitimate LSASS access"
  added_by: <analyst-name>
  added_date: YYYY-MM-DD
  expires: YYYY-MM-DD     # 6 maanden default
  evidence_link: <ticket / wiki>
```

**Verboden patterns**:

- `match: '*'` of geen match-criteria (suppressie-all).
- Geen reden ingevuld.
- Geen expiry ingevuld.
- Suppressie op rule-id-globaal in plaats van event-specifiek.

Suppressie zonder al deze velden = audit-finding bij volgende review.

### 4. Baseline-learning en threshold-recalibration

Voor frequency-based en anomaly-based rules:

- **Rolling baseline** (laatste N dagen) voor "wat is normaal hier". Updates wekelijks of maandelijks; te-snelle-update kan attack-pattern absorberen in baseline.
- **Threshold-aanpassing op basis van baseline-distributie**: percentile-based (alert wanneer >P99 op metric X) in plaats van vaste cijfers.
- **Per-segment-baselines**: admin-accounts hebben andere baseline dan service-accounts dan end-users. Eén rule die alle drie dezelfde drempel toepast levert garantie-FPs.
- **Time-of-day en day-of-week-segmentatie** waar relevant (bv. weekend-werk vs. weekdag).

Anti-pattern: baseline die zo wide-net-fitted is dat een real attack ruimschoots binnen "normaal" past.

### 5. Rule-lifecycle: retirement, refresh, retire

Rules verouderen. Discipline om de stack te onderhouden:

- **Retire**: rule die N maanden (default 6) geen TP heeft + threat-pattern is verouderd of inmiddels door andere rule beter gedekt. Verwijder uit productie, archive in detection-as-code-repo voor reference.
- **Refresh**: rule die wel TP heeft maar grote tuning-stack rondom heeft groeid. Herschrijf op basis van actuele baseline en threat-pattern.
- **Retain**: rule blijft, met huidige tuning, tot volgende review.
- **Promote**: experimental rule met goede TP-rate naar production-severity.
- **Demote**: rule met te-veel-FPs en lage TP-rate naar lager severity-niveau (informational), niet meteen retire — soms levert het nog hunting-context.

Quarterly cyclus: alle rules langs deze vier acties. Default: retain. Maar elke retain moet expliciet gedocumenteerd zijn ("FP-rate stabiel, 12 TPs in afgelopen kwartaal").

### 6. Metrics en verification-loop

Houden welke metrics tracked je tuning-effectiviteit:

- **Alert-volume per dag/week** (target: stabiel of dalend, geen onverwachte spikes).
- **TP-rate per rule** (target: > 10% high-severity, > 5% medium).
- **Mean-time-to-triage (MTT)** (target: korter wordend).
- **Fatigue-index** (zelf-gerapporteerd door analysts of berekend uit acceptance-rate van alert-acties).
- **Coverage-regressie**: dropt je ATT&CK-coverage doordat je rules retiret zonder vervanging? Track via DeTT&CT.
- **Suppression-cardinaliteit**: hoeveel actieve suppressies per rule? Boven N=10 is signal dat de rule zelf gefixt moet worden.
- **Suppression-expiry-compliance**: % suppressies die nog binnen geldigheid zijn (target: > 95%; rest re-evaluate of expired-removed).

**Verification-loop**:

Laag 1: scope (alle hot-rules deze cyclus geadresseerd?), aannames (FP-categorieën onderbouwd door data, niet door anekdote?), gaps (suppressies hebben expiry + reden + evidence-link?). Laag 2: TP/FP-cijfers afkomstig van source-of-truth (SOC-platform), niet samengevat geheugen, ATT&CK-coverage-claims via tool-rapport, geen verzonnen baseline-percentielen.

## Output

```
Alert-tuning rapport — <SOC / org>
Periode: <start → eind>
Reviewer: <naam + rol>

Volume-triage (Top-10 hot rules):
  Rule | Alert-vol | MTT | TP-rate | Acties

Per hot rule:
  Rule-ID:           <id>
  FP-pattern:        <categorie>
  Beslissing:        <suppress / refactor / retire / refresh>
  Implementatie:     <suppression-yaml / refactor-PR-link / retirement-ticket>
  Verwachte impact:  <volume-reductie %, FP-rate-target>

Suppressie-stack-status:
  Totaal actief:        N
  Per rule (Top-N):     gemiddeld M
  Verlopen / re-eval:   N (deze cyclus afgehandeld)
  Verboden patterns:    <0 of lijst, met fix-actie>

Baseline-recalibration:
  Rules met geüpdatete thresholds: N
  Per-segment-baselines toegevoegd: <lijst>

Lifecycle-acties deze cyclus:
  Retire:   <N rules>
  Refresh:  <N rules>
  Promote:  <N>
  Demote:   <N>
  Retain:   <N (default)>

Coverage-impact (DeTT&CT of equivalent):
  ATT&CK techniques nu gedekt:    <%>
  Verschuivingen sinds vorig kwartaal: <toename/afname>

Metrics:
  Alert-volume trend:           <grafiek-ref>
  TP-rate trend:                <per severity>
  MTT trend:                    <minuten>
  Fatigue-index:                <score>

Verification-loop: ...
```

## Referenties

- **NIST SP 800-92** — [https://csrc.nist.gov/pubs/sp/800/92/final](https://csrc.nist.gov/pubs/sp/800/92/final). Guide to Computer Security Log Management; baseline-laag.
- **MITRE D3FEND** — [https://d3fend.mitre.org/](https://d3fend.mitre.org/). Defensive countermappings.
- **DeTT&CT** — [https://github.com/rabobank-cdc/DeTTECT](https://github.com/rabobank-cdc/DeTTECT). Coverage-tracking en data-source-mapping. NL-bron (Rabobank CDC).
- **Sigma project** — [https://github.com/SigmaHQ/sigma](https://github.com/SigmaHQ/sigma). `falsepositives` veld is built-in tuning-discipline.
- **MITRE ATT&CK Navigator** — [https://mitre-attack.github.io/attack-navigator/](https://mitre-attack.github.io/attack-navigator/). Visuele coverage-mapping.
- **SANS — Detection Engineering Maturity Model** — [https://www.sans.org/](https://www.sans.org/). Maturity-rubric voor team-volwassenheid.
- **Florian Roth — Sigma rules best practices** — [https://github.com/SigmaHQ/sigma/wiki/Rule-Creation-Guide](https://github.com/SigmaHQ/sigma/wiki/Rule-Creation-Guide). Praktisch tuning-advies vanuit project-maintainer.

## Categorieën

- blue
