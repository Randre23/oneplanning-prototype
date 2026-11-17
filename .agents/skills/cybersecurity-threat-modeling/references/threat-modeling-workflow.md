# Threat Modeling Workflow

Detailed method behind the SDLC steps defined in [../SKILL.md](../SKILL.md). Operating mode and per-phase actions live in `SKILL.md`; this file covers the modeling procedure.

## Usage priority

- Primary: greenfield projects (from scratch)
- Secondary: brownfield projects (feature additions, refactors, modernization)

## Inputs (priority order)

1. Product/design artifacts: user stories, requirements documents, business cases, architecture notes
2. Prior security artifacts and outputs
3. Existing project security documents
4. Code/config/CI/IaC (optional enrichment)

For greenfield projects, complete planning/design threat modeling from design artifacts even when no code exists yet.

## Workflow

### 1. Define scope

- Define scope, assumptions, assets, and stakeholders

### 2. Model architecture and trust boundaries

- Build data-flow and trust-boundary view using the data-flow table (§3 in template)
- **Generate a Mermaid trust-boundary diagram** showing components grouped by zones (Internet, DMZ, Private, Isolated), with data flows labeled by protocol

**Trust boundary identification criteria** — a boundary exists wherever the trust level changes across any of these dimensions:

| Dimension | Trust scale (least trusted to most trusted) | Boundary example |
|-----------|----------------------------------------------|------------------|
| Network zone | Internet, DMZ, Private network, Isolated subnet | Traffic entering the DMZ from the internet |
| Identity context | Anonymous, Authenticated user, Authenticated service | An unauthenticated request reaching an authenticated endpoint |
| Authorization scope | Public, Restricted, Privileged (read-only vs read-write) | A read-only consumer gaining write access to a topic |
| Data classification | Public, Internal, Confidential, Regulated (PCI/PII) | A service passing PII to a less-restricted service |
| Organizational ownership | Your system, Third-party provider | An outbound API call to an external PSP or carrier |

**Data flow granularity** — model one row per distinct data exchange that crosses a trust boundary. Include:
- The specific data types crossing (e.g., "JWT access token", "PII: email + address", "payment token")
- The protocol and transport (HTTPS, mTLS, Kafka topic, local IPC)
- Whether the flow is synchronous or asynchronous

A Mermaid diagram showing components grouped by trust boundary is recommended alongside the table for visual orientation, but the table is the authoritative artifact for STRIDE analysis.

### 3. Identify threats (STRIDE)

- Enumerate threats per component and boundary crossing
- For each threat, describe a **realistic attack path**: attacker profile → entry point → attack vector → targeted asset → impact. Do not write generic one-liners.
- When a threat enables another (e.g., XSS enables JWT theft enables account takeover), note the prerequisite threat ID in the register
- **Recommendation:** After threat enumeration is complete, generate a **threat chain diagram** (Mermaid flowchart) showing prerequisites and cascading relationships. This aids in prioritizing which threats block downstream threats.

### 4. Assess existing controls

- For a **new system** (built from scratch): "existing controls" means controls already specified in the architecture spine or design artifacts
- For an **existing system** (already in production): audit the current deployment — document what defenses are actually running BEFORE identifying gaps
- Record both the control mechanism and its known weaknesses or coverage gaps

### 5. Score risk

- Score risks with `Likelihood x Impact` and assign priority (see Core rules in [../SKILL.md](../SKILL.md))
- **Every score MUST include a rationale** explaining why that Likelihood and Impact value was chosen. Example: "Likelihood 4: token exposed to XSS-vulnerable frontend, 15-min window; Impact 4: grants full account access including PII"
- **Recommendation:** After scoring, generate a **risk heat map** (Mermaid scatter plot or table) showing all threats plotted by Likelihood vs. Impact, color-coded by priority band (P0/P1/P2/P3). This provides quick visual prioritization.

### 6. Define mitigations

- For EVERY threat in the register, define: mitigation strategy, type (Prevent/Detect/Recover), owner, due date, and verification method
- Mitigation table has one row per mitigation (Mitigation ID), with a Threat ID(s) column. The mapping is many-to-many: a threat may need several mitigations, and one mitigation may cover several threats
- Complete coverage: every threat has at least one mitigation OR an explicit accepted-risk entry (Accepted risks section)
- Defense in depth: P0/P1 threats should combine at least one Prevent mitigation with at least one Detect or Recover mitigation; if a single control is judged sufficient, state why
- Do not merge distinct controls into one row to limit the number of mitigations — each control with its own owner or verification method is a separate mitigation

### 7. Convert to delivery work

- Convert mitigations into ADRs, stories/tasks, tests, or security debt

### 8. Produce verification checklist and requirements artifacts

- Generate `security-requirements.md`: Each SR derived from threat mitigations, with acceptance criteria and test types
- Generate `security-verification-checklist.md`: Live evidence collection document linking requirements to test results
  - **Key principle:** Evidence collection uses **release-phase triggers** (e.g., "before production release", "per release cycle"), NOT arbitrary calendar dates
  - **Critical constraint - NEVER generate in output:**
    - Specific calendar dates (any YYYY-MM-DD value or month/day reference) — use phase language only
    - Invented person or vendor names (any real-looking name not provided in the input context) — use role-based placeholders [Security Lead Name], [Architect Name]
    - Fake test execution timestamps — these are filled in ONLY during actual test execution
    - Any timestamp, date, or name not explicitly provided in input context
  - **Triage rules:** P1/P2 refer to threat **risk priority from threat model** (9-15 vs. 4-8), not test type
  - **Sample evidence:** All evidence templates are realistic examples only; actual accuracy depends on application implementation and real test execution. Use placeholders like [ACTUAL_TEST_EXECUTION_TIMESTAMP_ISO8601], [SECURITY_LEAD_NAME] in examples.
  - **No Contact/Escalation section:** Threat model verification is verification scope only; incident response procedures belong in separate runbooks
  - **Risk-adjusted priorities are delivery planning work** (sprint allocation, story points), not threat modeling scope

### 9. Validate and maintain

- Publish release security summary with open risks
- Update threat model after major changes to architecture or data flows


## Quality checklist

- Every threat references a concrete component or data flow (DF-ID)
- Every threat description includes an attack path narrative (attacker → entry → vector → asset → impact)
- Every risk has explicit score rationale explaining Likelihood AND Impact values
- Every mitigation has owner, due date, and status
- Every mitigation verification method matches its type (Prevent → test, Detect → alert, Recover → runbook)
- Every unresolved risk has acceptance owner and expiry
- Threat chains are documented (Prerequisite column filled when one threat enables another)
- Evidence links are present for required project security expectations
- **Mitigation coverage is complete: every threat ID appears in at least one mitigation row OR in the accepted-risks section**
- **P0/P1 threats have layered mitigations (Prevent + Detect/Recover) or a stated rationale for a single control**
- **Evidence Collection: Contains NO specific calendar dates (YYYY-MM-DD values) in Due Date, Test Date, or Engagement Period columns — use phase language only ("before production release", "per release cycle")**
- **Evidence Collection: Contains NO invented approver names in Sign-Off sections — use role-based placeholders like [Security Lead Name], [Architect Name]**
- **Evidence Artifacts: All timestamps in sample evidence use placeholders like [ACTUAL_TEST_EXECUTION_TIMESTAMP_ISO8601], never specific dates**
