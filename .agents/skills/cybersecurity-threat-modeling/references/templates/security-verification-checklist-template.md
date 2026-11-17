# Security Verification Checklist - <System or Feature Name>

## Pre-Release Security Gate

| Category | P0 (Score 16-25) | P1 (Score 9-15) | P2 (Score 4-8) |
|----------|------------------|-----------------|----------------|
| **Evidence Required** | ✅ Mandatory PASS | ✅ Mandatory PASS | 🟡 Strongly recommended PASS |
| **Release Blocker** | ❌ YES | ❌ YES | 🟡 Only if many failures |
| **Documentation** | Threat ID, SAST/Pen-test evidence | Threat ID, test evidence | Threat ID, test evidence |

**Release decision logic:**
- **All P0 PASS:** Go to next gate
- **Any P0 FAIL/NO EVIDENCE:** NO-GO; blocker
- **All P1 PASS + P2 optional:** Proceed
- **Any P1 FAIL/NO EVIDENCE:** NO-GO; must remediate and re-test
- **P2 failures:** Document as accepted risk; update risk register

---

## Verification Matrix

**Format:** One row per security requirement derived from threats. Link to threat ID, risk priority (from threat model), and test evidence.

| Requirement ID | Requirement Statement | Threat ID(s) | Risk Priority | Test Type | Evidence Link | Owner | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| SR-01 | | TH-XX | P1 | [See test types below] | [Link to evidence artifact] | | | |

### Test Types (Independent of Risk Priority)

- **Unit Test** → Code-level validation (logic, input bounds, authentication checks)
- **Integration Test** → Service-to-service communication, database queries, workflow steps
- **Network Test** → Protocol compliance (TLS version, cipher strength, mTLS handshake)
- **Penetration Test** → Attacker simulation (XSS/CSRF/injection attempts, privilege escalation)
- **Audit Test** → Configuration review (PII redaction, audit logging, access controls)
- **Compliance Test** → Regulatory evidence (PCI-DSS scan, GDPR data handling, encryption key management)

**Important:** A P1 threat may require multiple test types. For example:
- P1 threat = "Payment token exposure" requires: Unit test (validation logic) + Audit test (TLS configuration) + Compliance test (PCI-DSS evidence)

---

## Evidence Triage Rules

**P1 Test** = Test validating mitigation for a **P1 threat** (Risk Score 9-15)  
**P2 Test** = Test validating mitigation for a **P2 threat** (Risk Score 4-8)  

Evidence is either present OR absent. Test result is either PASS or FAIL. Combined triage:

| Evidence | Test Result | Triage Status | Action |
|---|---|---|---|
| ✅ Collected | PASS | **PASS** | Threat mitigated; evidence accepted |
| ✅ Collected | FAIL | **FAIL** | Mitigation ineffective; requires rework + re-test |
| ❌ Not collected | — | **NO EVIDENCE** | Threat not verified; blocks release unless accepted as risk |

**Release Decision Matrix:**

| P1 Tests | P2 Tests | Release Status | Action |
|---|---|---|---|
| All PASS | All PASS | ✅ **GO** | Proceed to production |
| All PASS | Some FAIL/NO EVIDENCE | 🟡 **GO with conditions** | Document accepted risks in risk register; update compliance tracker |
| Some FAIL/NO EVIDENCE | Any | ❌ **NO-GO** | P1 mitigations must be resolved; re-test and resubmit for gate review |

---

## Evidence Collection Schedule

**Schedule uses release-phase triggers, not arbitrary calendar dates.**

| Phase | Evidence Type | Collection Trigger | Owner | Cadence |
|-------|-------------|-----------|-------|---------|
| **CI/CD** | SAST scan report | Every build | Platform team | Continuous |
| **CI/CD** | Unit test results | Every build | Dev team | Continuous |
| **Pre-Release** | Penetration test report | Before candidate build for production release | Security team | Per release |
| **Pre-Release** | Integration test results | Before candidate build for production release | Dev team | Per release |
| **Pre-Release Gate** | PCI-DSS ASV scan (if applicable) | Before production release | Compliance team | Per release |
| **Pre-Release Gate** | Network security audit | Before production release | Platform team | Per release |
| **Per Release Cycle** | PII scan (log grep for data leaks) | Per release cycle milestone | Platform team | Per cycle |
| **Per Release Cycle** | TLS certificate rotation test | Before production release | Platform team | Per cycle |
| **Annual** | Full penetration test + PCI audit | Annually after go-live or per audit schedule | Security + Compliance | Yearly |
| **On-Change** | Threat model update | When architecture/data flow changes | Architect | As needed |
| **On-Incident** | Security incident review & mitigation validation | After security incident or bug discovery | Security team | As needed |

