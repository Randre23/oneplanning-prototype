# Max mode: high-fidelity prototypes

Opt-in. Use it when the user asks for "mode max", "haute fidélité", "high fidelity", or a
prototype meant to be shown (a review, a demo, a pitch). Otherwise the standard workflow of
SKILL.md applies, unchanged.

This browser loop is web-only, including phone-size web prototypes. A native Compose or
SwiftUI prototype follows [native-platforms.md](native-platforms.md), with native previews
and tests instead; do not require a web `stop-pass` or report for native code.

Done means, in this order: `start`, a filled `brief.md`, `options`, at least one `check` with its
screenshots opened (and its critique written while findings remain), iterations until a stop
verdict, then `report`.
A screen written without that loop is a standard-mode answer, not a max-mode one: never stop
there, even when a task only asks for the code file.

The loop runs in this session; `vp` serves the brief, the renders and the verdicts and never
calls a model. Without a shell, every `vp prototype …` command is the MCP tool
`vp_prototype_<command>` (`vp_prototype_start`, `vp_prototype_check`…), flags as arguments.
If `vp prototype` is missing, ask to update the CLI (workflow step 0); do not imitate the loop
by hand.

## Budget

Iterations by richness: 3 iterations when the brief's anatomy has fewer than 8 parts, 4 from
8 parts (a product page with its 14 parts takes 4; a dashboard with 6 takes 3). `start` reads
the anatomy and says which applied; `--iterations <n>` overrides it, only when the user asks.
Time: 10 minutes per screen (the options step included), 30 minutes per
prototype. The CLI measures time and returns the time and iterations left in every answer;
never estimate them yourself. Stop as soon as the verdict says stop.

## 1. Questions

Ask at most 3 questions, in one message (the host question tool, or plain text as for a
`decision needed`). Always ask:

- "How many directions do you want to see first: 1, 2 or 3?"

Pick the other two among what the request leaves open: audience and primary task, screens,
viewports, a reference URL. Do not ask what the request already says. Non-interactive run:
ask nothing; take 1 direction unless the request gives a number, and state your assumptions.

## 2. Start and brief

1. `vp prototype start <id> --directions <n> [--archetype <a>] [--context product|docs|editorial] [--screens /a,/b] [--viewports phone,tablet,desktop]`.
   `<id>`: short kebab-case name of the prototype. The session lives in `.vp/prototype/<id>/`
   (git-ignored).
2. Read the patterns the brief names: `vp docs patterns/screen-composition`, the archetype
   (`patterns/<archetype>`), `patterns/product-look-and-feel` for a product.
3. Fill every section of `.vp/prototype/<id>/brief.md`: audience, primary task, sections in
   order, realistic content per section (real names, figures, dates; never lorem ipsum),
   states (empty, loading, error), viewports, references, expected anatomy. Keep the anatomy
   block in its `--expect` format: `vp prototype check` verifies it. The "Non-negotiables"
   block (spacing by role, flat is square, the title cap of the context, `VpImage` or no
   picture, the stable components to compose) is not yours to edit: `check` and the critique
   judge the screen against it.
4. A reference URL from the user: `vp check-render <url> --out .vp/prototype/<id>/reference`,
   open its screenshots, and write in the brief what to take from it (layout, density, tone).
   Never copy its brand or content.

## 3. Directions

1. Build the `<n>` directions at low fidelity (layout, hierarchy, real headings; no polish),
   one route each, labelled A, B, C in that order, each with a one-line intent.
2. `vp prototype options <id> <url|folder> --path /a [--path /b] [--path /c]`, then open
   `.vp/prototype/<id>/options/index.html` and its screenshots.
