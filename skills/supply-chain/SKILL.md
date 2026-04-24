---
name: supply-chain
description: Software supply-chain defense — SBOM generation (CycloneDX/SPDX), SLSA build provenance, artifact signing with sigstore/cosign, dependency-confusion and typosquat defense, and consumer-side verification of what you pull in.
---

# Supply Chain Defense

## Wanneer gebruiken

Deze skill dekt de producer- én consumer-kant van software supply-chain: wat je bouwt, hoe je bewijst dát je het bouwde, hoe je tekent, en hoe je wat je consumeert verifieert. Hij vult `cve-triage` aan (triage van wat er in je SBOM zit) en wordt door `cicd-hardening` aangeroepen voor de build-provenance-kant.

Activeert bij:

- Een vraag als "genereer een SBOM", "zet SLSA op", "hoe teken ik onze artefacten", "zijn we vatbaar voor dependency confusion", "cosign verify".
- Een compliance-vraag uit `iso27001`, `nis2`, `dora` of `soc2` over provenance of SBOM-aanlevering.
- Een build-pipeline die artefacten publiceert (npm-package, PyPI-wheel, Docker image, Helm chart, GitHub release-binary) en provenance mist.
- Een incident waar een compromised dependency of typosquat is gevonden (XZ-achtig, event-stream-achtig).
- Een overheids-customer die SSDF-attestation of SBOM-delivery eist (US Executive Order 14028, EU Cyber Resilience Act).

### Wanneer NIET (handoff)

- Per-CVE triage uit de SBOM → `cve-triage`. Deze skill maakt de SBOM, die andere weegt hem.
- Secrets in artefacten of in build-output → `secrets-scanner`.
- CI-pipeline-veiligheid zelf (pinned actions, OIDC, runner-isolatie) → `cicd-hardening`. Overlap op SLSA-provenance is daar bewust verwezen.
- Container base-image-hardening → `container-hardening`. Image-signing komt hier (sigstore/cosign), image-inhoud daar.
- Code-pattern-vragen over dep-hygiene (pinning, lockfiles) → `secure-coding` fase 6.

## Aanpak

Zes fases. Fase 1 en 2 zijn producer-kant (wat je maakt en declareert), fase 3 is de signing-laag, fase 4 en 5 zijn consumer-kant (wat je binnenhaalt), fase 6 is verificatie.

### 1. SBOM generatie

Een Software Bill of Materials is de ingrediëntenlijst van je artefact. Twee gangbare formats, beide machine-leesbaar:

- **CycloneDX** (OWASP project, JSON/XML/protobuf). Sterkere security-focus, native VEX-integratie, pURL-based identificatie. Default-keuze voor security-use-cases.
- **SPDX** (Linux Foundation, tagValue/JSON/YAML/RDF). Sterker in licentie-tracking, bredere adoption in enterprise-compliance. Default-keuze als licentie-compliance ook doel is.

Generatie-tools:

- **syft** (Anchore, Apache-2). Scant filesystems, images, lockfiles. Kan beide formats uit. Default-keuze voor containers en filesystem-artefacten.
- **cdxgen** (OWASP, Apache-2). CycloneDX-native, bredere ecosysteem-dekking incl. Java/Node/Python/Go/Rust.
- **cyclonedx-bom-<lang>**: taal-specifieke CLIs (`cyclonedx-bom` voor Node, `cyclonedx-python-lib` voor Python, `cyclonedx-maven-plugin` voor Maven).
- **Microsoft sbom-tool** (MIT). Integreert met Azure DevOps en GitHub.

Genereer bij build, niet achteraf. Achteraf-SBOM op een al-gedeployde artefact mist transitive resolution-moments en is per definitie een benadering.

```bash
# syft — container-image SBOM in CycloneDX
syft <image>:<tag> -o cyclonedx-json > sbom.cdx.json

# syft — filesystem (bv. git clone)
syft dir:. -o spdx-json > sbom.spdx.json

# cdxgen — Node-project CycloneDX
cdxgen -t js -o bom.json
```

SBOM committen of niet? Voor open-source projecten: met het release-artefact publiceren (GitHub release asset, sigstore-bundle). Voor closed-source: in een artifact-registry naast het artefact. Niet in git-history; lockfile is de source of truth.

### 2. Build-provenance (SLSA)

SLSA (Supply-chain Levels for Software Artifacts) is een framework dat vier niveaus van build-provenance definieert. Provenance is een ondertekende attestatie over hoe een artefact is gebouwd.

