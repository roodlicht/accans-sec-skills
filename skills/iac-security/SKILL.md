---
name: iac-security
description: IaC misconfig scanning and cloud-aware review for Terraform, CloudFormation, Ansible and Pulumi. Covers tool orchestration (checkov/tfsec/kics/cfn-nag), policy-as-code (OPA/Conftest), CIS benchmark mapping, IAM over-permission detection, drift monitoring.
---

# IaC Security

## Wanneer gebruiken

Deze skill reviewt Infrastructure-as-Code op misconfig: te-ruime IAM, public storage, ontbrekende encryption, open security-groups, logging uit. Hij leunt op de cloud-provider best-practices plus CIS-benchmarks en orchestreert de gangbare scanners.

Activeert bij:

- Een vraag als "scan deze Terraform op misconfigs", "checkov op ons CloudFormation-template", "is deze S3-bucket-policy OK", "review onze Pulumi-stack", "conftest-policy schrijven".
- Nieuwe of gewijzigde IaC-files: `*.tf`, `*.tfvars`, `*.hcl`, CloudFormation `*.yaml`/`*.json` templates, Ansible `playbook.yml`, `roles/`, Pulumi `Pulumi.yaml` plus `__main__.py`/`index.ts`.
- Een compliance-audit (ISO/SOC2/NIS2) die cloud-control-evidence vraagt.
- Een handoff vanuit `security-review` fase 3 waar IaC in de diff zit.
- Een drift-vermoeden: "loopt prod af van de Terraform-staat".

### Wanneer NIET (handoff)

- Kubernetes-manifests en Helm-charts → `k8s-security`. Hoewel het IaC is, is K8s een eigen wereld met eigen tools.
- Dockerfile-hardening → `container-hardening`. Image-inhoud hoort daar, image-registry-IAM hier.
- CI-pipeline-hardening (de workflow die terraform apply draait) → `cicd-hardening`. Overlap: welke creds via OIDC, wel hier genoemd.
- Secrets in IaC-files → `secrets-scanner`. Scan IaC met die skill voor je hier verder gaat.
- Per-CVE triage op Terraform-providers of modules → `cve-triage`.
- Cloud-runtime-misconfig die niet uit IaC komt (handmatige console-change, drift) → drift-detection hier ja, remediatie richting `ir-runbook` als het een incident is.

## Aanpak

Zes fases. Fase 2 en 3 vormen de kern (scanning + cloud-aware review).

### 1. Inventaris per IaC-type

Wat heb je, in welke tool, voor welke cloud, en wat is de dekking?

