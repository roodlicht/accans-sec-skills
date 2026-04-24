---
name: cicd-hardening
description: CI/CD pipeline hardening for GitHub Actions and GitLab CI — trust-model (pull_request_target vs pull_request), action pinning to SHA, OIDC-based cloud access, permissions minimization, runner isolation, and supply-chain gates (SLSA provenance, signing).
---

# CI/CD Hardening

## Wanneer gebruiken

Deze skill behandelt de pipeline zelf als aanvalsoppervlak, niet de code die erdoorheen stroomt. CI/CD-compromise is een supply-chain-incident: wie de pipeline bezit, bezit de release-artefacten.

Activeert bij:

- Een vraag als "review onze workflow-files op security", "zet OIDC op tussen GitHub en AWS", "waarom is `pull_request_target` gevaarlijk", "pin alle actions op SHA", "kunnen we SLSA-L3 halen".
- Nieuwe of gewijzigde `.github/workflows/*.yml`, `.gitlab-ci.yml`, Jenkinsfile, Azure Pipelines-YAML, CircleCI-config, reusable-workflow-definities, composite actions.
- Een incident of near-miss: een forked PR heeft secrets kunnen gebruiken, een third-party action had een compromise, een self-hosted runner werd misbruikt.
- Een compliance-audit die SSDF-evidence of SLSA-level-attestation vraagt.
- Een supply-chain-moment waar de pipeline de laatste schakel is voor release (`supply-chain`-skill belt hierheen voor build-provenance-setup).

### Wanneer NIET (handoff)

- SAST in de pipeline → `sast-orchestrator` voor tool-keuze en ruleset. Deze skill bepaalt alleen dat hij ergens in de workflow-fase draait.
- Secret-scanning in de pipeline → `secrets-scanner`. Zelfde verdeling.
- Dependency-scanning en CVE-triage → `cve-triage` en `supply-chain`. De gate-logica ligt bij `security-gate`.
- Container-build zelf (Dockerfile, base-image) → `container-hardening`. Hier dekken we alleen de workflow die hem bouwt.
- Kubernetes-deployment door GitOps-agent (Argo CD, Flux) → `k8s-security`.
- Infrastructuur-provisioning (Terraform apply vanuit CI) → `iac-security` voor de resources-kant, hier alleen de creds-flow via OIDC.
- IR bij een daadwerkelijk-gecompromitteerde pipeline → `ir-runbook`.

## Aanpak

Zeven fases. Fase 1 (trust-model) is het hart — wat mis gaat in CI-aanvallen is vaak een misvatting over wie wat mag draaien.

### 1. Trust-model en workflow-triggers

**GitHub Actions — de `pull_request_target` val.**

`pull_request` (default) draait workflow-code uit de PR-branch en heeft **geen** toegang tot secrets van de base-repo. Veilig voor fork-PRs.

`pull_request_target` draait de workflow-code uit de **base-branch** (dus vertrouwd) maar met de PR-context. Heeft secrets. Bedoeld voor scenario's zoals "label de PR na lint-check". **Levensgevaarlijk** als je de PR-code uitvoert (via checkout + test-run), want dan voert je base-trusted workflow code uit de untrusted fork uit met secrets aan boord. Dit is de aanvalsklasse die GitHub zelf "poisoned pipeline execution" noemt.

Regel: als je `pull_request_target` gebruikt, check **nooit** de PR-branch uit en voer **nooit** code uit die van de PR komt. Wel: labels zetten, commentaren plaatsen, metadata lezen.

**GitLab CI — merge request pipelines.**

`merge_request_event` draait op de source-branch met toegang tot variabelen afhankelijk van protected-flag. Protected variables alleen beschikbaar op protected branches — zet prod-secrets op protected. Cross-project triggers via pipeline-trigger-tokens zijn nog een vector; behandel die tokens als secret.

**Protected branches en required checks.**

Main/release-branches protected zetten: geen directe push, review-required, status-checks-required, linear history, no force-push. `security-gate` als required check. Zonder branch-protection kan een compromised developer-account direct release-pipelines starten.

**CODEOWNERS**: verplicht review door specifieke teams voor kritieke paths (`.github/workflows/`, `infra/`, `deploy/`). Zonder CODEOWNERS-enforcement bij branch-protection is het advies, niet beleid.

### 2. Action-pinning en provenance

Third-party Actions zijn de onderschatte supply-chain-risico. Een owner die compromised wordt of een action die muteert raakt iedereen die de tag gebruikt.

- **Pin op SHA, niet op tag.** `uses: actions/checkout@v4` is mutable (tag kan worden herplaatst). `uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683` is immutable. Voor cruciale workflows (release, deploy): altijd SHA-pinning.
- **Renovate/Dependabot configureren om SHA-pins te updaten** met changelog-review. Zonder auto-updates loop je op stale vulnerable Actions.
- **Verified publishers en Actions uit trusted orgs** (`actions/`, `github/`, `docker/`, `aws-actions/`, `azure/`, `google-github-actions/`). Third-party marketplace-Actions met 10 stars en één maintainer zijn een keuze die je moet kunnen verantwoorden.
- **Lint tools**: `zizmor` (Rust, OSS) voor GitHub Actions audit — pakt `pull_request_target`-misuse, impersonation, expression-injection op. `actionlint` voor syntax. `poutine` voor cross-platform CI-analyse.
- **GitLab equivalent**: include'd templates pinnen op vaste versie, geen `@main` voor `include: remote:` of shared templates.

