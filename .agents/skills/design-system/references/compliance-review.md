# Compliance checks

When asked to check, audit or review code, no `vitamin-play-web` checkout is needed.

## Steps

1. For each file, identify the platform and every design-system component, style, token and
   hand-built UI pattern.
2. For each component: `vp component <name> --platform <p> --detail compact`, its `--props`,
   `--a11y` or section, and `--guidelines`. Check Compose and SwiftUI APIs against their
   documentation as carefully as web ones. `vp token <value>` for hardcoded values. Never
   infer an API or a fix from memory.
3. Web files: also `vp lint <file…>`. It checks `Vp*` props, hand-built patterns, token values
   and the button guidelines it can parse. Its parser is heuristic: a clean result is not proof.
4. Report file by file before opening the next: findings, then compliant usages, each citing
   the documented prop, native API, guideline or token row. A hand-built pattern is a finding
   only when the platform docs provide its replacement. If a lookup returns nothing, report
   that rather than trying alternate names.

## What counts as a violation

A violation is only one of:

- raw HTML or a hand-built pattern where a documented `Vp*` component or asset exists;
- a hardcoded value (hex, px, font size, duration, shadow, a physical `padding-left`, a
  hand-made dark mode) where a token, a typography utility, a logical property or the
  theming mechanism exists;
- a prop, variant or value absent from the props table;
- a documented Don't or usage rule of `--guidelines` (two primary buttons side by side, two
  icons in one button, a vague label…).

A valid variant on a valid component is a design choice unless a documented Don't forbids it
in that context. Judge each rule on the file as written: when a fix you propose would create a
new conflict (the raw button you turn into a primary next to an existing primary), say it inside
that fix, never as a violation of the code that is already there. Wrapping already-tokenised
content in another component is an optional suggestion, listed apart. A token `vp token` returns for the platform is correct by
definition. A clean-looking file still goes through steps 1–3; once they find nothing, end
with one sentence saying the file is compliant.
