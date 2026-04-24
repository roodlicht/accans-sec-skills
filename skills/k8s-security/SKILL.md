---
name: k8s-security
description: Kubernetes security review — RBAC discipline, Pod Security Standards (baseline/restricted), NetworkPolicy default-deny, admission controllers (Kyverno/Gatekeeper/VAP), External Secrets Operator, and runtime monitoring via Falco and audit logs.
---

# Kubernetes Security

## Wanneer gebruiken

Deze skill dekt de cluster-en-workload-laag boven op `container-hardening`. Image-inhoud en build zit daar; wat K8s met die images doet (scheduling, RBAC, networking, secrets, runtime-policy) zit hier.

Activeert bij:

- Een vraag als "review onze K8s-manifests", "onze RBAC loopt uit de hand", "zet Pod Security Standards aan", "schrijf een NetworkPolicy", "welke admission-controller is verstandig", "cosign-verification in de cluster".
- Nieuwe of gewijzigde manifests: `Deployment`, `StatefulSet`, `DaemonSet`, `Job`, `ServiceAccount`, `Role(Binding)`, `ClusterRole(Binding)`, `NetworkPolicy`, `ValidatingAdmissionPolicy`, Helm-charts, Kustomize-overlays.
- Een cluster-audit uit compliance (CIS Kubernetes Benchmark, NSA/CISA guide, PCI-DSS cloud-scope).
- Een handoff vanuit `security-review` wanneer K8s in de scope zit.
- Een incident waar laterale beweging in een cluster wordt vermoed (zie `ir-runbook` voor response).

### Wanneer NIET (handoff)

- Container image-inhoud (base-image, USER, caps) → `container-hardening`. Deze skill neemt de image als gegeven.
- Cluster-provisioning IaC (EKS/GKE/AKS-module, node-groups, VPC) → `iac-security`. Manifest-niveau hier, infrastructuur-niveau daar.
- CI-pipeline die manifests toepast → `cicd-hardening`. GitOps-controllers (Argo CD, Flux) noemen we hier alleen ter context.
- Secret backend (Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault) → `secrets-scanner`. External Secrets Operator bridgt beide.
- Per-CVE in K8s-componenten of sidecars → `cve-triage`.
- Service-mesh-config (Istio AuthorizationPolicy, mTLS, Linkerd) ligt deels in scope (auth/runtime), deels buiten (traffic-management is ops).
- Pentest tegen een cluster → `recon-agent` + `web-exploit-triage`.

## Aanpak

Zes fases. Fase 1–3 vormen de cluster-basis, fase 4 bridgt naar externe secrets, fase 5 dekt runtime.

### 1. Cluster-baseline: RBAC, Pod Security Standards, admission

De drie controls die bij een nieuwe cluster meteen moeten staan.

**RBAC-discipline**:

- **Default deny voor service accounts.** `automountServiceAccountToken: false` op de namespace-default service account plus op elke Pod die API-toegang niet nodig heeft. De default-SA die in elke pod gemount wordt, is de meest misbruikte aanval-trampolin.
- **Least-privilege roles.** Wildcards (`verbs: ["*"]`, `resources: ["*"]`) zijn red flags. Splits lees en schrijf, scope op specifieke resources, gebruik `Role` (namespace-scoped) boven `ClusterRole` waar kan.
- **Geen cluster-admin voor applicaties.** `cluster-admin` ClusterRole mag alleen voor human operators en zelfs daar liefst via just-in-time escalatie.
- **Kyverno/Gatekeeper-policy die high-risk RBAC blokkeert**: geen wildcards in prod-namespaces, geen bindings aan `system:anonymous`, geen escalatie naar `cluster-admin`.
- **Audit wat er aan rechten staat**: `kubectl auth can-i --list --as=system:serviceaccount:<ns>:<sa>`. Of tools als `rbac-lookup`, `krane`, `permission-manager`.

**Pod Security Standards (PSS)** zijn sinds Kubernetes 1.25 de vervanger van PodSecurityPolicy. Drie niveaus, afgedwongen per namespace via labels:

- **privileged** — alles toegestaan. Alleen voor systeem-workloads die het nodig hebben.
- **baseline** — voorkomt bekende privilege-escalatie (geen hostNetwork, geen privileged containers, beperkte hostPath, geen linux-capabilities buiten defaults).
- **restricted** — harden-by-default: runAsNonRoot, readOnlyRootFilesystem, seccomp RuntimeDefault, alle caps gedropt plus NET_BIND_SERVICE-achtige expliciete adds, geen privilege escalation, volume-types beperkt.

Labels per namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.29
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

`enforce` blokkeert, `audit` logt, `warn` waarschuwt bij `kubectl apply`. Begin met `warn`+`audit`, migreer naar `enforce` als findings gladgetrokken zijn.

**Admission controllers** voor regels die PSS niet dekt:

- **Kyverno** — YAML-policies, no-code, sterker op mutation (bv. automatisch `readOnlyRootFilesystem: true` injecteren). Default-keuze voor teams zonder Rego-ervaring.
- **OPA Gatekeeper** — Rego-policies, deeper logic mogelijk, zelfde engine als `iac-security` fase 4. Default-keuze als je OPA al gebruikt.
- **ValidatingAdmissionPolicy (VAP)** — built-in in Kubernetes 1.30+, CEL-expressions in plaats van Rego. Geen externe controller nodig, lichter dan Gatekeeper, minder feature-rijk. Gebruik voor simpele policies.

Eén van deze is genoeg. Alle drie samen is onderhoudslast zonder meerwaarde.

### 2. Workload-hardening: securityContext in Pod-spec

Dit is de brug tussen `container-hardening` (wat er in de image zit) en wat K8s er daadwerkelijk mee doet. Elke Deployment/StatefulSet/Job hoort dit blok:

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: app
          image: <registry>/<image>@sha256:<digest>
          imagePullPolicy: IfNotPresent
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
              # alleen toevoegen wat strikt nodig:
              # add: ["NET_BIND_SERVICE"]
          resources:
            limits:
              cpu: "500m"
              memory: "512Mi"
            requests:
              cpu: "100m"
              memory: "128Mi"
```

Per veld kort:

- **runAsNonRoot + runAsUser** — backup als image geen USER-directive heeft. Explicitely zet een niet-root UID.
- **readOnlyRootFilesystem** — writable paden via `emptyDir` of persistent-volume mounts, rest is read-only. Malware-persistentie binnen de container wordt moeilijker.
- **seccompProfile RuntimeDefault** — Docker/containerd-default seccomp-filter aan. In restricted-PSS vereist.
- **capabilities drop ALL** — geen Linux-caps tenzij expliciet toegevoegd.
- **allowPrivilegeEscalation false** — blokkeert setuid-escalatie.
- **resource limits** — voorkomt dat één pod het node uitput (DoS-amplificatie). Limits én requests, niet alleen één van beide.
- **imagePullPolicy** — IfNotPresent met digest-pin; `Always` alleen bij mutable tags (wat je in productie niet wil).

### 3. Netwerk-isolatie: NetworkPolicy default-deny

Zonder NetworkPolicy is intra-cluster traffic volledig open. Default-deny installeren, daarna per Pod/namespace toestaan wat nodig is.

Default-deny per namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

Daarna expliciete allow-policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-web
  namespace: payments
spec:
  podSelector:
    matchLabels: { app: payment-api }
  policyTypes: [Ingress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { role: web }
          podSelector:
            matchLabels: { app: web-frontend }
      ports:
        - protocol: TCP
          port: 8080
```