**Expression-injection**. `${{ github.event.pull_request.title }}` direct in een `run:`-block is command-injection: een PR-titel met ``" ; rm -rf / #`` voert op de runner uit. Fix: waarde via env-variabele doorgeven (`env: TITLE: ${{ github.event.pull_request.title }}`, dan `"$TITLE"` in het script). Zizmor vangt dit.

### 3. Secrets en creds: OIDC eerst

Long-lived cloud-credentials in CI-secrets zijn het klassiek-slechte patroon. OIDC lost het op: CI-runner krijgt een short-lived, audience-gebonden token van de identity-provider, cloud-side accepteert dat token en reikt tijdelijke IAM-creds uit.

- **GitHub → AWS**: OIDC-provider in AWS (`token.actions.githubusercontent.com`), IAM-role met trust-policy op `repo:<org>/<repo>:ref:refs/heads/main` of `environment:<env>`. `aws-actions/configure-aws-credentials@v4` pinned op SHA.
- **GitHub → GCP**: Workload Identity Federation, `google-github-actions/auth`.
- **GitHub → Azure**: federated identity credentials op App Registration.
- **GitLab → cloud**: `id_tokens` feature (JWT per job) met equivalent OIDC-setup cloud-side.

OIDC-trust-policy's:

- **Scope zo nauw mogelijk**. Trust alleen specifieke branches (`refs/heads/main`), of beter: environments (`environment:production`). Niet op `repo:<org>/<repo>:*`.
- **Audience-claim expliciet** op `sts.amazonaws.com` of cloud-equivalent. Default is wide, je wil 'm narrow.
- **Geen fallback op statische keys.** Als OIDC om welke reden dan ook niet werkt, faal de pipeline — geen "oh dan gebruiken we de oude `AWS_SECRET_ACCESS_KEY` maar even". Die key bestaat niet meer, als het goed is.

Resterende secrets (third-party API-keys die geen OIDC ondersteunen):

- **Environment-scoped** in GitHub Actions (`environment: production` met protected-flag en required-reviewers). Of GitLab-protected-variables op protected-branch.
- **Verwijder na gebruik** waar kan; sommige tooling (HashiCorp Vault integratie) genereert just-in-time creds.
- **Nooit echo'en**. Een bug waar een secret per ongeluk in log-output belandt: GitHub maskeert automatisch maar is niet feilloos. Zet `set -x` / `--debug` uit in steps die secrets aanraken.

### 4. Permissions: minimaal per workflow

GitHub Actions default `GITHUB_TOKEN` is historisch `write-all`. Sinds 2023 is default read-only in nieuwe repos, maar oude repos niet automatisch. Expliciet zetten:

```yaml
permissions:
  contents: read          # default voor de meeste workflows
jobs:
  deploy:
    permissions:
      contents: read
      id-token: write     # voor OIDC
      packages: write     # voor ghcr-push, alleen in deploy-job
    ...
```

Workflow-level permissions zet een plafond; job-level kan verfijnen omlaag. Voor jobs die push rechten nodig hebben, dat strikt naar die job scopen.

GitLab CI-equivalent: `CI_JOB_TOKEN` permissions via Project → Settings → CI/CD → Token access, met allowlist van projects die je token mag gebruiken.

### 5. Runners: isolatie en keuze

**GitHub-hosted runners** zijn ephemeral (fresh VM per job), goed default. Verbruik: public repos gratis, private betaald.

**Self-hosted runners** zijn persistent tenzij je ze zelf elke run opnieuw provisioneert. Risico's:

- **Persistente state**: vorige run kan secrets/artifacts achterlaten voor volgende run, cross-job-contamination.
- **Fork-PR exposure**: een forked PR die op een self-hosted runner draait heeft toegang tot de hele host. Standaard-advies: **self-hosted runners alleen voor workflows die niet door forked PRs getriggerd kunnen worden**. Private repos of internal-only workflows.
- **Network positionering**: een self-hosted runner in een VPC kan dingen bereiken die je niet wil.

Als je self-hosted moet: **ephemeral runners** (actions-runner-controller op Kubernetes, of `--ephemeral`-flag), **non-root service-account**, **runner-scope per repo of per org** en niet cluster-wide, **network-egress-policy**, geen mount van docker.sock (geeft breakout).

Scale-set runners met firecracker/KVM-isolatie (GitLab) of runner-groups met labels (GitHub) voor verdere segmentatie.

### 6. Supply-chain gates in de pipeline

De plaats waar `supply-chain`, `secrets-scanner`, `cve-triage`, `sast-orchestrator` en `security-gate` landen als CI-steps.

