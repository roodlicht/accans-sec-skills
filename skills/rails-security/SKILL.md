---
name: rails-security
description: Rails security review — Brakeman integration, mass-assignment via strong_parameters, SQL injection in ActiveRecord, template injection via html_safe/raw, Devise hardening, credentials.yml.enc, force_ssl and CSP config, recent Rails/Rack CVE patterns.
---

# Rails Security

## Wanneer gebruiken

Deze skill is de Rails-specifieke laag boven `secure-coding`. Rails convention-over-configuration dekt veel af, maar wie tegen de grain in gaat (string-interpolatie in `.where`, `.html_safe` op user-input, CSRF uit voor "het was moeilijk") krijgt kwetsbaarheden terug.

Activeert bij:

- Een vraag als "review deze Rails-app", "Brakeman-triage", "Devise-hardening", "mass-assignment-check", "is onze CSP OK", "SSL forceren".
- Aanwezigheid van `Gemfile`, `config/application.rb`, `config/environments/production.rb`, `config/routes.rb`, Devise-setup onder `config/initializers/devise.rb`, Pundit/CanCanCan policies.
- Een PR die `html_safe`, `raw`, `.where("... #{x} ...")`, `skip_before_action :verify_authenticity_token`, of `skip_forgery_protection` aanraakt.
- Een Brakeman-rapport dat moet worden getrieerd.
- Een handoff vanuit `security-review` waar Rails in de stack zit.

### Wanneer NIET (handoff)

- Algemene Ruby-secure-coding → `secure-coding`.
- API-ontwerp (Rails API-only mode heeft overlap met `api-security`) → die skill voor OWASP API Top 10, hier voor Rails-specifieke uitwerking.
- SAST-tool-orchestratie → `sast-orchestrator`. Brakeman is Rails-specifiek en hoort hier.
- Dep-vulns in gems → `cve-triage` (via `bundle audit` of OSV-scanner).
- Container/K8s-deploy → `container-hardening` / `k8s-security`.
- Secrets in `config/master.key` of `credentials.yml.enc` op disk → `secrets-scanner`. Deze skill dekt alleen het Rails-credentials-model.

## Aanpak

Zes fases. Brakeman doet het zware statische-analyse-werk; deze skill voegt menselijke context toe aan wat Brakeman output en vangt wat hij mist.

### 1. Brakeman en dependency-scanning

**Brakeman** (OSS, Rails-specifiek, sinds 2011). Statische analyse die Rails-idiomen kent. Default-tool voor deze skill.

```bash
bundle add brakeman --group=development
bundle exec brakeman --no-pager -o brakeman-report.json -f json
```

Integratie in CI via de Brakeman-action of plain `bundle exec brakeman --exit-on-warn`. Fail op new warnings via baseline-workflow (`--compare` tegen een vorige run).

Brakeman-warnings triageren met dezelfde discipline als `sast-orchestrator` fase 5: baseline bij invoering, suppress met rule-ID plus reden (`ignore.json`), periodiek herzien.

**bundler-audit** (OSS) voor Gemfile.lock-vulns; resultaten doorzetten naar `cve-triage`. Dependabot/Renovate voor auto-updates.

### 2. Mass-assignment en strong_parameters

De klassieke Rails-kwetsbaarheid. Pre-Rails-4 was whitelist opt-in; sindsdien verplicht via `strong_parameters`.

- **Controller-idioom**: `params.require(:user).permit(:name, :email)`. Alleen die velden worden door `@user.update(user_params)` geaccepteerd.
- **Foot-gun**: `params.require(:user).permit!` — bang-variant permit't alles, effectief mass-assignment zonder whitelist. Zoek naar `.permit!` in elke review.
- **Nested attributes**: `permit(addresses_attributes: [:street, :city])` — expliciet per level.
- **Polymorphic / hash-type input**: `permit(preferences: {})` is leeg-whitelist en accepteert een heel hash zonder sleutel-check. Beperk tot bekende keys.
- **Admin-flags nooit in permit**: `is_admin`, `role`, `stripe_customer_id` — hardcode in de controller, niet toestaan via params.

### 3. SQL injection in ActiveRecord

