---
name: c2-hygiene
description: Command-and-Control infrastructuur-hygiene voor red-team — redirector-architectuur (HTTP/HTTPS/DNS), traffic-shaping (sleep/jitter/staging), TLS-cert-en-domain-aging, OPSEC-checklist, en defensieve detection-opportunities mapped op ATT&CK Command and Control (TA0011).
---

# C2 Hygiene

> **Sandbox/lab-only en RoE-strict**: deze skill beschrijft architectuur en hygiene-discipline voor C2-infrastructuur in red-team-engagement-context. Specifieke beacon-configuraties, malleable-profile-strings voor benoemde C2-frameworks, of EDR-bypass-recepten staan niet hier — die horen in een afgesloten engagement-vault. Skill levert architecturele patronen, OPSEC-checklists en detection-perspectief, allemaal verifieerbaar in lab.

## Wanneer gebruiken

C2 (Command and Control) is de operationele backbone van elk red-team-engagement of APT-simulatie: hoe communiceer je met geplaatste implants zonder gepakt te worden, en hoe maak je het verkeer realistisch genoeg dat detection-tuning er iets mee kan. Deze skill geeft de architectuur- en hygiene-lens, niet de framework-specifieke setup.

Activeert bij:

- Een vraag als "hoe zet ik C2-redirectors op", "is domain fronting nog haalbaar in 2026", "wat is een redelijke beacon-jitter", "OPSEC-review van onze C2-stack", "hoe testen we detection op onze C2".
- Red-team engagement-voorbereiding waar C2-infra moet worden ontworpen of beoordeeld.
- Purple-team oefening waar de defensieve kant detection wil testen tegen realistische beacons.
- Defensive-context: SOC-team wil weten welke patronen ze moeten detecteren — deze skill geeft de offensive-lens, `detection-engineer` levert de rule-side.
- Threat-emulation tegen specifieke threat-actors (CIS / MITRE Adversary Emulation Plans) — deze skill levert de C2-laag, threat-intel komt elders vandaan.

### Wanneer NIET (handoff)

- Initial access of phishing → `phishing-sim`, `web-exploit-triage`, `payload-crafter`. Deze skill begint met "hoe blijft de implant praten".
- Post-exploitation / lateral movement / persistence → `post-exploit`, `ad-attacks`. C2 is het transport, die skills doen de actie erop.
- Detection-rule-bouw → `detection-engineer`, `siem-query`, `purple-ops`. Deze skill noemt detection-opportunity, die skills bouwen de rules.
- Final reporting → `pentest-reporter`.
- Threat-intelligence over specifieke C2-frameworks-in-the-wild → `ioc-hunter`.
- Forensics na een geïdentificeerd C2 in productie → `forensics-assist` plus `ir-runbook`.

## Aanpak

Zes fases. Fase 1 (architectuur) en fase 4 (OPSEC-discipline) zijn waar C2-engagements falen of slagen.

### 1. Redirector-architectuur

Een implant praat zelden direct met je teamserver — daartussen zit minimaal één redirector-laag. Doel: aanvalsbron afschermen, traffic legitiem laten ogen, en kosten van takedown verlagen.

**Lagen** (van implant naar operator):

- **Implant** in target-omgeving.
- **Front-domein** waar de implant naartoe praat. Liefst CDN-fronted, "aged" domain met geloofwaardige content.
- **Redirector** (HTTP/HTTPS): nginx of Apache met reverse-proxy-config die alleen specifieke paths/User-Agents/headers naar teamserver doorzet, alle andere naar een onschuldige sinkhole-pagina (HTTP 200, geen redirect — dat zou een scanner triggeren).
- **DNS-redirector** voor DNS-C2 channels: jouw nameserver met een NS-delegatie van een sub-domein naar je C2-server.
- **Teamserver / C2-controller**: niet rechtstreeks bereikbaar van internet. Toegang via VPN of bastion.

**Selectiecriteria voor front-domein**:

- Domain-age (hoe ouder hoe geloofwaardiger; nieuw-geregistreerd domain = red flag bij DNS-monitoring).
- Categorisatie bij filtering-services (BlueCoat/SquidGuard/Cisco-Umbrella). Categorize als news/business eerder dan unknown.
- TLS-cert door publieke CA met geloofwaardige subject (SAN matcht domain).
- Gewenste reputatie via `urlscan.io` en `threatintelligenceplatform.com` checks vóór live.

**Domain fronting**: het sturen van traffic door een CDN met een SNI/Host-header-mismatch zodat het naar één host lijkt maar naar een andere wordt geleid. Sinds ~2018 is dit door grote providers (Google, AWS CloudFront, Microsoft Azure) afgesloten. Sinds 2022-2024 is het in de meeste mainstream-CDNs niet meer reproduceerbaar zonder vendor-policy-violation. Skill noemt het als historische context, geen aanbevolen techniek voor 2026.

**Alternatieven voor domain-fronting**:

