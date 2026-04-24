---
name: container-hardening
description: Docker and OCI image hardening — base-image selection, USER/caps/read-only FS discipline, distroless migration, build-time scanning with trivy/grype, image signing via sigstore, and runtime guardrails (seccomp, AppArmor).
---

# Container Hardening

## Wanneer gebruiken

Deze skill dekt de container-image-laag: wat erin zit, hoe het draait, en hoe je bewijst dat het klopt. Hij is de basis waar `k8s-security` op voortbouwt (K8s neemt deze images aan en voegt cluster-niveau controls toe).

Activeert bij:

- Een vraag als "review onze Dockerfile", "naar distroless migreren", "waarom draait onze container als root", "trivy-scan triage", "image signen met cosign".
- Een nieuwe of gewijzigde `Dockerfile`, `Containerfile`, `docker-compose.yml`, `.dockerignore`, multi-stage build-script.
- Een image-scan-output (trivy/grype/snyk container) die getrieerd moet worden.
- Een handoff vanuit `security-review` fase 3 (container in scope) of vanuit `k8s-security` (PodSecurityContext wijst op image-level issue).
- Een supply-chain-moment: image moet getekend, attestation gepubliceerd. Samen met `supply-chain`.

### Wanneer NIET (handoff)

- Kubernetes-workload-spec (PodSecurityContext, NetworkPolicy, RBAC) → `k8s-security`. Image is de ingrediënt, K8s is de kok.
- SBOM-format en signing-keys-setup → `supply-chain`. Deze skill roept sigstore aan, de andere legt hem uit.
- Vulnerabilities in packages bínnen de image → output van scanner gaat naar `cve-triage` voor triage.
- Secrets in image-layers → `secrets-scanner` op image-history.
- CI-pipeline die de build doet → `cicd-hardening`.
- Pure code-vraag die toevallig in een container draait → `secure-coding` of de framework-skill.

## Aanpak

Zes fases. Fase 1–3 zijn image-inhoud, fase 4 is signing, fase 5 is runtime, fase 6 is verificatie.

### 1. Base-image-keuze

De base-image is 80% van je attack-surface. Kies bewust.

**Opties, van klein naar groot**:

- **scratch** (0 layers). Alleen voor statically-linked binaries. Go, Rust, soms C. Kleinste attack-surface, geen shell, geen debug-tools. Default bij statisch gelinkte artefacten.
- **Distroless** (Google). Minimale runtime voor een taal (Java, Python, Node), geen shell, geen package-manager. `gcr.io/distroless/java21-debian12`, `gcr.io/distroless/python3-debian12`, etc. Met `:debug`-variant voor troubleshooting.
- **Chainguard Images** / **Wolfi**. Glibc-free, continually-rebuilt, SLSA-L3-signed. Vergelijkbaar met distroless, aantoonbaar kleiner CVE-venster door dagelijkse builds.
- **Alpine** (musl-libc). Klein (~5 MB), package-manager (apk) aanwezig. Pas op: musl kan subtiele verschillen vs glibc opleveren (DNS-resolving, thread-locals).
- **Debian slim** / **Ubuntu minimal**. Grotere footprint maar bredere compatibiliteit.
- **`<language>:latest`** (bv. `node:latest`, `python:latest`). **Gebruik niet.** `latest` is onreproducibel, en deze tags bevatten veel meer dan nodig.

Regels:

- **Pin op digest, niet op tag.** `FROM gcr.io/distroless/python3-debian12@sha256:<digest>`. Tag kan onder je voeten muteren.
- **Update-cadens documenteren.** Base-images krijgen CVEs, je moet regelmatig rebuilden. Renovate of Dependabot voor Dockerfile-dep-bumps.
- **Één image = één verantwoordelijkheid.** Niet één mega-image met app + migratie + CLI-tools; aparte images met shared base.

### 2. Dockerfile-hygiëne

De instructies die image-inhoud vormen. Elk van deze is een klassieke foot-gun.

