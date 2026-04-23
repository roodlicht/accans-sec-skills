---
name: secure-coding
description: Language-agnostic secure-coding patterns — input validation, injection-safe APIs, authN/authZ, crypto, secrets, dependency hygiene. The default lens when no framework-specific skill applies.
---

# Secure Coding Standards

## Wanneer gebruiken

Deze skill is de substrate-laag voor code-werk. Hij triggert wanneer Claude code schrijft of reviewt en er geen framework-specifieke skill is die dieper gaat. Concreet:

- De gebruiker vraagt "is dit veilig?", "review op security issues", "kan iemand dit misbruiken?", "wat kan er misgaan?".
- Claude schrijft nieuwe code die untrusted input aanneemt, geheimen hanteert, auth uitvoert, crypto aanraakt, of met externe systemen praat.
- Claude reviewt een patch of PR en er is geen scherpere skill (zoals `django-security` of `api-security`) actief.
- Als backstop bij codegeneratie in een taal waarvoor geen specifieke skill bestaat (Go, Rust, C#, PHP, Kotlin).

### Wanneer NIET (handoff naar scherpere skills)

- Framework-specifiek: Django → `django-security`, Rails → `rails-security`, Spring Boot → `spring-security`, Next.js → `nextjs-security`.
- API-ontwerp / REST/GraphQL-endpoints → `api-security`.
- Infrastructuur: Terraform/Ansible/Pulumi → `iac-security`; Dockerfile / OCI → `container-hardening`; Kubernetes manifests → `k8s-security`; CI/CD workflows → `cicd-hardening`.
- Vulnerability triage op dependencies → `cve-triage`; SBOM en provenance → `supply-chain`; secrets in git-history → `secrets-scanner`.
- Full PR-review als workflow (niet alleen patterns) → `security-review`; deze skill is diens pattern-bibliotheek.

Als één van bovenstaande skills toepasbaar is, gebruik die eerst. `secure-coding` blijft relevant voor de niet-gedekte stukken.

## Aanpak

Zes fases. Werk ze sequentieel af tijdens een review; bij codegeneratie kun je er door-heen springen afhankelijk van wat je schrijft. Elke fase heeft dezelfde opbouw: **regel → code-signaal (rode vlaggen om te herkennen) → do/don't**.

De fases corresponderen met OWASP Top 10 2021 en Proactive Controls v3, maar zijn hier georganiseerd rond de volgorde waarin een ontwikkelaar ze in de praktijk tegenkomt.

### 1. Trust boundaries in kaart

De eerste vraag bij elk stuk code: waar komt untrusted data binnen, en welke code draait met meer rechten dan de data-producer?

- **Trust-sources inventariseren.** HTTP-parameters, headers, cookies, file-uploads, database-inhoud (die eerder door untrusted bron is geschreven), environment variables in multi-tenant context, message queues, cross-service RPC, bestanden uit object storage.
- **Privilege-zones scheiden.** Setuid binaries, service-accounts, cloud-IAM roles, container caps — elke rechten-verhoging kruist een trust-boundary. Code die rechten-verhoogd draait moet input alsof het een verse aanval is behandelen.
- **Data-integriteit bij serialisatie-grenzen.** Elke plek waar je serialiseert (JSON, protobuf, custom binary, YAML) of deserialiseert is een boundary. Signatuur + integriteitscheck hoort bij data die tussen trust-zones reist (denk JWT, cookies, cached computations).

**Red flag — trust loss.** Code die zegt "dit komt uit de database dus het is veilig" — tenzij je de write-pad naar die database ook hebt gevalideerd is dat een aanname. Cached untrusted data is nog steeds untrusted.

### 2. Invoer-validatie en uitvoer-encoding

Twee aparte concerns die vaak verward worden. Valideer bij de grens (parse, don't validate-after-parse), encodeer bij het uitvoerpunt op basis van de doel-context.

- **Allowlist boven denylist.** Valideer op type, lengte, format, range, character-class. "Alles behalve `<script>`" is een denylist en verliest altijd tegen encoding-tricks, Unicode-homoglyphs, of nieuwe payload-vormen.
- **Parse, don't validate.** Waar mogelijk converteer input naar een type dat de invariant afdwingt (`int`, UUID, enum) in plaats van de string door te geven met een losse validatiecheck. Zie Alexis King's "Parse, don't validate".
- **Context-aware output-encoding.** Dezelfde string moet anders worden ontsnapt in HTML-body, HTML-attribute, JavaScript-string, URL-query, CSS-value en shell-arg. Gebruik framework-primitives (`safe_join`, template auto-escape, `shlex.quote`).
- **Parameterized queries voor elke query-taal.** SQL via prepared statements, OS-commands via arg-array in plaats van shell-string, LDAP via gescapete filters, XPath via variabele-binding, templates via auto-escape-modus (Jinja2 `autoescape=True`, ERB `h()`, etc.).

**Red flags in code:**
```
# SQL — string-interpolatie in query
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
cursor.execute("SELECT * FROM users WHERE id = " + user_id)

# Command — shell=True met user input
subprocess.Popen(f"git clone {url}", shell=True)
os.system("convert " + filename + " out.png")

# Template — raw HTML insertion
element.innerHTML = userInput        # JS/DOM
v-html="userInput"                   # Vue
dangerouslySetInnerHTML={{ __html }} # React
{{ user.bio | safe }}                # Jinja2 met | safe op untrusted
```

**Safe variants:**
```
# SQL
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))       # psycopg2
db.query("SELECT * FROM users WHERE id = $1", userID)                 # Go
PreparedStatement s = conn.prepareStatement("SELECT ... WHERE id = ?") # Java

# Command
subprocess.run(["git", "clone", url], check=True)                     # no shell
child_process.execFile("git", ["clone", url])                         # Node

# Template — default auto-escape aan, alleen bewust escape-af voor vertrouwde data
```

### 3. Identity: authenticatie, sessies, autorisatie

Geen zelfgeschreven auth. Gebruik vetted frameworks (Spring Security, Django auth, auth.js, Devise, Keycloak, Auth0). Als je toch iets bouwt, dan alleen rondom een vetted primitive.

- **Password hashing: argon2id (voorkeur), scrypt, of bcrypt.** Nooit MD5, SHA-1, SHA-256 zonder KDF, geen PBKDF2 met lage iteraties. Gebruik de library-defaults; custom parameters zijn een rode vlag.
- **MFA inbouwen vanaf dag 1 voor admin- en privileged accounts.** TOTP, WebAuthn/passkeys, push-based. SMS is legacy-fallback, niet primair.
- **Sessions: signed, HttpOnly, Secure, SameSite=Lax of Strict, korte TTL, roteren bij privilege-change.** Geen session-ID in URL.
- **Autorisatie per resource, niet per route.** IDOR (Insecure Direct Object Reference) ontstaat als `/api/documents/123` alleen authenticatie checkt maar niet of de actor `123` mag zien. Check eigendom/rol op elk lookup-pad.
- **Fail-closed default.** Geen toegang tenzij expliciet toegestaan. Middleware die bij onbekende route "allow" retourneert is een bug.

**Red flags:**
```
# Password-handling
hashlib.md5(password.encode()).hexdigest()
hashlib.sha256(password.encode()).hexdigest()    # geen salt, geen KDF
bcrypt.hashpw(password, bcrypt.gensalt(4))       # te lage cost-factor

# Session
document.cookie = "sid=" + sessionId             # JS heeft toegang → XSS steelt
session.permanent = True                         # zonder TTL-set

# AuthZ
@app.route("/api/documents/<id>")
def get_doc(id):
    return Document.objects.get(id=id)           # geen ownership-check

# Generic "is logged in" als enige check
if (user.isAuthenticated()) { return adminPanel }
```

### 4. Secrets, keys, crypto

Crypto zelf implementeren is de klassieke foot-gun. Gebruik high-level APIs. Voor secrets: nooit in source, liefst in een vault, env-vars zijn acceptabel als secondary pad.

- **Secrets management-hierarchie.** Vault (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) > platform-provided injection (K8s secret, ECS task-role) > env-var op host > `.env`-file buiten git. Nooit in source, nooit in log, nooit in error-message.
- **Key rotation + per-environment separatie.** Dev/staging/prod gebruiken nooit dezelfde keys. Roteer op een schema én bij verdenking van lek. Bewaar vorige key kort voor graceful rotation.
- **Symmetric crypto: AES-GCM of ChaCha20-Poly1305.** ECB nooit. CBC alleen met verified HMAC. Unique nonce per message.
- **Asymmetric: Ed25519 voor signatures, X25519 voor key-exchange, RSA ≥ 3072 bits als legacy.** MD5/SHA-1 zijn dood voor signatures.
- **TLS 1.2+ minimum, 1.3 voorkeur. Certificate validation altijd aan.** `verify=False` in requests/curl is een staging-hack, geen productie-config.
- **Randomness: `os.urandom` / `crypto.randomBytes` / `SecureRandom`.** Nooit `Math.random()` / `random.random()` voor security-doeleinden (tokens, IDs, nonces).

**Red flags:**
```
# Hardcoded secrets
const API_KEY = "sk-proj-..."
db_password = "Welcome2024!"
# AWS / GitHub / Slack-tokens in source → vangen met gitleaks of trufflehog

# Crypto mis
cipher = AES.new(key, AES.MODE_ECB)              # ECB
requests.get(url, verify=False)                  # TLS-validation uit
token = str(random.random())                     # niet crypto-safe
hashlib.sha1(data).hexdigest()                   # voor signatures/integrity

# Key management
KEY = "hardcoded-32-byte-string-right-here"       # ook als env-var fallback
```

### 5. Robuustheid: fouten, deserialisatie, logging

Wat gebeurt er als iets misgaat? Fail-closed, geen sensitive data in errors, geen gevaarlijke deserialisatie, structured logging zonder geheimen.

- **Exception handling: specifiek vangen, niet generic.** `catch (Exception e) { }` (Java/C#) of `except: pass` (Python) maskeert bugs die security-relevant kunnen zijn. Log de error, retourneer een generieke message naar de gebruiker.
- **Geen stack traces of interne paden naar de client.** Production error-pages tonen `request-id`, niet `/home/app/lib/.../db.py line 47 in _execute`.
- **Deserialisatie van untrusted data is RCE-prone bij native formats.** Java `ObjectInputStream`, Python `pickle.loads`, PHP `unserialize`, Ruby `Marshal.load`, YAML `yaml.load` (zonder SafeLoader), .NET `BinaryFormatter`. Gebruik JSON, protobuf, of msgpack met schema-validatie.
- **Signed integrity voor cross-boundary data.** JWTs moeten gevalideerd worden met de *verwachte* algorithm (voorkom `alg: none` en algorithm-confusion). Cookies die server-state encoderen signeren met HMAC.
- **Logging-hygiëne.** Nooit passwords, tokens, card-numbers, API-keys, PII (BSN, e-mail full, etc.) loggen. Maskeer bij bron, niet bij log-pipeline. Log wél security-events: auth-failures, authz-denials, admin-acties, rate-limit-hits.

**Red flags:**
```
# Swallowed exceptions
try: risky()
except: pass
catch (Exception e) { /* empty */ }

# Dangerous deserialisatie
pickle.loads(request.body)
yaml.load(user_input)                            # zonder Loader=SafeLoader
ObjectInputStream ois = new ObjectInputStream(sock.getInputStream())

# JWT
jwt.decode(token, key, algorithms=None)          # accepteer alle alg
jwt.decode(token, None, options={"verify_signature": False})

# Logging
logger.info(f"Login voor {user.email} met wachtwoord {password}")
logger.error(f"Payment {card_number} failed")
```

### 6. Dependencies en runtime-hygiëne

Ingeleverde vulnerabilities via libraries zijn het grootste deel van modern-day exploits (OWASP A06). Behandel dit als eerste-klas concern.

- **Pinnen.** `package-lock.json` / `poetry.lock` / `Gemfile.lock` / `go.sum` in git committen. Transitive dep-versies moeten reproduceerbaar zijn.
- **SBOM genereren.** CycloneDX of SPDX via `cyclonedx-bom`, `syft`, `sbom-tool`. In CI, per build. Zie `supply-chain` skill voor provenance.
- **Vulnerability-scanning.** Dependabot/Renovate voor updates, `osv-scanner` of `grype` voor scan, Snyk/Mend voor enterprise. Scan op PR-basis, niet alleen nightly.
- **Typosquatting-verdediging.** Nieuwe dependencies kritisch bekijken: author, age, download-trend, scoped naam. Overweeg een interne mirror voor kritische packages.
- **Runtime-minimalism.** Container draait niet als root; filesystem read-only waar kan; seccomp/AppArmor defaults aan; egress network policies. Zie `container-hardening` en `k8s-security` voor diepgang.
- **Update-ritme.** Kritieke CVE in een directe dependency: patch binnen dagen. In transitive: risk-weighted via `cve-triage` (reachable-path + EPSS).

**Red flags:**
```
# requirements.txt zonder versie-pin
requests
flask

# package.json met caret op alles (^) → auto-drift
"dependencies": { "lodash": "^4.0.0" }

# Dockerfile
FROM node:latest           # latest-tag = onreproducibel
USER root                  # of geen USER directive
ADD http://... /app/       # ADD met URL bypassed integrity

# Runtime
process.env.NODE_ENV niet "production" in prod
DEBUG=True in productie-config (Django, Flask)
```

## Output

Wanneer deze skill wordt gebruikt voor een code-review of scan, retourneert hij een gestructureerd rapport. Bij codegeneratie werkt de skill "stil" — hij beïnvloedt wát je schrijft, maar produceert geen aparte output.

Rapport-structuur bij review:

```
Bevindingen per fase:
  1. Trust boundaries: <ok | issues: ...>
  2. Input/output: <ok | issues met file:line>
  3. Identity: <ok | issues met file:line>
  4. Secrets/crypto: <ok | issues met file:line>
  5. Robustness: <ok | issues met file:line>
  6. Dependencies: <ok | issues met versies>

Per issue:
- Fase: <1–6>
- Locatie: <file:line>
- Classificatie: <CWE-ID, OWASP A0x>
- Ernst: <blocker | high | medium | low>
- Patroon: <korte naam, bv. "SQL-string-concat", "pickle.loads", "verify=False">
- Fix: <concrete suggestie, bij voorkeur met code-alternatief>
- Handoff: <indien van toepassing: gebruik <skill-id> voor diepere review>

Algemene conclusie: <blockers-count, overall verdict>
```

Issues altijd aan een CWE-ID koppelen waar mogelijk — dat is de taal die tools (SAST, CI, issue-trackers) spreken. Alleen CWE-nummers gebruiken die je verifieerbaar kent; bij twijfel `[verify: CWE]` markeren (zie `verification-loop` Laag 2).

## Referenties

- OWASP Top 10 2021 — [https://owasp.org/Top10/](https://owasp.org/Top10/). Canonieke lijst van applicatie-risicocategorieën; elke bevinding mapt naar een A0x.
- OWASP Proactive Controls v3 — [https://owasp.org/www-project-proactive-controls/](https://owasp.org/www-project-proactive-controls/). Wat ontwikkelaars moeten dóén (tegenover Top 10 die beschrijft wat er misgaat).
- OWASP ASVS v4 — [https://owasp.org/www-project-application-security-verification-standard/](https://owasp.org/www-project-application-security-verification-standard/). Verification-checklist op drie niveaus; bruikbaar als requirement-set voor nieuwe services.
- OWASP Cheat Sheet Series — [https://cheatsheetseries.owasp.org/](https://cheatsheetseries.owasp.org/). Per-topic diepgang (Input Validation, Authentication, Session Management, Cryptographic Storage, etc.). Samenvatten en verwijzen, niet woordelijk overnemen.
- CWE Top 25 — [https://cwe.mitre.org/top25/](https://cwe.mitre.org/top25/). Klasse-niveau catalogus; gebruik CWE-IDs in findings voor tool-interoperabiliteit.
- NIST SP 800-218 (SSDF v1.1) — [https://csrc.nist.gov/pubs/sp/800/218/final](https://csrc.nist.gov/pubs/sp/800/218/final). Secure Software Development Framework; procesmatige context voor deze patterns.
- SEI CERT Coding Standards — [https://wiki.sei.cmu.edu/confluence/display/seccode](https://wiki.sei.cmu.edu/confluence/display/seccode). Taal-specifieke regelsets voor C/C++/Java/Perl; raadplegen voor detail per taal.
- Alexis King — "Parse, don't validate" ([https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/)). Framing achter fase 2 input-validatie.

## Categorieën

- core
- appsec