---

## Sample Evidence Artifacts (Template Reference)

⚠️ **CRITICAL INSTRUCTION FOR LLM GENERATION:**

These are **templates and format examples ONLY**. When generating actual evidence sections:
- **NEVER include specific calendar dates** (any YYYY-MM-DD value or month/day reference)
- **NEVER invent approver, tester or vendor names** (no real-looking person or company names unless provided in the input context)
- **ALWAYS use phase-based language** (e.g., "before production release", "per release cycle")
- **ALWAYS use role-based placeholders** (e.g., "[Security Lead Name]", "[Tester Name]")
- **Actual timestamps and dates are filled in ONLY during real test execution**, not in this template

⚠️ **Important Disclaimer:**

These are **templates and format examples only**, not actual evidence. Actual evidence accuracy depends entirely on:
- How the application is developed (language, framework, library versions)
- Which testing tools are deployed (e.g., SonarQube vs. Checkmarx for SAST; Jest vs. pytest for unit tests)
- Actual test execution results (real tests may pass, fail, or reveal new findings not predicted in this template)

**Use these samples to:**
- Understand the required format and structure of evidence
- Define acceptance criteria for development teams
- Communicate expected evidence structure to security reviewers
- Compare against actual test results once executed

**Do NOT use these as:**
- Proof that tests have actually run
- Actual evidence for release decisions
- Replacements for running real tests and collecting real results
- A source of real dates, approver names, or timestamps

---

### Example: SR-05 Server-Side Price Validation (Unit Test Evidence)

**Requirement:** `POST /api/orders/validate-price` must re-compute line-item totals server-side against the product catalog; frontend price data is not trusted.

**Sample Evidence Structure (Template ONLY — Replace placeholders with actual values):**

```json
{
  "test_name": "Server-Side Price Validation Tests",
  "test_file": "tests/unit/services/order-service.test.js",
  "framework": "Jest",
  "test_cases": [
    {
      "id": "TVP-001",
      "description": "Reject tampered price data from client",
      "input": {
        "item_id": "SKU-12345",
        "client_price": "5.00",
        "catalog_price": "25.00"
      },
      "expected_result": "REJECT - catalog price used, client price ignored",
      "actual_result": "✅ PASS",
      "timestamp": "[ACTUAL_TEST_EXECUTION_TIMESTAMP_ISO8601]"
    },
    {
      "id": "TVP-002",
      "description": "Accept correct prices matching catalog",
      "input": {
        "item_id": "SKU-12345",
        "client_price": "25.00",
        "catalog_price": "25.00"
      },
      "expected_result": "ACCEPT - prices match",
      "actual_result": "✅ PASS",
      "timestamp": "[ACTUAL_TEST_EXECUTION_TIMESTAMP_ISO8601]"
    },
    {
      "id": "TVP-003",
      "description": "Handle currency conversion correctly",
      "input": {
        "item_id": "SKU-12345",
        "currency": "USD",
        "catalog_price_base": "25.00",
        "catalog_price_eur": "23.00",
        "client_price_eur": "5.00"
      },
      "expected_result": "REJECT - EUR price from catalog used, client price ignored",
      "actual_result": "✅ PASS",
      "timestamp": "[ACTUAL_TEST_EXECUTION_TIMESTAMP_ISO8601]"
    }
  ],
  "summary": {
    "total_tests": 3,
    "passed": 3,
    "failed": 0,
    "status": "✅ PASS"
  }
}
```

---

### Example: SR-08 TLS 1.3 + Cipher Strength (Network Audit Evidence)

**Requirement:** All external communication must use TLS 1.3 with strong cipher suites (AEAD ciphers only).

**Sample Evidence Structure (Template ONLY — Replace placeholders with actual values):**

