# Threat Model - <System or Feature Name>

## 1. Scope

- In scope:
- Out of scope:
- Release/Sprint:
- Date:
- Facilitator:
- Security reviewer(s):

## 2. System context

- Business purpose:
- Critical assets:
- Entry points:
- External dependencies:

## 3. Trust boundaries and data flows

### Architectural Context Diagram (Mermaid — Required)

A visual representation of trust zones and key components. Each zone represents a boundary where trust level changes.

```mermaid
[ARCHITECT: Generate a Mermaid diagram grouped by trust boundary zones. Example zones: Internet, DMZ, Private Network, PCI Isolated Subnet, Hardware Security Module. Show component clusters within each zone and arrows representing data flows with protocol labels (HTTPS, mTLS, Kafka, etc.). This aids readers in quickly understanding the security perimeter and isolation boundaries.]
```

**Visual guidelines:**
- Group components by trust boundary (zones)
- Label flows with protocol (HTTPS 1.3, mTLS, Kafka, IPC)
- Highlight PCI-DSS / regulated data flows with distinct styling
- Use subgraph notation to show isolation (e.g., `subgraph PCI_Isolated`)

### Data Flow Table (Authoritative Text Source)

| ID | Source | Destination | Data | Protocol | Trust Boundary Crossed | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DF-01 |  |  |  |  |  |  |

## 4. Threat register (STRIDE)

| ID | Component/Flow | STRIDE | Threat description (attacker profile → entry point → vector → asset → impact) | Prerequisite | Existing controls | Likelihood (1-5) | Impact (1-5) | Score | Score rationale | Priority | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TH-01 |  |  |  | — |  |  |  |  |  |  |  |

## 5. Threat chain and dependency visualization (Mermaid — Recommended for P0/P1)

Shows which threats have prerequisites and how one threat enables another. Critical for understanding attack sequences.

```mermaid
[ARCHITECT: Generate a Mermaid flowchart showing threat prerequisites and chains. Example:
- T-01 (XSS) → enables T-05 (Admin JWT theft)
- T-02 (Price tampering) → enables T-09 (Payment tampering)
- T-16 (SQL injection) → enables multiple downstream threats
Use directed edges to show "enables" relationships. This helps identify which threats must be mitigated FIRST to prevent cascading attacks.]
```

---

## 6. Risk heat map (Mermaid or Table — Recommended)

Visual prioritization of P0/P1/P2 threats by score.

```mermaid
[ARCHITECT: Generate a scatter plot or heat map showing Likelihood (x-axis, 1-5) vs Impact (y-axis, 1-5). Each threat plotted as a dot, color-coded by priority (P0=red, P1=orange, P2=yellow). Threat IDs labeled on dots. This instantly shows which threats dominate the risk profile and deserve mitigation focus.]
```

---

## 7. Mitigation plan

| Mitigation ID | Threat ID(s) | Mitigation | Type (Prevent/Detect/Recover) | Owner | Due date | Status | Verification method |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-01 | TH-01 |  |  |  |  |  |  |
| M-02 | TH-01, TH-03 |  |  |  |  |  |  |

**Instructions:**
- One row per mitigation (not per threat). Threat-to-mitigation mapping is many-to-many:
  - A threat may need several mitigations (defense in depth)
  - A mitigation may address several threats (list all Threat IDs in the same row)
- Complete coverage is mandatory: every threat in Section 4 appears in at least one row, OR is listed in Section 8 as an accepted risk
- Defense in depth for P0/P1 threats: at least one **Prevent** mitigation plus at least one **Detect** or **Recover** mitigation, unless the rationale for a single control is stated
- Do not merge distinct controls into one row just to reduce row count — each control with its own owner or verification method gets its own Mitigation ID
- Verification method guidance by type:
  - **Prevent** → specific test (unit test, SAST rule, network policy test, pen test scenario)
  - **Detect** → monitoring/alerting (Datadog alert, WAF rule, log-based alert query, anomaly detection)
  - **Recover** → runbook reference, automated failover test, or disaster recovery drill

## 8. Accepted risks

| Threat ID | Reason for acceptance | Approver | Expiry date | Review trigger |
| --- | --- | --- | --- | --- |
| TH-XX |  |  |  |  |

## 9. Security requirements derived

| Requirement ID | Requirement statement | Linked threat(s) | Acceptance criteria |
| --- | --- | --- | --- |
| SEC-01 |  |  |  |

## 10. Verification checklist reference

**This section is a placeholder.** Refer to the standalone **security-verification-checklist.md** document for:

- Full Verification Matrix (Requirement ID → Test type → Evidence link → Owner → Status)
- Evidence Triage Rules (P1/P2 interpretation tied to threat risk priority from Section 4)
- Evidence Collection Schedule (phase-based triggers, not arbitrary dates)
- Sample Evidence Artifacts (templates only; actual accuracy depends on implementation)
- Pre-Release Security Gate (GO/NO-GO decision matrix)
- Compliance Evidence Mapping

The verification checklist is maintained as a live document by the implementation team and updated as test evidence is collected.

**Template location:** `references/templates/security-verification-checklist-template.md`

## 11. Compliance evidence mapping

- PCI-DSS link (if payment processing involved):
- GDPR link (if PII or EU customers involved):
- ISO 27001 link (if information security scope applies):
- Other regulatory frameworks:

## 12. Review summary

- Open P0 threats:
- Open P1 threats:
- Risk acceptance summary (threats with no mitigation):
- Go/No-Go recommendation:
- Next review trigger (architecture change / before next production release):
