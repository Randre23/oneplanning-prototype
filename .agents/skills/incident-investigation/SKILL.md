---
name: incident-investigation
description: >
  Autonomous and semi-autonomous skill for ingesting incident alerts,
  qualifying severity, isolating root causes across tech/business layers,
  and recommending or executing workarounds.
inputs:
  - alert_source: string
  - alert_payload: object
  - target_environment: string
outputs:
  - incident_summary: object
  - incident_qualification: object
  - evidence_and_signals: list
  - root_cause_hypothesis: list
  - mitigation_plan: list
  - recommended_action: string
  - crisis_escalation_status: boolean
license: Apache-2.0
metadata:
  owner: sig-reliability
  category: reliability-operations
  version: 1.0.0
  last-updated: "2026-11-04"
---

# INCIDENT INVESTIGATION SKILL

## GLOBAL GUIDELINES

Apply these guidelines at every investigation step and when writing every response:

- **Mitigate first:** This skill is for investigating and mitigating an active or recent incident. Prioritize removing or reducing user-impacting symptoms. A long-term fix is optional unless it is quick, low-risk, and directly resolves the incident, or is the only viable mitigation.
- **Stay within incident-command authority:** Recommend actions the Incident Commander (IC) can perform, authorize, or assign to an accountable team. State the owner, required access or approval, and operational risk. Do not execute a state-changing action without explicit authorization. Do not recommend unrelated engineering work or postmortem improvements such as better alerting or detection.
- **Require temporal relevance for error signals:** Treat an error as incident-relevant only if it first appears in the same observation window as impact onset, or if an existing error signal materially increases at or after onset. Compare with the pre-incident baseline over the same time resolution, quantify the increase when possible, and state the time window. An unchanged background error is not evidence for this incident. Temporal correlation alone does not prove causation.
- **Separate evidence from inference:** Label observed facts, hypotheses, and unknowns clearly. Connect claims to a source and time window; include dashboard, log, trace, ticket, or runbook links when available. Never invent measurements, links, commands, or conclusions. Use `Unknown` or `Not checked` when information is unavailable.
- **Keep the occurrence in view:** Establish `T0` for this occurrence, not the first historical appearance of a similar issue. Continue to investigate cause and impact even if the service has recovered; distinguish current status from the incident's peak impact.
- **Prioritize discriminating checks:** Prefer checks that can confirm or rule out the leading hypothesis and guide a mitigation. Avoid broad investigation that does not change the IC's next decision.
- **Use available integrations deliberately:** Check which MCPs, tools, and local skills are available in the current session. Prefer read-only integrations for evidence gathering; tool availability does not grant permission to change production state. Do not claim a tool or access path is available unless verified.
- **Respect integration boundaries:** Use Datadog MCP for observability, Atlassian MCP for Jira/Confluence, GitHub MCP for repository/change evidence, and the `kube-diagnose` skill for read-only Kubernetes inspection when available. Use SMA-X MCP only if configured. If no suitable MCP is available, name the approved runbook, console, CLI, or accountable operator as the next path; do not invent an MCP or command.
- **Validate technology recommendations:** Follow the Decathlon Tech Radar skill for technology/tool recommendations. If the radar cannot be reached, state that validation is unavailable and do not present a technology as radar-approved.
- **Require explicit authorization for mutations:** Never run a restart, rollback, scale operation, traffic/configuration change, offset reset, credential rotation, cache purge, or external communication without explicit IC authorization and the required owner/access. Read-only MCPs and diagnostic skills do not perform or authorize these actions.

## REQUIRED RESPONSE FORMAT

Use these sections in this order for every investigation response. Keep the first section concise; use `Unknown`, `Not established`, or `Not checked` rather than omitting a field.

### Incident Summary

- **Symptom onset (`T0`):** Timestamp and timezone, or `Unknown`; include the signal/source used to establish it.
- **Affected service:** Service, product, environment, and region; mark unknown fields explicitly.
- **Current status:** Ongoing, recovered, or unclear, with the latest check time.
- **Most probable root cause:** One concise hypothesis, or `Not established`; include confidence (`High`, `Medium`, or `Low`).
- **Next IC action:** The single highest-priority action to reduce impact, or `No action identified`; include the responsible owner.

### Impact and Timeline

