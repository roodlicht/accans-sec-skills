# Licensing

This repository uses two complementary licenses, applied per file class. The split exists because the project is roughly 95% knowledge content and 5% code, and these need different licenses to be effective.

## Why a dual license

A single permissive license (MIT, Apache 2.0) is fine for code but provides almost no protection for prose content against trivial repackaging or scraping into AI training datasets. A single content license (CC BY-SA 4.0) is appropriate for the catalog text but doesn't cover what code licenses normally cover (patent grants, contributor obligations).

Splitting the licenses lets each part of the repository be governed by the right legal instrument:

- **Content** (the security tradecraft itself, the bulk of the value) is under **CC BY-SA 4.0**. This means: anyone can read, modify, translate, redistribute. But every derivative — including translations to other languages, ports to other AI assistant systems, or incorporation into a downstream product — must remain CC BY-SA 4.0 and credit Accans. Closed-source repackaging of the catalog is not legally available. The ShareAlike copyleft is enforceable in the EU under the InfoSoc Directive (2001/29) and the DSM Directive (2019/790).
- **Code** (the build, install, and packaging tooling) is under **Apache 2.0**. Permissive, with explicit copyright retention and a patent grant. Suitable for the small amount of executable scripting in the repo and for any future code-bearing files.

## Which license applies to which file

| Path / file class                                  | License          |
|----------------------------------------------------|------------------|
| `skills/<id>/SKILL.md`                             | CC BY-SA 4.0     |
| `skills/<id>/references/`, `skills/<id>/templates/`| CC BY-SA 4.0     |
| `agents/<id>.md`                                   | CC BY-SA 4.0     |
| `commands/<id>.md`                                 | CC BY-SA 4.0     |
| `examples/*.md`                                    | CC BY-SA 4.0     |
| `tests/*.md`                                       | CC BY-SA 4.0     |
| `assets/*` (banner, future graphics)               | CC BY-SA 4.0     |
| `README.md`, `CONTRIBUTING.md`, `SECURITY.md`,     |                  |
| `CODE_OF_CONDUCT.md`, `CLAUDE.md`, `LICENSING.md`, |                  |
| this file                                          | CC BY-SA 4.0     |
| `catalog.json`, `manifest.json`                    | CC BY-SA 4.0     |
| `bin/sec-install`                                  | Apache 2.0       |
| `scripts/*.mjs`                                    | Apache 2.0       |
| `install.sh`                                       | Apache 2.0       |
| `web/index.html` (HTML/CSS/JS)                     | Apache 2.0       |
| `.github/workflows/*.yml`                          | Apache 2.0       |
| `package.json`, `.gitignore`, `.gitattributes`     | Apache 2.0       |
| `LICENSE-Apache-2.0`, `LICENSE-CC-BY-SA-4.0`       | their own terms  |

The intent: text and structured data → CC BY-SA 4.0. Anything machine-executable → Apache 2.0.

## What this means for downstream users

### If you're a security practitioner using the catalog

Install it, run the skills, customize them locally for your context. No restrictions. No attribution required for private use.

### If you're forking the catalog publicly

You may. Two requirements:

1. Your fork must remain under CC BY-SA 4.0 for content and Apache 2.0 for code.
2. You must credit Accans somewhere visible in the README and link back to this repository.

### If you're translating the content

Translations are derivative works. They must be released under CC BY-SA 4.0. We welcome translation contributions back to this repo (see `CONTRIBUTING.md`).

### If you're building a commercial product around the catalog

You may, with constraints. The **Apache 2.0**-licensed code can be incorporated into a closed-source product (with attribution). The **CC BY-SA 4.0**-licensed content cannot — any product that distributes or makes the content available must do so under CC BY-SA 4.0.

In practice: SaaS and commercial assistants that bundle the catalog text in their distribution must publish that text under CC BY-SA 4.0. Hosting the catalog on a private network without redistribution is not affected.

### If you're an AI training operation

Training a model on CC BY-SA 4.0 content places the resulting model in a contested legal area. Accans takes the position that derivative outputs of such training are subject to the ShareAlike obligation and must be made available under CC BY-SA 4.0. Test cases in EU courts are emerging; the maintainers reserve the right to participate in or initiate enforcement actions where appropriate.

If you need a commercial license that exempts your operation from the ShareAlike obligation, contact Ric van Westhreenen at [ric@accans.com](mailto:ric@accans.com).

## Contributor licensing

By submitting a pull request to this repository, you agree:

1. Your contribution to **content files** is licensed under CC BY-SA 4.0.
2. Your contribution to **code files** is licensed under Apache 2.0.
3. You have the right to make these contributions under those licenses (you are the author or have appropriate rights).

We use Developer Certificate of Origin (DCO) as the attestation mechanism. Sign your commits with `git commit -s` to add the `Signed-off-by:` trailer. The full DCO text is at https://developercertificate.org/. See `CONTRIBUTING.md` for details.

## Trademarks

"Accans" and the Accans dot mark are not part of either license grant. The licenses do not give you permission to use the Accans name or mark in your fork, derivative work, or commercial product without separate permission.

This is the standard position under both Apache 2.0 §6 and the CC BY-SA 4.0 trademark exclusion. It allows the copyleft to operate on the work itself without giving away brand rights.

## Questions

License questions — particularly commercial licensing for AI training, SaaS bundling, or other use cases that exceed the standard grants — go to Ric van Westhreenen at [ric@accans.com](mailto:ric@accans.com).
