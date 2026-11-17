# Customization Strategy: Agent vs Workflow Architecture

## Executive Summary

This repository implements a **2-layer customization model** for BMAD at Decathlon:
- **Agents** define persona-level operating procedures (3-4 personas)
- **Workflows** add workflow-specific execution guidance (8 workflows)
- **3-layer TOML merge** ensures both layers work together

**Answer to "Are they redundant?":** NO. They're complementary layers serving different purposes.

---

## The 3-Layer TOML Merge Model

```
Layer 1 (Base):     <skill-root>/customize.toml              [BMad Method Standard]
Layer 2 (Team):     _bmad/custom/<skill>.toml                [Decathlon Customizations — this repo]
Layer 3 (User):     _bmad/custom/<skill>.user.toml           [Personal Override]
```

`<skill-root>` is wherever the skill is installed by the harness — for the BMM
module that is `_bmad/bmm/skills/<skill>/customize.toml`, and for Copilot/Claude
skill installs it is `.agents/skills/<skill>/customize.toml`. The resolver
(`_bmad/scripts/resolve_customization.py`, invoked as `uv run …` since
BMAD-METHOD 6.11.0) always derives the layer paths from the skill directory it
is given, so the base path is not fixed to one location.

Central config resolves separately and in its own order:
`_bmad/config.toml` → `_bmad/config.user.toml` → `_bmad/custom/config.toml` →
`_bmad/custom/config.user.toml`.

**Failure semantics (verified against `src/scripts/config_utils.py` at tag
v6.11.0):** the resolver exits `1` when a *required* layer is missing — the
skill's own `customize.toml` or `_bmad/config.toml` — or when any present
override file cannot be parsed as TOML. A stale override that targets a removed
skill is never loaded at all (dead, not fatal), and unknown keys inside an
override are merged but simply ignored by the skill. Both are silent, which is
why removed-skill override files are deleted rather than left behind.

- **Agents**: Merge happens at agent instantiation (startup)
- **Workflows**: Merge happens at workflow invocation (each phase)

---

## Agent Customizations

### Files:
- `bmad-agent-dev.toml` → Amelia (Developer)
- `bmad-agent-architect.toml` → Winston (Architect)
- `bmad-agent-pm.toml` → John (Product Manager)
- `bmad-agent-ux-designer.toml` → UX Designer

### What They Control:
1. Persona identity (name, title)
2. Global principles (apply to ALL workflows)
3. Skill routing menus (quick-access commands)
4. Mandatory knowledge gates (MUST invoke before decisions)
5. Persistent facts (truths agent should always know)

### Size: ~47-53 lines per agent

---

## Workflow Customizations

### Files (8 workflows):
- `bmad-brainstorming.toml`
- `bmad-prd.toml`
- `bmad-architecture.toml`
- `bmad-create-epics-and-stories.toml`
- `bmad-build.toml`
- `bmad-sprint-planning.toml`
- `bmad-code-review.toml`
- `bmad-ux.toml`

> **BMAD-METHOD 6.11.0.** `bmad-build` is the single official Phase 4
> implementation loop: `bmad-sprint-planning` → `bmad-build` → `bmad-code-review`.
> Readiness validation is **no longer its own skill** — `bmad-check-implementation-readiness`
> was removed upstream and folded into `bmad-sprint-planning`, which now opens
> with a PASS / CONCERNS / FAIL readiness gate. `bmad-create-architecture`,
> `bmad-dev-story`, `bmad-create-story` and `bmad-quick-dev` survive only as
> forwarding shims under `v6-shims/` until the v7 cut, so this bundle overrides
> their replacements instead.
>
> Upstream also mandates two customization-file renames for anyone who had them:
> `_bmad/custom/bmad-quick-dev{,.user}.toml` → `bmad-build{,.user}.toml` and
> `_bmad/custom/bmad-dev-auto{,.user}.toml` → `bmad-build-auto{,.user}.toml`.
> This bundle never shipped either file, so there was nothing to migrate.

### What They Control:
1. Activation steps (skills to invoke BEFORE workflow)
2. Phase-specific persistent facts
3. External knowledge sources (on-demand routing)
4. On-complete actions (what happens when phase finishes)

### Size: ~16-29 lines per workflow

---

## Why Both Are Necessary

