# Sites, screens and prototypes

## A new web site or dashboard

Start from a template, never from scratch: `vp search "<request>" --type template`, then
`vp docs templates/<id>` (anatomy, components, styling rules), then, once the user agrees,
`vp create <id> <dir> --title "<title>"`. Keep its stack; build pages with its blocks and the
workflow of SKILL.md. If no template fits, say so. For one screen of an archetype (dashboard,
product page, mobile app, back office, conversational), start from `vp create starter-<archetype>`
when one fits: a React + Vite screen that already passes `vp lint` and `vp check-render --expect
BRIEF.md`, to fill with the brief's content (copy its `BRIEF.md` to `.vp/prototype/<id>/brief.md`,
or run `vp brief`, so that `vp verify` reads it).

Templates, including `starter-mobile-app`, are React web apps, not Compose or SwiftUI
projects. `vp create` is CLI-only: without a shell, ask the user to run it, then resume.

## Select the flow first

- New web screens and web prototypes: use the standard flow below.
- Small changes in an existing web screen: read component `--props` and `--guidelines`,
  run `vp lint` on changed files, the SKILL.md self-check and relevant project tests.
  The brief and browser loop are optional; do not require Vite or Playwright for a routine edit.
- Native Android/Apple screens: follow [native-platforms.md](native-platforms.md).
  Use native builds, tests and previews; `vp brief`, `vp verify` and the prototype render
  loop do not validate Compose or SwiftUI. Never block native delivery on a web verdict.

## New web screens and prototypes: the standard flow

The new web screen starts from a brief and ends when
`vp verify` answers `ready`. The same determinism as the max mode, without its session. In this
order:

1. **Brief first.** `vp brief <id> --archetype <archetype> --context product|docs|editorial`
   (`--screens /a,/b`, `--viewports phone,tablet,desktop` when the request says so). It writes
   `.vp/prototype/<id>/brief.md` (git-ignored) and nothing else: no session, no budget. Without
   a shell: the MCP tool `vp_brief`. An id that already has a brief or a session is refused:
   pick another, or `--force` to start the brief again.