- **USER niet-root.** Default Docker-user is root (UID 0). Expliciet `USER app` of `USER 10001` op een eigen UID. Zonder USER: elke proces in de container is root in de container, en bij container-escape root op de host.
- **Read-only filesystem waar kan.** Via `docker run --read-only` of Kubernetes `readOnlyRootFilesystem: true`. Write-behoefte beperken tot expliciete `tmpfs`- of `volume`-mounts. Exposure: als een aanvaller executie krijgt, kan hij geen malware wegschrijven.
- **Capabilities droppen.** Default Docker-caps (NET_ADMIN, SYS_ADMIN selectief) zijn te ruim. `--cap-drop=ALL` plus expliciet toevoegen wat je nodig hebt (bv. `--cap-add=NET_BIND_SERVICE` voor poort <1024). In Kubernetes: `securityContext.capabilities`.
- **Multi-stage builds.** Build-stage met compilers en dep-installers, runtime-stage minimaal. Voorkomt dat `gcc`, `make`, `git` in productie-image eindigen. Zie Docker-docs voor syntax.
- **.dockerignore.** Voorkomt dat `.env`, `.git`, `node_modules`, test-fixtures in image belanden via `COPY . .`. Zonder `.dockerignore` heeft je container de hele source plus eventuele lokale secrets.
- **Geen geheimen in layers.** `ENV PASSWORD=...`, `ARG SECRET=...`, of `COPY .env .` commits secrets in image-history. Zelfs bij latere layer-delete blijft het. Gebruik BuildKit-secrets (`RUN --mount=type=secret,id=...`) of runtime-injection via K8s secret / Vault.
- **Layer-volgorde voor caching én security.** Dependencies installeren eerst (verandert zelden), code copy later (verandert vaak). Cache-efficiency plus forceert rebuild bij dep-wijziging.
- **Apt/apk-install opschonen.** `apt-get install --no-install-recommends` plus `rm -rf /var/lib/apt/lists/*` in dezelfde RUN. Anders blijven package-lists in de layer.
- **HEALTHCHECK toevoegen** (als niet via K8s liveness/readiness). Laat orchestrator merken dat container hangt.
- **EXPOSE documenteren, niet publiceren.** `EXPOSE 8080` is documentatie. Publicatie gebeurt op `docker run -p` of K8s Service.

**Anti-patterns**:

```dockerfile
FROM node:latest                    # latest tag, onreproducibel
COPY . /app                         # inclusief .env, .git, tests
RUN npm install --unsafe-perm       # suggereert root-permission need
USER root                           # expliciet root
CMD ["npm", "start"]
```

**Betere variant**:

```dockerfile
FROM node:20-bookworm-slim@sha256:<digest> AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src

FROM gcr.io/distroless/nodejs20-debian12@sha256:<digest>
WORKDIR /app
COPY --from=build /app /app
USER 10001
CMD ["src/index.js"]
```

### 3. Build-time scanning

Voordat image de registry raakt:

- **Trivy** (Aqua, Apache-2). Scant images op OS- en app-dep-vulns, secrets, misconfigs. Snelst in adoption.
  ```bash
  trivy image --severity HIGH,CRITICAL --exit-code 1 <image>:<tag>
  ```
- **Grype** (Anchore, Apache-2). Vuln-scanner gecombineerd met Syft voor SBOM. Detailleerde per-package-CVEs.
- **Clair** (Red Hat OSS). Server-side scanning, integreert met Harbor.
- **Snyk container** / **Sysdig Secure** (commercial). Enterprise-options met bredere feed-bronnen en UI.
- **Docker Scout** (Docker Inc). Sinds 2023 de default in Docker Desktop; vergelijkbaar met Trivy voor use-case.

Koppel output aan `cve-triage`. Alle findings van hoge severity blocker-matchen hun criteria daar (KEV, reachable, exposed). Niet automatisch blokkeren op alle HIGH; je drown-t in low-impact base-image-noise.

Configuraties ook scannen: Trivy heeft `--scanners misconfig` voor Dockerfile-linting (stapt in fase 2 op dezelfde regels).

### 4. Image signing en provenance

Zie `supply-chain` voor de volledige uitleg; hier de container-specifieke calls.

- **Teken bij build** (niet achteraf). Sigstore + cosign, keyless via OIDC.
  ```bash
  cosign sign --yes <registry>/<image>@sha256:<digest>
  ```
- **SBOM attesteren** op dezelfde image.
  ```bash
  syft <image>:<tag> -o cyclonedx-json > sbom.json
  cosign attest --yes --predicate sbom.json --type cyclonedx <image>@sha256:<digest>
  ```
- **SLSA-provenance** via `slsa-framework/slsa-github-generator` bij GitHub Actions build.
- **Verify bij pull**, niet alleen bij push. Kubernetes admission controller (Kyverno, Sigstore policy-controller) die onbeketende images weigert. Referentie: `k8s-security` fase 1.

Registry-keuze:

- **Harbor** (OSS) ondersteunt signing, vuln-scanning, image-replication.
- **Cloud registries** (ECR, GAR, ACR) met built-in scanning.
- **GHCR** voor GitHub-gekoppelde builds.

### 5. Runtime-hardening