- **Domain-borrowing / High-Reputation CDN-egde-deployments**: legitieme tenant-deployments die als front werken; vendor-policy-grenzen variëren.
- **Cloud Storage-fronting**: object-storage public-read URLs (S3, GCS, Azure Blob) als download-relay. Vendor-policies vergelijkbaar gemonitord.
- **DNS-over-HTTPS (DoH)** als channel: traffic ziet eruit als gewone DoH naar Cloudflare/Google DNS.
- **Webhook-services** (Slack, Discord, Telegram): API-traffic is per definitie outbound-allowed in veel orgs. Detectie via behavioural-analysis op deze legitieme services.

Discipline: nooit een front kiezen waarvan de policy expliciet zegt dat dit hier niet voor gebruikt mag worden. Niet alleen ethisch — als de provider takedown doet ben je je infra kwijt mid-engagement.

### 2. Traffic-shaping en beacon-tuning

Beacons zijn periodieke check-ins van implant naar teamserver. Twee-as discipline: hoe vaak en hoe regelmatig.

- **Sleep-interval**: tijd tussen check-ins. Korte sleep (10–30 sec) = snelle interactie, meer verkeer, hogere detection-kans. Lange sleep (5–60 min) = stealthier maar trager. Default voor stealthy-engagement: minutes-range, niet seconds.
- **Jitter**: percentage random-deviation rond sleep-interval. Zonder jitter is interval `60s, 60s, 60s` — een SIEM ziet de regelmaat. Met 30% jitter: `42s, 75s, 51s` — minder cyclisch. Default: 25–50% jitter.
- **Staging**: initial-payload klein en clean (loader), full-implant gestaged via tweede request na trust gewonnen. Reduceert eerste-impact-detection.
- **Working-hours schedule**: beacon alleen tijdens target-organisatie-werkuren. Implant slaapt buiten 9–17 lokale-tijd. Verkeer "blends in" met legitiem werk. Implementatie via implant-clock (legt time-zone-fingerprint achter, tradeoff) of operator-side scheduled-window.
- **C2-channel-rotation**: meerdere channels (HTTP, DNS, named-pipe) zodat takedown van één niet alles stopt. Implant-config met fallback-volgorde.

Detection-perspectief per shaping-keuze:

- Hoge-jitter + lange-sleep is harder voor frequency-analysis, maar TLS-fingerprint en domain-reputation zijn unchanged. Defense in depth detecteert meerdere lagen.
- Working-hours-schedule is detecteerbaar als implant-clock niet matcht met werkelijke target-tijdzone (off-by-hour).
- C2-channel-rotation laat een patroon achter waar dezelfde implant op meerdere kanalen gezien wordt.

### 3. TLS, certificates en domain-aging

C2-traffic in 2026 is bijna altijd TLS-encrypted. Cert- en domain-discipline:

- **Cert-issuer**: Let's Encrypt is gratis maar low-reputation in sommige scoring-systemen. Commercial-CA-cert (DigiCert / Sectigo) verlaagt cert-based-detection.
- **Cert-fingerprint** (JA3/JA3S, JA4/JA4S sinds 2023): TLS-handshake-fingerprint identificeert TLS-stack. Een implant die JA3 heeft die niet matcht met de browsers in target-omgeving valt op. Discipline: TLS-stack van de implant matchen met expected-fingerprint, of legitimate-library-traffic emuleren.
- **Domain-age**: nieuwregistratie heeft "domain-age <30 dagen"-flag bij meerdere DNS-monitoring-services. Plan domain-purchase + DNS-record-publish weken voor engagement.
- **Catetegorisatie bij content-filters**: vooraf urlscan.io / Cisco Talos / Symantec WebPulse checken. Recategoriseren via vendor-portals waar mogelijk.

### 4. OPSEC-discipline

Per stap in C2-operatie een OPSEC-bumper. Deze checklist is een lagging vs. leading-indicator-mix.

- **Operator-side IP-aging**: teamserver achter VPN, niet rechtstreeks van operator-werkstation. VPN-exit IP is niet hetzelfde als operator-thuis-IP.
- **DNS-resolution-checks**: alle implant-domeinen via target-side resolvers, niet operator-side. Vergissing leidt tot operator-DNS in target-logs.
- **Tooling-fingerprints**: standaard-tooling (default-Cobalt-Strike-strings, default-Sliver-paths) is door commerciële EDR-vendors gefingerprint. Customisering vooraf, geen out-of-the-box runs.
- **Logging-discipline operator-side**: elke commando, elke beacon, elke file-overdracht in een immutable log. Voor rapport én voor cleanup-verificatie.
- **Cleanup-readiness**: pre-engagement checklist van wat opgeruimd moet worden post-engagement (DNS-records, S3-buckets, registered-domains, certs). Niet ad-hoc bedenken op delivery-dag.
- **Tijdsdiscipline**: action-windows synchroniseren met target-time-zone (zie working-hours hierboven), command-execution alleen binnen afgesproken slot.
- **Communicatie naar klant**: real-time check-ins bij tier-0-actie, voor het geval iets escaleert.

### 5. Detection-perspectief en handoff naar blue-team

Elke C2-keuze laat een signaal achter. Documenteer per laag wat de blue-team had kunnen zien.

