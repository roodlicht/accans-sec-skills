---
name: spring-security
description: Spring Boot security review — Spring Security config (SecurityFilterChain), OAuth2/OIDC client en resource-server, method-level @PreAuthorize, JWT validatie, actuator endpoint lockdown, CSRF-model voor web vs API, en recente Spring CVE-patronen (Spring4Shell, SpEL injection, authorization bypasses).
---

# Spring Boot Security

## Wanneer gebruiken

Deze skill is de Spring-specifieke laag boven `secure-coding` en `api-security`. Spring Security is krachtig en precies daarom foot-gun-rijk: configuratie-kleine-letters bepalen of je app veilig is of wagenwijd.

Activeert bij:

- Een vraag als "review onze Spring Security config", "OAuth2 client-setup", "actuator endpoints afschermen", "JWT-validatie op Spring Resource Server", "@PreAuthorize-review".
- Aanwezigheid van `spring-boot-starter-security`, `spring-security-oauth2-client`, `SecurityFilterChain`-beans, `@EnableWebSecurity`, `@PreAuthorize`/`@PostAuthorize`-annotaties, `application.yml` met `spring.security.*` of `management.*`.
- Een PR die `.permitAll()`, `.disable()` op CSRF/CORS, custom `AuthenticationProvider`, `UserDetailsService`, of JWT-filter aanraakt.
- Spring-version-bumps rond security-releases.
- Een handoff vanuit `security-review` of `api-security` waar Spring in de stack zit.

### Wanneer NIET (handoff)

- Algemene Java-secure-coding → `secure-coding`.
- API-ontwerp en OWASP API Top 10 — grote overlap, maar die skill is framework-agnostisch. Gebruik `api-security` voor conceptuele vragen (wat is IDOR, hoe valideer je schema), deze skill voor Spring-specifieke uitwerking.
- SAST met Semgrep `p/java-spring` of CodeQL — `sast-orchestrator`.
- Dep-vulns (incl. Log4Shell-klasse-vulns in transitive deps) → `cve-triage`.
- Infra rondom Spring (Kubernetes-deploy, container-image) → `container-hardening` + `k8s-security`.
- Secrets (application.properties met DB-passwords) → `secrets-scanner`.

## Aanpak

Zes fases. Fase 1 (SecurityFilterChain) is waar de meeste production-bugs zitten.

### 1. SecurityFilterChain-config

Spring Security 6+ gebruikt Lambda-DSL. Elke keten bepaalt welke auth-mode welk pad krijgt en wat "geopend" betekent.

Veelgeziene foot-guns:

- **`.permitAll()` op te breed pad.** `http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/**").permitAll())` zet de hele API open. Zoek naar `.permitAll()` op wildcards en challenge elke.
- **Volgorde van matchers.** Filter-chain matcht top-down. Een `/api/**` permitAll boven een `/api/admin/**` authenticated-rule overrulet deze laatste. Altijd van specifiek naar algemeen.
- **`.anyRequest().permitAll()`** — als laatste regel is dit catch-all open. Bijna altijd fout. Laatste regel hoort `.anyRequest().authenticated()` te zijn, met uitzondering bij een puur publieke app.
- **Meerdere `SecurityFilterChain`-beans** met `@Order`. Eerste match wint. Een te-brede eerste chain kan latere chains overbodig maken.
- **`.csrf(csrf -> csrf.disable())`** zonder context. CSRF standaard aan voor stateful web-auth. Disable is terecht voor stateless JWT-API's, fout voor form-based auth. Als je twijfelt: aan laten.
- **CORS-config.** `.cors(cors -> cors.configurationSource(source))` met `CorsConfigurationSource` die wildcards teruggeeft is standaard-misvatting. `allowedOrigins("*")` in combinatie met `allowCredentials(true)` werkt niet (Spring weigert), maar het is een signaal dat de config-flow niet is doordacht.

Concrete reference-config voor een stateless JWT-API:

```java
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    http
        .securityMatcher("/api/**")
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated())
        .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()))
        .csrf(csrf -> csrf.disable())  // terecht voor stateless API
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    return http.build();
}
```

### 2. Method-level authorization

Route-level auth is nooit genoeg. Methods met sensitive logica horen `@PreAuthorize` of equivalent.