ActiveRecord parametriseert via hash-syntax en positional placeholders. Issues ontstaan bij string-interpolation.

Veilig (alle geparameteriseerd):

```ruby
User.where(name: name)
User.where("name = ?", name)
User.where("name = :n AND age > :a", n: name, a: 18)
```

Onveilig:

```ruby
User.where("name = '#{name}'")          # string-interpolation
User.where("name = '" + name + "'")     # concatenatie
User.order(params[:sort])               # order-by user-input = kwetsbaar
User.find_by_sql("SELECT ... #{query}") # raw SQL
```

Specifieke sub-patronen:

- **`order(params[:sort])`** — allowlist van toegestane kolomnamen. `User.order(params[:sort].presence_in(%w[name created_at]) || :id)`.
- **`group(...)`, `having(...)`, `pluck(...)`** — accepteren string-fragmenten; niet samenstellen uit user-input.
- **`sanitize_sql_array`/`sanitize_sql_like`** voor gevallen waar je toch raw SQL nodig hebt.
- **`find_by_sql`, `connection.execute`** — altijd geparameteriseerd, Brakeman vangt dit.

### 4. XSS en template-escape

Rails escapet by default in ERB (`<%= %>`). XSS ontstaat waar je opt-out doet.

- **`raw(user_input)`** — rendert ruw, geen escaping.
- **`<%= user_input.html_safe %>`** — zelfde effect, methode op string.
- **`safe_concat`, `content_tag(..., user_input)`** met `escape: false` — varianten.
- **`sanitize(user_html, tags: ..., attributes: ...)`** — Rails' ingebouwde HTML-sanitizer; acceptabel voor user-gegenereerde HTML mits allowlist scherp is. Verwijs naar de Rails-docs voor de default-allowlist.
- **`javascript_tag do ... end`** met user-input in de body — JS-context-XSS, niet gedekt door HTML-escape.
- **Custom helpers** die `html_safe` teruggeven zijn een veelvoorkomende bug-bron. `def my_helper(input); "<b>#{input}</b>".html_safe; end` is kapot als `input` user-input is. Fix: `content_tag(:b, input)`.

### 5. Auth: Devise, CSRF, sessies, CSP

- **CSRF**: `protect_from_forgery with: :exception` (default sinds Rails 5.2). `skip_before_action :verify_authenticity_token` is een security-review-trigger. API-controllers die `ActionController::API` extenden hebben CSRF niet nodig (stateless); mixed controllers (web + JSON) wel.
- **Devise-hardening**:
  - Modules: `:database_authenticatable`, `:registerable`, `:recoverable`, `:rememberable`, `:validatable`. Zet `:confirmable` aan voor e-mail-verificatie, `:lockable` voor brute-force-mitigatie, `:timeoutable` voor inactieve sessies.
  - Password-hashing: Devise gebruikt bcrypt; stretches >= 12 voor prod.
  - `devise-two-factor` voor TOTP-MFA.
  - Password-reset flow: verify dat token tijdgebonden is (`reset_password_within` redelijk kort), enumeration-safe (zelfde response voor bestaande/niet-bestaande email).
- **Sessie-config**: `config.session_store :cookie_store, key: '_app_session', secure: Rails.env.production?, httponly: true, same_site: :lax`. `expire_after` redelijk (bv. 2 uur inactief).
- **Content Security Policy**: sinds Rails 5.2 via `config/initializers/content_security_policy.rb`. Default-policy opbouwen zonder `'unsafe-inline'` of `'unsafe-eval'`; nonce-based als inline nodig is.
- **`force_ssl`**: `config.force_ssl = true` in production.rb. Of op reverse-proxy-niveau, niet beide redundant.

### 6. CVE-patronen en verification-loop

Rails/Rack CVEs om te kennen:

- **CVE-2019-5418 ActionView file-disclosure** — Accept-header-based path-traversal. Historisch maar canonical; elke Rails-versie <5.2.2.1 / 4.2.11.1 is kwetsbaar. Reviewer-reflex: is Rails-versie recent genoeg?
- **CVE-2022-32224 ActiveRecord YAML-deserialisatie RCE** — via `serialize :column`. Fix in 5.2.8.1, 6.0.5.1, 6.1.6.1, 7.0.3.1. Zoek in code naar `serialize :col` zonder type-argument; dat triggert legacy YAML-pad.
- **CVE-2023-22795 ActionDispatch ReDoS** — header-parsing regex DoS.
- **Rack 3.x security-stream (2024)** — meerdere CVEs in Rack's request-parser. `[verify tegen https://github.com/rack/rack/security/advisories]` voor huidige status.
- **Overig**: `[verify tegen https://rubyonrails.org/security/]` voor Rails-specifieke, `[verify tegen https://github.com/rack/rack/security/advisories]` voor Rack.

File-uploads en Active Storage:

- `has_one_attached :avatar` — content-type wordt via `content_type` in de blob opgeslagen, maar MIME-check op upload is de verantwoordelijkheid van de controller. Gebruik `validates :avatar, content_type: [...]` via `active_storage_validations`-gem.
- **Variants** met `ImageMagick` backend: CVE-intensieve library. Liever `vips` als backend.
- **Private storage** voor niet-publieke bestanden (`ActiveStorage::Current.url_options`); niet direct blob-urls delen zonder signed URL plus expiry.

Verification-loop: Laag 1 scope (Gemfile-versies, production.rb-settings, routes + controllers-permits alle langs?), aannames (`protect_from_forgery` actief op alle web-controllers?). Laag 2 (CVE-IDs tegen rubyonrails.org/security geverifieerd, Brakeman rule-IDs echt, geen verzonnen Devise-modules).

## Output

```
Rails security review — <app>
Rails: <x.y.z> | Ruby: <x.y.z> | Gems met vuln: <N via cve-triage>

Brakeman:
  Warnings totaal:      N (baseline: M, nieuw: K)
  High-confidence:      <lijst>
  Gegroepeerd per klasse

Code-patterns:
  skip_before_action :verify_authenticity_token: <lijst>
  .permit!, mass-assignment risks:                <lijst>
  String-interpolation in .where/.order:          <lijst>
  html_safe/raw op user-input:                    <lijst>

Devise:
  Modules aanwezig:     <confirmable, lockable, timeoutable?>
  MFA actief:           <devise-two-factor | geen>
  stretches:            <N>
  enumeration-safe:     <ja/nee op reset-flow>

Deploy-settings:
  config.force_ssl:     <true | false>
  session-cookie flags: <secure, httponly, same_site>
  CSP:                  <default-policy, zonder unsafe-inline?>

Active Storage (indien):
  MIME-validatie:       <aanwezig | missing>
  ImageMagick vs vips:  <backend>

Versie-check:
  Rails-security-releases:  <actueel | N maanden achterstand>
  Rack-CVE-scope:           <verified>

Findings (severity-gesorteerd, volg security-review-format)
Verification-loop: ...
```

## Referenties

- Rails Security Guide — [https://guides.rubyonrails.org/security.html](https://guides.rubyonrails.org/security.html). Officiële security-guide, onderhouden met core-team-input.
- Rails Security Announcements — [https://rubyonrails.org/security/](https://rubyonrails.org/security/). CVE-feed.
- Brakeman — [https://brakemanscanner.org/](https://brakemanscanner.org/). Rails-specifieke SAST.
- bundler-audit — [https://github.com/rubysec/bundler-audit](https://github.com/rubysec/bundler-audit). Gemfile.lock dep-CVE-scan.
- Devise — [https://github.com/heartcombo/devise](https://github.com/heartcombo/devise) en [https://github.com/devise-security/devise-security](https://github.com/devise-security/devise-security) voor extra modules.
- Active Storage Validations — [https://github.com/igorkasyanchuk/active_storage_validations](https://github.com/igorkasyanchuk/active_storage_validations). MIME-/size-checks die AS zelf niet doet.
- Rack Security Advisories — [https://github.com/rack/rack/security/advisories](https://github.com/rack/rack/security/advisories). Rack raakt elke Rails-app direct.
- OWASP Ruby on Rails Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/Ruby_on_Rails_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Ruby_on_Rails_Cheat_Sheet.html).

## Categorieën

- appsec