| C2-keuze | Detection-opportunity |
|---|---|
| Front-domain met low age | DNS-newly-registered-domain detection (Cisco Umbrella, DomainTools) |
| Default tooling-strings | YARA-rules van EDR-vendors |
| TLS JA3-fingerprint mismatch | Network-monitoring met JA3-allowlist |
| Beacon zonder jitter | Frequency-analysis op outbound-DNS/HTTP |
| Working-hours niet matchend met TZ | Time-of-day-anomaly-detection |
| Volume-anomaly bij staging | Baseline-vs-current outbound-bytes-anomaly |
| Geographic-anomaly van VPN-exit | GeoIP-based UEBA |

Per engagement-rapport een tabel zoals deze plus mapping naar ATT&CK TA0011 sub-techniques (T1071-application-layer-protocol, T1090-proxy, T1573-encrypted-channel, T1568-dynamic-resolution, T1132-data-encoding).

Handoff naar `detection-engineer` voor concrete sigma/KQL-rules.

### 6. Verification-loop

Laag 1: scope (alle C2-componenten binnen RoE? cleanup-checklist compleet?), aannames (domain-age en cert-fingerprint daadwerkelijk gecheckt vóór live?), gaps (logging operator-side compleet voor reconstructie?). Laag 2: ATT&CK TA0011 sub-techniques correct, geen verzonnen JA3-strings of vendor-tool-fingerprints, domain-fronting-claims actueel (deze techniek schuift snel; beweer geen "werkt nog op vendor X" zonder verificatie), OPSEC-checklist niet ge-overstated.

## Output

```
C2-architectuur — <engagement>
RoE: <welke channels toegestaan, welke working-hours>
Doel: <stealthy / detection-validation / threat-emulation>

Architectuur:
  Front-domain:        <FQDN, age, categorisatie, cert-issuer>
  HTTP-redirector:     <hostnaam, infrastructuur (cloud-VM/container)>
  DNS-redirector:      <NS-delegatie, sub-domein>
  Channels in gebruik: <HTTP-S / DNS / DoH / webhook>
  Teamserver-locatie:  <achter VPN/bastion, niet directly internet-reachable>

Beacon-config (lab-tested):
  Sleep:               <minutes-range>
  Jitter:              <%>
  Staging:             <ja/nee, hoeveel stages>
  Working-hours:       <slot in target-timezone>
  Channel-fallback:    <volgorde>

OPSEC-checklist:
  Operator-IP-aging:   <ok/finding>
  DNS-resolution:      <target-side / operator-side leak: ok/finding>
  Tooling-fingerprint: <gecustomiseerd: ok/finding>
  Cert-fingerprint:    <JA3/JA4 vs target-baseline>
  Domain-categorisatie: <ok/finding>
  Logging compleet:    <ok/finding>
  Cleanup-checklist:   <opgesteld: ok/finding>

Detection-opportunities (handoff detection-engineer):
  Per C2-keuze: signaal-shape, log-bron, rule-vorm

ATT&CK-mapping:
  TA0011 sub-techniques in gebruik: <T-IDs>

Cleanup-status (post-engagement):
  Domain-registratie verlopen/verkocht: <datum>
  TLS-certs revoked:                    <ok>
  Cloud-resources gedeleted:            <ok>
  Logs naar engagement-vault:           <ok>

Verification-loop: ...
```

## Referenties

- **MITRE ATT&CK — Command and Control (TA0011)** — [https://attack.mitre.org/tactics/TA0011/](https://attack.mitre.org/tactics/TA0011/). Sub-techniques als framework.
- **MITRE D3FEND** — [https://d3fend.mitre.org/](https://d3fend.mitre.org/). Defensive counters.
- **MITRE Adversary Emulation Plans** — [https://github.com/center-for-threat-informed-defense/adversary_emulation_library](https://github.com/center-for-threat-informed-defense/adversary_emulation_library). Threat-emulation-templates met concrete C2-eisen.
- **JA3/JA4 fingerprinting** — [https://github.com/FoxIO-LLC/ja4](https://github.com/FoxIO-LLC/ja4). Modern TLS-fingerprint-spec; sinds 2023 gangbaar.
- **NCSC-NL "Defensive Threat Intelligence" guidance** — [https://www.ncsc.nl/](https://www.ncsc.nl/). NL-perspective op C2-detection.
- **SpecterOps blog — C2 OPSEC posts** — [https://specterops.io/blog/](https://specterops.io/blog/). Methodology-bron voor red-team-OPSEC.
- **Microsoft TLS-fingerprint research** — [https://techcommunity.microsoft.com/](https://techcommunity.microsoft.com/). Vendor-perspective op detection.
- **Center for Threat-Informed Defense — TRAM** — [https://github.com/center-for-threat-informed-defense/tram](https://github.com/center-for-threat-informed-defense/tram). Mapping-tooling.
- **NIST SP 800-115 §5** — [https://csrc.nist.gov/pubs/sp/800/115/final](https://csrc.nist.gov/pubs/sp/800/115/final). Methodology-context.

## Categorieën

- pentest