### Scope Difference
- **Agents** apply globally across ALL workflows for that persona
- **Workflows** apply ONLY to that specific phase, regardless of agent

### Multi-Agent Workflows
```
Dev-story workflow can run under BOTH Dev and PM agents.
The 3-layer merge ensures BOTH agent + workflow customizations apply.
```

### Example: Web Frontend Work

**Agent (Dev):**
```
"Before web frontend work, ALWAYS invoke design-system + web-accessibility-evaluation"
→ Global principle (applies everywhere)
```

**Workflow (Dev-Story):**
```
"When implementing web UI, apply WEB TASK FLOW in order:
 (1) design-system → (2) web-accessibility-evaluation → (3) forms → (4) http"
→ Phase-specific timing and order
```

**Why both?**
- Agent = safety guardrail
- Workflow = tactical execution guidance
- If agent principle removed, workflow still enforces it

---

## Skill Routing

### Agent Skills (Mandatory Gates)
```toml
principles = [
  "Always invoke decathlon-tech-radar",
  "Always invoke knowledge-graph-query for Decathlon assets",
]
```
→ Invoked BEFORE agent starts work
→ Non-negotiable guardrails

### Workflow Skills (Conditional Sources)
```toml
external_sources = [
  "When PRD references User Journeys, consult delivery-metrics",
  "When architecture involves Decathlon assets, consult knowledge-graph-query",
]
```
→ Invoked ON-DEMAND when conditions match
→ Enriches workflow with contextual knowledge

---

## The "Always-On Discovery Principle" Pattern

**Context:** `knowledge-graph-query` (AppReferential graph lookup) and
`decathlon-api-discovery` (DocAPI semantic search for internal APIs/endpoints) act as a
shared "global wiki" — every phase benefits from grounding a request in what already
exists before proposing something new. BMad has **no separate semantic router or regex
hook mechanism**: the only way to make a skill fire without the user naming it
explicitly is to phrase a natural-language condition inside `principles` /
`persistent_facts` (agents) or `external_sources` / `activation_steps_*` (workflows).
These fields stay in context for the whole session/run, so the LLM re-evaluates them
against every user turn and self-triggers the referenced skill when the condition
matches — this is BMad's built-in equivalent of an "always-on" hook.

**The pattern, as applied to both discovery skills across this repo:**
- **Agents** (`bmad-agent-pm`, `bmad-agent-architect`, `bmad-agent-dev`,
  `bmad-agent-analyst`, `bmad-agent-ux-designer`): a `principles` entry phrased as *"When
  [named Decathlon asset / an unnamed internal capability] is referenced, invoke
  `knowledge-graph-query` / `decathlon-api-discovery` FIRST — never assume."* Because
  agent principles are global to the persona, this applies across every workflow that
  persona drives, not just one phase.
- **Workflows** (`bmad-prd`, `bmad-architecture`, `bmad-create-epics-and-stories`,
  `bmad-build`, `bmad-sprint-planning`, `bmad-code-review`, `bmad-ux`): the same
  condition phrased as an `external_sources` or
  `activation_steps_append` entry, scoped to what that workflow actually decides (e.g.
  `bmad-ux` frames it around "does this screen duplicate an existing product" and "what
  API/data shape does this flow actually depend on", not architecture-level concerns).

**Why duplicate `knowledge-graph-query` and `decathlon-api-discovery` together
everywhere?** They answer two different but adjacent questions — "does this Decathlon
*asset* already exist?" (graph) vs. "does an *API/endpoint* already exist for this
*capability*?" (semantic search) — and a single request often needs both (e.g. "we need
to show live stock on the product page" implies checking both the product asset in the
graph and the stock API via discovery). Wiring them as a pair keeps the "never assume,
always check first" discipline consistent, per the intentional-redundancy convention
already established for other skill pairs in this repo (see Summary Table below).

### Limits of this pattern — BMad context vs. a standard chat

The pattern above only fires once a BMad agent or workflow skill is actually active,
because `principles`/`persistent_facts`/`external_sources` are BMad-specific override
fields — a plain chat session with no BMad persona loaded never reads this repo's TOML
at all. In a standard chat, the **only** signal a host agent uses to decide whether to
auto-invoke a skill for a given message is that skill's own frontmatter `description`
(and any "When to use this skill" section in its body) — the mechanism
`decathlon-api-discovery`'s `SKILL.md` already uses well (explicit "Use when someone
asks which API or endpoint to call for a given business need" plus concrete example
phrasings). This repo has **no ability to edit that field** — it lives in each skill's
home repository (`dktunited/asset-knowledge-graph` for `knowledge-graph-query`,
`dktunited/agent-skills` for `decathlon-api-discovery`), not here.