- **`@EnableMethodSecurity`** (Spring Security 6) vervangt `@EnableGlobalMethodSecurity`. Zonder deze annotatie werken `@PreAuthorize`/`@PostAuthorize` niet.
- **`@PreAuthorize("hasRole('ADMIN')")`** — role-based.
- **`@PreAuthorize("hasAuthority('SCOPE_write:documents')")`** — voor JWT-scopes.
- **`@PreAuthorize("#id == authentication.name or hasRole('ADMIN')")`** — per-resource ownership, de fix voor IDOR (zie `api-security` API1 BOLA).
- **`@PostAuthorize`** — filter return-value na execute. Zeldzaam nodig, heeft performance-impact.

Common miss: ownership-check in de service-method maar niet in de controller, of omgekeerd. Eén plek is genoeg, maar moet ondubbelzinnig zijn welke.

### 3. Actuator lockdown

Spring Boot Actuator exposed operationele endpoints. Default-config (oud) was wijd open. Sinds Boot 2.x default alleen `/health` en `/info` public, rest geauthenticeerd. Reviewer-regel: controleer dat je niet teruggevallen bent naar het oude model.

- **`management.endpoints.web.exposure.include`** — wat wordt blootgesteld. `"*"` is fout in prod. Beperk tot wat Ops écht nodig heeft: `health,info,prometheus,metrics`.
- **`management.endpoint.env.show-values=NEVER`** of `ALWAYS`/`WHEN_AUTHORIZED`. `/env` toont alle env-vars, inclusief secrets bij verkeerde config.
- **`management.endpoint.heapdump.enabled=false`** in prod. Heapdump via HTTP is memory-exfil-primitive.
- **`management.server.port`** op aparte port die niet extern routable is. Plus firewall/NetworkPolicy (zie `k8s-security`).
- **Actuator security op de SecurityFilterChain**: aparte chain met `EndpointRequest.toAnyEndpoint()` matcher, role `ACTUATOR` of equivalent.

### 4. JWT en OAuth2

Spring heeft drie OAuth2-rollen: client (consumer), resource-server (you, validating tokens), authorization-server (you, issuing tokens). Elk heeft eigen foot-guns.

- **Resource-server (JWT-validatie)**:
  - **Issuer-validatie** verplicht: `spring.security.oauth2.resourceserver.jwt.issuer-uri` of expliciete `JwtDecoder` met `NimbusJwtDecoder.withIssuerLocation(issuer)`.
  - **Audience-claim** validatie expliciet bouwen (niet default). `OAuth2TokenValidatorFactories.create().andValidate(JwtIssuerValidator).andValidate(JwtAudienceValidator)`.
  - **Algorithm-whitelist**: accepteer `RS256` / `ES256`, wijs `HS256` af tenzij expliciet bedoeld. Algorithm-confusion is een klassieke aanval. Zie ook `api-security` fase 2.
  - **Clock-skew**: `.setClockSkew(Duration.ofMinutes(2))` redelijk, niet 1 uur.
- **Client (consumer van OAuth)**:
  - **PKCE verplicht** voor public clients (mobile, SPA die Spring alleen serveert).
  - **Redirect-URI strict** geregistreerd, geen wildcards.
  - **Scopes minimal** vragen.
- **Authorization-server**:
  - Spring Authorization Server is relatief jong (stable sinds 2022). Gebruik vendor-IdP (Keycloak, Auth0, Okta) tenzij je een sterke reden hebt om zelf te hosten.

### 5. CVE-patronen uit de afgelopen jaren

Spring ecosystem heeft een paar beruchte CVEs; elk is een patroon om naar te zoeken.

- **Spring4Shell (CVE-2022-22965)**. Spring Framework RCE via class-loader-manipulation in data-binding. Patched in 5.2.20, 5.3.18. Historisch maar nog actueel als reviewer-reflex: Java-apps die `ServletRequestDataBinder` gebruiken zonder allowlist zijn gevoelig. Spring Boot's default-binder is sinds fix-release patched.
- **CVE-2022-22963 Spring Cloud Function** — SpEL-injection via `spring.cloud.function.routing-expression`-header. Les: SpEL-evaluatie op untrusted input is RCE. Zoek in je code naar `SpelExpressionParser().parseExpression(userInput)`.
- **CVE-2023-20860 / -20861 Spring Framework** — mass-binding en security-bypass via `matchers` in combinatie met `mvcMatchers`. Fix in 5.3.26, 6.0.7. Reviewer-regel: mix van `antMatchers` en `mvcMatchers` is foot-gun — gebruik consistent één en bij voorkeur `requestMatchers` (Spring Security 6).
- **CVE-2024-22257 Spring Security authorization bypass** — mogelijke bypass wanneer `AuthenticatedVoter` geconfigureerd was zonder additional checks. `[verify tegen https://spring.io/security/cve-2024-22257]` voor exact patched-versions in jullie context.
- **Recentere CVEs** — `[verify tegen https://spring.io/security/]` — check de CVE-feed bij versie-bump of review. Geen verzonnen IDs in findings.

