# CLAUDE.md — Working instructions for Claude Code

Context for Claude when working in this repository. Read this fully before making changes.

## Where you are

This is `accans-sec-skills` — a catalog of security skills, agents, and commands for Claude Code / Cowork, plus a web builder and an installer CLI. The single source of truth is `catalog.json`. The catalog is fully filled in (47 items across `core` / `appsec` / `pentest` / `blue` / `grc`). Work in this repo typically involves maintenance, refresh, or adding new items.

## Primary tasks

Three kinds of work occur:

- **Maintaining existing items**: refresh on new CVEs, framework version bumps, regulatory changes (NIS2/DORA RTS updates, Cyberbeveiligingswet status, AVG amendments). Keep `[verify]` markers current.
- **Adding new items**: a new category or practical question that does not fit an existing skill. Follow the scaffold flow (see Workflow below).
- **Re-categorisation or profile changes**: edit only `catalog.json`, then run `npm run check`.

When in doubt: `npm run validate` shows catalog ↔ disk consistency and the cross-reference graph.

## Conventions

### Language

- **All catalog content (skill bodies, agent definitions, command bodies)**: English. The catalog has been positioned as accessible to a global audience; bodies, headings, and prose are all in English.
- **Front-matter `description` fields**: English, active voice, 1–2 sentences, trigger words prominent. This is what Claude's skill-matcher reads — invest here.
- **Technical terms**: keep canonical English forms (SAST, DAST, SBOM, SSTI, OWASP Top 10). Don't translate.
- **Compliance context**: NL/EU regulations (NIS2, AVG, Cyberbeveiligingswet, Autoriteit Persoonsgegevens) take precedence over US equivalents. The references stay NL/EU even when the surrounding text is in English.

### Style

- Concrete over abstract. Examples, commands, CVE numbers.
- No marketing language. No "robust", "comprehensive", "advanced" without substantiation.
- Lists are fine, but every bullet should be at least one sentence with content. No word-lists.
- Reference links always to primary source (OWASP, NIST, MITRE, vendor docs) — not blog summaries.

### Per-skill structure

Each `SKILL.md` follows the scaffold template (When to use → Approach → Output → References → Categories). Fill them all. The **Approach** section is the heart: numbered phases that Claude can follow when the skill triggers.

Length guidance:

- Skills: 150–400 lines of markdown is normal. Shorter is fine if scope is small; longer needs justification.
- Agents: system prompt + scope + approach + output. 80–200 lines.
- Commands: shorter — what does it do, what are the steps, what arguments. 40–120 lines.

## Workflow

### Editing an existing item

```bash
# Edit content in skills/<id>/SKILL.md (or agents/<id>.md / commands/<id>.md)
# Optionally add helper files: skills/<id>/references/, skills/<id>/templates/
npm run check          # build + validate combined
open web/index.html    # visual check — is the description readable? scope clear?
```

### Adding a new item

```bash
# 1. Entry in catalog.json (id, name, type, cat, profiles, desc)
# 2. Scaffold a stub
npm run scaffold
# 3. Write the body
# 4. Build + validate
npm run check
```

### Commit cadence

One commit per finished skill, not per file save. Commit message:

```
skills/<id>: <short reason for the work>

<optional: which sources, which choices, what's deliberately not in the skill>
```

Example:

```
skills/iac-security: cover Terraform/CFN/Ansible/Pulumi

OWASP IaC Top 10 as the spine. Checkov + tfsec for Terraform,
cfn-lint + cfn-nag for CloudFormation. Pulumi section is lighter
because the toolchain surface is smaller.
```

## Do's

- Read the OWASP / NIST / MITRE source you cite before you write. No second-hand summaries.
- Check whether a related skill already exists (e.g. `security-review` overlaps with `secure-coding`). Avoid duplication.
- For framework-specific skills (Django, Spring, Rails, Next.js): cite at least one CVE or a known misconfig from the past three years.
- For GRC skills (ISO27001, NIS2, DORA, AVG): reference the official text, not a consultancy blog.
- If you're unsure about scope, write the question first as a comment `<!-- scope question: ... -->` and ask before continuing.

## Don'ts

- **No bluffing on CVE numbers, CVSS scores, or exploit details.** Non-existent CVEs are worse than useless. When in doubt: leave it out or insert a `[verify]` marker.
- **No offensive payloads that are directly exploitable against specific software versions** without sandbox context. Pattern-level payload libraries yes; ready-to-fire 0-days against production targets no.
- **No "in practice we see..." without a source.** Anecdote without reference = strike it.
- **Don't bloat the `description` front-matter.** If the description is longer than 2 sentences it's too long — the matcher should parse it quickly.
- **Don't drift outside scope.** `django-security` is about Django; general Python security belongs in `secure-coding`.

## Special skills

A few items deserve extra attention:

- **`verification-loop`** — the meta-skill that has Claude review its own output. Appears in every profile. Hybrid structure: a universal self-review pass (Layer 1 — scope, assumptions, gaps, adversarial reader, failure modes, consistency) plus a security-red-flag section (Layer 2 — CVE/CVSS verification, payload level, unsubstantiated practice claims, source quality). Layer 2 must be removable as a self-contained block without breaking Layer 1, so the skill is reusable in non-security contexts outside this repo.
- **`threat-modeler`** (agent) — must be a self-contained sub-agent. The system prompt should be tightly scoped to STRIDE / attack trees / mitigation ranking, otherwise it becomes a generic security agent.
- **`security-gate`** (command) — the pre-merge blocker. Must be runnable as `/security-gate` in Claude Code; the argument-hint in front-matter should match.
- **`gdpr-pia` / `nis2` / `dora`** — legally sensitive. Disclaim explicitly that this is not legal advice and refer to official NL/EU sources.

## Categories and profiles

Don't touch unless deliberate. `cat` is for the UI tab filter, `profiles` is for the install presets. Adding an item to a profile means `./bin/sec-install --profile <name>` will pick it up automatically — be selective with `core` and `full`.

If you re-categorize an existing item, update **only** `catalog.json` and run `npm run build`. The manifest scanner will pick up the change automatically.

## When you finish a new item

1. No `_Status: stub_` line should be left (validate will catch it otherwise).
2. The `description` front-matter is sharp: trigger words prominent, 1–2 sentences, English.
3. `npm run check` (build + validate). No errors, ideally no warnings.
4. Open `web/index.html`, find your item in the grid, read the card description — does it make sense?
5. Commit using the convention above.

## Useful commands

```bash
npm run scaffold        # create only missing files (idempotent)
npm run build           # manifest + HTML injection
npm run validate        # catalog ↔ disk + frontmatter + reference graph
npm run check           # build + validate combined
npm run package         # builds dist/ for static-site deploy
npm run list            # all items via the CLI
npm run profiles        # all profiles + counts

./bin/sec-install --profile core --dry-run              # see what would install
./bin/sec-install --profile full --dest .claude         # repo-scoped install for testing
./bin/sec-install <id> [<id>...] --dest /tmp/fake       # test a few items in isolation

# Curl-pipeable variant (for hosted deploy, same flags as bin/sec-install):
bash install.sh --base-url http://localhost:8765 --profile core --dry-run
```

## Explicitly not the task

- This is not a security tool wrapper — we don't build scanners, we write knowledge for a language model.
- We don't reuse copyrighted material verbatim (OWASP cheat sheets, vendor docs). Summarize and link.
- We don't build audit trails or tenant isolation here. Those belong in a product, not a skills catalog.

Questions or scope doubts → mark with `<!-- question: ... -->` in the stub and ask before continuing.