- **Terraform / OpenTofu**: `*.tf`-files, `terraform.lock.hcl`, state-locatie (S3 + DynamoDB-lock, GCS, Azure Blob, Terraform Cloud). Modules: eigen of publiek? Providers: welke versies zijn gepinned?
- **CloudFormation**: `*.yaml`/`*.json` templates, CDK-output (transpiled naar CFN), StackSets in multi-account-opzet.
- **Ansible**: `playbooks`, `roles`, `inventory`. Let op: Ansible draait vaak op bestaande hosts, dus IaC + runtime-config zit door elkaar.
- **Pulumi**: `Pulumi.yaml` plus taalspecifieke code (Python/TS/Go/C#). State in Pulumi Cloud of self-hosted backend.
- **Cloud-provider matrix**: welke providers raak je? AWS, GCP, Azure, multi-cloud? Provider-specifieke tools (bv. cfn-nag) zijn alleen zinvol bij de bijbehorende provider.

Uitkomst: een overzicht welke IaC-techniek raakt welke cloud-resources. Zonder dat kies je tools op de tast en mis je de drift tussen tools en stacks.

### 2. Tool-orchestratie

Eén tool per IaC-type is zelden genoeg; de overlap is nuttig omdat regelsets verschillen. Minimaliseer wel tot wat echt meerwaarde geeft.

**Terraform**:

- **Checkov** (Prisma Cloud OSS, Apache-2). Python, brede regelset inclusief CIS-benchmarks per cloud, IaC én container én K8s én secrets. Default breadth-tool.
- **tfsec** (Aqua, MIT). Tight Terraform-focus, snel. Minder regels dan Checkov maar minder ruis. Sinds 2023 in maintenance-mode; Trivy absorbeert de regels.
- **Trivy** (Aqua, Apache-2). Scanner voor containers, IaC en filesystems. Handig als je al Trivy gebruikt voor images.
- **KICS** (Checkmarx OSS). Brede IaC-dekking (Terraform, CFN, K8s, Dockerfile, Ansible). Vergelijkbaar met Checkov; kies één van de twee.
- **terrascan** (Accurics, bezet door Tenable). OPA-rego-based.

**CloudFormation**:

- **cfn-lint** (AWS official). Syntax en schema-validatie, geen security-regels maar verplichte startpunt.
- **cfn-nag** (Stelligent, MIT). Ruby, security-focused rules. Waarschuwt over IAM-wildcards, open security groups, unencrypted storage.
- **cfn-guard** (AWS, Apache-2). Policy-as-code met eigen DSL. Zwaarder dan cfn-nag maar policy-gedreven.
- **Checkov** dekt CFN ook; praktisch genoeg om te combineren met cfn-lint voor syntaxcheck.

**Ansible**:

- **ansible-lint** (Ansible community, MIT). Best-practice plus security-regels.
- **KICS** heeft Ansible-rules.
- Ansible-playbooks zijn vaak imperative; statische analyse mist runtime-state. Aanvullen met smoke-tests.

**Pulumi**:

- **Checkov** (versie ≥ 2.3) ondersteunt Pulumi via state-inspection.
- **Policy as Code** (Pulumi-native, gratis tier). Policy-packs in dezelfde taal als de stack.
- Alternatief: converteer Pulumi-state naar Terraform-plan en scan daar. Minder direct.

Draai tools in CI met baseline-file (zie ook `sast-orchestrator` fase 5 voor noise-reductie discipline). Findings op nieuwe code zijn blocker, bestaande zijn planbaar.

### 3. Cloud-aware review

Het verschil tussen IaC-scanning en cloud-review: tools vangen de regels, mens vangt de context. Loop de volgende categorieën langs voor elk resource-type dat raak is.

- **IAM / identity**. Wildcards in `Action` (`s3:*`), wildcards in `Resource` (`arn:aws:s3:::*`), service-accounts met Owner/Admin-roles, cross-account trust zonder ExternalId, MFA niet vereist op root of admin-users. Principle of least privilege verifieerbaar maken door policies te genereren vanuit CloudTrail/Audit Logs (`aws iam generate-service-last-accessed-details`).
- **Storage**. Publieke S3-buckets of GCS-objecten, default encryption uit, geen lifecycle-policy voor oude data, geen versioning + MFA-delete op gevoelige buckets. EBS/EFS/Azure-disks unencrypted.
- **Networking**. Security groups met `0.0.0.0/0` op niet-web-poorten (22 SSH, 3389 RDP, 3306 MySQL, 5432 Postgres), NACLs te permissief, Route Tables die traffic via onbedoelde paden sturen, VPC-peering zonder goede segmentatie.
- **Logging en audit**. CloudTrail/Cloud Audit Logs aan in alle regions, logs in een aparte log-archive account, ontoegankelijk voor compromise-target, retention ≥ 1 jaar (afhankelijk compliance).
- **Encryption**. In-transit (TLS forced, `RequireTLS: true` op buckets, RDS forced SSL), at-rest (KMS-CMK of vergelijkbaar), key-rotation aan.
- **Secrets**. Geen hardcoded waarden in templates, verwijzen naar Secrets Manager/Parameter Store/Key Vault. Zie `secrets-scanner`.
- **Public exposure**. Load balancers, API Gateways, App Runners, App Services: welke zijn publiek? Is WAF ervoor? Geo-restricties?

CIS-benchmarks als baseline: AWS Foundations Benchmark v3, GCP Foundation Benchmark v2, Azure Foundations Benchmark v2. Alle drie bestaan als Checkov-ruleset (`cis_aws`, `cis_gcp`, `cis_azure`).

### 4. Policy-as-code guardrails

Scanning is detect-after-the-fact. Policy-as-code dwingt af vóór apply.

- **OPA + Conftest** — Rego-policies tegen IaC-plans. `terraform plan -out=tfplan && terraform show -json tfplan | conftest test -`. Policies in git, reusable over stacks.
- **Checkov custom policies** — Python of Rego, kunnen in dezelfde run als Checkov draaien.
- **Terraform Sentinel** (commercial, HashiCorp) — policy-as-code native in Terraform Cloud/Enterprise.
- **AWS Service Control Policies (SCPs)** — organisatie-niveau guardrails die IaC níet kan omzeilen. Bv. "geen region buiten EU", "geen S3 ACL public-read".
- **Azure Policy / GCP Organization Policy** — equivalenten op die platforms.

Schrijf policies vanuit de org-specifieke regels die tools niet kennen: "alle databases in eigen VPC", "geen EC2 met public IP tenzij tagged `public-allowed`", "alle S3-buckets moeten object-lock aan hebben in finance-accounts".

### 5. Drift-detectie

IaC-state en werkelijke cloud-state kunnen divergeren door handmatige console-changes, andere tools, of compromised credentials. Zonder drift-detection loopt je model af.

- **Terraform**: `terraform plan` in CI op schedule, alert op non-zero-diff.
- **CloudFormation**: Drift Detection API (`aws cloudformation detect-stack-drift`), kan via CloudWatch-alerts.
- **Pulumi**: `pulumi refresh --expect-no-changes`, fails op diff.
- **Driftctl** (OSS) — cross-provider drift-detection.
- **Cloudquery** — declaratieve cloud-state extractor, match tegen IaC.

Drift is niet per definitie security-incident, maar onbedoelde drift moet wel getriageerd worden. Bij verdachte drift (nieuwe IAM-role die niet in code staat): escaleer naar `ir-runbook`.

### 6. Verification-loop

Laag 1: scope (alle IaC-types in de repo gedekt? alle regions/accounts? drift-check actief?), aannames ("CIS-benchmark-compliant" onderbouwd met tool-output, niet ge-eyeballed), gaps (secrets en k8s-manifests expliciet verwezen?), consistentie (policy-as-code regels niet in conflict met SCPs).

Laag 2: CIS-benchmark-versie-nummers kloppen, cloud-provider-feature-namen actueel (AWS verandert feature-names), geen verzonnen regel-IDs uit een scanner, CVE-verwijzingen (als ze gebruikt worden voor een specifieke IaC-misconfig) tegen NVD geverifieerd.

## Output

```
IaC Security review — <scope>
IaC-types: <terraform | cfn | ansible | pulumi>
Clouds in scope: <aws | gcp | azure | multi>

Scan-output (samenvatting, geen ruwe dumps):
  Checkov:    <N blockers, M medium, K low>
  tfsec/Trivy:<...>
  cfn-nag:    <...>

Cloud-aware findings:
  IAM:         <lijst overly-permissive roles/policies>
  Storage:     <public buckets, unencrypted volumes>
  Networking:  <open security groups, NACL gaps>
  Logging:     <CloudTrail/audit gaps>
  Encryption:  <in-transit + at-rest gaps>

Policy-as-code status:
  Active:      <OPA/Conftest | Sentinel | SCPs | Org Policy>
  Coverage:    <welke rules actief, welke niet>

Drift:
  Laatst gecheckt: <datum>
  Divergence:      <geen | zie bijlage>

Findings (severity-gesorteerd, blockers eerst, volg security-review-format)

Verification-loop: ...
```

## Referenties

- OWASP IaC Security — [https://owasp.org/www-project-iac-security/](https://owasp.org/www-project-iac-security/). OWASP IaC Top 10 en guidance.
- CIS Benchmarks — [https://www.cisecurity.org/cis-benchmarks](https://www.cisecurity.org/cis-benchmarks). AWS Foundations, GCP Foundation, Azure Foundations — de baseline.
- Checkov — [https://www.checkov.io/](https://www.checkov.io/). Tool-docs plus regelset-referentie.
- tfsec / Trivy IaC — [https://aquasecurity.github.io/trivy/latest/docs/coverage/iac/](https://aquasecurity.github.io/trivy/latest/docs/coverage/iac/). Trivy-integrated IaC-scanning.
- cfn-nag — [https://github.com/stelligent/cfn_nag](https://github.com/stelligent/cfn_nag). CloudFormation rules.
- AWS cfn-guard — [https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html](https://docs.aws.amazon.com/cfn-guard/latest/ug/what-is-guard.html).
- ansible-lint — [https://ansible.readthedocs.io/projects/lint/](https://ansible.readthedocs.io/projects/lint/). Lint-rules incl. security.
- Pulumi Policy as Code — [https://www.pulumi.com/docs/using-pulumi/crossguard/](https://www.pulumi.com/docs/using-pulumi/crossguard/).
- OPA / Conftest — [https://www.openpolicyagent.org/](https://www.openpolicyagent.org/) en [https://www.conftest.dev/](https://www.conftest.dev/).
- NIST SP 800-204D — [https://csrc.nist.gov/pubs/sp/800/204/d/final](https://csrc.nist.gov/pubs/sp/800/204/d/final). Strategies for secure DevSecOps.
- AWS Well-Architected Security Pillar — [https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html). Primaire AWS-guidance.
- Google Cloud Security Best Practices — [https://cloud.google.com/security/best-practices](https://cloud.google.com/security/best-practices).
- Azure Security Baseline — [https://learn.microsoft.com/en-us/security/benchmark/azure/](https://learn.microsoft.com/en-us/security/benchmark/azure/).

## Categorieën

- appsec
