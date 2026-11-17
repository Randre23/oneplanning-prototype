---
name: decathlon-ai-augmented-development-docs
description: >
  Answers questions from Decathlon's login-gated AI Augmented Development portal
  (ai-augmented-development.decathlon.net) by fetching its llms-full.txt bundle
  with the gh CLI. Use it when the user asks about GitHub Copilot at Decathlon
  (billing, AI Credits, quotas, out-of-quota, best practices, App, CLI, cloud
  agent), the AI Augmented SDLC (install, canvases, installer, BMAD, context
  engineering, troubleshooting, going to production, videos, release notes),
  Agent Skills, MCP servers, vibe-coding standards, the glossary, trainings,
  SIGs or community calls, or asks "what does the AI dev portal say about...".
license: MIT
metadata:
  audience: all
  domain: platform-engineering
  mcp_required: false
---

# Decathlon AI Augmented Development Docs

## Overview

The portal at **https://ai-augmented-development.decathlon.net** is the single source of
truth for AI Augmented Development at Decathlon — GitHub Copilot usage, the AI Augmented
SDLC platform, coding standards, reusable Agent Skills, MCP servers, trainings and
community resources.

That site is **login-gated**, so an agent cannot browse it directly. To stay usable by
agents anyway, the portal publishes a plain-text, full-content bundle following the
[llms.txt](https://llmstxt.org/) convention, and that bundle is **committed to GitHub** in
the `dktunited/ai-augmented-development` repository under `public/llms/`. This skill reads
it from GitHub via the authenticated `gh` CLI — no login, no scraping.

## The one rule: only read `llms-full.txt` files

There are several files under `public/llms/`, but **only the `llms-full.txt` files contain
the complete inlined content** of the site. Read those and nothing else.

| Path under `public/llms/` | Read it? | Contents |
|---|---|---|
| `llms-full.txt` | ✅ **Yes — default** | Whole site: every doc page **and** every classic portal page inlined, links preserved. |
| `docs/llms-full.txt` | ✅ Optional | All documentation pages (every product), no classic pages. |
| `docs/<product>/llms-full.txt` | ✅ Optional | Documentation of one product only. `<product>` is `github-copilot` or `ai-augmented-sdlc`. |
| `llms.txt`, `llms-pages.txt`, `*/llms.txt` | ❌ **No** | Link-only indexes pointing back at the login-gated site — an agent following them gets lost. |
| `index.json`, anything else | ❌ **No** | Bundle metadata, not content. |

Do **not** read `index.json` or the `llms.txt` indexes to "discover" bundles — the table
above is exhaustive.

## What the whole-site bundle contains

1. **Documentation** (`/docs`) — one `# <Product>` block per product (`# GitHub Copilot`,
   `# AI Augmented SDLC`), organised by Divio category (`## Tutorials`, `## How-to Guides`,
   `## Explanation`, `## Reference`), one `### <Page title>` per page.
2. **Site pages** — after a `# Site pages` heading, one `## <Page title>` per classic
   portal page: Home, Documentation, AI Augmented SDLC (landing), AI Augmented SDLC —
   Release Notes, AI Augmented SDLC — Customizations, Tutorials — AI Augmented SDLC,
   Agent Skills, Standards, Vibe Coding Standard, Effective Methods, Glossary,
   MCP Servers, Trainings & Tutorials, Talks & Presentations, Monthly Community Calls.

Every page heading is **immediately followed by a `Source: <canonical URL>` line**, which
makes the bundle easy to index. Notable content:

- **Tutorials — AI Augmented SDLC**: every video chapter with its summary, the video links
  in **FR (original)** and **EN (dubbed with AI using ElevenLabs)**, the full written
  lesson (Markdown) and related resources.
- **AI Augmented SDLC — Release Notes**: the platform releases and their changes.
- **MCP Servers** / **Agent Skills**: the full catalogs with descriptions and links.

## Prerequisites

- An authenticated `gh` CLI with access to the private Decathlon org
  (`gh auth status` should show `github.com`). The same access used by the other
  `decathlon-*` skills.
- Network access to `api.github.com`.

## How to use this skill

### Step 1 — Fetch the bundle to a local file

The whole-site bundle is large (a few hundred KB), so save it to a file instead of
printing it into the conversation:

```bash
gh api repos/dktunited/ai-augmented-development/contents/public/llms/llms-full.txt \
  -H "Accept: application/vnd.github.raw" --cache 1h > /tmp/aiad-llms-full.txt
```

Use a smaller bundle only when the question is clearly limited to the docs of one product:

```bash
# All docs (no classic pages)
gh api repos/dktunited/ai-augmented-development/contents/public/llms/docs/llms-full.txt \
  -H "Accept: application/vnd.github.raw" --cache 1h > /tmp/aiad-llms-docs.txt

# GitHub Copilot docs only
gh api repos/dktunited/ai-augmented-development/contents/public/llms/docs/github-copilot/llms-full.txt \
  -H "Accept: application/vnd.github.raw" --cache 1h > /tmp/aiad-llms-copilot.txt

# AI Augmented SDLC docs only
gh api repos/dktunited/ai-augmented-development/contents/public/llms/docs/ai-augmented-sdlc/llms-full.txt \
  -H "Accept: application/vnd.github.raw" --cache 1h > /tmp/aiad-llms-sdlc.txt
```

Release notes, video tutorials, MCP servers, Agent Skills, trainings, talks, community
calls and the glossary live **only** in the whole-site bundle.

### Step 2 — Build a table of contents

List every page with its line number and URL:

```bash
grep -n -B1 '^Source: ' /tmp/aiad-llms-full.txt
```

Also search by keyword when the topic is specific:

```bash
grep -n -i 'quota\|ai credits' /tmp/aiad-llms-full.txt | head -50
```

### Step 3 — Read only the relevant sections

Read the pages you need by line range (from one page's line number to the next page's),
e.g. `sed -n '4714,4900p' /tmp/aiad-llms-full.txt`. Read several pages when a question
spans topics. For broad or exploratory questions ("what does the site offer?"), start
from the Home and Documentation site pages, which summarise everything.

### Step 4 — Answer from the bundle

- Treat the bundle as the authoritative content and answer directly from it.
- Cite the page's `Source:` URL when you reference it, but **do not fetch it** (it is
  login-gated). Links inside the content (GitHub repos, videos, external tools) are
  preserved and can be shared as-is.
- If the bundle does not cover the question, say so plainly rather than guessing or
  falling back to the link-only indexes.

## Notes

- The bundles are generated from the portal's content (Markdown docs plus the rendered
  React pages) by the site's full build. After every merge to `main`, a workflow
  regenerates them and opens a PR with the refreshed copies, so the committed bundle can
  briefly lag the live site (typically the latest release notes) until that PR is merged.
- Always fetch from the `main` branch (the default), which is what `gh api .../contents/...`
  returns unless you pass `?ref=`.
