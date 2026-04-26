# Accans Sec Skills

Security-focused skills, agents and commands for Claude Code and Cowork — with a selective install builder.

The repo holds three things:

- **Catalog** of security items (skills / agents / commands) across four domains: AppSec & DevSecOps, Pentest & Red team, Blue team & IR, GRC & Compliance.
- **Web builder** (`web/index.html`) — pick items, apply a profile preset, copy a one-line install command. Accans-branded, no external JS deps.
- **CLI** (`bin/sec-install`) — copies selected items into your `~/.claude` directory (or any other scope).

## Quickstart

```bash
# Build manifest + inject into web/index.html (idempotent)
npm run build

# Validate catalog ↔ disk consistency + reference graph
npm run validate

# Open the builder
open web/index.html     # macOS
xdg-open web/index.html # Linux

# Or install directly from the CLI
./bin/sec-install --list-profiles
./bin/sec-install --profile core --dry-run
./bin/sec-install --profile core              # installs to ~/.claude
./bin/sec-install security-review threat-modeler ir-runbook
./bin/sec-install --profile full --dest .claude   # repo-scoped install
```

## Hosting (optional)

The catalog can be deployed as a static site so visitors can browse and install via `curl | bash`:

```bash
# Build a deploy-ready dist/ directory (index.html + manifest.json + install.sh + catalog files)
npm run package

# Upload dist/ to your static host's docroot
rsync -av --delete dist/ user@host:/var/www/security.example.com/
```

When served over http(s) the page detects this and renders a curl-install command with the live origin baked in:

```bash
curl -sSL https://security.example.com/install.sh | bash -s -- --profile core
curl -sSL https://security.example.com/install.sh | bash -s -- --list-profiles
```

`install.sh` requires `curl` and `jq` on the client. Override the source via `--base-url <url>` or `SEC_INSTALL_BASE_URL` env-var if hosting under a different domain than the script's default.

## Project layout

```
catalog.json              Single source of truth — ids, names, categories, profile membership
manifest.json             Generated: catalog merged with on-disk frontmatter (build output)
skills/<id>/SKILL.md      One folder per skill, with frontmatter + markdown body
agents/<id>.md            One file per agent (sub-agent definition)
commands/<id>.md          One file per slash command
scripts/scaffold.mjs      Creates files for new catalog entries (idempotent)
scripts/build-manifest.mjs  Scans disk → writes manifest.json → injects into web/index.html
scripts/validate.mjs      Validates catalog ↔ disk + frontmatter + cross-reference graph
scripts/package.mjs       Builds dist/ for static-site deploy (web + manifest + catalog + installer)
.github/workflows/ci.yml  Build + validate + drift-check on push/PR
bin/sec-install           Installer CLI (Node, no deps) — local repo
install.sh                Curl-pipeable installer (POSIX bash + curl + jq) — for hosted deploy
web/index.html            Builder UI
```

## Adding a new item

1. Add a row to `catalog.json` with `id`, `name`, `type` (`skill` / `agent` / `command`), `cat` (one or more of `core`, `appsec`, `pentest`, `blue`, `grc`), `profiles` (which presets include this item), and a short `desc`.
2. Run `npm run scaffold` — a stub appears under the right directory.
3. Fill in the stub following the conventions in `CLAUDE.md`. Iterate on the `description` frontmatter until triggering is sharp.
4. Run `npm run check` — builds the manifest, validates catalog/disk consistency, and reports the cross-reference graph.

## Profiles

Profiles are opinionated bundles — they don't add capability, they just select a coherent subset. Each item carries an explicit `profiles: [...]` array so membership is data, not a match function. Presets today:

- **core** — cross-cutting essentials (7)
- **appsec** — core + DevSecOps and framework-specific guardrails (19)
- **pentest** — offensive + red team (12)
- **blue** — SOC, detection engineering, incident response (11)
- **grc** — EU/NL-oriented compliance, policy, audit (10)
- **full** — everything (47)

## Status

All 47 items are filled in across the five profiles (`core` 7, `appsec` 12, `pentest` 9, `blue` 10, `grc` 9). Each item carries its own RoE/scope discipline where relevant — pentest skills stay at pattern-level (no version-specific weaponized exploits), GRC skills carry "no legal advice" disclaimers and reference primary EU/NL sources, and `verification-loop` is hybrid (universal self-review plus a removable security-red-flag layer). See `CLAUDE.md` for editing conventions and `scripts/validate.mjs` for the consistency checks.

## License

MIT. See the root of the repo.
