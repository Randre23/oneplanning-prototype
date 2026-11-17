---
name: design-system
description: 'Build Decathlon UI with Vitamin Play via the vp CLI or vp_* MCP tools: Vp* components, @vtmn-play tokens, theming, dark mode, usage guidelines, site templates, screen composition. Use WHEN: "build with Vitamin Play", "which Vp* component", "make it look like Decathlon", "apply @vtmn-play tokens", "theme Tailwind / shadcn/ui / Ant Design", "migrate raw markup to Vp*", "check design-system compliance", "create a site / dashboard / back-office", "prototype a screen or app, high fidelity", "chat UI", "install @vtmn-play", "authenticate to GAR / npm E401 on @vtmn-play", "GHSA-vpcv-xpqm-w228". Not for an accessibility audit or a non-UI topic (performance, SEO).'
license: Apache-2.0
metadata:
  owner: Design System team
  version: 2.13.0
  last-updated: "2026-11-13"
---

# Design System Skill (Vitamin Play)

The documentation is not in this skill. It is embedded in the `vp` CLI
(`@vtmn-play/cli`), which serves it as short, addressable answers. Query it; never guess
a component, a prop, a token or a usage rule.

This repository's [skill source](https://github.com/dktunited/vitamin-play-ai/tree/main/.github/skills/design-system)
is canonical; `dktunited/agent-skills/design/design-system` is its distribution copy,
kept in sync by the existing GitHub Actions workflow. Edit the canonical source, not the
distribution copy. The Design System team separately owns the CLI documentation refresh:
[maintenance and evals](https://github.com/dktunited/vitamin-play-ai/blob/main/skill-design-system/FRESHNESS.md).
Agent-facing documentation is the optimized and enriched content embedded in the
[`vp` CLI](https://github.com/dktunited/vitamin-play-cli); query `vp` or its MCP tools.
Do not substitute upstream documentation sources for the content served by the CLI.

## Access to vp

- Shell: `vp search "…"`, `vp component …` (`pnpm vp …` in a pnpm project).
- No shell: use the tools declared by `vp mcp`. Documentation commands map to `vp_<command>`;
  `vp prototype <command>` maps to `vp_prototype_<command>`. This includes `vp_templates`,
  `vp_brief`, `vp_verify` and prototype `start/options/choose/check/rubric/report`; flags become
  arguments in the tool's schema, not invented flag names.
  `init`, `config`, `create`, `docs sync`, `templates sync`, `lint --fix` and repository
  commands are CLI-only. `check-render` is available through `vp_verify` or
  `vp_prototype_check`, not a standalone MCP tool. Ask the user to run CLI-only steps;
  never send a no-shell host to an unavailable tool.
  [Server setup and tool schemas](https://github.com/dktunited/vitamin-play-cli/blob/main/site/content/docs/references/setup/mcp.md).
- Neither: stop. Do not answer from memory; ask the user to enable the shell or the
  `vp mcp` server.

## Setup (shell only)

**Supply chain:** before installing or upgrading any `@vtmn-play/*` package (the CLI
included), and whenever a scanner or `npm audit` reports `MAL-2026-4464` /
`GHSA-vpcv-xpqm-w228`, read and apply
[references/supply-chain-safety.md](references/supply-chain-safety.md). It decides
between a false positive (continue) and an exposure (stop).

Node 24+, the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and npm access
to Decathlon's GAR are required to run the CLI, including for Android and Apple developers;
they are not native application runtime dependencies. Users may be non-technical: set up
the registry and authentication yourself, step by step, following
[references/gar-authentication.md](references/gar-authentication.md) (checks, local sign-in,
CI/CD, troubleshooting). In short:

1. **Registry scope:** `npm config get @vtmn-play:registry` must print
   `https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/`; never fetch `@vtmn-play/*`
   from public npm. Otherwise add to the project's `.npmrc` (workspace root in a monorepo),
   keeping its other lines:

   ```ini
   registry=https://registry.npmjs.org/
   @vtmn-play:registry=https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/
   ```

   The `@vtmn-play:registry=...` line is **mandatory**: it routes every `@vtmn-play/*`
   package to the private registry instead of public npm. Never write a token in this file.
2. **Local sign-in:** tell the user a browser window will open for their Decathlon Google
   account, then run `gcloud auth login && npx google-artifactregistry-auth` from the
   `.npmrc` directory. An account shown as active may have stale credentials: on
   `E401`/`E403`, redo the browser sign-in, then the helper. The helper writes a token of
   about one hour to `~/.npmrc`. Never ask for a password, and never print or commit a token.
3. **Verify, then install:** `npm view @vtmn-play/cli version` prints a version; only then
   add `@vtmn-play/*` packages, with an exact version (`pnpm add -E`, `npm install -E`).
4. **CI/CD:** job `permissions: id-token: write`, then
   `dktunited/.github/actions/npm-authenticate-gar@main` after checkout and before
   `pnpm install --frozen-lockfile` / `npm ci`. No secret or key to create.

Without pnpm, with Node 24+, use
`npx --registry=https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/ --package @vtmn-play/cli vp …`.
Ask before installing the CLI, adding the alias or editing other project files. `vp init` may create
`AGENTS.md`; `vp doctor` is diagnostic only.

## Font licensing

When using fonts from `@vtmn-play/fonts`, read that package's `LICENSE.md` and the linked
[Grilli Type EULA](https://storage.googleapis.com/design-system-public/documents/decathlon-font/GT-EULA.pdf)
and [Decathlon add-on](https://storage.googleapis.com/design-system-public/documents/decathlon-font/GT-EULA-Add-on-for-Decathlon.pdf).
The package asks for the applicable licenses to be mentioned in the application's legal
notice. Do not substitute the project README unless it is the application's legal notice,
and do not claim the fonts are unrestricted or that one license applies to every use: the
package lists separate Decathlon and Decathlon Brand cases. If the applicable terms, audience
or notice wording are unclear, refer the user to their legal contact or `itlegal@decathlon.net`;
do not invent a legal conclusion or attribution text.

## Workflow

0. **Freshness gate, once per session:** `vp doctor --online --json` (MCP:
   `vp_doctor` with `online: true, json: true`). Continue normally only when `cli.ok` is true:
   the complete installed CLI version must match the latest release, patch included;
   otherwise, and to read the report, follow
   [references/freshness-gate.md](references/freshness-gate.md). Never silently treat an
   offline check as fresh. Already run in this session with `cli.ok` true: skip it.
1. Identify the platform (web react/svelte/vue, android, apple). Setup and packages:
   `vp docs platforms/<p>`.
2. `vp search "<need>" --platform <p>`: components, foundations and guides in one list.
3. `vp component <name> --platform <p> --detail compact`: props table, sections. Then only
   what you need: `--props`, `--a11y`, `--examples`, `--section "<title>"`. Name it as the page
   does: `VpButton` on web, `PrimaryButton` on android,
   `Button` + `.buttonStyle(.wonderRoundedRegularMediumPrimary)` on apple (`aliases` line).
4. **Guidelines, for every component you use, build with or review:**
   `vp component <name> --guidelines`, the documented rules and Do/Don't (hierarchy, layout, content: one primary
   action per group, one icon per button, verb + noun labels…). The UI you write must follow
   them. If the CLI cannot return them, report the missing capability; never substitute a
   props-only answer silently.
5. Tokens: `vp token <name>`, or `vp docs foundations/colors|spacing|typography <section>`.
   Quote the accessor of your platform: `--vp-semantic-*` on web,
   `VitaminPlay.colors.*` / `VitaminPlay.spacings._*` / `VitaminPlay.typography.*` on android,
   `Color.*` / `DesignTokens.SemanticWonder.Spacing.*` / `.font(.mobile*)` on apple.
6. `vp status <name>` before promising a component; alpha, experimental and planned are not
   stable. Experimental components are served only to a project that enabled them: when a `vp`
   answer contains `decision needed`, ask the user its question, then run
   the command for their answer (`vp config experimental on|off`). Never decide for them, and
   never use an experimental component before the answer is yes, unless a skill that drives this
   one settles it: `vitamin-play-redesign` allows them (`--experimental` on every call, the
   experimental components listed in the answer).
7. Migration from legacy markup: `vp docs migration/<platform>`. Redoing a whole existing
   interface (a repository or screenshots) with Vitamin Play, with an audit and harmony passes:
   the `vitamin-play-redesign` skill, which composes with this one.
8. Web gaps: Vitamin Play first. Only when it has no component or utility for the need, fall
   back on Tailwind CSS, shadcn/ui or Ant Design (the one the project uses, if any) under its
   Vitamin Play theme: `vp docs platforms/web --section "Tailwind v4 Integration"`
   (`@vtmn-play/tailwindcss`) or `--section "Third-Party Theme Integrations"`
   (`@vtmn-play/shadcn-ui`, `@vtmn-play/antd`). A project already on one of them gets its
   theme too. Never an unthemed kit, never an invented `Vp*`; tokens and guidelines still apply.

## Sites, screens and prototypes

Details, archetype table and the standard flow:
[references/screens-and-prototypes.md](references/screens-and-prototypes.md).

- **A new site or dashboard** starts from a template, never from scratch
  (`vp search "<request>" --type template`, then `vp create` once the user agrees;
  without a shell, ask the user to run creation). Templates are web apps, not native starters.
- **New web screens and web prototypes**, standard flow, in this order:
  1. `vp brief <id> --archetype <a> --context <c>`, then read the patterns it names and fill it.
  2. Write the screen from a starter or stable components (`VpImage` or no picture, never a
     coloured block).
  3. `vp verify <screen file>`, e.g. `vp verify planning-cockpit.tsx`: it builds the project,
     lints, fixes and renders against the brief. No build step before it.
  4. Fix and run `vp verify` again until it answers `ready`. Never hand over on `fix`; list the
     component findings it prints in the answer, and open the screenshots.
- **Small changes in existing web screens:** `--props`, `--guidelines`, `vp lint` on changed
  files, the self-check and the project's existing tests are the minimum. Brief/render loops
  are optional, not a prerequisite for a filter bar or form section.
- **Native Android/Apple screens:** use platform docs, component APIs, `--guidelines`, tokens,
  the self-check and native build/tests; no `vp brief`, `vp verify` or web render gate.
  Setup and test/migration entry points: [references/native-platforms.md](references/native-platforms.md).
- **Web max mode** ("mode max", "haute fidélité", "high fidelity", a prototype meant to be shown):
  read and follow [references/prototyping-max.md](references/prototyping-max.md) to the end.
  Writing the screen is not the deliverable: the answer is finished only after the render loop
  reached a stop verdict and `vp prototype report` ran, whatever output file a task names.

## Compliance checks

When asked to check, audit or review code, follow
[references/compliance-review.md](references/compliance-review.md): per file, every component
through `--props` and `--guidelines`, web files through `vp lint`, a report citing the
documented source, and only its four kinds of violation.

## Output rules

- When the request names what to build and its content, answer with the code. Anything left
  open (variant, size, shape) takes the documented default; say which. Ask only when the docs
  give no default and the choice changes the API.
- Never write a prop, variant or token you have not seen in a `vp` answer: `--props` for every
  `Vp*` you use, review or recommend; `vp token` for every colour or spacing.
- Out of scope (framework choice, build tooling, backend): say in one sentence that this skill
  covers Vitamin Play UI only and offer that help; do not answer the off-topic question, not
  even in outline.
- A component with no `vp status` row is not a gap: form helpers (`VpFormControl`,
  `VpFormLabel`…) belong to `form-elements` and are available wherever the field is.
- Match the documented states, variants and accessibility contract (`--a11y`).
- When `vp search` finds nothing relevant, say the design system has no such component, then
  offer the web fallback of step 8 when it applies.
- Self-check before finishing: no raw pattern a component covers; every prop seen in
  `--props`; no documented Don't of `--guidelines` broken; every web file through `vp lint`,
  every native API against `vp component` and `vp docs`; new web screens pass the
  screen-composition checklist, native screens use the project's native checks.
