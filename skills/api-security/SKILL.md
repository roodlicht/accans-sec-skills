---
name: api-security
description: API security review against OWASP API Top 10 2023. Covers auth (OAuth2/JWT/API-keys), object-level authorization (BOLA/IDOR), schema validation, rate-limiting, CORS, SSRF, and GraphQL-specific concerns (introspection, query depth, batching).
---

# API Security

## Wanneer gebruiken

Deze skill is de API-specifieke lens: REST en GraphQL endpoints, hun auth, hun contract, hun abuse-oppervlak. Hij vult `security-review` aan wanneer de code een API-laag is, en wordt door framework-skills (`django-security`, `spring-security`, `rails-security`, `nextjs-security`) aangeroepen voor de API-specifieke regels.

Activeert bij:

- Een vraag als "review deze API op security issues", "is de auth op deze endpoint OK", "doen we OWASP API Top 10", "hebben we genoeg rate-limiting", "hoe gaan we om met CORS".
- Nieuwe of gewijzigde OpenAPI/Swagger/GraphQL schema's.
- Code die aan een externe API wordt blootgesteld: REST-controllers, GraphQL resolvers, gRPC-handlers, webhook-endpoints, service-mesh-routes.
- Een PR die auth-middleware, rate-limiting, schema-validatie of CORS-config raakt.
- Een handoff vanuit `security-review` of een framework-skill die naar API-specifieke diepgang verwijst.

### Wanneer NIET (handoff)

- Framework-specifieke API-config (Django REST Framework, Spring MVC, Rails API-only, Next.js route-handlers) → de betreffende framework-skill eerst. Die kennen hun eigen defaults en foot-guns beter.
- Pure code-pattern-vraag zonder API-context ("is deze query veilig") → `secure-coding`.
- Actieve API-pentest met exploitation → `web-exploit-triage` en `payload-crafter`.
- Dependency-vulns in API-libraries → `cve-triage`.
- API-gateway-config in de cloud (WAF-regels, AWS API Gateway resource-policies) → `iac-security`.
- Runtime WAF-tuning op bestaande productie ligt buiten scope, dat is ops-werk.

## Aanpak

Zeven fases georganiseerd rond OWASP API Security Top 10 2023 (API1–API10). Elke fase dekt één of meerdere API-categorieën.

### 1. Inventaris: endpoints en contract (API9)

Wat niet gedocumenteerd is, kan niet geaudit worden. Start altijd met de inventaris.

- **Endpoint-lijst.** Uit code (route-decorators, router-definitions), uit schema (OpenAPI, GraphQL SDL), of via een spider. Compleet betekent: publieke endpoints, admin-endpoints, interne of debug-endpoints, webhook-receivers, oude versies die nog live zijn.
- **API9 Improper Inventory Management.** Oude v1-endpoints die nog draaien, staging-endpoints op dezelfde host, debug-endpoints in productie. Documenteer wat leeft, wat deprecated is, en wat per direct uit moet.
- **Contract-check.** Is er een machine-leesbaar contract (OpenAPI 3.x, GraphQL schema)? Zo nee: leggen voor je verder gaat. Zonder contract is schema-validatie (fase 3) niet afdwingbaar.

### 2. Authenticatie (API2)

- **Mechanisme.** OAuth 2.0 / OIDC, API-keys, JWT, session-cookies, mTLS. Elk heeft z'n eigen failure-modes.
- **OAuth 2.0.** PKCE verplicht voor public clients (mobile, SPA). Geen Implicit flow meer (deprecated in OAuth 2.1). Redirect-URI strict matchen, geen wildcards. State-parameter gebruiken tegen CSRF op de callback.
- **JWT.** `alg: none` geweigerd. Algorithm-confusion voorkomen (RS256-key niet als HS256-secret accepteren). Expiry (`exp`) en not-before (`nbf`) gecheckt. `kid` in header moet tegen een whitelist, niet gebruikt voor key-lookup zonder validatie.
- **API-keys.** Scoped per client, niet één master-key voor alles. Roterabel. Niet in URL-query (komt in logs), wel in `Authorization: Bearer` of een custom header. Rate-limit per key (zie fase 4).
- **Session-cookies.** HttpOnly, Secure, SameSite=Lax/Strict. Server-side sessie-invalidatie bij logout. Roteren bij privilege-change.
- **mTLS** voor service-to-service in een zero-trust setup. Certificaat-validatie altijd aan, geen fallback op plain TLS.