```
Network Security Audit Report
Generated: [ACTUAL_SCAN_DATE_ISO8601]
Auditor: [Audit Team Name]

Endpoint: https://payment-service.example.com:443
---
Protocol Version: TLS 1.3 ✅
Supported Ciphers:
  - TLS_AES_256_GCM_SHA384 ✅ (Strong AEAD)
  - TLS_AES_128_GCM_SHA256 ✅ (Strong AEAD)
  - TLS_CHACHA20_POLY1305_SHA256 ✅ (Strong AEAD)
Weak Ciphers: None ✅

Certificate:
  - Subject: payment-service.example.com
  - Issued by: [Internal CA / Public CA]
  - Expiry: [CERTIFICATE_EXPIRY_DATE] (valid until before next major release)
  - Key: RSA-4096 ✅

HSTS Header: Strict-Transport-Security: max-age=31536000 ✅
OCSP Stapling: Enabled ✅

Status: ✅ PASS - TLS configuration meets requirements
```

**Note:** Actual scan results depend on the real TLS configuration deployed. This is a template showing expected structure. ALL TIMESTAMPS AND DATES ARE FILLED IN DURING ACTUAL TEST EXECUTION, NOT FROM THIS TEMPLATE.

---

## Compliance Evidence Mapping

Link threat model evidence to regulatory/audit frameworks:

| Framework | Applicable Requirements | Threat Model Link | Evidence Status |
|-----------|------------------------|-------------------|-----------------|
| PCI-DSS 3.2 | Req 2, 4, 6, 8 (TLS, encryption, change management) | TH-XX (payment token exposure) | [Link to pentest + network audit] |
| GDPR | Article 5 (confidentiality), Article 32 (encryption) | TH-XX (PII exposure) | [Link to data protection audit + encryption test] |
| ISO 27001 | Control A.10 (cryptography), A.12 (logging) | TH-XX (unauthorized access) | [Link to access control test + audit logging evidence] |

---

## Sign-Off & Review

⚠️ **CRITICAL INSTRUCTION FOR LLM — NEVER INVENT NAMES OR DATES IN SIGN-OFF SECTIONS:**

When generating evidence and sign-off sections:
- **NEVER write a person's name** unless it is explicitly provided in the input context
- **NEVER write a calendar date** (any YYYY-MM-DD value or month/day reference) for sign-off or test execution
- **NEVER pre-tick a signature** — every signature box stays unchecked (☐)
- **ALWAYS use role-based placeholders** like "[Security Lead Name]", "[Architect Name]", "[Date of execution]"
- **Actual sign-off names and dates are collected DURING release process, not in this template**

**Required format for approvals (the only acceptable form):**
```
- Security Lead: [ACTUAL_SECURITY_LEAD_NAME] | Date: [TEST_EXECUTION_DATE] | Signature: ☐
- Architect: [ACTUAL_ARCHITECT_NAME] | Date: [RELEASE_GATE_DATE] | Signature: ☐
```

**Non-compliant patterns (do NOT generate):** a real-looking first and last name in place of a placeholder, a concrete calendar date in place of a date placeholder, or a checked signature (✓) before the actual review has taken place.

---

**Security Review:** [ ] Approved by [Security Lead Name]  
**Architect Review:** [ ] Approved by [System Architect Name]  
**Compliance Review:** [ ] Approved by [Compliance Officer Name] (if regulatory scope applies)  
**Release Gate Trigger:** Before production release / [Architecture change milestone]  

---

**Last Updated:** [Date of template generation or last review]  
**Next Review Trigger:** Before production release / [Major architecture change]

---

### Instructions for Implementation Teams

1. **For each Requirement (SR-XX) in the Verification Matrix:**
   - Identify the corresponding Threat ID(s) and Risk Priority from the threat model
   - Run the test type(s) listed in the Evidence Link column
   - Collect results (pass/fail, timestamps, tool outputs)
   - Update Status column: ✅ PASS / ❌ FAIL / ⏳ IN PROGRESS / ⏸ BLOCKED

2. **Before Release Gate:**
   - Ensure all P0 and P1 threats have test evidence (PASS or FAIL)
   - If any P1 test FAILs, remediate and re-test
   - If evidence cannot be collected, document as "Accepted Risk" with approver signature
   - Run the triage matrix to determine GO / NO-GO decision

3. **For Delivery Teams:**
   - Test types and evidence collection are part of Definition of Done for security-related stories
   - Do NOT mark a mitigation as "Done" without corresponding test evidence
   - If test reveals a failure, file a bug and add to risk register (P0/P1 assessment)

