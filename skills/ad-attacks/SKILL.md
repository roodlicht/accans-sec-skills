---
name: ad-attacks
description: Active Directory aanvalspaden — BloodHound path-analyse, Kerberos-abuse (Kerberoasting/AS-REP-roasting/silver/golden ticket-klassen), delegation-flaws (unconstrained/constrained/RBCD), DCSync, ADCS-ESC1-8 patroon-niveau, en Tier-0-hygiene als verdedigingsmodel.
---

# AD Attack Paths

> **RoE-only en lab-discipline**: AD-attacks raken meestal aan de hoogste-privilege-laag van een organisatie. Versie-specifieke ticket-extraction-recepten, vendor-tool-output, kant-en-klare DCSync-commando's voor productie staan niet in deze skill, die horen in een afgesloten engagement-werkruimte. Skill bevat klasse-namen, BloodHound-edge-typen, ATT&CK-T-IDs en defensieve tegenhangers. Lab-werk doe je in een aparte AD-test-domein.

## Wanneer gebruiken

Active Directory is de identity-fundering van de meeste enterprise-netwerken. Path-analyse en privilege-escalation binnen AD verlopen volgens vrij voorspelbare patronen die door SpecterOps, Microsoft en andere partijen uitvoerig zijn gedocumenteerd. Deze skill geeft de structurele lens.

Activeert bij:

- Een vraag als "BloodHound-output triagen", "Kerberoasting in scope", "delegation-flaws in onze AD", "ADCS-attack-paden", "Tier-0-design".
- Een red-team / pentest-engagement waar internal-AD scope is en eerste foothold is gehaald (zie `post-exploit` voor bredere methodologie; deze skill is de AD-specifieke verdieping).
- Een purple-team oefening rond AD-detection-tuning.
- Een defensive-context waar je BloodHound op je eigen AD draait en attack-paden wil dichttrekken.
- Migration- of ADCS-design-review in samenhang met `iso27001` of `nis2`-Tier-0-eisen.

### Wanneer NIET (handoff)

- Initial access naar het netwerk → `phishing-sim`, `web-exploit-triage`, `recon-agent`. Deze skill begint met een bestaande domain-user of computer-account.
- Bredere post-exploitation buiten AD-context → `post-exploit`. Veel overlap; deze skill is het AD-specifieke deel.
- C2-infrastructuur en beacon-OPSEC → `c2-hygiene`. Vermeld als context, niet uitgewerkt.
- Final reporting met CVSS → `pentest-reporter`.
- Detection-rule-bouw op de techniques → `detection-engineer`. Deze skill levert de attack-side, koppelt naar detection-opportunity.
- Cloud-IAM-equivalenten (Azure AD / Entra ID heeft eigen patroon-set): gedeeltelijk hier ja (hybrid scenarios, ADFS, Entra Connect), pure cloud-IAM-attacks horen elders.
- Forensics na AD-incident → `forensics-assist` plus `ir-runbook`.

## Aanpak

Zes fases. Fase 1 (BloodHound + scope) en fase 5 (Tier-0-design als defensief raamwerk) zijn de plekken waar AD-werk slaagt of strandt.

### 1. BloodHound-path-analyse

BloodHound (SpecterOps OSS, Apache-2) is de standaard tool voor AD-graph-analyse. Edges (relaties) tussen nodes (users, groups, computers, domains, ADCS-objecten) tonen aanvalspaden in plaats van losse mis-configs.

