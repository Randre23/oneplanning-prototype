---
name: decathlon-find-mcp-server
description: >
  Discover and install MCP servers from the Decathlon curated catalog (mirrored from
  the AI Augmented Development site). Fetches mcp.catalog.json + mcp.catalog.meta.json
  from dktunited/ai-augmented-sdlc, matches the current context against each entry's
  description, tags and example, explains rejected / deprecated servers, points to the
  MCP request process for anything missing, and guides installation — via the AI
  Augmented SDLC canvas on Copilot App, or manual serverConfig elsewhere.
  Triggers on: "what MCPs are available", "find MCP server", "which MCP should I use",
  "install MCP", "add MCP", "MCP catalog", "MCP servers", "connect Jira", "connect Figma",
  "connect Datadog", "connect GitHub", "request an MCP", "suggest an MCP", "dkt-find-mcp".
license: MIT
metadata:
  audience: all
  domain: platform-engineering
  mcp_required: false
---

# Decathlon MCP Server Discovery

## Overview

This skill browses or searches the Decathlon curated MCP catalog (`mcp.catalog.json`) to
match your current context to the right MCP server and guide you through installation.

The catalog is **generated** daily by `scripts/sync-mcp-catalog.mjs` from the
[MCP Servers page](https://ai-augmented-development.decathlon.net/mcp-servers) of the AI
Augmented Development site (`dktunited/ai-augmented-development`, `app/mcp-servers`) —
the single source of truth for MCP servers validated at Decathlon. Never hardcode the
server list: it changes upstream (servers get added, deprecated or rejected).

Unlike generic web searches, this skill:
- Reads the **generated `mcp.catalog.json`** (servers *available* for install) and its
  companion **`mcp.catalog.meta.json`** (categories, *deprecated* servers, *rejected*
  requests, and the links to check / submit MCP requests)
- Matches your **active context** (URLs, tool mentions, task description) against each
  entry's `description` and `example` fields
- Guides installation via the **AI Augmented SDLC canvas** on Copilot App, or provides
  the exact `serverConfig` block for manual setup in VS Code and other IDEs

## When to use this skill

Auto-invoke this skill when any of the following are true:

- The user asks which MCP servers are available (e.g. "what MCPs can I install?", "show me the MCP catalog")
- The user asks how to connect a tool to their agent (e.g. "how do I connect Jira to Copilot?", "add Datadog to my agent")
- The user pastes or references content from an external platform that maps to a known MCP:
  (e.g. a Jira / Confluence link, a Figma file, a Datadog dashboard, a SonarQube quality
  gate, a Statsig experiment, an SMA-X ticket, a GitHub PR, a Miro board…) — always
  resolve it against the fetched catalog, never against a hardcoded list
- The user asks for an MCP server that may not exist yet, or wants to request / suggest one
- The user explicitly asks to browse the MCP catalog
- The user types `dkt-find-mcp`

## On Activation

### Step 1 — Determine mode

Classify the activation into one of two modes:

- **Context match mode**: the user's message or active context contains a specific external
  tool reference, URL, or mention that maps to a known MCP server. Skip the catalog browse
  and proceed directly to Step 3 to match the entry.
- **Browse mode**: the user is asking generally about available MCPs or what can be installed.
  Proceed through all steps, presenting a full catalog table in Step 3.

### Step 2 — Fetch the catalog

> **Canonical source: `dktunited/ai-augmented-sdlc@main`** — always fetch live; never use
> a local copy or vendored snapshot. The catalog is re-synced from AI Augmented Development
> every day and a stale copy would silently expose wrong `serverConfig` blocks or missing
> entries.

**Primary — `gh api` with raw Accept header** (handles org SSO/SAML automatically):

```bash
gh api "repos/dktunited/ai-augmented-sdlc/contents/mcp.catalog.json?ref=main" \
  -H "Accept: application/vnd.github.raw"
```

The `Accept: application/vnd.github.raw` header returns the raw file bytes directly —
no base64 decoding needed. Fetch `mcp.catalog.meta.json` the same way (same repo, same
ref) — it is optional: if it cannot be fetched, keep going with the available servers only.

**Fallback — `curl` with a token from `gh auth token`** (use if `gh api` fails):

```bash
curl -fsSL \
  -H "Authorization: Bearer $(gh auth token)" \
  -H "Accept: application/vnd.github.raw" \
  "https://api.github.com/repos/dktunited/ai-augmented-sdlc/contents/mcp.catalog.json?ref=main"
```

**If both fail**, stop and surface an actionable error — never silently invent catalog
entries:

> "Unable to fetch `mcp.catalog.json` from `dktunited/ai-augmented-sdlc`. Check your
> authentication (`gh auth status`) and network access to the org (VPN/Zscaler). I cannot
> suggest MCP servers without the catalog — I will not invent entries."

`mcp.catalog.json` is a JSON array of **available** servers. Each entry has the fields:
`id`, `name`, `description`, `icon`, `category` (`internal` = Decathlon MCP, `external`),
`theme` (category id, labelled in the meta `themes`), `tags`, `tokenCost`, `example`,
`docsHref`, `sourceHref` (the server card on the AI Augmented Development site),
`authType`, optional `info` / `warning` / `requirements` (prerequisites — always relay
them), `lastReviewedAt`, `parameters`, and `serverConfig`.

`mcp.catalog.meta.json` holds:
- `themes[]` — `{ id, label }` categories, in display order
- `deprecated[]` — servers deprecated upstream (`since`, `reason`): **never** suggest
  installing them; explain the reason and, if the user still has one configured, suggest
  removing it
- `abandoned[]` — compatibility alias of `deprecated[]` for older canvas versions; do not
  treat it as a separate source of data
- `rejected[]` — MCP requests that were not validated (`status`, `reason`, `issueHref`)
- `excluded[]` — servers listed on the site but deliberately not offered for install here
  (`reason`, e.g. covered by a skill or the Environment section): point the user to that
  alternative instead
- `links.openRequests` / `links.submitRequest` — the MCP request process

### Step 3 — Match context to catalog

**Context match mode:**
Scan each entry's `description` and `example` for relevance to the current context.
Check for tool names, platform keywords, and URL domains. Also match `tags`. If a clear match is found
(confidence ≥ 70%), skip Step 4 and go directly to Step 5 with that entry.
If multiple entries match, present the top matches ranked by relevance and ask the user
to confirm which one to use.

**No available match:** look the request up in the meta `excluded[]`, `deprecated[]` and `rejected[]`
lists and explain the outcome (e.g. "Slack MCP Server was requested in #219 but is
*Blocked — app unavailable*: …"). If nothing matches anywhere, say so and point the user
to the MCP request process — never suggest an unvalidated third-party MCP instead:

> "There is no validated MCP server for that yet. Check whether someone already asked for
> it: [open MCP requests](links.openRequests) — or submit one:
> [Submit an MCP request](links.submitRequest)."

**Browse mode:**
Present the available MCPs grouped by theme (meta `themes` labels, in order), flagging
Decathlon-internal ones:

| Icon | Name | Source | Auth | Example use case |
|------|------|--------|------|-----------------|
| 🎫 | SMA-X — IT Service Management | Decathlon | none | `#smax find open incidents assigned to my team` |
| 🔷 | Atlassian — Jira / Confluence | external | oauth2 | `Create a Jira about this TODO code ...` |
| … | … | … | … | … |

Then mention how many requests were rejected / servers deprecated (from the meta), and
the two request links. Ask the user: "Which MCP server would you like to install?"

### Step 4 — Confirm intent

Before proceeding with installation guidance, confirm with the user:

> "I found **[icon] [MCP name]** — [description]. Would you like to install it?"

Relay any `warning`, `info` and `requirements` of the entry before the user confirms.

If the user confirms, proceed to Step 5. If not, return to the catalog table (Step 3,
browse mode) so the user can pick a different entry.

### Step 5 — Installation guidance

Detect the install path based on the current environment:

**On GitHub Copilot App** (check if the `ai-sdlc` canvas is available in the current
tool context — i.e. the `open_canvas` tool is present):

> "You can install **[MCP name]** directly from the AI Augmented SDLC canvas:
> 1. Open the **AI Augmented SDLC canvas** (click the canvas icon or ask me to open it)
> 2. Navigate to the **MCP Catalog** tab
> 3. Click **[MCP name]** — the canvas handles authentication and server configuration automatically."

Offer to open the canvas immediately:
```
open_canvas({ canvasId: "ai-sdlc" })
```

**Manual / VS Code / other IDE:**

Provide the exact `serverConfig` block from the catalog entry. Tailor instructions
by `authType`:

- **`authType: none`** (e.g. `smax`, `chrome-devtools`): configuration
  is straightforward — paste the `serverConfig` block into your MCP settings.

- **`authType: oauth2`** (e.g. `atlassian`, `datadog`, `figma`, `github`): auth is
  interactive on first use — paste the `serverConfig` and complete the OAuth flow when
  prompted.

- **`authType: apikey`** (e.g. `sonarqube`, `statsig`): provide the parameter names from
  `parameters[]` and the `docsHref` link for token generation. Example for SonarQube:
  ```
  Required parameter:
    SONARQUBE_TOKEN — your SonarQube user token
    How to get it: Settings → Security → Generate Token
    Docs: [docsHref]
  ```

- **`authType: env`**: list all `parameters[]` entries with their labels and placeholder
  values, plus the `docsHref` link.

Replace every `$PARAM` placeholder of the `serverConfig` with the user's value (never
write real secrets into a committed file).

For VS Code, the user adds the `serverConfig` to `.vscode/mcp.json` (workspace-level) or
their user settings under `mcp.servers`.

### Step 6 — Post-install

After confirming the user has installed the MCP, provide:

1. A summary of key tools the MCP exposes (inferred from the `description` field).
2. A suggested first command using the catalog's `example` field:
   > "Try this to get started: `[example]`"
3. A link to the full documentation if `docsHref` is not null:
   > "Full docs: [docsHref]"
4. The server card on the AI Augmented Development site (`sourceHref`).
