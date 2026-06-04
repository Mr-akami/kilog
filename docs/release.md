# Release

Releases are driven by [changesets](https://github.com/changesets/changesets) and published via GitHub Actions (`.github/workflows/release.yml`) using npm [Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers). No long-lived `NPM_TOKEN` is required after initial setup.

## Author workflow

```bash
pnpm changeset              # record a change (bump kind + summary)
# commit the generated .changeset/*.md with your PR
```

When the PR lands on `main`, the workflow opens (or updates) a "chore: version packages" PR. Merging that PR bumps versions, writes CHANGELOG, and publishes to npm with provenance via OIDC.

## Required GitHub / npm setup

- npm org `kilog` must exist (https://www.npmjs.com/org/create)
- Settings → Actions → General → Workflow permissions → "Read and write" + "Allow GitHub Actions to create and approve pull requests"
- For **every** published package under `packages/` on npmjs.com: Settings → Trusted Publisher → GitHub Actions
  - Organization: `Mr-akami`
  - Repository: `kilog`
  - Workflow filename: `release.yml`
  - Environment name: (leave empty)
  - Current packages: `@kilog/core`, `@kilog/runtime-node`, `@kilog/register`, `@kilog/vite-plugin`, `@kilog/web-ui`, `@kilog/cli`, `@kilog/kilog`, `@kilog/nextjs-plugin`, `@kilog/wrangler-plugin`
  - A package whose Trusted Publisher is missing/misconfigured fails CI publish with a misleading `E404 Not Found - PUT` (npm treats the tokenless OIDC request as anonymous).
- (Recommended) On each package: Settings → Publishing access → "Require two-factor authentication and disallow tokens"

## First publish (bootstrap — once)

Trusted Publishing requires each package to exist on npm before its trusted publisher can be configured. Do the first publish manually, then switch to CI.

```bash
# 1. Prerequisites
#    - Create npm org "kilog": https://www.npmjs.com/org/create
#    - npm login (2FA enabled, no token needed)
#    - Ensure local is clean: git status
pnpm install --frozen-lockfile
pnpm build
pnpm test

# 2. Temporarily disable provenance (no OIDC in local env)
#    Edit each packages/*/package.json:
#      "publishConfig": { "access": "public", "provenance": true }
#    → "publishConfig": { "access": "public" }
#    (all 7 packages under packages/)

# 3. Publish in dependency order — workspace:* is auto-rewritten to the version
pnpm --filter @kilog/core publish --access public --no-git-checks
pnpm --filter @kilog/runtime-node publish --access public --no-git-checks
pnpm --filter @kilog/register publish --access public --no-git-checks
pnpm --filter @kilog/vite-plugin publish --access public --no-git-checks
pnpm --filter @kilog/web-ui publish --access public --no-git-checks
pnpm --filter @kilog/cli publish --access public --no-git-checks
pnpm --filter @kilog/kilog publish --access public --no-git-checks

# 4. Restore "provenance": true on all 7 packages and commit.
#    (OIDC in CI will auto-generate provenance from this point on.)

# 5. Configure Trusted Publisher on each package at npmjs.com (see setup list above).

# 6. Verify
npm view @kilog/kilog version
```

Tip: use `pnpm --filter <name> publish --dry-run` first to inspect what would be sent.

## Adding a new package (after initial setup)

npm Trusted Publishing **cannot perform a package's very first publish**: the OIDC request 404s because the package does not exist yet, and the npmjs.com UI only exposes Trusted Publisher settings for packages that already exist (chicken-and-egg). So a brand-new package needs one manual publish to bootstrap it, then Trusted Publisher configuration. After that, CI handles it like every other package.

Symptom if you skip this: the release workflow logs `@kilog/<new> is being published because our local version (x.y.z) has not been published on npm` followed by `error E404 Not Found - PUT .../@kilog%2f<new>`. Already-configured packages publish fine in the same run; only the unconfigured new one fails.

```bash
# 1. Build the new package (dist must exist)
pnpm build

# 2. Manually publish the CURRENT version once.
#    --provenance=false is required: provenance needs CI/OIDC and cannot be
#    generated in a local environment. (This overrides publishConfig.provenance
#    without editing the file.) Auth via npm login / 2FA / security key.
npm publish ./packages/<new-package> --access public --provenance=false

# 3. Confirm it landed (registry, not the cached website page):
npm view @kilog/<new-package> version

# 4. On npmjs.com → @kilog/<new-package> → Trusted Publisher → GitHub Actions:
#      Organization: Mr-akami   Repository: kilog
#      Workflow filename: release.yml   Environment: (empty)
#    Then add the package to the "Current packages" list in this doc.
```

From the next release on, CI publishes the new package via OIDC automatically. If the version PR has already bumped the new package past the version on npm, publish that exact version in step 2 (or merge the version PR, then re-run the release workflow once Trusted Publisher is set).

Gotchas observed:
- The npmjs.com **package page** can show 404/403 to `curl` (bot protection) or serve a stale cache right after publishing — trust `npm view <pkg> version` / the registry API, not the web page.
- "Publishing access" (2FA requirement) and "Trusted Publisher" are **separate** sections on the same Settings page. Configuring 2FA does not configure trusted publishing.

## README sync

`@kilog/kilog` ships the root `README.md` as its package README. `packages/kilog` has a `prepack` script that copies `../../README.md` in before packing, so every publish picks up the latest root README automatically.
