---
name: log-triage
description: Identity-log triage workflow — anomaly-patterns per provider (AWS CloudTrail, Azure AD/Entra, Google Workspace, Okta), session-en-token-misbruik, MFA-bypass-signalen, conditional-access-evasion, en cross-provider correlatie. Levert prioriteits-gestelde finding-list richting ir-runbook of detection-engineer.
---

# Log Triage

> **Identity-eerst-context**: het overgrote deel van moderne incidents start of escaleert via identity-providers. Logs zijn de truth-source — UI's zijn verouderd snapshots. Deze skill behandelt audit/identity-logs van de major-IdPs; netwerk-logs of endpoint-EDR raken aan, maar vallen in andere skills.

## Wanneer gebruiken

Een log-getriagede vraag begint met "iets is raar in de logs, kijk er eens naar". Deze skill geeft per provider de patroon-set om triageren waar mensen verloren raken in volume.

Activeert bij:

- Een vraag als "kijk naar deze CloudTrail-events", "is deze Azure AD-signin-anomaly real", "Google Workspace-audit-log heeft N login-failures", "wat is de anomaly hier in Okta", "compromised-account-investigatie".
- Een handoff vanuit `detection-engineer` (rule heeft gefired, vraagt diepere triage), `ir-runbook` (incident-onderzoek), `ioc-hunter` (IOC-match in identity-log).
- Een proactieve hunting-sessie gericht op identity-anomalies — overlap met `threat-hunt`.
- Een post-incident-onderzoek waar identity-pad gereconstrueerd moet worden voor `forensics-assist` of regulatory-rapportage.

### Wanneer NIET (handoff)

- Generic SIEM-query-bouw → `siem-query`.
- Detection-rule schrijven op basis van het patroon → `detection-engineer`.
- Threat-hunt-sessie als geheel → `threat-hunt` (command).
- Forensische memory/disk-analyse → `forensics-assist`.
- Network-flow-triage of EDR-process-events → buiten deze skill; vallen onder generic SIEM-query of EDR-tool-skill.
- IOC-curation of -enrichment → `ioc-hunter`.
- Regulatory-rapportage → `ir-runbook` plus `nis2`/`gdpr-pia`.

## Aanpak

Zes fases. Fase 1 (provider-context) en fase 4 (cross-provider-correlatie) zijn de plekken waar triage van losse-events naar betekenisvol-pad opbouwt.

### 1. Provider-context en log-source-inventaris

Identity-logs verschillen per provider in event-shape, retention, en toegankelijkheid. Triage start met "welke provider, welke log-stream, welke retention".

- **AWS**: CloudTrail (management + data-events), CloudTrail Insights (anomaly-detection, betaald), GuardDuty (managed-detection, IAM-relevant findings).
- **Azure / Entra ID**: Sign-in logs (interactive + non-interactive + service-principal), Audit logs (directory changes), Risk Detections (Identity Protection), Provisioning logs.
- **Google Workspace**: Login audit, Admin audit, OAuth Token audit, Drive audit.
- **Okta**: System Log (alle auth-events plus admin-acties), Tableau Insights (managed-anomaly).
- **JumpCloud / OneLogin / Ping**: vergelijkbare structuur.
- **On-prem AD**: Security Event Log via Sysmon/Windows Audit; via DC-SIEM-forwarder.

Per source: retention-window (default veel korter dan compliance-eis), log-completeness (zijn alle event-types ingeschakeld?), log-integrity (verzending naar SIEM compleet?).

Voorbereiding-check vóór triage: heb je toegang tot alle relevante streams voor de tijdvenster van het incident, niet alleen de "obvious" stream?

### 2. Anomaly-patterns per provider

Per IdP een pattern-set die je standaard langsloopt. Niet uitputtend; vertrekpunt voor triage.

**AWS CloudTrail**:

- **Console-login zonder MFA** waar policy MFA vereist. Event: `ConsoleLogin` met `additionalEventData.MFAUsed=No`.
- **GetSecretValue / Decrypt-bursts** door één principal in korte tijd — credential-harvesting-pattern.
- **AssumeRole-cross-account** vanuit onverwachte source-account.
- **CreateAccessKey + persist** voor een bestaande user (pattern T1098.001 — additional cloud credentials).
- **DisableLogging** events: StopLogging op Trails, DeleteTrail, UpdateConfigurationRecorder. Pattern T1562.008.
- **Mass S3 GetObject** of `ListBuckets` op short window — exfil-discovery.
- **IAM-policy met `Resource: "*"` plus `Action: "*"`** — overly-permissive setup.
- **Region-anomaly**: activity in regions waar je organisatie nooit deployt.

**Azure AD / Entra ID**:

- **Sign-in van impossible-travel**: geo-pattern met velocity > realistic flight-time. Identity Protection flagt dit, maar verifieer in detail (VPN-effecten, mobile-roaming).
- **MFA-fatigue-pattern**: meerdere MFA-prompts kort na elkaar, gevolgd door een approve. T1621 patroon. Conditional-Access kan dit blokkeren met "request-frequency-limit".
- **Service-principal-misuse**: principal met admin-rol die plotseling sign-ins doet vanuit niet-authorized-locations.
- **Legacy-auth-protocol-gebruik**: Basic Authentication, IMAP, POP — meestal MFA-bypassend. Hoort uit te staan.
- **Conditional-Access-bypass-attempts**: failures op CA-policy gevolgd door succes via andere route.
- **Application consent grants** met gevoelige scopes (Mail.ReadWrite, Files.ReadWrite.All) door gewone gebruikers — illicit consent grant T1528.
- **Token-replay**: zelfde token uit verschillende locaties.

**Google Workspace**:

- **OAuth-grants** met external apps door normale users — Drive-data-leak-vector.
- **Admin-Add / Role-Change**: verhoging van privileges.
- **Mass mail-forward-rule-set**: BEC-classifier T1114.003.
- **Login from unusual location** plus device-fingerprint-mismatch.
- **2SV-disabled** voor account dat eerder 2SV had — herstel-of-misbruik.
- **Drive-scope-share** "anyone with link" op gevoelige data.

**Okta**:

- **Push-notification-reject** gevolgd door push-accept-elsewhere — MFA-fatigue.
- **Factor-reset** door admin op user — backdoor-pattern.
- **API-token-creation** door admin met hoge-scope.
- **App-instance-add / OIN-app-grant** met hoge-scope.
- **Bypass** van network-zone-policies.

### 3. Per-event-triage: vragen-rij

Voor elke verdachte event, beantwoord:

- **Actor**: user, service-account, of API-token? Was het verwachte gedrag voor deze actor?
- **Bron**: IP, ASN, geographic, device-fingerprint. Match dat met bekende werknemer-locaties / mobile-providers / VPN-exit-points / cloud-provider-IP-ranges.
- **Authenticatie-keten**: hoe loggde de actor in (password, certificate, SAML-assertion, OAuth-token-replay)? MFA gebruikt? Welke factor?
- **Tijd**: binnen working-hours voor deze actor? Coherent met andere activiteit (vóór/erna)?
- **Outcome**: success, failure, partial. Bij failure: wat is de exact-error? Welke control vangde het?
- **Voorgaand gedrag**: wat deed deze actor 24h ervoor? Pattern-shift?

Verzamel antwoorden in incident-tabel-vorm. Zonder structuur verlies je consistency over events.

### 4. Cross-provider-correlatie

Echte aanvallen verspreiden zich over identity-providers. Een verstoring in Azure AD propageert vaak naar AWS via federated-auth, naar Google Workspace via SAML, naar SaaS-tools via OAuth.

Correlatie-strategieën:

- **User-identity-mapping**: zelfde mens in Azure AD + Google + Okta + AWS. Email-match werkt vaak. Documenteer de mapping vooraf zodat triage geen lookup-loop wordt.
- **Time-window-overlap**: actor X actief in Azure én GuardDuty-finding op AWS in dezelfde 30-minute-window.
- **IP-correlatie**: zelfde IP voor sign-in in twee providers binnen kort venster.
- **Token-trail-tracking**: SAML-assertion van IdP-A levert AccessKey op cloud-B die wordt gebruikt om SaaS-resource-C te raken.