State severity/criticality, affected endpoints or user journeys, technical and business impact, peak/current scope, and the key timestamps from first symptom to current state. Distinguish confirmed impact from suspected impact. Use a table with columns `Time (timezone)`, `Event/status`, `Evidence/source`, and `Impact`.

### Evidence and Signals

Use a table with columns `Signal and source/link`, `Component/scope`, `Time window`, `Pre-incident baseline vs. incident behavior`, and `Relevance`. Include concurrent alerts, changes, dependency health, and useful negative findings when checked. Apply the temporal-relevance rule to every error signal.

### Root Cause Analysis

Use a table in descending likelihood with columns `Rank`, `Hypothesis`, `Likelihood (High/Medium/Low)`, `Impact (Critical/Major/Minor)`, `Confidence (High/Medium/Low)`, `Evidence for`, `Evidence against`, and `Next discriminating check`. Include plausible rejected alternatives when useful; label them clearly and do not present them as established causes.

### Mitigation and Resolution

Use a table in priority order with columns `Priority`, `Action`, `Expected symptom relief`, `IC/assignee`, `Preconditions/access/approval`, `Risk/blast radius`, and `Success check/rollback condition`. Identify the recommended next action in the summary. Separate immediate mitigation from an optional long-term fix, and include the latter only under the rules above.

### Unknowns and References

List only missing information that could change the root-cause assessment or IC decision, with the next check and owner if known. Link the dashboards, logs, traces, runbooks, incident records, or change records used.

## 0. TRIGGER INGESTION
When an incident investigation is asked, classify the source of the alert:
- **Alert Sources:** `PagerDuty`, `Datadog` (SLI/SLO, Warning, Infra, Business), `SMAX`, `Human Report`.
- **Action:** Parse incoming alert metadata, affected service IDs, timestamp, and initial error strings (If human report, gather detailed description from the reporter. If you miss information from the first prompt, request additional details).
- **Tool routing:** For Datadog alerts, use available Datadog MCP event/monitor searches to retrieve the triggering alert and its timestamps. For SMAX, use the SMA-X MCP if configured; use Atlassian MCP only for Jira/Confluence records. No PagerDuty MCP is assumed: use the supplied alert payload or an authorized PagerDuty interface. For a human report, ask the reporter or IC for the missing impact and onset details.
<!-- How to avoid being blocked when triggered in async (aka no chat) -->

---

## 1. INCIDENT ASSESSMENT

### 1.1 Locate the context of the incident
- Identify the Decathlon Product. With **affected service(s)**, **environment**, and **region**.
- Determine the **alert type** (e.g., SLI/SLO breach, infrastructure failure, application error, external dependency outage).
- **Tool routing:** Use Knowledge graph for service identity, ownership, and upstream/downstream dependencies; search dashboards for product/service views. Do not infer the owning team or Datadog organization from a similar service name.

### 1.2 Sanity Check - Removal of doubt
- Verify if the issue is **actively ongoing** or was a temporary spike.
  - If the alert comes from a monitoring system, check the last 5 minutes of metrics to confirm the anomaly (For the SLO, check the burnrate evolution on last 5 minutes).
- Query live metrics or execute active health probes.
- **Tool routing:** Use Datadog monitor, metric, event, and dashboard searches for the current window and a comparable pre-incident baseline. A health probe is an authorized read-only check only when its endpoint and method are known; never probe by guessing. Continue with the incident window even when the latest signals show recovery.

## 2. QUALIFICATION & IMPACT
### 2.2 Severity & Criticality
- Evaluate the **Golden Signals** (Latency, Traffic, Errors, Saturation) across relevant components (e.g., APIM, Loadbalancer, Application, Databases).
- Focus on major variations in traffic, error rates, latency spikes, or saturation thresholds.
- **Tool routing:** Use Datadog metric searches and dashboard queries for the relevant service, endpoint, region, and component; use span searches/aggregation to locate latency and error contributors. Use RUM events, operation summaries, or waterfalls only when the affected journey has RUM coverage (frontend applications only). If a layer has no telemetry, record it as `Not checked` rather than inferring its health.

