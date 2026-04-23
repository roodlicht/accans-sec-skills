# Accans Sec Skills

Security-focused skills, agents and commands for Claude Code and Cowork — with a selective install builder.

The repo holds three things:

- **Catalog** of security items (skills / agents / commands) across four domains: AppSec & DevSecOps, Pentest & Red team, Blue team & IR, GRC & Compliance.
- **Web builder** (`web/index.html`) — pick items, apply a profile preset, copy a one-line install command. Accans-branded, no external JS deps.
- **CLI** (`bin/sec-install`) — copies selected items into your `~/.claude` directory (or any other scope).

## Quickstart

```bash
# 1. Generate stub files for every catalog entry (idempotent)
node scripts/scaffold.mjs

# 2. Build the manifest and inject the catalog into web/index.html
node scripts/build-manifest.mjs

# 3. Open the builder
open web/index.html     # macOS
xdg-open web/index.html # Linux

# 4. Or install directly from the CLI
./bin/sec-install --list-profiles
./bin/sec-install --profile core --dry-run
./bin/sec-install --profile core              # installs to ~/.claude
./bin/sec-install security-review threat-modeler ir-runbook
./bin/sec-install --profile full --dest .claude   # repo-scoped install
```

## Project layout

```
catalog.json              Single source of truth — ids, names, categories, profile membership
manifest.json             Generated: catalog merged with on-disk frontmatter (scaffold output)
skills/<id>/SKILL.md      One folder per skill, with frontmatter + markdown body
agents/<id>.md            One file per agent (sub-agent definition)
commands/<id>.md          One file per slash command
scripts/scaffold.mjs      Creates missing stub files from catalog.json
scripts/build-manifest.mjs  Scans disk → writes manifest.json → injects into web/index.html
bin/sec-install           Installer CLI (Node, no deps)
web/index.html            Builder UI
```

## Adding a new item

1. Add a row to `catalog.json` with `id`, `name`, `type` (`skill` / `agent` / `command`), `cat` (one or more of `core`, `appsec`, `pentest`, `blue`, `grc`), `profiles` (which presets include this item), and a short `desc`.
2. Run `node scripts/scaffold.mjs` — a stub will appear under the right directory.
3. Fill in the stub. Iterate on its `description` frontmatter until triggering is sharp.
4. Run `node scripts/build-manifest.mjs` — the web builder picks up your changes automatically.

## Profiles

Profiles are opinionated bundles — they don't add capability, they just select a coherent subset. Each item carries an explicit `profiles: [...]` array so membership is data, not a match function. Presets today:

- **core** — cross-cutting essentials (7)
- **appsec** — core + DevSecOps and framework-specific guardrails (19)
- **pentest** — offensive + red team (12)
- **blue** — SOC, detection engineering, incident response (11)
- **grc** — EU/NL-oriented compliance, policy, audit (10)
- **full** — everything (47)

## Status

Catalog is complete; the 47 items are stubs. Status inside each stub is `stub — inhoud nog uit te werken`. The plan is to fill them out in Claude Code, one at a time, with the skill-creator flow.

## License

MIT. See the root of the repo.