`knowledge-graph-query`'s current description leans on analytical question phrasing
("how many products are in domain X", "what stack does product Y use") rather than
plain named-entity mentions. Broadening it to explicitly cover "the user just named a
Decathlon product/API/team/domain, even without asking a graph-shaped question" would
close that gap for non-BMad sessions too — this has been raised as a
[github.com/dktunited/asset-knowledge-graph issue](https://github.com/dktunited/asset-knowledge-graph)
rather than changed here, since it's outside this repo's ownership.

---

## Proportional Workflow & Execution Guardrails

Mandatory gates (Tech Radar, SIG compliance, threat model, skill discovery) are sized
for feature work. A real session spent ~45 min on a one-value change + `terraform apply`
because of full ceremony, a plan run from the wrong branch misread as drift, rigid gates
and nested subagents. The rules are generic, not IaC-specific:

- **Light change** (`bmad-build` first prepend step, `bmad-agent-dev`): upstream one-shot
  criterion + no new tech, endpoint, data flow, access/security setting, migration or
  destructive step → skip discovery, full compliance sweep and `on_complete`. Upstream
  routing and review are untouched. Pure execution requests are not builds.
- **Execution guardrails** (same files): source ↔ target check (worktree branch ≠ env),
  one preflight, re-check premises on disproportionate results, stop after two identical
  failures, semantic gates, no nested subagents, no forced remote state.
- **What-changed first** (`bmad-agent-sre`): env regressions start with a config/version/
  deploy diff, not the incident workflow.

---

## New-Project Repository Topology Recommendation

Repository topology is handled as non-blocking guidance across two complementary
layers:

- **PM agent and PRD workflow:** detect a broad new project when at least two
  technical surfaces among specifications, frontend, and backend have different
  frameworks or lifecycles. Recommend `<product>-specs` when specifications need an
  independent lifecycle, `<product>-front` for the complete frontend, and
  `<product>-back` for the complete backend. Keep a narrow, single-framework project
  in one repository by default.
- **Architect agent and architecture workflow:** review and refine the PRD
  recommendation, explain its trade-offs, and document the accepted topology and any
  justified alternative boundaries or names.

The SIG Delivery position is deliberately phrased as a recommendation: **aim for a
monorepo using a single framework, scoped to a complete frontend or a complete
backend, but not both in the same repository**. For a broad full-stack initiative,
this favors separate frontend and backend repositories while retaining monorepo
benefits within each technical surface. It is not a blocking compliance gate.

After the user accepts the recommendation, both personas/workflows mention that the
already-installed `gh` CLI can create repositories and update their settings or
metadata. They may offer to perform those actions, but must obtain explicit
confirmation before mutating a repository and must surface command failures directly.

---

## Test Coverage

**Workflow benchmarks (counts as of the BMAD-METHOD 6.11.0 alignment):**
- `tests/bmad-prd/` → 8 test prompts
- `tests/bmad-architecture/` → 14 test prompts (retargeted from `bmad-create-architecture`, now a shim)
- `tests/bmad-create-epics-and-stories/` → 8 test prompts
- `tests/bmad-build/` → 11 test prompts (replaces `tests/bmad-dev-story/`)
- `tests/bmad-sprint-planning/` → 13 test prompts (incl. 5 readiness-gate prompts migrated from `tests/bmad-check-implementation-readiness/`)
- `tests/bmad-code-review/` → 8 test prompts
- `tests/bmad-ux/` → 4 test prompts

**Total:** 66 workflow test prompts, plus the `bmad-prd-conditional` (7) and
`bmad-merge-validation` (6) diagnostic suites.

Each test verifies:
✅ Activation steps invoke correct skills
✅ Persistent facts are applied
✅ External sources are conditional (not always invoked)
✅ Workflow-specific knowledge routing works
✅ On-complete actions are triggered correctly

---

## Removed Customizations

### `bmad-investigate.toml` (removed — BMAD v6.10.0)

BMAD-METHOD v6.10.0 fully **retired the `bmad-investigate` skill** ("it
reached the same conclusions as plain investigation at higher cost") with
**no forwarding shim** — unlike other deprecations (e.g.
`bmad-create-architecture` → `bmad-architecture`), there is no replacement
skill name to re-point a team override at. This repo's root-level
`bmad-investigate.toml` therefore had nothing left to merge onto and was
removed.

Its one substantive directive — routing reliability investigations through
`bmad-agent-sre` (Morgan) first — was preserved by folding it directly into
the `principles` of `bmad-agent-architect.toml` and `bmad-agent-dev.toml`,
so the safety net survives without depending on a skill that no longer
exists. If BMAD reintroduces an investigation-style workflow in a future
release, re-add a dedicated `bmad-<skill-name>.toml` override at that point
rather than resurrecting this file as-is.

### `bmad-check-implementation-readiness.toml` (removed — BMAD-METHOD 6.11.0)

`bmad-check-implementation-readiness` is listed in upstream `removals.txt` at
tag v6.11.0: it was **folded into `bmad-sprint-planning`**, which now opens with
a PASS / CONCERNS / FAIL readiness gate (`references/readiness-gate.md`) before
generating any tracking. The agent menu's IR trigger dispatches sprint-planning.

Every Decathlon readiness rule was migrated verbatim into
`bmad-sprint-planning.toml` rather than dropped:

| Rule | Where it lives now |
| --- | --- |
| SLO definitions via `slo-generator` (hard blocker) | `activation_steps_append[0]` |
| AppReferential registration via `knowledge-graph-query` | `activation_steps_append[1]` |
| API rediscovery via `decathlon-api-discovery` | `activation_steps_append[2]` |
| 5-point readiness criteria (SLO / Datadog / AppReferential / FedID / Tech Radar) | `persistent_facts` |
| Tier-1 `blast-radius-analyzer` recommendation | `persistent_facts` |
| `delivery-metrics` UJ impact check | `on_complete` |

`activation_steps_append` is used rather than `activation_steps_prepend` so the
findings land after the greeting and are available to the readiness gate itself.

### `bmad-dev-story.toml` and `bmad-create-architecture.toml` (removed — BMAD-METHOD 6.11.0)

Both skills now exist only as forwarding shims under `src/bmm-skills/v6-shims/`
and are scheduled for deletion at the v7 cut. Keeping an override on a shim
means the override silently stops applying the day the shim goes away, so:

- `bmad-dev-story.toml` → replaced by **`bmad-build.toml`**. `bmad-build` is the
  one official Phase 4 implementation loop
  (`bmad-sprint-planning` → `bmad-build` → `bmad-code-review`). Its customization
  surface is richer than dev-story's, so the Decathlon compliance check is now
  additionally wired as a `[[workflow.review_layers]]` entry with
  `id = "decathlon-compliance"`, which appends alongside the upstream
  `blind-hunter` / `edge-case-hunter` / `verification-gap` layers.
- `bmad-create-architecture.toml` → already fully duplicated by
  `bmad-architecture.toml`, which additionally uses the `finalize_reviewers`,
  `doc_standards` and `external_handoffs` fields the shim cannot access. The
  legacy file was pure duplication and was deleted.

### Known inert overrides

`external_sources` is only a real customization key on `bmad-architecture`,
`bmad-prd`, `bmad-product-brief`, `bmad-project-context`, `bmad-ux` and
`bmad-deep-recon` (verified against every `customize.toml` at tag v6.11.0).
`bmad-brainstorming.toml`, `bmad-code-review.toml`,
`bmad-create-epics-and-stories.toml` and `bmad-sprint-planning.toml` in this
repo also declare it. The resolver merges the unknown key without error and the
skill ignores it, so those entries are currently **inert, not broken** — this
predates 6.11.0 and is tracked separately from this alignment.

## Design System Customization (`design-system`)

`design-system` (from `dktunited/agent-skills`, `design/design-system`, introduced
by [dktunited/agent-skills#86](https://github.com/dktunited/agent-skills/pull/86))
is Decathlon's canonical Vitamin Play skill for web (React, Vue, Svelte), Android
and Apple UI. It replaces `web-ui-development`, which is now a thin shell that
delegates to it: `skills.config.json` installs `design-system` by default and
removes `web-ui-development` through `_migrations`.

The documentation is not in the skill. It is embedded in the `vp` CLI
(`@vtmn-play/cli`, published to Decathlon's Artifact Registry), run through
`npx` / `pnpm vp` (no prior install needed) or the `vp mcp` tools. Agents
therefore no longer fetch a `DESIGN.md` from `vitamin-play-documentation` nor
require the GitHub MCP server to read `vitamin-play-web`.

What the customizations rely on:

| Capability | `vp` command | Where it is wired |
| --- | --- | --- |
| Components, props, tokens, usage guidelines (decathlon.design Do/Don't) | `vp search`, `vp component … --props / --guidelines`, `vp token` | every surface below |
| Site templates (a new site or dashboard never starts from scratch) | `vp search "<need>" --type template`, `vp create` | UX Designer (`MOCKUP`), Dev (`WEB`) |
| Screen flow: brief, patterns, render check | `vp brief`, `vp docs patterns/…`, `vp verify` (until `ready`) | UX Designer, `bmad-ux`, `bmad-build` |
| Deterministic source check | `vp lint` | Dev, `bmad-build`, `bmad-code-review` |

The interface-type gates are unchanged: Vitamin Play applies to UI surfaces
(web, and native Android/Apple apps), never to CLI, API or MCP-server products.
WCAG 2.2 AA / RGAA (`web-accessibility-evaluation`) still gates web surfaces.

Deeper integration across the SDLC (brief, PRD vocabulary, architecture from
templates, prototyping vs. production) is deliberately left for the BMAD v7
alignment.

Benchmarks: `tests/bmad-ux/`, `tests/bmad-agent-ux-designer/`,
`tests/bmad-agent-dev/`, `tests/bmad-build/` and `tests/bmad-code-review/`
assert `design-system` and use a `design-system` stub sub-skill.

## UX Research Customization (`ux-research`)

`ux-research` (from `dktunited/agent-skills`, `design/ux-research`) is Decathlon's
canonical UX research methodology. It is wired as a **mandatory and exclusive**
gate: wherever a BMAD phase touches user evidence, the agent must invoke it and
follow its `references/` rules and `assets/` templates rather than proposing an
alternative research framework or improvising a protocol/persona template.

Where it is wired:

| Surface | Wiring |
| --- | --- |
| `bmad-agent-ux-designer.toml` | `persistent_facts` (methodology + quality floor), `principles` (mandatory/exclusive routing, evidence before mockup, evidence trail on handoff), menu entries `UXR` and `SYNTH` |
| `bmad-agent-analyst.toml` | `persistent_facts` + `principles` (user evidence routes to ux-research; ideas stay hypotheses; HMW/OST use its templates), menu entry `UXR` |
| `bmad-agent-pm.toml` | `persistent_facts` + `principles` (traceable user-need claims, no fabricated statistics, observation/insight/opportunity vocabulary), menu entry `UXR` |
| `bmad-ux.toml` | `activation_steps_append` (declare the evidence base first, interface-agnostic), `persistent_facts` (quality floor, modeling thresholds), `doc_standards` (research-evidence review as a blocking sign-off gate), `external_sources` |
| `bmad-prd.toml` | `persistent_facts` (evidence trail per user claim) + `external_sources` routing |
| `bmad-brainstorming.toml` | `persistent_facts` (ideas are hypotheses, not findings) + `external_sources` routing for HMW/OST/validation |
| `bmad-create-epics-and-stories.toml` | `persistent_facts` (stories trace to findings; low-confidence finding ⇒ experiment) + `external_sources` routing |

Note that the UX-research gate is **interface-agnostic**, unlike Vitamin Play
(UI surfaces only) and WCAG/RGAA (web surfaces only): a CLI, API, or MCP-server project
still has users whose behaviour must be evidenced rather than assumed.

> **Inert `external_sources` caveat.** Per [Known inert overrides](#known-inert-overrides),
> `external_sources` is not a real customization key on `bmad-brainstorming` and
> `bmad-create-epics-and-stories`. The `ux-research` routing entries declared
> there are therefore currently inert. This is intentional and harmless: on both
> workflows the substantive rule is **also** carried in `persistent_facts`, which
> does apply, so the gate holds today and the `external_sources` entries start
> working for free if upstream ever adds the key.

### Rendering rule: markdown deliverable vs. web artefact

`ux-research` templates are markdown, and markdown deliverables carry **no**
design-system obligation — their lack of Vitamin Play styling is not a gap.
But as soon as you build a **new** web deliverable off the back of research —
HTML page, interactive/clickable prototype, browser-served deck, persona or
journey board, opportunity-tree canvas, shareout microsite — it becomes a
Decathlon web surface and must be built through `design-system` with
Vitamin Play components and design tokens, then validated against
WCAG 2.2 AA / RGAA. Ad-hoc HTML/CSS and generic web templates are not
acceptable.

**Scope limit — BMAD defaults are excluded.** The rule covers *new* deliverables
an agent creates as a follow-up to research. Artefacts BMAD already produces by
default, `brainstorm.html` in particular, are explicitly **out of scope**: they
are left exactly as the workflow generates them, are never restyled or rebuilt
onto the design system, and are never flagged as a design-system gap. For this
reason `bmad-brainstorming.toml` carries **no** rendering rule at all.

This rule **overrides the interface-type determination** in `bmad-ux.toml`: that
gate governs the *product* being designed, not the artefacts used to communicate
about it. A CLI project's new HTML debrief deck is still a web surface.

Wired in: `bmad-agent-ux-designer.toml`, `bmad-agent-analyst.toml`,
`bmad-agent-pm.toml` (`persistent_facts` + `principles`), `bmad-ux.toml`
(`persistent_facts`, `doc_standards` deliverable-rendering review,
`external_sources`), `bmad-prd.toml`.

---

Benchmarks: `tests/bmad-ux/`, `tests/bmad-agent-ux-designer/`, `tests/bmad-prd/`,
`tests/bmad-agent-pm/` each add `ux-research` prompts and a stub sub-skill.

---

## Prototype Customization: Decathlon Protos & Figma (`deploy-to-protos`, `protos-data-and-api-access`, Figma MCP)

When the work is a prototype, POC, demo, or clickable web prototype, agents help
the user choose how to build and share it, without deciding for them. A prototype
is usually made **either** as a coded web prototype shared on Decathlon Protos
**or** in Figma; doing both is rare but never blocked.

### Choosing the medium: coded (Protos) or Figma

The UX Designer (and the `bmad-ux` workflow) suggests a coded prototype and
mentions Figma as the alternative, then lets the user choose.

- **Coded** — a Vitamin Play web prototype (`design-system`), which can then
  be shared on Protos as described below.
- **Figma** — requires a paid Figma licence. The user builds the prototype in
  Figma. There is no specific AI Augmented SDLC customization for Figma: if the
  user wants agents to work with it, they enable the Figma MCP server (`decathlon-find-mcp-server`,
  `https://mcp.figma.com/mcp`, OAuth) and share links to the file, frames, or
  prototype flow, and agents use what the Figma MCP server offers (review,
  accessibility, Vitamin Play alignment, changes, UX spec, dev handoff). Without
  the MCP server, they work from screenshots and say what they could not check.
  A Figma prototype is shared through Figma, so Protos is not suggested for it.

### Sharing a coded prototype on Decathlon Protos

[Decathlon Protos](https://protos.dktapp.cloud) hosts prototypes for signed-in
Decathlon teammates. Two skills, installed by default via `skills.config.json`,
describe how it works:

- `protos-data-and-api-access` — Decathlon API access, persistent data, and how
  to build a prototype for Protos;
- `deploy-to-protos` — publication and its prerequisites.

**Reference the skills, don't restate them.** The customizations only say *when*
to bring Protos up and *which skill* to consult; each step that touches Protos
tells the agent to consult the relevant skill and follow it. Protos details
(routes, `store.yaml`, auth, repository and workflow requirements) live in the
skills only, so they can evolve without touching this repo. The only Protos
facts kept here are the signals that a project targets Protos (root
`store.yaml`, a workflow using `publish-prototype`, or the user said so), which
agents need before they know to open the skill.

**Design principle — suggest, let the user decide.** Agents don't deploy on their
own. They suggest Protos **once**, at a natural milestone (prototype runs locally,
build complete, UX prototype ready for testing). If the user isn't interested,
the topic is dropped for the session. If the user accepts:

1. **Before deploying**, ask whether the prototype needs real Decathlon API access
   and/or persistent data. If so, consult `protos-data-and-api-access` and follow
   it; if not, skip it — a simple static prototype (no backend, database, API, or
   tests) is a good Protos candidate too.
2. Consult `deploy-to-protos` and follow it to publish.

Protos isn't suggested for production applications, CLI/API/MCP-only projects,
or longer-lived internal sites/docs. The suggestion in `bmad-build` is independent
of the BDD/testing step.

**No overlap with Decathlon Pages.** The existing Pages customizations are left
intact: the Dev agent's Pages-vs-Protos routing principle and `PAGES` menu, and the
analyst/brainstorming publication to `dktunited/brainstorming-artifacts` (served on
Pages). Protos is only for a runnable prototype; docs, longer-lived sites, shareout
microsites, and brainstorming artefacts go to Pages. Agents suggest only one of the
two for a given deliverable and ask the user when unclear.

**Interplay with other customizations.** For a prototype that targets Protos, the
Protos skills take precedence over the FedID configuration skills; code review
reports departures from `protos-data-and-api-access` as blocking and doesn't flag
a missing app-level FedID setup; the architecture phase can mark observability/SLOs
out of scope until the prototype becomes a product.

### Wiring

| Surface | Wiring |
| --- | --- |
| `bmad-agent-dev.toml` | `persistent_facts` (Protos skills as the reference, targeting signals); `principles` (suggest Protos for coded prototypes, consult `protos-data-and-api-access` before API/data/auth/route work, implement a design from shared Figma links via the Figma MCP); menu entries `PDATA` and `PROTOS` |
| `bmad-agent-ux-designer.toml` | `principles` (suggest a coded prototype, Figma as the alternative with a paid licence; suggest sharing a coded prototype on Protos for usability tests / walkthroughs, no research PII); menu entries `PROTOS` and `FIGMA` (work with a Figma prototype via the Figma MCP) |
| `bmad-ux.toml` | `persistent_facts` (coded prototype, Figma as the alternative with a paid licence; Figma via the Figma MCP) |
| `bmad-build.toml` | `activation_steps_append` (detect Protos target → consult `protos-data-and-api-access`), `persistent_facts` (Protos skills as the reference, user decides), `on_complete` (suggest publication for prototypes, independent of the BDD step) |
| `bmad-agent-architect.toml` / `bmad-architecture.toml` | ask whether a prototype will be hosted on Protos; if yes, consult both Protos skills and record their constraints as decisions instead of designing auth/backend, and mark observability/SLOs out of scope until graduation; nothing to host for a Figma prototype |
| `bmad-code-review.toml` | `persistent_facts` (review against `protos-data-and-api-access`, departures are blocking; missing app-level FedID is expected, not a finding) |
| `bmad-help.toml` | `persistent_facts` + `external_sources` (Protos as an optional next step for unpublished coded prototypes; Figma prototypes via the UX Designer's `FIGMA` menu) |
| `skills.config.json` | `_notes` for `deploy-to-protos` and `protos-data-and-api-access` |

Benchmarks: `tests/bmad-build/`, `tests/bmad-code-review/`, `tests/bmad-agent-dev/`
and `tests/bmad-agent-ux-designer/` add Protos prompts and stub sub-skills;
`tests/bmad-agent-ux-designer/` also adds a Figma prompt
(`figma-prototype-mcp`) with a `decathlon-find-mcp-server` stub.

---

## Skills Catalog Updates

**Added to catalog (PR #16):**
- `decathlon-find-skills` → Added to compliance category
- `java-tests-tzatziki` (Decathlon/tzatziki, formerly `add-cucumber-tests`) → Added to new testing-qa category

**All 17 required skills now in catalog:**
✅ decathlon-tech-radar
✅ knowledge-graph-query
✅ decathlon-tech-compliance
✅ slo-generator
✅ decathlon-find-skills
✅ java-tests-tzatziki
✅ delivery-metrics
✅ design-system (replaces web-ui-development)
✅ web-accessibility-evaluation
✅ web-forms-development
✅ http-fetching-methods
✅ vercel-react-best-practices
✅ spring-boot-fedid-resource-server
✅ spring-boot-fedid-rest-client
✅ better-auth-fedid-configuration-nextjs
✅ better-auth-fedid-configuration-astro
✅ business-data

---

## Best Practices

### When to Add Agent Customization
- Principle applies globally to a persona
- Should influence behavior across many workflows
- Is a safety guardrail that should not be bypassed

**Example:** "Always invoke tech-radar before technology decisions"

### When to Add Workflow Customization
- Rule is specific to a phase
- Changes how skills are invoked within that phase
- Provides phase-specific knowledge routing

**Example:** "In architecture phase, invoke slo-generator after asset-KG"

### Anti-Patterns to Avoid
- ❌ Don't duplicate agent principles verbatim in workflows
- ❌ Don't hard-code external sources that should be agent-level
- ❌ Don't create workflows without understanding which agents will run them

---

## Summary Table

| Dimension | Agents | Workflows |
|-----------|--------|-----------|
| Count | 3-4 personas | 8 phases |
| Scope | Global to persona | Specific to phase |
| File Size | ~47-53 lines | ~16-29 lines |
| Stability | Stable | Dynamic (evolves with methodology) |
| Skill Routing | Mandatory gates | Conditional sources + activation steps |
| Redundancy | None | Intentional (safety through duplication) |
| Tests | 4 agent benchmarks | 8 workflow benchmarks (PR #16) |

---

## References

- **BMad Docs**: https://docs.bmad-method.org/ (see also `how-to/customize-bmad.md` for
  the override mechanism, and the `bmad-help` / `bmad-customize` skills below)
- **Test Infrastructure**: `scripts/run-all-benchmarks.sh`, `tests/bmad-*/`
- **Config**: `skills.config.json` (auto-install manifest), `config.toml` (agent roster)
- **Skill scope**: `skills.config.json` entries are project-scoped unless listed in
  `_scopes.global` (user-level skills installed once per user in `~/.copilot/skills`,
  e.g. `google-workspace`, Databricks). During the transition these skills are also listed in
  `_scopes.project`, so they keep a project copy as well; drop them from `project` to go
  global-only. Older installers ignore the `_scopes` key.
  See `docs/GLOBAL_SKILLS.md` in `dktunited/ai-augmented-sdlc`.
- **Note**: this repo has no local `skills.catalog.json` or `mcp.catalog.json`, and
  neither does a consumer project — **no catalog is ever bundled or copied locally**.
  The discovery skills (`decathlon-find-skills`, `decathlon-find-mcp-server`, installed
  via `skills.config.json` from `dktunited/ai-augmented-sdlc`) fetch the catalogs **live
  from GitHub**, using the same strategy as the AI Augmented SDLC canvas
  (`src/copilot-extensions/decathlon-ai-augmented-sdlc/src/catalog.ts`):
  `gh api "repos/dktunited/ai-augmented-sdlc/contents/<catalog>.json?ref=main" -H "Accept: application/vnd.github.raw"`,
  with a `curl` + `gh auth token` fallback. Single source of truth —
  don't recreate a catalog here and don't vendor a snapshot.

### Where things actually live in a consumer project

After a "setup project environment" run (Copilot App canvas or the VS Code extension):

```
{project}/
├── _bmad/custom/          ← THIS repo, extracted here
│   ├── bmad-agent-*.toml
│   ├── skills.config.json ← real location (not the project root)
│   └── modules/
├── .agents/skills/<name>/ ← full skill directory (SKILL.md + scripts/, templates/…)
├── _specs/
└── skills-lock.json       ← authoritative list of installed skills
```

Skills that need to resolve either file must target these paths — `{project-root}/skills.config.json`
does not exist, and no `*.catalog.json` exists anywhere in the project.

### Newer BMad skills worth knowing about (not yet customized here)
- **`bmad-help`** — runs automatically at the end of every BMad workflow to recommend
  the next step, and can be invoked directly for guidance at any time. `bmad-help.toml`
  now adds a repo-wide "AI Augmented Development docs available" nudge (pointing at the
  `decathlon-ai-augmented-development-docs` skill / the site's `llms-full.txt` bundle),
  the intended single home for such nudges instead of duplicating them per-workflow.
- **`bmad-customize`** — a guided authoring skill that scans what's customizable in an
  installed BMad project and helps write override TOML interactively. Prefer it over
  hand-authoring new `bmad-*.toml` files from scratch when unsure of a skill's
  customization surface.

---

*Last Updated: 2026-10-05*
