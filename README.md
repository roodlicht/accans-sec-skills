![accans-sec-skills banner](assets/banner.svg)

# accans-sec-skills

> **47 Claude skills, agents and commands across 5 security profiles** · NL/EU regulatory-anchored (NIS2, DORA, AVG, Cyberbeveiligingswet) · 443 cross-references · pattern-level discipline for offensive items · static-site builder + curl-pipeable installer.

A catalog of structured `SKILL.md` files that prime Claude with security tradecraft across the full SDLC: AppSec & DevSecOps, Pentest & Red Team, Blue Team & IR, GRC & Compliance, plus a Core layer of cross-cutting essentials. Drop a profile-bundle into `~/.claude/` (or build your own selection in the browser) and Claude routes to the right item when you ask.

Maintained by **[Accans](https://accans.com)** — security engineering with NL/EU regulatory grounding.

---

## What this is

Five profiles, 47 items, one consistent architecture. Each item is a structured markdown file (`SKILL.md`, agent definition, or slash-command) with a front-matter description that the Claude matcher reads and a body that primes Claude on methodology, scope discipline, output format, and primary-source references.

| Profile  | Items | Focus |
|----------|-------|-------|
| `core`    | 7  | Cross-cutting essentials: secure-coding, security-review, secrets-scanner, cve-triage, threat-modeler, security-gate, verification-loop. |
| `appsec`  | 19 | Core + DevSecOps and framework-specific guardrails: SAST/DAST, IaC, container, k8s, API, supply-chain, Django, Spring, Rails, Next.js, CI/CD. |
| `pentest` | 12 | Recon, exploit-chain, payload library, AD attack paths, web-exploit triage, C2 hygiene, phishing-sim, post-exploitation, reporter. |
| `blue`    | 11 | IR runbook, detection-engineer, log-triage (CloudTrail / Entra / Workspace / Okta), SIEM queries, IOC hunter, malware-triage, forensics-assist, alert-tuning, purple-ops, threat-hunt. |
| `grc`     | 10 | NIS2, DORA, ISO 27001, SOC 2, AVG/GDPR PIA, risk-register, policy-drafter, vendor-questionnaire, audit-evidence — EU/NL-anchored. |

`full` is everything (47).

## How it differs from a generic "all-in-one" security AI bundle

- **Profile-based selective install.** Install `--profile blue` if you run a SOC; install `--profile pentest` for engagement work; install `--profile grc` for compliance. Don't pollute the matcher with skills that are not in your domain.
- **NL/EU regulatory anchor.** GRC items reference primary EU regulation texts (EUR-Lex), Dutch implementing law (Cyberbeveiligingswet), and Dutch authorities (Autoriteit Persoonsgegevens, Rijksinspectie Digitale Infrastructuur, DNB, AFM). Not US-centric.
- **Cross-skill graph.** 443 handoff-references between items: `secure-coding` is the substrate for `security-review`; `cve-triage` flows from `security-review`'s scan phase; `verification-loop` red-teams every output before delivery; `purple-ops` bridges pentest and blue.
- **Discipline-first.** Every pentest skill stays at pattern-level (no version-specific weaponized exploits — see *Disclaimers*). Every GRC item carries a "no legal advice" disclaimer. Every CVE / CVSS / regulatory-article reference verifies against a primary source, with `[verify]` markers where the law is currently shifting.
- **Static-site builder.** Visit a hosted instance, pick a profile or curate your own selection, and copy a `curl | bash`-pipeable install command. No browser-side magic; the site is fully static and the installer runs locally.

## Quickstart

### Hosted install (recommended)

If you have access to a hosted instance, pick a profile and run:

```bash
# Replace example.com with the actual host
curl -sSL https://example.com/install.sh | bash -s -- --list-profiles
curl -sSL https://example.com/install.sh | bash -s -- --profile core --dry-run
curl -sSL https://example.com/install.sh | bash -s -- --profile core
curl -sSL https://example.com/install.sh | bash -s -- security-review threat-modeler ir-runbook
```

Requires `curl` and `jq` on the client. Default destination is `$HOME/.claude`; override with `--dest`.

### Local repo install

```bash
git clone https://github.com/roodlicht/accans-sec-skills
cd accans-sec-skills
./bin/sec-install --list-profiles
./bin/sec-install --profile core --dry-run
./bin/sec-install --profile core               # installs to ~/.claude
./bin/sec-install --profile full --dest .claude   # repo-scoped install for testing
```

## Working language

The catalog is moving to English to be globally accessible. State per profile:

- **Core (7 items): English** — fully translated.
- **AppSec, Pentest, Blue, GRC (40 items): translation in progress.** Bodies currently in Dutch; English versions land in subsequent releases. Front-matter descriptions are already English across the whole catalog, so the Claude matcher behaves the same way today regardless of body language.
- **Front-matter `description` fields**: English (always).
- **Public-facing positioning** (this README, examples, smoke-tests, contributor docs): English.
- **GRC items remain explicitly NL/EU-anchored** in their references and regulatory text. That is the catalog's positioning — preserved across the translation work. NIS2, DORA, AVG, Cyberbeveiligingswet, AP, RDI, DNB, AFM stay as primary sources. Only the wrapping prose becomes English.

If you'd like to contribute English translations, see [CONTRIBUTING.md](CONTRIBUTING.md). The roadmap is roughly: AppSec → Pentest → Blue → GRC.

## Disclaimers

The catalog is opinionated. These rules are themselves a security mechanism; they apply to every item.

- **No legal advice.** GRC items (`nis2`, `dora`, `gdpr-pia`, `iso27001`, `soc2`, `policy-drafter`) summarize frameworks and reference primary sources. They do not constitute legal advice. Final entity classification, sanction-risk exposure, and contractual interpretation require a qualified jurist or DPO.
- **Authorized engagements only.** Pentest items (`recon-agent`, `exploit-chain`, `payload-crafter`, `ad-attacks`, `web-exploit-triage`, `c2-hygiene`, `phishing-sim`, `post-exploit`, `pentest-reporter`) assume a signed Rules of Engagement (RoE). Without RoE, the activities they describe are not legitimate. Every pentest item carries an explicit RoE-only disclaimer at the top.
- **Pattern-level only.** No version-specific weaponized exploits. No ready-to-fire gadget chains for named CVEs. No vendor-specific bypass-recipes for production EDRs. The catalog gives you the class of attack and the canonical pattern; engagement-specific weaponization belongs in your client's engagement-vault, not in a public catalog.
- **No CVE / CVSS / regulatory-number bluffing.** Every specific reference must verify against a primary source (NVD, EUR-Lex, vendor advisory). Where the source is currently shifting (e.g. Dutch Cyberbeveiligingswet status), items use `[verify]` markers rather than asserting.
- **Audit-grade, not forensics-grade.** `forensics-assist` produces output suitable for incident-response and audit consumption. Court-grade chain-of-custody for criminal investigations requires specialized forensics teams.
- **No copyright violation.** OWASP cheat sheets, vendor docs, and similar are summarized and linked, not transcribed.
- **No tools.** This catalog does not ship scanners, exploits, or runtime services. It is prose that primes Claude with structured tradecraft.

These disclaimers are mirrored — in their full form, in the source language of the relevant skill — within each item that touches the corresponding boundary.

## Examples

Four end-to-end walkthroughs that chain multiple items in realistic scenarios:

- [`examples/01-pre-merge-security-gate.md`](examples/01-pre-merge-security-gate.md) — `/security-gate` → `secrets-scanner` + `sast-orchestrator` + `cve-triage` → `verification-loop`. Pre-merge orchestration.
- [`examples/02-nis2-readiness-audit.md`](examples/02-nis2-readiness-audit.md) — `nis2` → `iso27001` mapping → `risk-register` → `policy-drafter` → `vendor-questionnaire` → `audit-evidence`. NL/EU-anchored compliance walkthrough.
- [`examples/03-authorized-red-team-engagement.md`](examples/03-authorized-red-team-engagement.md) — `recon-agent` → `web-exploit-triage` → `payload-crafter` → `exploit-chain` → `post-exploit` (with `c2-hygiene`) → `pentest-reporter` → `purple-ops`. Pattern-level discipline across an entire engagement.
- [`examples/04-ransomware-incident-response.md`](examples/04-ransomware-incident-response.md) — `ir-runbook` → `forensics-assist` → `malware-triage` → `ioc-hunter` → `detection-engineer` → `purple-ops` (with regulatory chains to `nis2` / `gdpr-pia` / `dora`). Multi-regulator incident-response.

## Smoke tests

[`tests/smoke-test-prompts.md`](tests/smoke-test-prompts.md) lists 47 prompts — one per catalog item — for manually exercising the matcher in a Claude environment. Useful when validating a fresh install, after substantive edits, or when investigating regressions.

We do not currently publish a pass-rate. The matcher is downstream of the skills system itself and pass-rates depend on Claude's version. The point of the list is to keep regressions visible, not to advertise a number.

## Project layout

```
catalog.json                  Single source of truth — ids, names, categories, profile membership
manifest.json                 Generated: catalog merged with on-disk frontmatter (build output)
skills/<id>/SKILL.md          One folder per skill, with frontmatter + markdown body (Dutch)
agents/<id>.md                One file per agent (sub-agent definition)
commands/<id>.md              One file per slash command
scripts/scaffold.mjs          Creates files for new catalog entries (idempotent)
scripts/build-manifest.mjs    Scans disk → writes manifest.json → injects into web/index.html
scripts/validate.mjs          Validates catalog ↔ disk + frontmatter + cross-reference graph
scripts/package.mjs           Builds dist/ for static-site deploy
.github/workflows/ci.yml      Build + validate + drift-check on push/PR
.github/workflows/deploy.yml  rsync dist/ to a Plesk host on push to main
bin/sec-install               Installer CLI for local-repo use (Node, no deps)
install.sh                    Curl-pipeable installer (POSIX bash + curl + jq) for hosted deploy
web/index.html                Builder UI
examples/                     End-to-end walkthroughs
tests/                        Smoke-test prompts
docs/CLAUDE.md (root)         Working-language editing conventions (Dutch — for contributors)
```

## Hosting

```bash
# Build a deploy-ready dist/ (index.html + manifest.json + install.sh + skills/ + agents/ + commands/)
npm run package

# Upload to your static host
rsync -av --delete dist/ user@host:/var/www/example.com/
```

When the site is served over http(s), the builder auto-detects `location.origin` and renders curl-install commands using the live host. The `install.sh` default base URL can be overridden via `--base-url` or `SEC_INSTALL_BASE_URL` env-var.

## Adding a new item

1. Add a row to `catalog.json` with `id`, `name`, `type` (`skill` / `agent` / `command`), `cat` (one or more of `core`, `appsec`, `pentest`, `blue`, `grc`), `profiles`, and a short English `desc`.
2. Run `npm run scaffold` — a stub appears under the right directory.
3. Fill in the body following the conventions in [CLAUDE.md](CLAUDE.md). The contributor doc is in Dutch (matching the working-language policy); structure and discipline rules carry through any language.
4. Run `npm run check` — builds the manifest, validates catalog/disk consistency, and reports the cross-reference graph.
5. Add a corresponding entry in `tests/smoke-test-prompts.md`.

## Status

47 items committed and tagged `v0.1.0`. CI runs build + validate + drift-check on every push and PR. Validation passes with 0 errors and 0 warnings as of the v0.1.0 tag.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Particularly welcome:

- Translation of `core` + `appsec` skill bodies to English.
- Realistic end-to-end walkthroughs in `examples/`.
- Fixes to outdated CVE / framework references.
- Improvements to the build / validate / packaging pipeline.

## Code of Conduct

By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security policy

Reporting tradecraft errors, installer issues, or accidental credential exposure: see [SECURITY.md](SECURITY.md).

## License

Dual-licensed:

- **Catalog content** (skills, agents, commands, examples, tests, docs, assets, JSON manifests) — [CC BY-SA 4.0](LICENSE-CC-BY-SA-4.0). Use, modify, redistribute, translate; derivatives must remain CC BY-SA 4.0 with attribution to Accans.
- **Code** (installer, build/validate/package scripts, web builder, workflows) — [Apache 2.0](LICENSE-Apache-2.0). Permissive with explicit copyright retention and patent grant.

See [LICENSE](LICENSE) for the combiner and [LICENSING.md](LICENSING.md) for per-file license assignment, contributor terms, and commercial-use guidance.

`Accans` and the Accans dot mark are not part of the license grant.

---

*Built with care for the NL/EU security community. If your work depends on a specific item being correct, please verify its primary sources before relying on it — the discipline rules in this catalog (verify CVE-IDs, primary regulatory sources, pattern-level offensive items, no legal advice in GRC) are exactly that: discipline rules. They are not infallibility guarantees.*