Image is maar de helft. Runtime-policy beslist wat de container mag als hij draait.

- **Seccomp** — filter system-calls. Docker-default-profile is goed startpunt; custom profile voor specifieke workloads (nginx, PostgreSQL) op te vinden in `moby/moby` repo of via tools als `dockerd-rootless-setuptool`.
- **AppArmor / SELinux** — mandatory access control. Ubuntu/Debian default AppArmor-profiles, RHEL/Fedora SELinux. Custom profiles via `--security-opt apparmor=profile-name`.
- **Rootless Docker / Podman** — daemon draait als non-root user; container-escape raakt geen host-root. Default in Podman, opt-in in Docker.
- **No new privileges** — `--security-opt=no-new-privileges:true` voorkomt setuid-escalatie binnen de container.
- **gVisor / Kata Containers** — kernel-isolatie voor hogere trust-niveaus. Overhead ~5–20%, loont bij multi-tenant workloads of vertrouwelijke data.

Ephemeral runtime: containers zijn stateless. State in volumes, niet in writable layers. `--rm` bij losstaande runs, `emptyDir` of persistent-volume in K8s.

### 6. Verification-loop

Laag 1: scope (alle Dockerfiles in de repo gedekt? base-images met digest pinned? USER niet-root in alle stages?), aannames ("distroless dus safe" alleen als je de concrete image-hash hebt geverifieerd), gaps (build-time én runtime-controls beide aanwezig?), consistentie (trivy-severity-threshold consistent tussen images?).

Laag 2: image-tags en digest-syntax kloppen, CVE-referenties in scan-triage tegen NVD geverifieerd, SLSA-level-claim onderbouwd met de concrete builder-config, geen verzonnen seccomp-profile-namen.

## Output

```
Container hardening review — <image(s)>
Dockerfiles in scope: <lijst>
Base-images: <gebruikt, pinned op digest: ja/nee>

Image-inhoud:
  USER niet-root:           <ja/nee per image>
  Multi-stage build:        <ja/nee>
  Read-only compatible:     <ja/nee, en welke write-paden>
  .dockerignore aanwezig:   <ja/nee>
  Secrets in layers:        <geen | gevonden: ...>

Scan-output (trivy/grype):
  Blockers (HIGH/CRITICAL): <N, met cve-triage-handoff>
  Medium:                   <N>
  Misconfigs:               <lijst>

Signing + provenance:
  Signed:                   <ja/nee, cosign-identity>
  SBOM attested:            <ja/nee, format>
  SLSA-level effectief:     <L0–L3>

Runtime-policy:
  Seccomp:                  <default | custom | geen>
  AppArmor/SELinux:         <profile | geen>
  Capabilities gedropt:     <ALL + adds | default>
  Rootless runtime:         <ja/nee>

Findings (severity-gesorteerd)

Verification-loop: ...
```

## Referenties

- Docker security docs — [https://docs.docker.com/engine/security/](https://docs.docker.com/engine/security/).
- OCI Image Spec — [https://github.com/opencontainers/image-spec](https://github.com/opencontainers/image-spec). Primaire image-format-spec.
- NIST SP 800-190 — [https://csrc.nist.gov/pubs/sp/800/190/final](https://csrc.nist.gov/pubs/sp/800/190/final). Application Container Security Guide.
- CIS Docker Benchmark — [https://www.cisecurity.org/benchmark/docker](https://www.cisecurity.org/benchmark/docker). Checklist-vorm, goed voor audits.
- Docker Bench for Security — [https://github.com/docker/docker-bench-security](https://github.com/docker/docker-bench-security). Scripted CIS-Docker-check.
- Distroless images — [https://github.com/GoogleContainerTools/distroless](https://github.com/GoogleContainerTools/distroless).
- Chainguard / Wolfi — [https://edu.chainguard.dev/chainguard/chainguard-images/](https://edu.chainguard.dev/chainguard/chainguard-images/). Continually-rebuilt minimal images.
- Trivy — [https://trivy.dev/](https://trivy.dev/). Multi-purpose scanner.
- Grype + Syft — [https://github.com/anchore/grype](https://github.com/anchore/grype). Vuln-scanner plus SBOM.
- Sigstore cosign — [https://docs.sigstore.dev/cosign/overview/](https://docs.sigstore.dev/cosign/overview/). Image-signing zonder long-lived keys.
- Seccomp profiles — [https://docs.docker.com/engine/security/seccomp/](https://docs.docker.com/engine/security/seccomp/).
- OWASP Docker Security Cheat Sheet — [https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html).

## Categorieën

- appsec