- **Collection**: SharpHound (Windows-binary) of Rusthound / BloodHound-Python op een ingebrachte AD-context. Lab-engagement gebruikt SharpHound; defensieve self-assessment kan via offline-export.
- **Edges-typen** (klasse-niveau):
  - `MemberOf`, `AdminTo`, `CanRDP`, `ExecuteDCOM`: direct-toegangs-relaties.
  - `GenericAll`, `GenericWrite`, `WriteDACL`, `WriteOwner`, `Owns`: DACL-rechten die owner-take-over of password-reset toelaten.
  - `ForceChangePassword`, `AddMember`, `AddSelf`: group/user-mutaties.
  - `AllowedToDelegate`, `AllowedToActOnBehalfOfOtherIdentity`: delegation-edges (zie fase 3).
  - `HasSession`: bevat-credential-indicator (legacy waardevol bij token-impersonation).
  - `DCSync`: replicating-rights edge (kritiek).
  - `ADCSESC1`-t/m-`ADCSESC10`: ADCS-templates met aanvalspaden (zie fase 4).
- **Cypher-queries voor pad-vinden**: shortest-path-to-domain-admins, kortste pad van compromised user X naar Tier-0-asset, alle edges van type Y in domain. SpecterOps documenteert canonical queries.
- **Triage-workflow**: alle paden ranken op (a) hoeveel hops, (b) welke edge-types (DACL > sessie > membership), (c) welke realistische uitvoerbaarheid. Niet elke 1-hop-edge is een quick-win; sommige vereisen specifieke tooling of admin-actie.

Defensieve gebruik: BloodHound op je eigen domain levert prioriterings-lijst voor hardening. Combineer met `risk-register`.

### 2. Kerberos-abuse-klassen

Kerberos heeft een aantal canonical aanvalsklassen die in vrijwel elk red-team-rapport zitten.

- **Kerberoasting (T1558.003)**. Service-accounts met SPN gekoppeld kunnen TGS-tickets opvragen door elke geauthenticeerde user. Ticket bevat een password-derived encrypted blob, offline-crackbaar als password zwak is (RC4-encrypted is sneller crackbaar dan AES). Defensive: alle service-accounts gMSA, RC4 disabled, Audit Kerberos Service Ticket Operations (Event 4769 met TicketEncryptionType 0x17 voor RC4).
- **AS-REP roasting (T1558.004)**. Accounts met `DONT_REQ_PREAUTH` UAC-flag laten een AS-REP zonder pre-auth vrij, ook offline-crackbaar. Defensive: pre-auth verplicht maken op elk account, auditen welke accounts deze flag hebben.
- **Pass-the-Ticket (T1550.003)**. Gestolen TGT/TGS-ticket hergebruiken op een andere machine. Detectie via 4768/4769-events in vreemde context.
- **Silver Ticket (T1558.002)**. TGS-ticket gefabriceerd met service-account-NTLM-hash → service-toegang zonder DC te raken. Defensive: tier-0-isolation, password-rotatie service-accounts.
- **Golden Ticket (T1558.001)**. TGT gefabriceerd met krbtgt-hash → domain-admin-niveau-toegang voor lange tijd. Detectie via anomalous-TGT-lifetime, gebruik van krbtgt-account als clienthuisnummer; verdediging via dubbele krbtgt-rotatie (procedure SpecterOps + Microsoft).
- **Diamond/Sapphire Ticket**: variant op Golden, request-vorm minder herkenbaar. Recente klasse, detection-rule-set in beweging.

Algemene Kerberos-discipline: monitor pre-auth-events, ticket-encryption-types (RC4 als red flag), gebruik van krbtgt door service-accounts.

### 3. Delegation-flaws

Delegation laat een service handelen namens een gebruiker. Misconfig is een hoog-impact aanvalspad.

- **Unconstrained Delegation**. Service-account met `TRUSTED_FOR_DELEGATION` UAC-flag krijgt TGT van elke user die mee inlogt. Aanvaller dwingt admin (printer-spool-service-trick) tot connect en steelt TGT. Defensive: minimaliseer unconstrained delegation, audit accounts met deze flag.
- **Constrained Delegation (S4U2Self / S4U2Proxy)**. Service kan alleen voor specifieke services delegaten. Aanval: als compromised account constrained-delegation-rechten heeft naar een Tier-0-service, kan TGS gefabriceerd worden voor elk user-naam (S4U-Self/Proxy-trick).
- **Resource-Based Constrained Delegation (RBCD)**. Doel-resource bepaalt wie mag delegaten via `msDS-AllowedToActOnBehalfOfOtherIdentity` attribute. Aanval: GenericWrite op een computer-object → schrijf je eigen account als trusted → gebruik S4U om te impersoneren naar dat computer-object. SpecterOps "RBCD" research is canonical.