Multi-factor voor admin- en privileged-flows. Recovery-flows (password-reset, e-mail-verandering, MFA-reset) zijn aparte auth-paden met eigen zwakheden, review ze apart.

### 3. Autorisatie (API1, API3, API5)

De drie autorisatie-categorieën uit OWASP API Top 10 samen. Dit is waar de meeste production-bugs zitten.

- **API1 Broken Object Level Authorization (BOLA / IDOR).** Endpoint `/api/documents/{id}` checkt authenticatie maar niet of de actor `{id}` mag zien. Fix: eigendoms-check op elk lookup-pad. Niet op route-niveau, op resource-niveau. Query zoals `SELECT * FROM documents WHERE id = :id AND (owner = :user OR :user IN shared_with)`.
- **API3 Broken Object Property Level Authorization.** De klassieke mass-assignment: client stuurt `{"id": 1, "role": "admin"}` en de API accepteert `role` klakkeloos. Fix: input-schema dat alleen geaccepteerde velden whitelistet. Output-schema dat gevoelige velden (bv. `password_hash`, `internal_notes`) niet teruggeeft. Framework-primitives: DRF Serializers, Spring `@JsonIgnore`, Rails `strong_parameters`, Pydantic `model_dump(include=...)`.
- **API5 Broken Function Level Authorization.** Admin-endpoints bereikbaar voor niet-admins, meestal omdat de authZ-check per route gebeurt in plaats van centraal afgedwongen. Fix: een centraal policy-enforcement-punt (middleware of decorator), deny-by-default voor routes zonder expliciete role-claim. Test: probeer elke admin-endpoint als gewone user.

Autorisatie-tests horen in de integration-suite, niet alleen in de code-review.

### 4. Resource-limits en business-flow-abuse (API4, API6)

- **API4 Unrestricted Resource Consumption.** Rate-limiting per IP én per authenticated identity (API-key/user). Verschillende limits per endpoint-klasse: auth-endpoints strakker (bv. 5/minuut) dan read-endpoints (60/minuut) dan write-endpoints (20/minuut). Paginering verplicht op list-endpoints met een max page-size. Body-size limits (bv. 1 MB tenzij file-upload). Query-complexiteit voor GraphQL (zie fase 6).
- **API6 Unrestricted Access to Sensitive Business Flows.** Ticket-resale-bots, credit-farming, coupon-stacking, bulk-signup voor fraud. Fix: CAPTCHA of proof-of-work op high-value flows, device-fingerprinting voor detection, velocity-checks (N transacties per minuut per account), en anomalie-detectie in monitoring. Dit overlapt met fraud-engineering, niet puur security, maar de API is het aanvalsoppervlak.

Rate-limit-responses: HTTP 429 met `Retry-After`-header, niet 503 of timeout. Logs moeten rate-limit-hits vastleggen met identity, endpoint en window.

### 5. SSRF en configuratie (API7, API8)

- **API7 Server Side Request Forgery.** Endpoints die op basis van user-input een outbound HTTP-call doen (webhook-dispatch, URL-preview, image-proxy, PDF-rendering, OAuth-redirect). Fix: allowlist van toegestane hosts. Blokkeer private-IP-ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.169.254 voor cloud-metadata) inclusief DNS-resolution (voorkom rebinding). Timeouts en redirect-limits. Gebruik libraries met SSRF-checks (bv. `SafeRequests` in Python, `safe-request` in Node).
- **API8 Security Misconfiguration.** CORS-config zonder wildcards (`Access-Control-Allow-Origin: *` mag alleen op expliciet publieke, non-auth-endpoints). Security-headers: HSTS, CSP, X-Content-Type-Options: nosniff, X-Frame-Options, Referrer-Policy. Default error-pages die geen stack-traces of framework-info lekken. Verbose API-errors terug naar client alleen in non-prod.

CORS-specifiek: `Access-Control-Allow-Credentials: true` met `Origin: *` is onmogelijk en sommige browsers blokkeren het, maar de misconfiguration-poging is het signaal dat het auth-model niet doordacht is.

### 6. GraphQL-specifiek (indien van toepassing)

REST-checks hierboven gelden grotendeels ook voor GraphQL, plus:

- **Introspection.** In productie uitzetten (`introspection: false` in Apollo, `GraphQLSchema` zonder `__schema`-resolver). Reduceert reconnaissance-oppervlak. Alternatief voor devs: schema als file committen en lokaal serveren.
- **Query-depth-limit.** Limiteer nesting-diepte om exponentiële queries te voorkomen. Libraries: `graphql-depth-limit` (Node), `graphql-core` query-complexity (Python).
- **Query-complexity-scoring.** Kosten per field (bv. list-fields 10 punten, scalar 1 punt), totaal-budget per request. Voorkomt dat één query via batching een DB-nightmare wordt.
- **Batching-limit.** Alias-based batching (N queries in één request) limiteren, anders ondermijnt het rate-limits-per-request.
- **Persisted queries.** In high-stakes setups alleen server-known queries accepteren (hash-gebaseerd). Client stuurt hash, server kent de query. Schermt af tegen willekeurige queries van een gecompromitteerde client.
- **Authorization in resolvers.** Per resolver de actor-check doen. GraphQL-fields kunnen elk hun eigen authZ-regels hebben, en een blanket check op de root levert IDOR op in nested queries.

### 7. Downstream API-consumption (API10)

Als je API zelf andere APIs consumeert (third-party, interne services), ben je ook de aanvaller's doel-surface via transitive trust.

- **Input van upstream valideren als user-input.** Een JSON-response van een third-party API is geen vertrouwde bron. Schema-valideren bij ontvangst.
- **TLS-validatie aan** op outbound calls, geen `verify=False`.
- **Timeout en retry-strategie.** Onbounded retries op 5xx = DoS-amplificatie. Circuit-breakers bij aanhoudende fouten.
- **Secret-hygiëne op outbound auth.** API-keys voor externe providers in de vault, geen hardcoded credentials. Zie `secrets-scanner`.

## Output

Rapport-structuur (aansluitend op `security-review`-rapport-format):

```
API security review — <service/scope>
Contract: <OpenAPI 3.x file | GraphQL SDL | geen (blocker)>
Endpoints in scope: N | Getest: M

OWASP API Top 10 2023 pass:
  API1 BOLA:                 <clean | findings: ...>
  API2 Broken Authentication:<clean | findings: ...>
  API3 BOPLA / mass assign:  <...>
  API4 Resource consumption: <...>
  API5 Function-level authZ: <...>
  API6 Business-flow abuse:  <...>
  API7 SSRF:                 <...>
  API8 Misconfiguration:     <...>
  API9 Inventory:            <...>
  API10 Downstream APIs:     <...>

GraphQL-specifiek (indien):
  Introspection prod:        <uit | aan - finding>
  Depth-limit:               <n | geen - finding>
  Complexity-scoring:        <aan | geen - finding>
  Batching-limit:            <n | onbeperkt - finding>

Findings (severity-gesorteerd, blockers eerst, volg security-review-format)

Verification-loop:
  Verdict: ...
  Security-verdict: ...
```

Findings zelf als in `security-review`: locatie, CWE/API-categorie, severity, reproductie, fix-richting. Reproductie liefst als curl-voorbeeld tegen een test-endpoint, niet tegen productie.

## Referenties

- OWASP API Security Top 10 2023 — [https://owasp.org/API-Security/editions/2023/en/0x11-t10/](https://owasp.org/API-Security/editions/2023/en/0x11-t10/). Canonieke categorisatie.
- OWASP API Security Project — [https://owasp.org/www-project-api-security/](https://owasp.org/www-project-api-security/). Bredere context plus cheat-sheets per categorie.
- OpenAPI Specification 3.1 — [https://spec.openapis.org/oas/v3.1.0](https://spec.openapis.org/oas/v3.1.0). Schema-basis voor validatie.
- OAuth 2.0 RFC 6749 — [https://datatracker.ietf.org/doc/html/rfc6749](https://datatracker.ietf.org/doc/html/rfc6749). Originele spec.
- OAuth 2.0 Security Best Current Practice — [https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics). Actuele guidance (PKCE, verboden flows).
- OAuth 2.1 draft — [https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1). Consolidatie van OAuth 2.0 plus BCP.
- JWT BCP RFC 8725 — [https://datatracker.ietf.org/doc/html/rfc8725](https://datatracker.ietf.org/doc/html/rfc8725). JWT-specifieke security-gotchas.
- CORS / Fetch Standard — [https://fetch.spec.whatwg.org/#cors-protocol](https://fetch.spec.whatwg.org/#cors-protocol). Primaire CORS-bron.
- GraphQL Specification — [https://spec.graphql.org/](https://spec.graphql.org/).
- OWASP GraphQL Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html). Introspection, depth, batching.
- NIST SP 800-204 — [https://csrc.nist.gov/pubs/sp/800/204/final](https://csrc.nist.gov/pubs/sp/800/204/final). Microservices-security.

## Categorieën

- appsec