- **Per-PR** (blocking): `/security-gate` als required check, die intern `secrets-scanner` + `sast-orchestrator` + `cve-triage` draait.
- **Per-build** (artefact-gerelateerd): SBOM genereren (syft), attestation tekenen (cosign), SLSA-provenance via `slsa-framework/slsa-github-generator`. Zie `supply-chain` fase 2.
- **Per-release** (aanvullend): image-scan met Trivy/Grype, signing verify, provenance verify. Fail-fast op unsigned of unresolved-critical.
- **OpenSSF Scorecard** als periodieke self-assessment van pipeline-hygiëne: pinned Actions, branch-protection, SAST aanwezig, etc. Rapporteert een score plus per-check-detail.

Log CI-events naar SIEM: wie draaide welke workflow, welke secrets werden geraakt, welke artifacts geproduceerd. Zonder audit-trail is een compromised-CI-incident niet reconstrueerbaar.

### 7. Verification-loop

Laag 1: scope (alle workflow-files gedekt? self-hosted runners geïnventariseerd? OIDC overal toegepast waar mogelijk?), aannames ("we pinnen op SHA" alleen als je de `uses:`-lines daadwerkelijk hebt gelezen), gaps (pull_request_target scherp nagelopen? expression-injection checks gedaan?), consistentie (permissions-scope matcht met wat de job daadwerkelijk doet).

Laag 2: Action-SHA's en publisher-identities kloppen, OWASP CICD Top 10 mapping correct, geen verzonnen zizmor/actionlint-rule-IDs, SLSA-level-claims onderbouwd.

## Output

```
CI/CD hardening review — <repo/pipeline>
Platform: <GitHub Actions | GitLab CI | Jenkins | Azure | ...>

Trust-model:
  Triggers gebruikt:       <lijst pull_request/pull_request_target/push/etc>
  pull_request_target risk:<clean | finding met context>
  Protected branches:      <config samenvatting>
  CODEOWNERS actief:       <ja/nee>

Action-pinning:
  % Actions SHA-pinned:    <N/M>
  Third-party uit onbekende orgs: <lijst>
  Expression-injection:    <clean | findings>

Credentials:
  OIDC naar cloud:         <AWS/GCP/Azure, trust-scope>
  Long-lived secrets:      <N, welke en waarom nog>
  Environment-protected:   <ja/nee per kritieke environment>

Permissions:
  Workflows met default write-all: <N>
  permissions: leeg of te breed:   <lijst>

Runners:
  Self-hosted in gebruik:   <ja/nee + scope>
  Ephemeral:                <ja/nee>
  Fork-PR-toegang tot self-hosted: <geblokkeerd | open>

Supply-chain gates:
  SAST in pipeline:         <sast-orchestrator handoff>
  Secret-scan:              <secrets-scanner handoff>
  Dep-scan:                 <cve-triage handoff>
  SBOM + provenance:        <supply-chain handoff>
  Scorecard:                <score + zwakste checks>

Findings (severity-gesorteerd, volg security-review-format)

Verification-loop: ...
```

## Referenties

- GitHub Actions Security Hardening — [https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions). Primaire GitHub-docs over workflow-security.
- GitHub Actions OIDC — [https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect).
- GitLab CI Security — [https://docs.gitlab.com/ee/ci/pipelines/](https://docs.gitlab.com/ee/ci/pipelines/) en [https://docs.gitlab.com/ee/ci/secrets/](https://docs.gitlab.com/ee/ci/secrets/).
- OWASP Top 10 CI/CD Security Risks — [https://owasp.org/www-project-top-10-ci-cd-security-risks/](https://owasp.org/www-project-top-10-ci-cd-security-risks/). Canonieke categorisatie.
- NSA/CISA "Defending CI/CD Environments" — [https://media.defense.gov/2023/Jun/28/2003249466/-1/-1/0/CSI_DEFENDING_CI_CD_ENVIRONMENTS.PDF](https://media.defense.gov/2023/Jun/28/2003249466/-1/-1/0/CSI_DEFENDING_CI_CD_ENVIRONMENTS.PDF). 2023-guidance.
- SLSA — [https://slsa.dev/](https://slsa.dev/). Build-provenance framework, zie ook `supply-chain`.
- OpenSSF Scorecard — [https://github.com/ossf/scorecard](https://github.com/ossf/scorecard). Self-assessment van project-hygiëne.
- zizmor — [https://github.com/woodruffw/zizmor](https://github.com/woodruffw/zizmor). Static analysis voor GitHub Actions.
- actionlint — [https://github.com/rhysd/actionlint](https://github.com/rhysd/actionlint). Workflow-syntax linter.
- slsa-github-generator — [https://github.com/slsa-framework/slsa-github-generator](https://github.com/slsa-framework/slsa-github-generator). SLSA-L3 provenance in GitHub Actions.
- Trail of Bits — "Publishing Python packages from GitHub Actions" threat-model ([https://blog.trailofbits.com/2023/05/23/trusted-publishing-a-new-benchmark-for-packaging-security/](https://blog.trailofbits.com/2023/05/23/trusted-publishing-a-new-benchmark-for-packaging-security/)). Goed referentie-werk voor OIDC-trust-setup.

## Categorieën

- appsec
