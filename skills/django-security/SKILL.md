---
name: django-security
description: Django security review — CSRF, ORM-level SQL injection (raw/extra/annotate), template injection via |safe, admin hardening, middleware ordering, settings deploy checklist, and recent Django CVE patterns.
---

# Django Security

## Wanneer gebruiken

Deze skill is de Django-specifieke laag boven `secure-coding`. Gebruik 'm wanneer Django zichzelf in de weg staat: defaults die misverstand-gevoelig zijn, ORM-paden die er veilig uitzien maar toch SQLi toelaten, of settings die per environment fout kunnen zijn.

Activeert bij:

- Een vraag als "review deze Django-app", "is onze deploy veilig", "wat zijn onze SECURE_-settings", "gebruiken we CSRF goed", "admin-hardening op Django".
- Aanwezigheid van `manage.py`, `settings.py`, `urls.py`, `models.py`, `views.py`, Django-middleware-class paths in `MIDDLEWARE`, DRF `viewsets.py` of `serializers.py`.
- Een PR die `@csrf_exempt`, `|safe`, `mark_safe`, `.raw()`, `.extra()`, `RawSQL`, of `HttpResponse(user_input)` introduceert.
- Django-versie-bumps die een security-release zijn (release notes melden dan expliciet fixes).
- Een handoff vanuit `security-review` waar Django in de stack zit.

### Wanneer NIET (handoff)

- Algemene Python-secure-coding (niet Django-specifiek) → `secure-coding`.
- DRF als API-laag heeft veel overlap met `api-security`: OAuth/JWT-flow, OWASP API Top 10 horen daar. Django-specifieke DRF-foot-guns (bv. `HyperlinkedModelSerializer` authorization bypass) blijven hier.
- SAST-tool-configuratie (Bandit, Semgrep `p/django`) → `sast-orchestrator`.
- Dep-vulns in Django of third-party packages → `cve-triage`.
- Deploy-infrastructuur (nginx, gunicorn, containers) → `container-hardening` / `iac-security`.
- Secrets-handling (SECRET_KEY, DB-creds) → `secrets-scanner`.

## Aanpak

Zes fases. Django-defaults zijn redelijk veilig; de meeste issues ontstaan waar je ze bewust overrule't.

### 1. Settings en deploy-checklist

`python manage.py check --deploy` is een Django-ingebouwde checker. Draai hem altijd, fix elke warning voor productie. Niet genoeg maar wel noodzakelijk.

Kritieke settings:

- **`DEBUG = False`** in productie. `DEBUG = True` lekt stack traces, env-vars, SQL-queries: volledige app-interne exposure. Geen uitzonderingen.
- **`ALLOWED_HOSTS`** expliciet. Wildcard `['*']` in prod is een Host-header-injection-vector.
- **`SECRET_KEY`** uit environment of vault, nooit in source. Rotatie-schema bij verdenking van lek. Zie `secrets-scanner`.
- **`SECURE_SSL_REDIRECT = True`**, **`SECURE_HSTS_SECONDS >= 31536000`** met `SECURE_HSTS_INCLUDE_SUBDOMAINS` en `SECURE_HSTS_PRELOAD`, **`SESSION_COOKIE_SECURE = True`**, **`CSRF_COOKIE_SECURE = True`**. Alleen waar TLS gegarandeerd is.
- **`SESSION_COOKIE_HTTPONLY = True`** (default), **`SESSION_COOKIE_SAMESITE = 'Lax'`** of `'Strict'`.
- **`SECURE_CONTENT_TYPE_NOSNIFF = True`**, **`SECURE_REFERRER_POLICY`** expliciet gezet.
- **`CSRF_TRUSTED_ORIGINS`** met full scheme+host waar relevant (Django 4+).
- **`PASSWORD_HASHERS`** met Argon2 eerst, daarna PBKDF2 als fallback. `django-argon2` package nodig.
- **Database**: `ATOMIC_REQUESTS` waar aangewezen, aparte DB-user met least-privilege (geen DROP/CREATE-rechten voor web-user).

### 2. ORM en SQL-injection

Django's ORM parametriseert standaard. SQLi ontstaat op plekken waar je eruit stapt:

- **`.raw()`**: string-formatting in het raw-queryset geeft SQLi. Gebruik placeholder-params: `Model.objects.raw('SELECT * FROM app_model WHERE name = %s', [name])`. Niet `f'SELECT ... WHERE name = {name}'`.
- **`.extra()`**: deprecated, nog veelgebruikt. `where=`, `params=`, `select=` kunnen misbruikt worden. Liever vervangen door `Func()`, `RawSQL()` met params, of `annotate()` met `ExpressionWrapper`.
- **`RawSQL`**: parameter-list móet gebruikt worden. Het voorbeeld in de Django-docs toont `RawSQL("select col from sometable where othercol = %s", (someparam,))`. Volg dat.
- **`QuerySet.annotate()` / `aggregate()` met dict-keys van user-input**. Historisch kwetsbaar (zie CVE-2022-28346, SQL-injection via column-aliases in dict-keys). Reviewer-regel: dict-keys in annotate/aggregate komen nooit van user-input, hardcode ze.
- **Order-by met user-input**. `.order_by(request.GET.get('sort'))` laat users kolommen kiezen. Allowlist de toegestane kolomnamen.
- **`__in=` met grote lijsten** uit user-input: geen SQLi maar wel DoS. Limiteer list-size.

Django CVE-referenties (binnen 3-jaar venster, verify tegen release notes):

- CVE-2022-28346: QuerySet.annotate/aggregate SQLi via dict-keys. Fix in Django 2.2.28, 3.2.13, 4.0.4. Canonical voorbeeld van "ORM is veilig, behalve als ..."
- CVE-2023-43665: Truncator DoS via crafted HTML. Fix in 3.2.22, 4.1.12, 4.2.6.
- Recentere CVEs in Django 4.2/5.x reeks: `[verify tegen https://docs.djangoproject.com/en/dev/releases/security/]` voor het huidige venster.

### 3. Template-injection en XSS

Django-templates hebben **autoescape aan by default**. XSS ontstaat als je 'm uitzet.

- **`{{ user_input|safe }}`**: rendert raw HTML. Alleen toepassen op content die je zelf hebt gecontroleerd (bv. sanitized HTML uit een trusted bleach-call), nooit op ongewaste user-input.
- **`{% autoescape off %}`**: schakelt escaping uit voor het hele blok. Zelden nodig, review elke toepassing.
- **`mark_safe(s)`** in Python-code: zelfde effect als `|safe`. Als `s` user-input bevat of samengesteld is uit user-input, heb je XSS.
- **`format_html('<a href="{}">', user_url)`**: URL-attributes zijn een apart probleem. `javascript:`-URLs via `href` bypassen HTML-escaping. Valideer `user_url.startswith(('http:', 'https:'))`.
- **Server-side template injection**: als je zelf templates rendert met user-controlled template-strings (`Template(user_input).render(...)`), krijg je SSTI met potentieel RCE. Nooit doen.
- **`HttpResponse(user_input)`**: bypass template-autoescape omdat er geen template is. Gebruik `render()` of encode expliciet.

### 4. CSRF-model

Django's `CsrfViewMiddleware` is aan by default voor POST/PUT/PATCH/DELETE.

- **`@csrf_exempt`**: zet CSRF uit voor een specifieke view. Alleen gebruiken op endpoints waar CSRF structureel niet werkt (bv. webhook-receivers met signature-verificatie). Elke `@csrf_exempt` in een PR is een security-review-moment.
- **DRF en CSRF**: DRF `SessionAuthentication` forceert CSRF, `TokenAuthentication`/`JWT` niet (stateless). Mixed auth-modes: wees expliciet welke endpoints welk model gebruiken.
- **`CSRF_COOKIE_HTTPONLY`**: default `False`, wat nodig is voor JS om token te lezen. Niet aanpassen tenzij je een custom CSRF-setup hebt.
- **`CSRF_TRUSTED_ORIGINS`**: sinds Django 4 strikter geïnterpreteerd (volledige origin met scheme). Zonder correcte config: legitieme POSTs worden 403 geweigerd.

### 5. Auth, session, en admin

- **`django.contrib.auth.password_validation`**: verwijder nooit. Lengte-check, common-password-check, attribute-similarity-check moeten actief zijn.
- **`AUTHENTICATION_BACKENDS`**: aangepaste backends zijn klassieke foot-gun. Elke custom backend moet timing-safe zijn (identieke response-tijd voor "user bestaat niet" vs "password fout").
- **Admin-interface**:
  - **`ADMIN_URL`** niet `/admin/` (security through obscurity + bot-traffic-reductie).
  - **IP-allowlist** via middleware of reverse-proxy voor `/admin/*`.
  - **2FA** verplicht via `django-otp` of `django-allauth` met TOTP.
  - **`is_staff` en `is_superuser`** nauwgezet toekennen. Superuser-status alleen voor een klein team.
