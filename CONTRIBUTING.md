# Contributing

Thanks for considering a contribution. This catalog grows by careful, specific additions — not by bulk imports.

## What kinds of contributions fit

- **Fixes to existing items**: outdated CVE references, framework-version drift, regulatory updates (NIS2/DORA/AVG amendments, AP guidance changes), broken links, stub-marker residue.
- **New items inside an existing profile** that fill a real gap. Open an issue first to discuss scope and avoid duplication; not every "add tool X" makes sense as a separate skill.
- **Translation of skill bodies to English** — see *Working language* below for the current policy.
- **Improvements to the build / validate / packaging pipeline.** Quality-of-life items welcome.
- **Examples and walkthroughs** in `examples/`. Realistic end-to-end engagement scenarios that chain multiple items together are particularly valuable.

## What does not fit

- New offensive tradecraft that is **not at pattern-level**. Version-specific weaponized exploits, ready-to-run gadget-chains for named CVEs, kant-en-klare bypass-recepten — these belong in an engagement-vault, not in a public skills catalog. See `CLAUDE.md` *Don'ts* for the exact rule.
- Items that **bluff on CVE-IDs, CVSS scores, or legal article numbers**. Every specific reference must verify against a primary source. When uncertain, use a `[verify: ...]` marker rather than asserting.
- Items that **reuse copyrighted material verbatim** (OWASP cheat sheets, vendor docs). Summarize and link to the primary source.
- **Generic "best practices" bullet lists** without sources or rationale. Concrete > abstract is the house style.
- **GRC items presented as legal advice.** Every item touching law (NIS2, DORA, AVG, sector-specific regs) carries an explicit "no legal advice" disclaimer and references primary sources.

## Working language

The catalog is moving to English. Current state:

- **Core (7 items): English** — fully translated.
- **AppSec, Pentest, Blue, GRC (40 items): in transition**. Bodies are still in Dutch and being translated in profile-batches. Front-matter `description` fields are English everywhere, so the matcher behaves consistently.
- **All public-facing positioning is in English**: README, examples, smoke tests, this file, CLAUDE.md.
- **GRC items remain explicitly NL/EU-anchored** in their references and regulatory text — only the wrapping prose becomes English. NIS2 / DORA / AVG / Cyberbeveiligingswet / AP / RDI / DNB / AFM stay as primary sources.

If you submit a translation of a Dutch skill body, retain the structure (use the English equivalents: When to use / Approach / Output / References / Categories) and translate the entire body consistently — partial translations are harder to maintain than full ones.

The translation roadmap (rough order): AppSec → Pentest → Blue → GRC. PRs that translate one full skill at a time are easiest to review.

## Process

1. **Open an issue first** for non-trivial changes. A short proposal saves rewrites later.
2. **Branch off `main`**, prefix the branch name with the affected area: `fix/`, `feat/`, `docs/`, `infra/`, `i18n/`.
3. **Stick to the conventions in `CLAUDE.md`**. It documents structure, length guidelines, em-dash discipline (yes, really), reference policy, and the verification-loop discipline.
4. **Run `npm run check`** before submitting. The CI will run it again, but local feedback is faster.
5. **Open a pull request** with a clear title and a body that links the originating issue. Cite the primary source for any new claim.
6. Expect review focused on: scope-creep, source quality, discipline-compliance, and whether the item fits the catalog's architecture (handoffs to neighbouring skills).

## Adding a new catalog item

1. Add a row to `catalog.json` with `id`, `name`, `type` (`skill` / `agent` / `command`), `cat` (one or more of `core`, `appsec`, `pentest`, `blue`, `grc`), `profiles`, and a short English `desc`.
2. Run `npm run scaffold` — a stub appears under the right directory.
3. Fill in the body (Dutch). Iterate on the English `description` until it triggers reliably.
4. Run `npm run check` (build + validate). The validator confirms catalog ↔ disk consistency, frontmatter integrity, no stub markers, and adds your item to the cross-reference graph.
5. Add a smoke-test prompt in `tests/smoke-test-prompts.md` that exercises the new item.
6. If the new item is a notable workflow, add an end-to-end walkthrough in `examples/`.
7. Open the PR.

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). The short version: be useful, be specific, criticize ideas not people, and assume the maintainer is trying to keep this catalog small and sharp on purpose.

## Licensing

Contributions are licensed under the same MIT license as the project (see `LICENSE`). By submitting a PR you confirm that you have the right to contribute the code or text under those terms.