Defensive: minimaliseer delegation-rechten, gebruik Authentication Policies en Authentication Policy Silos om tier-0-accounts uit te sluiten van impersonation.

### 4. DCSync, AD CS, en hoge-impact aanvalspaden

- **DCSync (T1003.006)**. Account met `Replicating Directory Changes`-recht kan zich voordoen als een DC en password-hashes ophalen, inclusief krbtgt. Defensive: alleen DCs en specifieke replication-accounts hebben dit recht, audit Event 4662 met directory-replication-rights.
- **AD CS (Active Directory Certificate Services)**: sinds 2021 een hoofd-aanvalsoppervlak na SpecterOps "Certified Pre-Owned"-paper. ESC1 t/m ESC10+ klassen. Pattern-niveau:
  - **ESC1**: certificaat-template laat client-supplied SAN toe → request cert met admin-SAN, authenticate als admin.
  - **ESC2**: any-purpose EKU → request authenticator-cert.
  - **ESC3**: enrollment-agent abuse.
  - **ESC4**: vulnerable template-permissions (write-DACL op template).
  - **ESC5**: PKI-objects DACL-misconfig.
  - **ESC6**: EDITF_ATTRIBUTESUBJECTALTNAME2 flag op CA.
  - **ESC7**: vulnerable CA-permissions.
  - **ESC8**: NTLM-relay naar AD CS web-enrollment.
  - **ESC9 / ESC10**: nieuwere varianten rond `userCertificate`-attribute en LDAP-pre-auth.

Tools: Certify (offensief, lab-only), Certipy (Python-port), PSPKIAudit (defensief). Defensive: ADCS-template-audit, web-enrollment uit, EDITF flag uit, tier-0-only-templates expliciet markeren.

### 5. Tier-0-hygiene als defensief raamwerk

Microsoft's Tier-model (sinds ~2014, geactualiseerd in Enterprise Access Model) is de structurele verdediging tegen alle bovenstaande klassen.

- **Tier-0**: identity-systemen, dus DCs, ADFS-servers, Entra Connect, ADCS-CAs, PKI-keys, krbtgt. Compromise hier = domain takeover.
- **Tier-1**: server-OS, applicatie-platforms, business-data.
- **Tier-2**: workstations, end-user devices.

**Regel**: een hoger-tier account mag nooit interactief inloggen op lager-tier system. Een Tier-0-admin op een Tier-2-laptop = Tier-0-credential-theft-risico.

Implementatie:

- **Authentication Policies + Silos** binnen AD: blokkeer Tier-0-accounts om in te loggen op niet-Tier-0-systems.
- **Privileged Access Workstations (PAW)** voor Tier-0-werk.
- **Just-In-Time access** voor admin-rechten (Azure AD PIM / on-prem-equivalent).
- **No service accounts in Domain Admins**, zo strict mogelijk.
- **gMSA** (group-Managed Service Accounts) voor service-accounts: passwords door AD beheerd, rotatie automatisch, niet kerberoastable.

Tier-model is het anchor van een audit-rapport: per BloodHound-edge die naar Tier-0 leidt, ontwerp-vraag "waarom mag dit pad bestaan".

### 6. Verification-loop en handoff

Laag 1: scope (alle BloodHound-collection binnen RoE? alle gebruikte techniques expliciet toegestaan?), aannames (pad-haalbaarheid op patroon-niveau bevestigd, niet alleen edge-aanwezigheid?), gaps (Tier-0-impact-claims onderbouwd?). Laag 2: ATT&CK-T-IDs correct, BloodHound-edge-typenamen kloppen met huidige BloodHound-versie (CE / 4.x), ADCS-ESC-classificatie tegen SpecterOps-paper geverifieerd, geen verzonnen Kerberos-encryption-types of UAC-flag-namen.