- **Session-management**: `SESSION_COOKIE_AGE` redelijk kort, `SESSION_EXPIRE_AT_BROWSER_CLOSE` waar passend, session-rotatie na privilege-change (sinds Django 2+ automatisch bij login).
- **django-allauth/django-axes** voor rate-limiting op login (brute-force-prevention). Native Django heeft geen rate-limiter op auth-endpoints.

### 6. Misc en verification-loop

- **File-uploads**: `FileField` valideert geen content-type. `UploadedFile.content_type` wordt door de client bepaald. Valideer magic-bytes, whitelisten van extensies, opslag buiten web-root.
- **Open redirects**: `redirect(request.GET.get('next'))` zonder validatie is open redirect. Django heeft `url_has_allowed_host_and_scheme(url, allowed_hosts=...)` voor dit doel.
- **Middleware-volgorde**: `SecurityMiddleware` hoort hoog, `CsrfViewMiddleware` voor `AuthenticationMiddleware`, custom middleware met side-effects dichtbij de view. Foute volgorde kan subtiele bypasses opleveren.
- **django-admin `check` met `--deploy`** in CI verplicht.
- **Bandit + Semgrep `p/django`** als SAST-laag, zie `sast-orchestrator`.

Verification-loop: Laag 1 scope (settings-file + urls + middleware-stack alle langs?), aannames (autoescape aan overal, geen `|safe` op user-input?), gaps (DRF-views in dezelfde review meegenomen?). Laag 2 specifiek op CVE-IDs (verify tegen Django-release-notes, niet geheugen), security-settings-namen (Django wijzigt soms default-waarden per major version), admin-hardening-claims onderbouwd met concrete middleware/package.

## Output

Volg het `security-review` rapport-format, met een Django-specifieke scan-samenvatting bovenaan:

```
Django security review — <app/project>
Django-versie: <x.y.z> (laatste security-release: <...>)

Deploy-checklist (python manage.py check --deploy):
  Warnings: N → opgelost/open
  DEBUG in prod:        <False | FINDING>
  ALLOWED_HOSTS:        <expliciet | wildcard — FINDING>
  SECURE_* settings:    <compleet | gaps>
  PASSWORD_HASHERS:     <Argon2 eerst | PBKDF2 default>

Code-patterns:
  @csrf_exempt:         <N, locatie, reden>
  |safe / mark_safe:    <N, op user-input? FINDING>
  .raw() / .extra():    <N, geparameteriseerd?>
  order_by(user-input): <lijst>

Admin:
  URL niet /admin/:     <ja/nee>
  IP-restrictie:        <ja/nee>
  2FA op staff:         <ja/nee>

Versie-check:
  Op laatste security-release: <ja | achterstand met N maanden>
  CVE-relevantie:              <handoff naar cve-triage>

Findings (severity-gesorteerd, volg security-review-format)
Verification-loop: ...
```

## Referenties

- Django Security — [https://docs.djangoproject.com/en/stable/topics/security/](https://docs.djangoproject.com/en/stable/topics/security/). Officiële security-topic-pagina.
- Django Deployment Checklist — [https://docs.djangoproject.com/en/stable/howto/deployment/checklist/](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/). Exact wat `manage.py check --deploy` controleert.
- Django Security Releases — [https://docs.djangoproject.com/en/dev/releases/security/](https://docs.djangoproject.com/en/dev/releases/security/). Canonieke CVE-log per versie.
- Django Admin Security — [https://docs.djangoproject.com/en/stable/ref/contrib/admin/#adminsite-objects](https://docs.djangoproject.com/en/stable/ref/contrib/admin/#adminsite-objects). Admin-configuratie-ref.
- OWASP Django Security Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/Django_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Django_Security_Cheat_Sheet.html).
- Django Rest Framework — Authentication — [https://www.django-rest-framework.org/api-guide/authentication/](https://www.django-rest-framework.org/api-guide/authentication/). DRF-auth-mode-matrix.
- django-axes — [https://django-axes.readthedocs.io/](https://django-axes.readthedocs.io/). Login-attempt-rate-limiting.
- django-otp — [https://django-otp-official.readthedocs.io/](https://django-otp-official.readthedocs.io/). 2FA op admin.

## Categorieën

- appsec
