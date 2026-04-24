---
name: nextjs-security
description: Next.js security review — middleware auth-bypass patterns (CVE-2025-29927), Server Actions auth/CSRF, Server/Client Component boundary en SSR data-leaks, auth.js (NextAuth) config, route-handlers als API, Image Optimization SSRF, security-headers via middleware.
---

# Next.js Security

## Wanneer gebruiken

Deze skill is de Next.js-specifieke laag boven `secure-coding` en `api-security`. Next.js heeft de afgelopen jaren meerdere architectuur-wisselingen doorgemaakt (Pages Router, App Router, Server Actions, middleware-evolutie), en de security-implicaties veranderen mee. Hij wordt ook gebruikt door teams die de grens tussen front-end en back-end niet scherp hebben — precies daar zitten de bugs.

Activeert bij:

- Een vraag als "review onze Next.js-app", "CVE-2025-29927 impact", "Server Actions veilig maken", "auth.js/NextAuth-config review", "middleware-auth", "SSR lekt data naar client bundle", "image optimization SSRF".
- Aanwezigheid van `next.config.js`/`.mjs`/`.ts`, `middleware.ts` in de project-root, `app/` directory met `page.tsx` en `layout.tsx`, `pages/` (oudere router), `"use server"`- of `"use client"`-directives, NextAuth/auth.js-config.
- Een PR die middleware aanraakt, Server Actions toevoegt, API-routes converteert naar Server Actions, of auth.js-config wijzigt.
- Next.js-versie-bumps, vooral rond security-releases.
- Handoff vanuit `security-review` of `api-security` wanneer Next.js in de stack zit.

### Wanneer NIET (handoff)

- Algemene JS/TS secure-coding → `secure-coding`.
- OWASP API Top 10 als conceptueel framework → `api-security`. Hier de Next.js-uitwerking.
- SAST-tooling (eslint-plugin-security, Semgrep `p/javascript`) → `sast-orchestrator`.
- Dep-vulns in `package.json` / `package-lock.json` → `cve-triage`.
- Vercel/Netlify-deploy-config en edge-network-policies → `iac-security` waar mogelijk, anders platform-specifieke docs.
- Secrets in `.env.local` of Vercel-env-vars → `secrets-scanner`.

## Aanpak

Zeven fases. Fase 1 (middleware en auth-bypass) is het hart — dat is waar de CVE-2025-29927-klasse-bug zat en waar architectuur-misvattingen het vaakst problemen geven.

### 1. Middleware en auth-bypass

Next.js middleware draait vóór elke matching-request en wordt vaak gebruikt voor authenticatie-gates en redirects. Precies daarom is het een aanvalsoppervlak.