SIEM-tooling met cross-provider data is hier kritiek (zie `siem-query`). Handmatige correlatie werkt voor kleine investigations; bij grotere incidents is geünificeerde-data-laag nodig.

### 5. Prioritering en triage-output

Per finding:

- **Severity-classificatie**:
  - **Confirmed compromise**: bewijs van real-misbruik, ga direct naar `ir-runbook`.
  - **High-suspicion**: pattern matcht, geen direct-bewijs, vraagt diepere actie (force-MFA-reset, verify-with-user).
  - **Anomalous-but-explainable**: lijkt-anomalie maar passend bij legitieme situatie. Documenteer voor baseline.
  - **Background-noise**: false-positive-pattern. Handoff naar `alert-tuning` voor rule-aanpassing.

- **Recommended-action** per finding: account-disable, force-pw-reset, MFA-re-enroll, key-rotation, conditional-access-tighten, deeper-forensics.

- **Handoffs**: high-suspicion en confirmed → `ir-runbook`; pattern-feedback → `detection-engineer`; new-IOCs → `ioc-hunter`; tuning-input → `alert-tuning`.

### 6. Verification-loop

Laag 1: scope (alle relevante streams gecheckt voor tijdvenster, geen blind-spots zoals service-principal-logs of OAuth-grant-logs?), aannames (gebruiker bevestigde of ontkende activiteit?), gaps (cross-provider-correlatie gedaan, niet alleen single-provider tunnel-vision?). Laag 2: event-type-namen kloppen tegen actuele provider-docs, geen verzonnen field-names of API-event-IDs, ATT&CK-T-IDs correct.

## Output

```
Log triage — <scope / actor / event-cluster>
Tijdvenster: <start → eind UTC>
Streams gecheckt: <provider × log-source>

Findings (per actor, per provider):
  Actor:       <user-ID + provider>
  Provider:    <AWS/Azure/Google/Okta>
  Pattern:     <impossible-travel / mfa-fatigue / illicit-consent / etc>
  Events:      <event-IDs + tijdstempels>
  Severity:    <confirmed | high-suspicion | anomalous-explainable | noise>

Cross-provider correlatie:
  IP-overlap:    <IP gevonden in providers X, Y>
  Time-overlap:  <actor-cluster binnen N minuten>
  Token-trail:   <indien relevant>

Recommended actions per finding:
  - <actor>: <account-disable / force-pw / MFA-reset / key-rotate / etc>

Handoffs:
  ir-runbook:         <confirmed compromises>
  detection-engineer: <patroon onderbouwt nieuwe rule>
  ioc-hunter:         <nieuwe IOCs voor enrichment>
  alert-tuning:       <noise-rules voor lifecycle-aanpak>

Verification-loop: ...
```

## Referenties

- **AWS CloudTrail user-guide** — [https://docs.aws.amazon.com/awscloudtrail/latest/userguide/](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/). Event-types, log-formats.
- **AWS CloudTrail Reference (Mitiga)** — externe analyse-resource voor CloudTrail-event-mapping naar ATT&CK.
- **Microsoft Entra ID monitoring docs** — [https://learn.microsoft.com/en-us/entra/identity/monitoring-health/](https://learn.microsoft.com/en-us/entra/identity/monitoring-health/). Sign-in / Audit / Risk-logs.
- **Microsoft Defender for Identity** — [https://learn.microsoft.com/en-us/defender-for-identity/](https://learn.microsoft.com/en-us/defender-for-identity/). On-prem AD-monitoring.
- **Google Workspace Audit Logs** — [https://support.google.com/a/answer/9725452](https://support.google.com/a/answer/9725452).
- **Okta System Log API** — [https://developer.okta.com/docs/reference/api/system-log/](https://developer.okta.com/docs/reference/api/system-log/).
- **MITRE ATT&CK — Cloud matrix** — [https://attack.mitre.org/matrices/enterprise/cloud/](https://attack.mitre.org/matrices/enterprise/cloud/).
- **Mandiant — Threats to identity providers** — periodieke rapporten via [https://www.mandiant.com/resources](https://www.mandiant.com/resources).
- **CISA — Cloud and identity hardening guidance** — [https://www.cisa.gov/](https://www.cisa.gov/).

## Categorieën

- blue