2. **Read, then fill.** Read the patterns the brief names (`vp docs patterns/screen-composition`,
   the archetype's pattern, `patterns/product-look-and-feel` for a product). Fill every section:
   audience, primary task, the sections in order (keep, drop or rename the parts the pattern
   proposes), realistic content per section (real names, figures with units, dates; never lorem
   ipsum), states (empty, loading, error), viewports, images. Adapt the "Expected anatomy" block
   to the parts of this screen and keep it valid JSON. The "Non-negotiables" block is not yours
   to edit: spacing by role, flat is square, the title cap of the context, pictures through
   `VpImage` or none, the stable components to compose; `vp verify` (its lint and its render)
   judges the screen against it.
3. **Write with stable components first.** For every component: `--props`, `--guidelines`,
   `vp token`. Compose VpCallout (a message or an alert that stays), VpToast (a transient
   confirmation, in a VpToastProvider), the chart components (VpLineChart, VpBarChart,
   VpAreaChart, VpDonutChart, VpRadialChart, VpRadarChart for data, peer `echarts`), VpSticker,
   VpBadge, VpActionChip/VpCheckboxChip/VpRadioGroupChip (choose the documented chip API),
   VpSelect, VpSkeleton, VpTooltip for the surfaces the brief marks; never
   redraw them (no hand-built alert box, no bars from `div` widths). VpCallout, VpToast and the
   charts are experimental on web: `vp status` first. Mark each part of the anatomy with
   `data-section="<id>"` or a region labelled with its name.
4. **`vp verify <screen file>`** (every file you wrote for the screen: `vp verify
   planning-cockpit.tsx`, or `vp verify src/Orders.tsx src/OrderRow.tsx`). Do not build first:
   one command runs the rest of the flow, in order: `vp lint --fix` on the files (it rewrites
   only what has one exact answer: a token value, `font-weight: 700`, `font-bold`, a default
   radius off a flat element, a `vp-title-m`/`vp-title-l` heading to `vp-title-s` in product
   context, and prints each change), `vp lint` again, the build of the project with its own Vite
   (the nearest `vite.config.*`; a failed build is the first item, `[build]`, with the error),
   then `vp check-render` on that build with the anatomy of `.vp/prototype/<id>/brief.md` (the
   only brief of the project, or `--brief <id>`; screenshots in `.vp/prototype/<id>/verify/`).
   The context and viewports come from the brief. Without a shell: the MCP tool `vp_verify`
   (`target`: the screen file). A project without Vite (Next.js) verifies what it builds or
   serves instead: `vp verify out --files <src…>` after `next build`, or `vp verify
   http://localhost:3000 --path <page> --files <src…>` with `next dev` running.
5. **Repeat until `ready`.** The verdict is `ready` (no lint ✗, no render error, no layout
   warning, the whole anatomy) or `fix`, with the items in order (lint errors, render errors,
   layout warnings), each with its fix, and the command to run again. Fix by hand what `--fix`
   only reports: a KPI value on `vp-title-m`/`vp-title-l` ("a figure: VpStatCard, or
   vp-title-s"), a hand-built pill (`hand-built-label`: VpSticker, or VpBadge for a count),
   `fake-picture`, `radius-flat`, an undocumented prop value, a missing anatomy part
   (`expect:<id>`), `spacing-off-scale`, `cramped`, `sparse`, `radius-on-flat`, `title-size`.
   Run the printed command again after each fix: it builds again (on a URL or a built folder,
   rebuild yourself when `--fix` rewrote a line: the render measured the old build). **Never hand over on `fix`.** Findings it lists
   "inside Vitamin Play components" never block: name them in the answer for the design system,
   do not rework the screen for them. Open the screenshots before handing over.
6. If `vp verify` says it cannot run (exit 2: no Playwright, no `vite.config.*` or no Vite in
   the project; nothing was rewritten), follow its message (the built folder or a dev server
   URL instead), ask before installing anything, and say the screen was not checked: a screen nobody
   rendered is not finished.

Three rules of `vp docs patterns/screen-composition` hold on every screen, whatever the
archetype (sections "Spacing by role", "Flat is square" under Surfaces and cards, "Motion"):

- **Spacing by role**: `xs` between the items of a group (list rows, chips, buttons of one bar),
  `m` between the blocks of a card, `2xl` (phone) to `3xl` (desktop) between sections; never a
  literal `px` gap.
- **Flat is square**: what sits in the flow (card, tile, panel, input, table) takes
  `rounded-main` (0); only what floats (popover, menu, tooltip, listbox, toast, modal, drawer)
  takes `rounded-s`; chips, pills and avatars `rounded-full`.
- **No rotating chevrons**: a disclosure swaps or flips its icon instantly; motion stays on
  progress, loaders and entering overlays.

Titles follow the cap of the context (the brief states it): `title-s` (22px) in product UI,
`title-m` in documentation, the editorial column of the type ramp otherwise. Pictures are a
`VpImage` with an intent, a ratio and an alt, or there is none: `VpImage` is experimental, so
`vp status VpImage` first; on `decision needed`, relay the question and run
`vp config experimental on|off` for the answer. Until it is yes, use no picture and say where
pictures go. Never a coloured block, a raw `<img>`, a `data:` or placeholder URL.

## The archetypes

| Need | Page |
| --- | --- |
| KPIs, performance, debrief | `vp docs patterns/dashboard` |
| Lists, details, forms, work queue, AI recommendations | `vp docs patterns/back-office` |
| Navigation, top bar, side panels | `vp docs patterns/web-platform` |
| Phone-size web prototype (not native implementation) | `vp docs patterns/mobile-app` |
| The Decathlon feel and tone | `vp docs patterns/brand-expression` |
| Prototyping a product (planner, store tool, AI-assisted platform): the visual language Decathlon designers use, mapped to tokens and components | `vp docs patterns/product-look-and-feel` (in addition) |
| A chat, assistant or agent UI | `vp docs patterns/conversational-interfaces` (first) |
| A product page, product listing or cart | `vp docs patterns/commerce-product-page` |

`vp brief --archetype` takes `dashboard`, `back-office`, `web-platform`, `mobile-app`,
`assistant` (or `conversational-interfaces`), `commerce` (or `product-detail-page`); an unknown
archetype takes the screen anatomy of `patterns/screen-composition`.

## Max mode

A web prototype meant to be shown ("mode max", "haute fidélité", "high fidelity") replaces this flow
with the loop of [prototyping-max.md](prototyping-max.md): `vp prototype start` writes the same
brief with a session and a budget, and `vp prototype check` renders, critiques and answers a
verdict until a stop.