- **SLSA Level 1**: build-proces gedocumenteerd, provenance bestaat, maar is niet tamper-proof.
- **SLSA Level 2**: hosted build-service, authenticated provenance, source en build zijn gekoppeld.
- **SLSA Level 3**: build is geïsoleerd (non-forgeable), source en build zijn gecontroleerd, provenance is cryptografisch gebonden aan de artefact-inhoud.
- **SLSA Level 4** (deprecated in v1.0 spec): maximale garanties. Samengevoegd in L3 in de huidige spec.

Praktische route naar Level 3:

- **GitHub Actions**: de `slsa-framework/slsa-github-generator` suite levert L3-provenance out-of-the-box voor Go, Node, Python, Docker-images. Build-job draait in een reusable workflow die door GitHub is geïsoleerd; attestation wordt door GitHub-attestor-identity getekend.
- **GitLab CI**: in-toto attestation via Cosign-sign-in-CI. Minder kant-en-klaar dan GitHub maar haalbaar met rekor-logging.
- **Self-hosted runners**: L3 wordt moeilijker — de isolatie-garantie ligt dan bij jou. Overweeg ephemeral runners per build (bv. via actions-runner-controller).

Provenance is een in-toto statement met predicate-type `https://slsa.dev/provenance/v1`. Inhoud: artefact-hash, builder-identity, source-repo-commit, build-parameters. Tekenen gebeurt via sigstore (fase 3).

### 3. Signing met sigstore

Sigstore is de de-facto open-source signing-stack sinds 2021. Drie componenten:

- **cosign** — CLI om artefacten te tekenen en te verifiëren. Ondersteunt container-images, blobs, git-commits (via `gitsign`), SBOMs, attestations.
- **Fulcio** — certificate authority die short-lived X.509 certs uitgeeft op basis van OIDC-identiteit. Geen lokale key-management.
- **Rekor** — transparantie-log. Elke signing-actie wordt als immutable entry gelogd zodat latere verificatie mogelijk is ook als de key weg is.

Keyless signing (aanbevolen default):

```bash
# sign image with OIDC-bound cert, entry in rekor
cosign sign --yes <image>@sha256:<digest>

# sign attestation (SBOM)
cosign attest --yes --predicate sbom.cdx.json --type cyclonedx <image>@sha256:<digest>

# verify signer-identity (GitHub Actions example)
cosign verify <image> \
  --certificate-identity-regexp "https://github.com/<org>/<repo>/.github/workflows/.+" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com"
```

Key-based signing (als je traceable-identity niet wil of kunt): `cosign generate-key-pair` plus KMS-backed key (AWS KMS, GCP KMS, Vault). Minder operationeel leuk maar past waar OIDC-integratie ontbreekt.

Gitsign voor commit-signing: short-lived certs in plaats van GPG-keys die jaren blijven hangen. Geen key-management, verification tegen rekor.

### 4. Dependency-confusion en typosquat-defense

Dependency confusion: een aanvaller publiceert een package onder dezelfde naam als je interne private package op een public registry met hoger versie-nummer. Je build-tool resolved de public, voert aanvaller-code uit. Bekend sinds Alex Birsan's 2021 Medium-publicatie (primaire bron).

Verdediging:

- **Scoped / namespaced packages.** npm `@org/pkg`, Maven groupId. Scoped packages op een public registry zijn per definitie jouw namespace als je de scope bezit.
- **Registry-config die private-first resolved.** npm `.npmrc` met `@org:registry=https://internal`. pip `index-url` op interne PyPI, `extra-index-url` alleen als fallback.
- **Lockfile + integrity-hash.** `package-lock.json` met SHA-512 integrity, `poetry.lock` met content-hashes, Go `go.sum`. Voorkomt dat eenzelfde versie met andere inhoud wordt geaccepteerd.
- **Mirror / proxy registry.** Nexus, Artifactory, Verdaccio, GitLab Package Registry. Internal-first, cachet public deps, blokkeert onbekende.
- **Publish-preventie voor interne naam.** Registreer je interne namen op public registries als placeholder (met minimal/placeholder-version) om namespace-squatting te voorkomen.

Typosquat:

- **Nieuwe dependencies kritisch bekijken.** Author, age (hoe lang bestaat het package?), download-count, reverse-deps. Tools: `npm-typo-check`, `socket.dev`, Snyk Advisor.
- **Deps-on-install.** Post-install scripts uitzetten waar mogelijk (`npm install --ignore-scripts`). Veel supply-chain-attacks triggeren op install.

### 5. Consumer-side verificatie

Wat je binnenhaalt verifieer je voor je het gebruikt.

