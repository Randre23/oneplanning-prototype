# Native platform entry points

The CLI is a documentation tool, not a native build system. Android and Apple teams need
Node 24+ and npm GAR authentication to run `vp`, even though their apps do not use npm.
Set them up with [gar-authentication.md](gar-authentication.md); with no npm project, the scope goes in `~/.npmrc`.
[CLI installation](https://github.com/dktunited/vitamin-play-cli/blob/main/site/content/docs/cli/getting-started/install.md).

## Android

Read `vp docs platforms/android` before setup. In a Decathlon project with the SIG Mobile
Gradle repository helper already available, restore the Maven GAR repository:

```kotlin
repositories {
    mavenGarSigMobile()
}
```

This helper is provided by the project's SIG Mobile build tooling, not by Gradle or
Vitamin Play. If unresolved, ask for that tooling/setup; do not invent an import or fetch
private Maven artifacts from public repositories. npm authentication for `vp` does not
configure Maven.

Read `vp docs platforms/android --section "Testing Artifacts"` for companion `-test`
artifacts and selectors, and `--section "Migration from Vitamin to Vitamin Play"` plus
`vp docs migration/android` for documented mappings. Query each component's native API,
tokens and guidelines; run the project's Gradle build, relevant Compose tests and previews.
Architecture, navigation and performance policy remain with SIG Mobile and the project.

## Apple

Read `vp docs platforms/apple --section "SPM Integration"` for package/target setup, then
the theming and token sections. Use `vp docs migration/apple` and component `--a11y`
for migration and accessibility guidance. Read the repository's native test strategy and
run its relevant Xcode/Swift tests and previews; do not claim an undocumented testing or
architecture standard.

For both platforms, finish the SKILL.md self-check. Web `vp lint`, `vp verify` and
`vp prototype` render verdicts are not native validation. State explicitly which native
checks ran and any unavailable preview or test instead of claiming browser verification.

Sources: [Android library](https://github.com/dktunited/vitamin-play-android),
[Apple library](https://github.com/dktunited/vitamin-play-apple), and
[Vitamin Play CLI](https://github.com/dktunited/vitamin-play-cli) for the documentation
served to agents.