### 2.3 Impact Scoping
- Thanks to Golden Signals, determine **Tech Impact** (error rates, degraded endpoints) and **Business/Quality Impact** (functional impact, user workflow degradation).
- Also use User Journey mapping to assess the impact on the end-user experience.
- Identify exact **Symptom Onset Time** ($T_0$).
  - Here we want to find the first signals that triggered the alert for this occurrence, not espacially the first historical apparition.
- Refer to relevant Dashboards and System Documentation.
- **Tool routing:** Use Datadog RUM for observed user/session or journey signals where instrumented, then use the product's journey map and business documentation from Confluence. Ask the product/support owner to confirm uninstrumented business impact; distinguish that confirmation from telemetry evidence.

---

## 3. ROOT CAUSE INVESTIGATION (RECHERCHE RC)

### 3.1 Historical & Parallel Context
- Query parallel monitoring systems for concurrent alerting monitors on the same service (or on related services for this Decathlon Product).
- Search past incident reports (SMAX), and cross-team issue history for similar patterns.
- **Tool routing:** Use Datadog event/monitor/incident searches for concurrent signals. Search incident records in SMA-X MCP if configured; Compare timestamps and affected scope; similar historical incidents are context, not evidence that the current cause is the same.

### 3.2 Dependency & Layer Analysis
- Map internal and external dependencies by architectural layer (Internal : Infra, Middleware, Application, API. External: Other Decathlon APIs, External Vendors <!--Skill "upbro"-->).
   - If the incident is related to a specific service inside Decathlon Knowledge graph, check its **Service Dependency Graph** for upstream/downstream dependencies. You may also look for the **Service Health Status** of each dependency (e.g., Datadog, PagerDuty incidents, SMAX tickets).
- Inspect container/orchestration health (e.g., `Pod Status`, restarts, OOMKilled events).
- **Tool routing:** Use Datadog service entity relationships to identify direct dependencies and their telemetry. For Kubernetes workloads, use the `kube-diagnose` skill and its read-only `kubectl` checks; do not use it to restart or modify resources. Verify external dependency status through its documented status source or owner.

### 3.3 Search Surface Reduction
- Narrow investigation scope down to specific **Availability Zones** or **Features** based on signal routing (In Datadog, search for filters on features / datacenter / region ...).
- **Tool routing:** Apply the service's actual Datadog tags/template variables (environment, region, zone, feature, endpoint) to monitor, metric, log, span, and RUM searches. Preserve the broader aggregate as a comparison; do not assume tag names.

### 3.4 Change & Active Intervention Detection
- Check recent or ongoing changes: Code deployments <!--(Github MCP or GCS Github events)-->, Configuration updates <!--(Github MCP or GCS Github events)-->, External vendor maintenance, or CAB interventions (via cab-events-extraction skill).
- **Tool routing:** Use GitHub MCP commit, pull-request, and deployment/repository evidence searches to identify candidate code changes; repository activity alone does not prove deployment. Use the `cab-events-extraction` skill with Atlassian Confluence access for CAB records. Check the actual deployment/configuration source or ask its owner to confirm production rollout and timing.

### 3.5 Observability Deep-Dive
- Inspect active **Logs**, **Traces**, and telemetry.
- **Tool routing:** Use Datadog log and span searches, trace retrieval, and RUM details when relevant. Narrow by service, environment, and incident window, then compare with baseline. Enabling debug logging or changing retention is a stateful operational change: route through the service owner and approved procedure; do not attempt it through an unrelated observability MCP.

### 3.6 Historical Post-Mortem Correlation
- If you didn't find anything really relevant, cross-reference with historical post-mortems for similar incidents. Postmortem entries <!-- See Confluence --> should be reviewed.
- **Tool routing:** Search Confluence post-mortem pages and linked Jira actions with Atlassian MCP; use SMA-X MCP for incident history if configured. Cite the source page/ticket and distinguish prior findings from current-occurrence evidence.

### 3.7 Hypothesis Generation
- Formulate a list of **Root Cause Hypotheses** based on the above analysis.
- Rank hypotheses by likelihood and use the fields defined in **Root Cause Analysis** in the required response format.
- Base confidence on the quality and coverage of evidence, not on likelihood alone. State evidence both for and against each leading hypothesis, and identify a next check that could change its ranking.
- Include unlikely or rejected alternatives when they are plausible and useful to the IC's decision; label them as rejected or low likelihood, not as confirmed causes.

