# Freshness gate (workflow step 0)

Run it once per session, before the first Vitamin Play task: `vp doctor --online --json` (MCP:
`vp_doctor` with `online: true, json: true`). It checks the running CLI against the latest
release in the private registry; it does not install or update anything. Its answer holds for
the rest of the session: do not rerun it for later tasks unless the CLI was updated or the user
asks.

Read the report, not only the exit code: agent-block and project-package diagnostics are
separate from CLI freshness. Continue normally only when `cli.ok` is true. Doctor compares
the complete installed version to the latest published release, including patch updates.
There is no documentation-age threshold; the Vitamin Play team owns the embedded docs refresh:
[ownership and procedure](https://github.com/dktunited/vitamin-play-ai/blob/main/skill-design-system/FRESHNESS.md).

- **The CLI differs from the latest release:** ask permission to update it using the published
  version returned by doctor, after the supply-chain checks of
  [supply-chain-safety.md](supply-chain-safety.md). Then rerun the gate. Restart or reconnect
  `vp mcp` first: a running server still uses its old CLI.
- **The user declines, the registry is unreachable, authentication fails, or the host cannot
  update:** explain which installed documentation will be used and obtain explicit permission
  to continue with it. Never silently treat an offline check as fresh. On an authentication
  failure, first walk through [gar-authentication.md](gar-authentication.md) (scope, sign-in,
  token refresh), then rerun the gate.
- **`vp doctor` or `vp_doctor` is missing:** ask to update the CLI/server and retry. Do not work
  around missing commands with version-specific instructions in this skill.
- **Project packages lag behind documented versions:** `vp changes <component>` lists what
  changed; explain what applies. Updating the CLI does not update UI packages.