### 6. Misc en verification-loop

- **`@JsonIgnore` op gevoelige entity-velden** (password_hash, internal-notes) om te voorkomen dat ze in de JSON-response belanden (mass-response, spiegel van mass-assignment).
- **`@JsonProperty(access = WRITE_ONLY)`** voor input-only velden.
- **DTOs gebruiken** in plaats van entities direct serialiseren. Voorkomt dat DB-schema-wijzigingen per ongeluk velden exposen.
- **Session-fixation**: Spring Security voorkomt dit by default (`SessionAuthenticationStrategy`). Niet uitzetten zonder reden.
- **Password hashing**: `BCryptPasswordEncoder` default. Argon2-variant via `Argon2PasswordEncoder` als de library erbij zit. Nooit `NoOpPasswordEncoder` buiten tests.

Verification-loop: Laag 1 (SecurityFilterChain-config coherent? Actuator-endpoints expliciet afgeschermd? JWT-issuer+audience beide gevalideerd?), Laag 2 (CVE-IDs via spring.io/security bevestigen, OAuth-flow-namen kloppen, geen verzonnen Spring-annotaties in voorbeelden).

## Output

```
Spring Security review — <service/module>
Spring Boot: <x.y.z> | Spring Security: <x.y.z> | Versie-status: <current | N releases achterstand>

SecurityFilterChain:
  Chains aanwezig:        N
  permitAll() matchers:   <lijst + context>
  .anyRequest() laatste:  <authenticated | permitAll — FINDING>
  CSRF-status:            <enabled | disabled met context>
  CORS-config:            <scoped | wildcard — FINDING>

Method-security:
  @EnableMethodSecurity:  <ja/nee>
  @PreAuthorize-coverage: <controllers met/zonder>
  Ownership-checks:       <aanwezig op resource-endpoints?>

Actuator:
  Exposure:               <lijst endpoints>
  /env show-values:       <NEVER | WHEN_AUTHORIZED | ALWAYS — FINDING>
  /heapdump:              <disabled | exposed — FINDING>
  Apart port of filter:   <ja/nee>

OAuth2 / JWT:
  Rol:                    <client | resource-server | beide>
  Issuer-validatie:       <ja/nee>
  Audience-validatie:     <ja/nee>
  Algorithm-whitelist:    <ja/nee>

CVE-check:
  Spring4Shell-patched:   <ja>
  Recente security-releases: <binnen N dagen van upstream?>
  cve-triage handoff:     <N openstaand>

Findings (severity-gesorteerd, volg security-review-format)
Verification-loop: ...
```

## Referenties

- Spring Security Reference — [https://docs.spring.io/spring-security/reference/](https://docs.spring.io/spring-security/reference/). Canonical docs, Lambda-DSL en config-patronen.
- Spring Security CVE-feed — [https://spring.io/security/](https://spring.io/security/). Alle Spring-projects CVEs, canonieke bron voor verificatie.
- Spring Boot Actuator — [https://docs.spring.io/spring-boot/reference/actuator/index.html](https://docs.spring.io/spring-boot/reference/actuator/index.html). Endpoint-config en security-implicaties.
- OWASP Java Security Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Java_Security_Cheat_Sheet.html).
- Spring Framework Reference (RequestMapping, Binding) — [https://docs.spring.io/spring-framework/reference/](https://docs.spring.io/spring-framework/reference/). Voor patronen die Spring4Shell-achtige aanvallen omvatten.
- RFC 8725 (JWT BCP) — [https://datatracker.ietf.org/doc/html/rfc8725](https://datatracker.ietf.org/doc/html/rfc8725). JWT-specifieke gotchas.
- OAuth 2.0 Security BCP — [https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics).
- NIST NVD — [https://nvd.nist.gov/](https://nvd.nist.gov/). Voor CVE-verificatie bij elke cite.

## Categorieën

- appsec