Egress naar het internet: allowlist van DNS-resolvable hostnames kan niet met vanilla NetworkPolicy (die werkt op pod/namespace-selectors en IP-CIDR's). Voor FQDN-egress gebruik je een CNI met FQDN-support (Cilium, Calico Enterprise) of een egress-proxy (Istio egress gateway, Squid).

Cilium en Calico hebben ook `ClusterwideNetworkPolicy` voor policies die boven namespaces zweven — handig voor baseline-defaults.

### 4. Secrets: waarom K8s Secrets niet genoeg zijn, en wat wel

`kind: Secret` is base64, niet encryption. Wie RBAC-toegang heeft tot `secrets.get` in de namespace leest alles. Wel encrypted-at-rest in etcd als je de kube-apiserver `--encryption-provider-config` hebt ingesteld — maar dat is opt-in en vaak niet gebeurt.

Drie aanpakken, stijgend in volwassenheid:

- **SealedSecrets** (Bitnami). Encrypt de secret offline met cluster-public-key, commit het versleutelde object in git. Handig voor GitOps; één cluster = één key-paar.
- **External Secrets Operator (ESO)**. Pull-model: ESO synct externe secret-stores (Vault, AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Doppler, Infisical) naar K8s-Secret-objects. Dat object in de Pod is nog steeds base64, maar de source of truth is buiten het cluster. Default-keuze in enterprise-contexten.
- **Secrets Store CSI Driver**. Mount secrets als files via een CSI volume; geen K8s-Secret-object tussenstap. Secrets nooit in etcd. Zwaarder om op te zetten, schoner qua threat-model.

Bij alle drie: secret-rotatie blijft een externe verantwoordelijkheid (zie `secrets-scanner` fase 4). K8s-ESO zorgt alleen voor sync.

IRSA (IAM Roles for Service Accounts) op EKS, Workload Identity op GKE, Managed Identity op AKS: bind de SA direct aan een cloud-IAM-role, geen statische API-key nodig. Default-aanbeveling voor cloud-workloads.

### 5. Runtime-monitoring

Wat gebeurt er eigenlijk in de cluster, en merk je dat op tijd?

- **Kubernetes audit log**. `--audit-policy-file` op kube-apiserver. Minimaal: alle RBAC-changes, alle secret-reads door non-system-accounts, alle `exec`/`attach`-acties, alle `escalate`/`bind`-verbs. Stream naar SIEM (zie `siem-query` en `log-triage`).
- **Falco** (CNCF OSS). eBPF/kernel-based syscall-monitoring met regelset voor anomalieën: shell-in-container, `cat /etc/shadow`, `chmod 777` in prod-namespaces, netwerk-connecties naar bekende C2. Default-keuze voor runtime-threat-detection in open-source.
- **Tetragon** (Cilium) — eBPF-based observability plus enforcement. Vergelijkbaar met Falco, meer kernel-level.
- **KubeArmor** — runtime-enforcement met AppArmor/BPF.
- **Service-mesh-auth** — Istio `AuthorizationPolicy` of Linkerd policy voor mTLS-enforcement tussen services. Vervangt NetworkPolicy niet, vult hem aan op L7-niveau.

Alerts uit Falco etc. gaan naar `detection-engineer` voor rule-tuning en `ir-runbook` voor response.

### 6. Verification-loop

Laag 1: scope (alle namespaces een PSS-label? alle Pods een securityContext? alle namespaces een default-deny NetworkPolicy?), aannames ("we gebruiken Workload Identity" alleen als je de SA-annotations daadwerkelijk hebt gezien), gaps (audit log activated, Falco-alerts gerouteerd, runtime-monitoring dekt ook kube-system), consistentie (PSS-level matcht met daadwerkelijke securityContext-settings).

Laag 2: K8s API-versies en veldnamen kloppen (PSS-syntax veranderde met 1.25, VAP is 1.30+), CVE-referenties naar K8s-componenten tegen NVD geverifieerd, geen verzonnen Kyverno-policy-snippets die niet tegen echte CRDs draaien.

## Output

```
K8s security review — <cluster/namespace/app>
Scope: <manifests, Helm-charts, namespaces>

Cluster-baseline:
  RBAC:             <audit-bevindingen, wildcards, over-permissive>
  PSS per namespace:<tabel: namespace → enforce/audit/warn>
  Admission:        <Kyverno | Gatekeeper | VAP | geen>

Workload-hardening:
  Pods zonder securityContext: <N>
  runAsNonRoot false:          <N>
  readOnlyRootFilesystem false: <N>
  capabilities niet gedropt:   <N>
  Geen resource limits:        <N>

Netwerk:
  Namespaces zonder default-deny: <lijst>
  Egress-policies aanwezig:       <ja/nee per namespace>
  FQDN-egress via: <CNI | proxy | geen>

Secrets:
  Native K8s Secrets in use: <N, zijn ze source-of-truth of ESO-synced?>
  Encryption at rest etcd:   <aan/uit>
  Workload Identity:         <ja/nee per service>

Runtime:
  Audit log aan:   <ja/nee>
  Falco/Tetragon:  <deployed, alerts geroute>
  Service-mesh:    <Istio/Linkerd/geen, mTLS-scope>

Findings (severity-gesorteerd)

Verification-loop: ...
```

Per finding: location (manifest of resource), CIS-benchmark-ID waar relevant, CWE-ID waar van toepassing, severity, fix (YAML-snippet in plaats van proza).

## Referenties

- Kubernetes Pod Security Standards — [https://kubernetes.io/docs/concepts/security/pod-security-standards/](https://kubernetes.io/docs/concepts/security/pod-security-standards/). Officiële definitie privileged/baseline/restricted.
- Kubernetes RBAC — [https://kubernetes.io/docs/reference/access-authn-authz/rbac/](https://kubernetes.io/docs/reference/access-authn-authz/rbac/).
- Kubernetes NetworkPolicy — [https://kubernetes.io/docs/concepts/services-networking/network-policies/](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
- ValidatingAdmissionPolicy — [https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/). Built-in alternatief voor OPA/Kyverno vanaf 1.30.
- CIS Kubernetes Benchmark — [https://www.cisecurity.org/benchmark/kubernetes](https://www.cisecurity.org/benchmark/kubernetes). Audit-checklist.
- NSA/CISA Kubernetes Hardening Guide — [https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF). Semi-governmental baseline.
- OWASP Kubernetes Top 10 — [https://owasp.org/www-project-kubernetes-top-ten/](https://owasp.org/www-project-kubernetes-top-ten/).
- NIST SP 800-204B — [https://csrc.nist.gov/pubs/sp/800/204/b/final](https://csrc.nist.gov/pubs/sp/800/204/b/final). Microservices + service-mesh security.
- Kyverno — [https://kyverno.io/](https://kyverno.io/). YAML policy-engine.
- OPA Gatekeeper — [https://open-policy-agent.github.io/gatekeeper/website/](https://open-policy-agent.github.io/gatekeeper/website/).
- External Secrets Operator — [https://external-secrets.io/](https://external-secrets.io/).
- Secrets Store CSI Driver — [https://secrets-store-csi-driver.sigs.k8s.io/](https://secrets-store-csi-driver.sigs.k8s.io/).
- Falco — [https://falco.org/](https://falco.org/). Runtime threat detection.
- Cilium — [https://docs.cilium.io/](https://docs.cilium.io/). CNI met FQDN-egress en Tetragon-integratie.

## Categorieën

- appsec