- **Container-image signatures.** Kubernetes admission controller (Kyverno, Sigstore policy-controller) die onbeketende of niet-trusted-signer images weigert. Referenties in `k8s-security`.
- **Package-level attestations**: npm sinds 2023 ondersteunt provenance via sigstore, PyPI heeft trusted-publishing. Bij consumptie: verifieer attestatie bij install in CI, niet alleen op developer-machines.
- **Verification-policies**: Cosign `policy` met allowlist van toegestane signers en attestation-predicates. Match op builder-identity (GitHub Actions workflow-path), niet op branch-naam (die is te wijzigen).

### 6. Verification-loop

Laag 1: scope (alle artefacten die de org publiceert hebben SBOM én attestatie? alle consumptie-paden verifiëren?), aannames ("we gebruiken keyless signing" alleen als OIDC daadwerkelijk gekoppeld is), gaps (test-artefacten en internal-tools worden vaak vergeten, zijn ze bewust uitgesloten of vergeten?), consistentie (SBOM-format consistent over alle artefacten?).

Laag 2: SLSA-level-claims onderbouwd met concrete build-setup, geen hand-wave naar "we zitten op L3", CVE's of incidents die je noemt (XZ, event-stream, SolarWinds) geverifieerd qua feitelijke details, cosign-command-voorbeelden getest op syntax tegen de actuele versie.

## Output

Twee modes afhankelijk van aanleiding.

**Setup-mode** (nieuwe of ontbrekende supply-chain-discipline):

```
Supply-chain setup — <project/org>
Huidige staat: <SBOM: ja/nee | Signing: ja/nee | SLSA-level: L0–L3>

Geleverd:
- SBOM-generatie: <tool + format + build-step>
- Provenance: <SLSA-level target + toolchain>
- Signing: <cosign keyless via OIDC | KMS-backed | gitsign voor commits>
- Dep-confusion defense: <scoped packages | registry-config | mirror>
- Consumer-verificatie: <policy-controller | cosign verify in CI>

Te testen:
1. Build artefact → SBOM bestaat en is gevuld
2. Build artefact → attestation vindbaar in rekor
3. Verify-command retourneert success op getekende, faalt op ongetekende

Verification-loop: ...
```

**Incident/audit-mode** (bestaande pipeline auditen):

```
Supply-chain audit — <scope>
Findings:
- SBOM: <aanwezig voor alle artefacten | ontbreekt voor X>
- Provenance: <SLSA-niveau effectief | claim vs. realiteit>
- Signing: <coverage%, unsigned artefacten gelijst>
- Dep-confusion: <namespace-registratie, registry-config, mirror>
- Consumer-verify: <enforcement-punten en gaps>

Per gap:
- Wat mist
- Concrete remediation
- Prioriteit (blocker voor compliance | standard sprint-item)

Verification-loop: ...
```

Geen rapport dat zegt "we zitten op SLSA L3" zonder de daadwerkelijke build-setup te hebben gezien. Fase 2 eist bewijs.

## Referenties

- SLSA framework — [https://slsa.dev/](https://slsa.dev/). v1.0 specificatie met L1–L3 definities.
- CycloneDX — [https://cyclonedx.org/](https://cyclonedx.org/). OWASP-project, SBOM-format + VEX-integratie.
- SPDX — [https://spdx.dev/](https://spdx.dev/). Linux Foundation, ISO/IEC 5962:2021.
- Sigstore — [https://www.sigstore.dev/](https://www.sigstore.dev/). Cosign, Fulcio, Rekor, Gitsign.
- in-toto — [https://in-toto.io/](https://in-toto.io/). Attestation-framework onder SLSA-provenance.
- CISA SBOM-pagina — [https://www.cisa.gov/sbom](https://www.cisa.gov/sbom). Guidance + minimaal-format-definitie.
- US Executive Order 14028 — [https://www.whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/](https://www.whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/). Origineel mandaat voor SBOM-delivery in federaal aanschaf.
- EU Cyber Resilience Act — [https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act). EU-equivalent met SBOM-verplichtingen voor digitale producten.
- NIST SP 800-218 (SSDF) — [https://csrc.nist.gov/pubs/sp/800/218/final](https://csrc.nist.gov/pubs/sp/800/218/final). Secure Software Development Framework, supply-chain-raakvlak.
- OpenSSF Best Practices — [https://www.bestpractices.dev/](https://www.bestpractices.dev/). OpenSSF-badge, raakt supply-chain-discipline.
- Alex Birsan — "Dependency Confusion" (2021). [https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610). Originele publicatie over de aanvalsklasse.

## Categorieën

- appsec