---

## 4. DECISION ENGINE

### 4.1 Risk & Recovery Evaluation
- Check if the identified issue maps to a **Known Recovery Plan** / Risk management Playbook / Documented DRP, based on the symptoms.
- Assess execution risk vs. blast radius of potential actions.
- **Tool routing:** Retrieve the service's approved recovery plan from Confluence or its runbook repository. Use Datadog read-only telemetry to estimate current scope and verify success. The plan's documented approval and execution steps take precedence over generic examples below.

<!--### 4.2 Mode Selection
- **Standard Path:** Proceed to **Section 5a (Workaround / Immediate Resolution)**.
- **Escalation Path:** Trigger **Section 5b (Crisis Mode)** if impact is catastrophic, unknown, or standard recovery fails. -->

---

## 5a. WORKAROUND & RESOLUTION PLAYBOOKS
Choose mitigation patterns based on the evidence and the IC's decision. Present each proposed action using all fields in **Mitigation and Resolution** in the required response format. Rank symptom-reducing actions ahead of long-term remediation, and explain when an action is not safe or not yet authorized.

- **Restart:** Reboot instance, pod, or service. Provide the cli-command or UI action needed.
- **Restart:** Use Datadog and the `kube-diagnose` skill (for Kubernetes) to confirm the affected workload and restart evidence. Give the restart command or UI path only from the verified runbook. The diagnostic skill is read-only; execution belongs to the authorized service operator after IC approval.
- **Rollback / Hotfix:** Use Datadog to verify the change/impact relationship and GitHub MCP to inspect the candidate commit, pull request, and known-good version. Confirm the production version and rollback procedure with the deployment owner; execute only through the approved release/GitOps path after IC approval. Do not treat a repository revert as a production rollback.
- **Scale:** Use Datadog metrics and read-only Kubernetes inspection (`kube-diagnose`) to verify saturation and current replica/HPA state. The platform/service owner performs scaling through the approved control plane; require capacity, quota, and cost checks and IC approval.
- **User Mitigation:** Issue client warning/advisories or client-side fix instructions.
- **Traffic Reroute / DRP:** Retrieve the approved DRP/runbook from Confluence and use Datadog to check target health and recovery signals. An authorized APIM/CDN/network operator executes the documented failover or reroute; no APIM/CDN write integration is assumed. Require explicit IC approval and a defined return-to-primary check. If you have access to Gravitee or Cloudflare tools, you may use it to see the options.
- **Offset Reset:** Use Datadog consumer metrics/logs and the service runbook to establish the affected consumer, lag, and offset range. No Kafka offset-reset MCP is assumed; the accountable messaging operator uses the approved Kafka UI/CLI only after checking replay/duplication/data-loss risk and obtaining IC approval.
- **Security / Auth:** Use Datadog logs/metrics and the certificate or identity runbook to verify expiry/failure without exposing credentials. The credential/certificate owner performs rotation through the approved secrets/identity control plane; do not read, print, or transmit secret values. No credential-rotation MCP is assumed. But you may suggest auth credential renewal when you have enough proof (API Keys, TLS/SSL certs).
- **Config Update:** Use Datadog to verify the suspected config-related symptom and GitHub MCP to inspect the configuration source/history. Make changes via the approved reviewed GitOps/release workflow with the owning team; do not directly mutate production configuration through an unrelated MCP. Require IC approval and a rollback diff/check. Configuration changes may also be useful on API Management (Gravitee)
- **Cache Invalidation:** Use Datadog to verify cache-related symptoms and consult the cache/CDN runbook. The cache owner performs a scoped purge through the approved control plane; Confirm scope, origin capacity, and cache-warm recovery before approval.
- **Last resort:** If no standard mitigation is viable, propose a bounded temporary workaround or manual intervention that the IC can authorize or delegate. State its risks, prerequisites, and how to verify or stop it.
  - **Tool routing:** Use the closest read-only Datadog, GitHub, Atlassian, or diagnostic evidence source to bound the proposal. State explicitly when no integration supports execution; assign execution to the accountable operator and define an expiry/stop condition.

<!--
---

## 5b. CRISIS MANAGEMENT MODE
*Triggered when automated or standard workarounds are insufficient.*

Use the crisis management skill
-->
---