- **CVE-2025-29927** (`[verify tegen https://nextjs.org/blog]` en [https://github.com/vercel/next.js/security/advisories](https://github.com/vercel/next.js/security/advisories)): Een interne header die Next.js gebruikt voor infinite-loop-detectie kon extern worden gezet, waardoor middleware werd overgeslagen. Effect: middleware-based auth kon worden bypassed. Patched in 14.2.25, 15.2.3. Impact-reviewer-vragen:
  - Draai je een versie ≥ fix?
  - Was middleware je enige auth-laag voor geraakt paden? Zo ja: iedereen die gedurende de exposure-window toegang had kunnen krijgen, is een audit-doel.
  - Zijn er defense-in-depth auth-checks op page- of Server-Action-niveau? Als "nee", is dit een pattern-level fix, niet alleen een version-bump.

- **Algemener middleware-patroon**: middleware is geen veilige plek voor **alleen** auth. Defense-in-depth: auth ook in de page/route-handler/Server-Action checken. Middleware voor redirects en header-enforcement, niet als enige gate.

- **Open redirects via middleware**: `return NextResponse.redirect(new URL(request.nextUrl.searchParams.get('next') ?? '/', request.url))` — als `next` niet gevalideerd is, is dit een open redirect. Allowlist van bestemmingen.

- **Matchers**: `export const config = { matcher: '/admin/:path*' }` — een te smalle matcher beschermt niet wat je dacht te beschermen. Verify dat alle gevoelige paden gematched zijn.

### 2. Server Actions: auth en CSRF

Server Actions (`"use server"`) zijn RPC-endpoints die uit een Client Component worden aangeroepen, maar als server-code draaien. Ze delen security-concerns met API-routes plus een paar eigen.

- **Authenticatie in de Action zelf**, niet alleen in de caller. Een aanvaller kan je action hard-coded aanroepen, omzeilend je UI-guard.
  ```ts
  'use server';
  export async function deletePost(id: string) {
    const session = await auth();         // niet overslaan
    if (!session) throw new Error('unauth');
    const post = await db.post.findUnique({ where: { id } });
    if (post.authorId !== session.user.id) throw new Error('forbidden'); // IDOR-fix
    await db.post.delete({ where: { id } });
  }
  ```
- **Input-validatie**: Server Actions ontvangen een `FormData` of direct-gecalled args. Valideer met zod/valibot/yup. Trust niks dat uit de client komt.
- **CSRF**: Next.js beschermt Server Actions by default via same-origin checks en een action-id die alleen de server uitgeeft. Cross-origin POST naar een action faalt. Maar: die bescherming leunt op `Origin`- en `Host`-headers. Custom proxy-setups kunnen dit breken; verifieer dat Next.js' CSRF-guard actief is na je proxy.
- **Rate-limiting**: Next.js heeft geen ingebouwde rate-limiter. Gebruik Upstash/Redis/edge-config op het action-pad, of plaats auth-sensitive Actions achter een gateway die rate-limit doet.

### 3. Server/Client Component-grens en SSR data-leaks

App Router introduceerde Server Components en Client Components. De grens is runtime-betekenis: wat in een Server Component staat belandt niet in de client-bundle, wat in een Client Component staat wel.

- **`"use client"`-boundary**: data die je als props naar een Client Component stuurt, belandt in de client-bundle of in de hydration-payload. Dus: geen secrets, geen interne IDs, geen `password_hash`, geen ander user's data die toevallig in je query meekwam, geen feature-flags die concurrenten niet mogen zien.
- **`process.env` in Client Components**: alleen `NEXT_PUBLIC_*`-vars zijn beschikbaar. Elke andere leest als `undefined`. Dat is de juiste default; maar een per ongeluk hernoemd `NEXT_PUBLIC_API_KEY` leakt naar productie-bundel. Grep op `NEXT_PUBLIC_` en controleer of alles er expliciet publiek hoort.
- **Hydration-mismatch** als bron van leaks: als server en client verschillende data zien (bv. admin-flag), kan de gehydrate-ende client data in dev-tools zien die hij niet behoort te zien. Server-rendered state bevat wat je send't.
- **Route-handler (`app/api/.../route.ts`)** voor Pages Router's API-routes: behandel als elke andere API-endpoint (zie `api-security`). Auth in de handler, niet alleen in de UI.

### 4. auth.js (NextAuth) en sessie-model

auth.js (gerebrand van NextAuth v5) is de de-facto auth-library voor Next.js.

- **Session-strategie**: `database` of `jwt`. JWT-strategie stopt alle session-data in een encrypted JWT-cookie — snelle reads, geen server-side invalidatie. Database-strategie heeft die wel maar vereist DB-hit per request. Keuze is een trade-off; JWT-default is redelijk voor kleine apps, database voor iets waar logout écht moet invalidaten.
- **`AUTH_SECRET`** moet cryptografisch willekeurig zijn (`openssl rand -base64 32`), in vault of env-var, per environment anders. Zie `secrets-scanner`.
- **Providers**: OAuth-providers (Google, GitHub, etc.) gebruiken PKCE by default in auth.js v5. OK. Let op Custom Credentials-provider: je schrijft zelf de `authorize`-functie, alle credential-validatie is jouw verantwoordelijkheid. Verify password-hashing (argon2id via `argon2` package of bcrypt), en timing-safe comparison.
- **Callback-URL allowlist**: `pages.signIn` etc. expliciet. Geen dynamic redirect-URL vanuit `callbackUrl`-query-param zonder allowlist-check.
- **Session-cookie-flags**: auth.js zet `HttpOnly`, `Secure` (in prod), `SameSite=Lax` by default. Niet overriden tenzij noodzakelijk.

### 5. Image Optimization, file-uploads, overige SSRF-vectoren

- **`next/image` met externe bronnen**: `remotePatterns` in `next.config.js` is allowlist voor waar Next.js plaatjes mag fetchen. Wildcard-hostname is effectief een image-proxy-SSRF: iemand laadt `/_next/image?url=<internal-URL>` en gebruikt je server om internal endpoints te bereiken. Scope `remotePatterns` tot exact jouw CDN/bucket-domein.
  Canonical voorbeeld van deze klasse: `[verify tegen CVE-database en Next.js advisories — meerdere image-proxy-gerelateerde CVEs zijn verschenen]`.
- **File-uploads via Server Actions**: `FormData` met `File` — valideer server-side op content-type, grootte, magic-bytes. Client `File.type` is spoofbaar. Opslaan buiten `public/` om path-traversal te voorkomen.
- **Fetch in Server Components naar user-URLs**: klassieke SSRF (zie `api-security` fase 5). Private-IP-ranges blokkeren, DNS-rebinding-bescherming.
- **`next/headers` cookies/headers-access**: alleen in Server Components en Server Actions, niet in Client Components. Goed bewaakt by default.

### 6. Security-headers via middleware of next.config

Headers worden geconfigureerd in `next.config.js` `headers()` of in middleware.

```js
// next.config.mjs
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'nonce-<nonce>'; ..." },
];

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

- **CSP** met nonce is aanbevolen; Next.js documenteert het nonce-patroon via middleware. `'unsafe-inline'` en `'unsafe-eval'` vermijden waar kan — ze nullen de XSS-bescherming van CSP grotendeels.
- **HSTS** met `preload` alleen als je op de HSTS preload-list staat of wil. `max-age` minimaal 1 jaar voor preload-eligibility.
- Headers via middleware zijn dynamischer (per-route) maar zwaarder.

### 7. Misc en verification-loop

- **`dangerouslySetInnerHTML`** — React-equivalent van `|safe`. Alleen op gesanitized content, nooit direct op user-input. Gebruik `DOMPurify` of `sanitize-html` voor user-gegenereerde HTML.
- **`eval`, `new Function`, dynamic `import(userString)`** — RCE-vectoren, nooit op user-input.
- **`revalidatePath` / `revalidateTag`** vanuit Server Actions — als de path parameter uit user-input komt, kan iemand je cache manipuleren. Allowlist de paden.
- **`noindex` op niet-productie** via middleware of `robots.txt`, om staging niet per ongeluk in Google te krijgen.

Verification-loop: Laag 1 (next.config, middleware, layout/page auth-checks, Server Actions alle langs?), aannames ("auth.js werkt by default" alleen als je de actual config hebt gezien). Laag 2 (CVE-2025-29927 met fix-versies tegen nextjs.org-advisories, auth.js v5-API-namen kloppen, geen verzonnen Next.js-version-ranges in fix-claims).

## Output

```
Next.js security review — <app>
Next.js: <x.y.z> | Router: <App | Pages | mixed>
auth.js / NextAuth: <versie, provider-list>

Middleware:
  Bestaat:              <ja/nee>
  Auth via middleware:  <enige laag | onderdeel van defense-in-depth>
  Matchers:             <scope>
  CVE-2025-29927 patched: <ja/nee>
  Open redirects:       <lijst>

Server Actions (indien App Router):
  Aantal actions:       N
  Auth-check per action:<ja voor alle | gaps op ...>
  Input-validatie:      <zod/valibot/... | geen>
  Rate-limited:         <ja/nee>

Server/Client boundary:
  NEXT_PUBLIC_* exposure: <lijst, review>
  Secrets in Client props:<grep voor password/token/key>
  Hydration-leaks:        <zichtbaar in dev-tools?>

auth.js:
  AUTH_SECRET source:   <vault/env>
  Session-strategy:     <jwt | database>
  Providers:            <OAuth + PKCE | credentials + hashing-scheme>
  Callback-URL allowlist: <ja/nee>

next/image:
  remotePatterns scope: <specifiek | wildcard — FINDING>

Security-headers:
  HSTS:                 <aan + preload>
  CSP:                  <nonce/hash | unsafe-inline — FINDING>
  Frame-Options:        <DENY/SAMEORIGIN>

Versie-check:
  Laatste security-release: <datum>
  cve-triage handoff:       <N deps met vulns>

Findings (severity-gesorteerd, volg security-review-format)
Verification-loop: ...
```

## Referenties

- Next.js Security — [https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy) en bredere [https://nextjs.org/docs](https://nextjs.org/docs).
- Next.js Security Advisories — [https://github.com/vercel/next.js/security/advisories](https://github.com/vercel/next.js/security/advisories). Primaire CVE-bron.
- Server Actions docs — [https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).
- auth.js (NextAuth v5) — [https://authjs.dev/](https://authjs.dev/).
- React Security — [https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html) voor `dangerouslySetInnerHTML`.
- OWASP Top 10 2021 — [https://owasp.org/Top10/](https://owasp.org/Top10/).
- CSP Reference — [https://content-security-policy.com/](https://content-security-policy.com/). Handige CSP-builder plus uitleg per directive.
- MDN Headers (HSTS, X-Frame-Options, etc.) — [https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers). Primaire header-referentie.

## Categorieën

- appsec