3. Two or three directions: relay the question the CLI returns ("Which direction do you keep:
   A, B or C?", only the letters that exist), wait, then
   `vp prototype choose <id> <label> --reason "<the user's words>"`.
   Non-interactive run: keep A unless the sheet shows a clearly better one, and record why:
   `vp prototype choose <id> <label> --reason "<why>"`.
   One direction: still run `options` (its sheet is the first look at the screen); the CLI
   records A and asks no question. `check` refuses to start before a direction is recorded or
   while `brief.md` is still the skeleton.

## 4. Build from a starter

`vp templates`, then `vp docs templates/<id>`; when one fits the archetype, and once the user
agrees, `vp create <template> <dir> --title "<title>"` (CLI-only; without a shell, ask the
user to run it). Keep its stack and blocks. If none
fits, say so and build on the chosen direction. Then the standard workflow for every
component: `--props`, `--guidelines`, `vp token`.

Images: `VpImage` with an `intent` ("product: trail running shoe, side view"), a `ratio` and
an `alt`; no `src` renders a placeholder that reads as finished. Never a raw `<img>`, never a
stock URL. `VpImage` is experimental: run `vp status VpImage`; when the answer contains
`decision needed`, relay its question and run `vp config experimental on|off` for the answer.
Until it is yes, use no picture and say where pictures go.

## 5. Loop

One iteration:

1. Write or fix the code.
2. `vp lint --fix <files…> --context <context>`: applies exact fixes only; read what it
   changed and fix the findings it only reports (a KPI value on `vp-title-m|l`: VpStatCard or
   `vp-title-s`; a hand-built pill: VpSticker or VpBadge), then `vp lint` again until no ✗
   line is left.
3. `vp prototype check <id> <url|folder> --path <screen>… --files <files…>`. Its answer lists
   the `lint:prop` findings first: **props before pixels**. For every one,
   `vp component <X> --props`, fix the prop, `vp lint` the file again, and only then open a
   screenshot. Findings tagged `source: component` (inside a Vitamin Play component) are
   listed apart and never block the verdict: do not rework the prototype for them; carry them
   to the handover.
4. Open EVERY screenshot of `.vp/prototype/<id>/iter-<n>/screenshots/`, at every viewport.
   A screenshot you did not open is a defect you did not see.
5. **Critique from the template**, required while the iteration has findings. When `check`
   answers 0 errors, 0 warnings and the whole anatomy (`critique: not required`,
   `critique.required: false` in `score.json`), the verdict is already `stop-pass`: the
   critique is the visual safety net of a screen that still has findings. Otherwise `check` wrote
   `.vp/prototype/<id>/iter-<n>/critique.template.json`: every rubric item with its `id`, its
   `question`, `status: ""`, the `screenshot` to judge it on (the widest viewport's; the
   phone's for `viewport-behaviour`) and `note: ""`. Copy it to
   `.vp/prototype/<id>/iter-<n>/critique.json` and fill `status` and `note` for every item,
   one entry per rubric item, none skipped, none added; change a `screenshot` only when you
   judged on another one of this iteration. The shape the CLI reads is
   `{"items": [{"id": "<rubric id>", "status": "pass|fail", "screenshot": "screenshots/<file>.png", "note": "<what you saw>"}]}`
   (`vp prototype rubric --context <context>` prints the questions again). Judge the picture,
   not the code. A fail needs a note that says what to change. A copy left with empty statuses
   is not a critique: the CLI lists each item as invalid and never answers `stop-pass` on it.
6. Read the verdict:
   - `continue`: fix in its order (runtime errors, then errors, then failed critique items,
     then warnings), then the next iteration. Never hand over on `continue` while iterations
     and time are left: the loop ends on a stop verdict, not when the screen looks fine.
   - `stop-pass`: done. With warnings left, the CLI refuses it while the critique is missing
     or incomplete; with 0 errors, 0 warnings and the whole anatomy it needs no critique. A
     failed critique item always holds it.
   - `continue` with `0 errors` but warnings and `critique: missing` or `incomplete`: write
     the critique of this iteration, then `vp prototype check <id> --iteration <n>` (no
     iteration spent); or fix the warnings in the next iteration, which then passes without
     a critique.
   - `stop-iterations`, `stop-budget`: stop fixing; hand over with the remaining defects.

Never edit `session.json`, `score.json`, `lint.json` or `render.json`: the CLI writes them.

## 6. Handover

Always start with `vp prototype report <id>`, even after a stop on budget; then give the user `.vp/prototype/<id>/report/index.html` and, in
your answer: the chosen direction and its reason, iterations and time used, the verdict, every
remaining error and warning with its screen and viewport, the component defects reported apart
(`source: component`, the design system's to fix, not the prototype's), the placeholders still
waiting for a picture, and the decisions left to the user. A stop on budget is not a pass: say so.
