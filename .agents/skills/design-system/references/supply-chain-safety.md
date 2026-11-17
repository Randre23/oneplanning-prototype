### Supply-chain safety: `@vtmn-play/react` on public npm

`@vtmn-play/*` packages are private and only published to Decathlon's Google Artifact Registry. A malicious dependency-confusion package was published under the same name on the **public** npm registry (`@vtmn-play/react@99.9.1`, advisory [`MAL-2026-4464` / `GHSA-vpcv-xpqm-w228`](https://osv.dev/vulnerability/MAL-2026-4464)). npm support has removed it and replaced it with a `0.0.1-security` holding package, but the advisory is still listed by vulnerability scanners and may be flagged by agents.

Before installing or upgrading `@vtmn-play/react` (or any `@vtmn-play/*` package), verify:

1. **A `.npmrc` exists** at the project root (or workspace root in a monorepo) and contains `@vtmn-play:registry=https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/`.
2. **Versions target a real private release.** Prefer an exact version (e.g. `0.44.0`, or a pnpm `catalog:` entry resolving to one). Bounded ranges such as `^0.44.0` or `~0.44.0` are allowed, but the user accepts the risk of pulling a new release automatically. Never use `*`, `latest`, `x`, an empty range, or any range that could match `99.9.1` (e.g. `>=0.0.0`).
3. **The lockfile resolves from the private registry**: `resolved`/`tarball` URLs for `@vtmn-play/*` must point to `europe-npm.pkg.dev`, never `registry.npmjs.org`.
4. **The lockfile is committed and enforced.** Each `@vtmn-play/*` entry has an `integrity` hash (`sha512-…`), and CI installs with `pnpm install --frozen-lockfile` or `npm ci`. A version number alone does not guarantee content: the integrity hash does, and a frozen install fails if the tarball has changed.

When all four checks pass, a scanner alert on `MAL-2026-4464` / `GHSA-vpcv-xpqm-w228` is a false positive for this project: the public package is never fetched. Mention it to the user and continue — do not block the flow.

If any check fails, **stop and warn the user** that the project is exposed to the known malicious `@vtmn-play/react` package on public npm, then fix the `.npmrc` and/or pin the version before running any install. If `@vtmn-play/react@99.9.1` (or any version resolved from `registry.npmjs.org`) is already installed, treat it as a compromise: remove `node_modules` and the lockfile entry, reinstall from the private registry, rotate any credentials available on the machine/CI, and notify the security team.