Handoff:

- `pentest-reporter`: finding-format met ATT&CK-mapping per gebruikte techniek.
- `purple-ops` / `detection-engineer`: detection-opportunity per stap (welk Event-ID, welke Sigma-rule).
- `policy-drafter`: input voor Access Control Policy en Privileged Access Policy.

## Output

```
AD Attack Path Assessment — <domein>
Foothold:        <user-context, machine, privileges>
RoE-scope:       <Tier-mate, welke systemen, welke techniques>

BloodHound-pad-analyse:
  Collection-bron:       <SharpHound/Rusthound/BloodHound-Python> + datum
  Shortest paths to DA:  <N paden, kortste = M hops>
  Tier-0 reachable:      <ja/nee, via welke edges>
  Top-N hoogste-impact-paden, gerangschikt:
    Path-1: <beschrijving + edges>
    Path-2: ...

Kerberos-flaws:
  Kerberoastable accounts:     <N>, <welke met RC4-tickets>
  AS-REP-roastable:            <N>
  RC4-tickets in use:          <% van TGS>
  Pass-the-Ticket-evidence:    <indien observed>

Delegation-issues:
  Unconstrained:              <N machines/accounts>
  Constrained zonder Tier-0-isolation: <lijst>
  RBCD-misconfig:             <waarop>

DCSync + AD CS:
  DCSync-rechten buiten DC:   <accounts/groups>
  ADCS-vulnerable templates:  <ESC-classificatie per template>

Tier-0-hygiene:
  Authentication Policies + Silos: <aanwezig/niet>
  PAW-gebruik:                     <aanwezig/niet>
  Service accounts in Tier-0:      <N>
  gMSA-coverage:                   <%>

Per finding:
  Severity:        <Critical/High/Medium>
  ATT&CK:          <T-IDs>
  D3FEND counter:  <relevant>
  Detection-opp.:  <Event-ID + signaal-shape>

Cleanup-status:
  <persistence niet aangelegd | persistence-X opgeruimd>

Verification-loop: ...
```

## Referenties

- **BloodHound + SpecterOps blog** — [https://bloodhound.specterops.io/](https://bloodhound.specterops.io/) en [https://specterops.io/blog/](https://specterops.io/blog/). Canonical bron voor edge-types en attack-path-research.
- **MITRE ATT&CK — Kerberos** — [https://attack.mitre.org/techniques/T1558/](https://attack.mitre.org/techniques/T1558/) en sub-techniques.
- **SpecterOps "Certified Pre-Owned"** — [https://specterops.io/wp-content/uploads/sites/3/2022/06/Certified_Pre-Owned.pdf](https://specterops.io/wp-content/uploads/sites/3/2022/06/Certified_Pre-Owned.pdf). Canonical ADCS-ESC-paper.
- **Microsoft Enterprise Access Model** — [https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model](https://learn.microsoft.com/en-us/security/privileged-access-workstations/privileged-access-access-model). Tier-0-architectuur.
- **Microsoft — krbtgt password reset** — [https://github.com/microsoft/New-KrbtgtKeys.ps1](https://github.com/microsoft/New-KrbtgtKeys.ps1). Officiële krbtgt-rotatie-procedure.
- **MITRE D3FEND — Kerberos defenses** — [https://d3fend.mitre.org/](https://d3fend.mitre.org/).
- **PSPKIAudit** — [https://github.com/GhostPack/PSPKIAudit](https://github.com/GhostPack/PSPKIAudit). Defensive-self-assessment voor ADCS.
- **Microsoft Authentication Policies + Silos** — [https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/how-to-configure-protected-accounts](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/how-to-configure-protected-accounts).
- **CIS Microsoft Active Directory Benchmark** — [https://www.cisecurity.org/](https://www.cisecurity.org/). Configuration-baselines.

## Categorieën

- pentest
