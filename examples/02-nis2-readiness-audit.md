# Example 2 — NIS2 readiness audit (NL/EU context)

**Profile**: `grc`. **Items chained**: `nis2` → `iso27001` (mapping) → `risk-register` → `policy-drafter` → `vendor-questionnaire` → `audit-evidence`.

> **Disclaimer**: this walkthrough is technical and procedural. NIS2 entity classification, sanction exposure, and contractual implications require a qualified legal advisor. The skills cited here help structure the work; they do not substitute for legal review.

## Scenario

A medium-sized SaaS provider (~200 FTE, financial sub-sector adjacent) needs to know whether the EU NIS2 Directive applies, what the obligations look like, and how to demonstrate readiness ahead of a possible Dutch Cyberbeveiligingswet audit. The CISO wants a structured plan.

## Walkthrough

### Step 1 — Scope determination via `nis2`

Run a scoping pass against the NIS2 Directive (2022/2555).

- **Sector**: identify against Annex I (essential entities) and Annex II (important entities). Sub-codes matter — the SaaS provides cloud-services, so likely Annex I §8 (digital infrastructure) sub-categories apply.
- **Size criterion**: 200 FTE exceeds the 50-FTE / €10M threshold, so size is in scope.
- **EU service-provision**: confirmed.
- **Subsidiaries / holdings**: NIS2 works at entity level. Inventory each legal entity and run scoping individually.

Output: classification (essential vs important), with rationale tied to specific Annex entries. Document any judgement-call cases for legal review.

### Step 2 — Map the 10 baseline measures (Art 21) to existing controls

The `nis2` skill links each Art 21 measure to a corresponding ISO 27001:2022 Annex A control. Hand off to `iso27001` for the mapping detail.

| Art 21 measure | ISO 27001:2022 A-control(s) | Internal status |
|---|---|---|
| 1. Risk-analysis + infosec policy | A.5.1, A.5.2 | Policy in place; risk-register exists |
| 2. Incident handling | A.5.24, A.5.26 | IR runbook v3 (last reviewed Q1) |
| 3. Business continuity | A.5.29, A.5.30 | BCP exists; last tabletop > 12 months ago |
| 4. Supply-chain security | A.5.19–A.5.23 | Vendor list present; assessments inconsistent |
| 5. Acquisition / development / maintenance | A.8.25, A.8.28 | Secure-SDLC partially adopted |
| 6. Effectiveness evaluation | A.5.36 | Internal audit annually |
| 7. Cyber-hygiene + training | A.6.3 | Yearly awareness; no targeted phishing-sim |
| 8. Cryptography | A.8.24 | Crypto policy v1 |
| 9. HR + access + asset mgmt | A.5.11, A.6.1, A.8.1 | In place, last reviewed Q3 |
| 10. MFA + secure communications | A.8.5 | MFA on admin only; user-rollout planned |

Gaps surface here: measure 4 (supply-chain), measure 7 (no phishing-sim), measure 10 (MFA not universal).

### Step 3 — Fold gaps into the risk register via `risk-register`

For each gap, formulate as a risk in the `threat + vulnerability + consequence` shape:

> "An unauthorized actor exploits a vendor with weaker security controls than ours and uses that supply-chain path to access customer data, resulting in a NIS2 reportable incident plus AVG breach notification under Art 33."

Each risk receives qualitative `likelihood × impact` (5×5 scale), inherent-vs-residual scoring, and a treatment decision (avoid / modify / share / retain) with owner and deadline. Boundaries against the entity's documented risk-appetite drive prioritization.

### Step 4 — Draft policy artifacts via `policy-drafter`

Tier-1 (Information Security Policy) is in place. Add or refresh:

- **Vendor Management Policy** to address measure 4. Use the six-section structure from `policy-drafter`: Purpose / Scope / Statement / Roles / Compliance / Review.
- **Cryptography Policy** if v1 is more than 2 years old.
- **MFA / Access Control Policy update** to reflect universal-MFA rollout.

Each policy carries an explicit review-cadence and event-driven trigger (significant incident, scope change, regulatory amendment).

### Step 5 — Vendor inventory via `vendor-questionnaire`

For measure 4 specifically: tier the vendor inventory (3-tier on data-access × business-criticality × regulatory-scope), select frameworks (CAIQ for cloud-providers, SIG-Lite for SaaS), and standardize on attestation-first evidence (SOC 2 Type II report + ISO 27001 certificate) for tier-1 vendors.

Result: a structured vendor register that doubles as evidence for both NIS2 measure 4 and (if the entity falls under DORA in parallel) DORA Art 28(3) Register of Information.

### Step 6 — Assemble evidence for audit via `audit-evidence`

Per Art 21 measure, the `audit-evidence` skill maps each control to its evidence-types: policies (inspection), incident-tickets (inspection + re-performance), training-completion logs (inspection), vendor-assessments (inspection), MFA-coverage reports (automated). Period-tagging is critical because NIS2 Art 23 incident reporting timelines (24h / 72h / 1 month) imply a forward-looking evidence stream, not a one-time snapshot.

Storage: a versioned evidence repository. WORM is overkill for this scope; access-controlled + versioned is sufficient.

### Step 7 — Verification-loop on the readiness package

Before delivering the report to the board:

- **Layer 1**: scope (all measures touched? all entities in the legal structure included? sub-processors via vendors mapped?), assumptions (any "we already do this" that lacks evidence?), gaps (legal review still pending — that's a real gap, not a polishing-detail).
- **Layer 2**: NIS2 article references verified against EUR-Lex; Cyberbeveiligingswet implementation status marked `[verify against latest tweedekamer.nl status]` because the legislative track has shifted; AP and RDI role-attributions current.

## Final deliverable

A NIS2 readiness package with:

- Scope determination + classification (essential / important).
- Per-measure status against Art 21, mapped to ISO 27001 Annex A.
- Gap list with risk-register entries, owners, and deadlines.
- Policy artifacts, in draft or refreshed.
- Vendor register tiered for measure 4.
- Evidence-collection plan tied to the upcoming observation period.
- Verification-loop verdict.
- Explicit pending-items for legal review (entity classification confirmation, sanction exposure, contract-clause harmonization).

## What this demonstrates

- **Multi-framework chaining**: NIS2 obligation → ISO 27001 Annex mapping → risk-register entries → policy artifacts → vendor questionnaire → audit-evidence. One coherent track.
- **Discipline**: every legal claim cites EUR-Lex or the Dutch source; nothing is asserted from memory. `[verify]` markers preserve epistemic honesty for items that depend on currently-shifting law.
- **Boundary**: legal interpretation, sanction-risk exposure, and contractual implications are flagged as out-of-scope for the skills and deferred to a qualified jurist. The skills structure the technical and procedural readiness.
