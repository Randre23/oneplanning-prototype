# Google Artifact Registry (GAR) authentication

Every `@vtmn-play/*` package, the `vp` CLI included, comes from Decathlon's Global NPM
Private Registry: `https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/`. The user may
not be technical: drive every step yourself, explain each one in a single plain sentence,
and only hand over what needs a human (signing in in the browser, approving an install).

Never ask for, read, print or store a password or token. Tokens live only in the user's
`~/.npmrc`, written by the helper below; never in the project `.npmrc`, a script, a commit
or the chat. Never use `--credential-config=.npmrc` or any project file as credential target.

## Local machine

Run the steps in order, from the directory that holds the project's `.npmrc` (project root,
or workspace root in a monorepo). Skip a step whose check already passes.

1. **Registry scope.** Check: `npm config get @vtmn-play:registry` prints
   `https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/`. Otherwise create or update the
   project's `.npmrc`, keeping its other lines:

   ```ini
   registry=https://registry.npmjs.org/
   @vtmn-play:registry=https://europe-npm.pkg.dev/tnt-managed-wtbe/global-npm/
   ```

   Keep an existing `registry=` value if the project uses another default registry. Do not
   add `always-auth` (older guides show `//…:always-auth=true`): npm ignores it and npm 11
   warns `Unknown project config "always-auth"`; remove it if that warning worries the user.
   With no project (only running `vp`), ask before adding the same lines to the user's
   `~/.npmrc` instead.
2. **Google Cloud CLI.** Check: `gcloud --version`. Otherwise ask, then install it:
   `brew install --cask gcloud-cli` on macOS with Homebrew, else the
   [official installer](https://cloud.google.com/sdk/docs/install). Open a new shell, or
   use the full path the installer prints, before continuing.
3. **Sign in and get the npm token.** Tell the user a browser window will open and they must
   sign in with their Decathlon Google account, then run, in one command:

   ```bash
   gcloud auth login && npx google-artifactregistry-auth
   ```

   (`pnpm dlx google-artifactregistry-auth` in a pnpm project). Wait for it to return: the
   sign-in blocks until the user completes it in the browser; allow several minutes. The
   helper then reads the registries of the `.npmrc` in the current directory and writes a
   short-lived token (about one hour) to `~/.npmrc`.
   An account listed as active by `gcloud auth list` is not proof: its credentials can be
   stale and give `E403`. Run only `npx google-artifactregistry-auth` (no browser) when the
   user signed in during this session, or to refresh an expired token or after the `.npmrc`
   scopes change; on any `E401`/`E403` at step 4, run the full command once more.
   In a shell with no browser (remote host, container), use
   `gcloud auth login --no-launch-browser` only if the user can paste the code back;
   otherwise ask them to run the full command in their own terminal, then continue.
4. **Verify.** `npm view @vtmn-play/cli version` prints a version number.
5. **Install.** Only now, after the checks of [supply-chain-safety.md](supply-chain-safety.md),
   add the packages that `vp docs platforms/<p>` lists, with an exact version:
   `pnpm add -E …` or `npm install -E …`. Never leave `*` or `latest` in
   `package.json`, and commit the lockfile.

The token lasts about one hour, then `npx google-artifactregistry-auth` must run again. In a project, offer once to add
a script so anyone can refresh it with a single command, e.g.
`"gar:login": "npx google-artifactregistry-auth"` (`pnpm gar:login`, `npm run gar:login`).
The Google sign-in lasts much longer: run the full step 3 command only if this script fails.
On Windows, `~/.npmrc` is `%USERPROFILE%\.npmrc`.

### Troubleshooting

| Symptom | Cause | Action |
| --- | --- | --- |
| `E401`, `E403` or `Unable to authenticate` after it worked before | Token expired (about one hour) | Rerun `npx google-artifactregistry-auth`, then step 4. |
| Same error right after a token refresh | The helper uses Application Default Credentials before the `gcloud` account; stale or foreign ADC wins | If `GOOGLE_APPLICATION_CREDENTIALS` is set to a file that is not meant for this, run the command without it; else run `gcloud auth application-default login && npx google-artifactregistry-auth` (browser sign-in again), then step 4. |
| `E403` `The caller does not have permission` | Usually stale `gcloud` credentials, even with an active account | Rerun the full step 3 command (`gcloud auth login && npx google-artifactregistry-auth`), then step 4. |
| Same `E403` right after the full step 3 command | The account has no read access to global-npm | Stop. Tell the user to contact `frontendsig@decathlon.net`. |
| `E404` naming `registry.npmjs.org` for a `@vtmn-play/*` package | The scope line is missing or not read | Stop installing; fix step 1 from the right directory. See [supply-chain-safety.md](supply-chain-safety.md). |
| pnpm: `tokenHelper must not be configured in project-level .npmrc` | A credential setting sits in a project-level `.npmrc` | Ask before moving that line to `~/.npmrc`; never delete credentials. |
| `gcloud: command not found` right after installing | The shell has not reloaded `PATH` | New shell, or the full path printed by the installer. |
| `npx` or `pnpm dlx` cannot download the helper | No access to the public npm registry | Report the network or proxy issue to the user; do not use another registry. |

## CI/CD (GitHub Actions)

Use Decathlon's [`npm-authenticate-gar`](https://github.com/dktunited/.github/tree/main/actions/npm-authenticate-gar)
action, which authenticates through GitHub OIDC (read-only on global-npm). No secret, key or
token to create. Show the diff and ask before editing a workflow, then apply it:

```yaml
jobs:
  build:
    runs-on: [self-hosted, decathlon]
    permissions:
      id-token: write   # mandatory: OIDC sign-in to Google Cloud
      contents: read
    steps:
      - uses: actions/checkout@v5
      - uses: pnpm/action-setup@v4        # pnpm projects only; reads packageManager
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: npm auth GAR before gcloud authentication
        uses: dktunited/.github/actions/npm-authenticate-gar@main
        # with:
        #   directory: front               # only when .npmrc is not at the repository root
      - name: Install dependencies
        run: pnpm install --frozen-lockfile   # npm: npm ci
```

- Keep the order: checkout (the action needs the committed `.npmrc`), then the action, then
  the install. The committed `.npmrc` must contain the step 1 lines.
- If the job already signs in with its own service account
  (`dktunited/.github/actions/gcloud_workload_identity`), keep that step before this action;
  the action reuses it, and the service account needs read access to global-npm
  (`frontendsig@decathlon.net`).
- Pull requests from forks get no OIDC token: the action fails there by design.
- Never add a service-account JSON key or `NPM_TOKEN` secret to read `@vtmn-play/*`;
  publishing is out of scope.
