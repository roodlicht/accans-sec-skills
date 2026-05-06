# Security Policy

## Reporting a vulnerability

This catalog primarily contains **prose** that primes Claude with security tradecraft — not running services or production code. The realistic vulnerability surface is therefore narrow but not zero. We take reports on three classes of issue:

1. **Tradecraft errors** — incorrect, outdated, or misleading guidance that could lead a reader to do something unsafe. Examples: a CVE reference that doesn't exist, a payload-pattern that's exploit-ready against current production, a regulatory claim that contradicts the source text.
2. **Installer / build issues** — a flaw in `install.sh`, `bin/sec-install`, the build/validate scripts, or the CI workflow that could compromise a user's environment (path traversal on file-write, credential leak in CI logs, drift-check bypass that ships a tampered manifest).
3. **Embedded secrets or credentials** — anything in the repo or in `dist/` artifacts that should not be there.

### How to report

- For **non-critical issues** (tradecraft errors, doc fixes, scope-discipline gaps): open a public issue on GitHub.
- For **anything that touches the installer, the build, or potential credential exposure**: email the maintainer privately first — Ric van Westhreenen, [ric@accans.com](mailto:ric@accans.com). Please do not file a public issue for these classes until coordinated disclosure has happened.

We aim to respond within **5 working days**. The catalog is maintained on a small-team basis; please be patient, and please be specific (file path, line number, what's wrong, why).

### What we won't treat as a vulnerability

- Differences of opinion about methodology, severity calibration, or framework choice. Open an issue or PR with rationale.
- Skill-bodies being in Dutch. That is by design — see the README *Working language* section.
- "Information about offensive techniques exists in this repo." All offensive tradecraft in this repo is at pattern-level (no version-specific weaponized exploits) and is intended for authorized engagements only. See the README *Disclaimers* section.
- Outdated `[verify]`-marked claims. These are explicit invitations to re-verify before relying on a specific number.

## Discipline reminders, mirrored from CLAUDE.md

The repo has hard rules that are themselves a security mechanism. Reports that ask us to relax these will be declined:

- **No version-specific weaponized exploits.** Offensive items stay at pattern-level.
- **No CVE / CVSS / regulatory-article-number bluffing.** Every specific reference must verify against a primary source (NVD, EUR-Lex, vendor advisory).
- **No legal advice in GRC items.** Frameworks are summarized; legal interpretation belongs to a qualified jurist.
- **No copyright-violating reuse.** OWASP cheat sheets, vendor docs, and similar are summarized and referenced, not transcribed.

Reports that catch us violating these rules in any specific item are welcome and will be acted on.
