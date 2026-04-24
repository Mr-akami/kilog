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
- For each published package on npmjs.com: Settings → Trusted Publisher → GitHub Actions
  - Organization: `Mr-akami`
  - Repository: `kilog`
  - Workflow filename: `release.yml`
  - Environment name: (leave empty)
  - Configure for all 7 packages: `@kilog/core`, `@kilog/runtime-node`, `@kilog/register`, `@kilog/vite-plugin`, `@kilog/web-ui`, `@kilog/cli`, `@kilog/kilog`
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

## README sync

`@kilog/kilog` ships the root `README.md` as its package README. `packages/kilog` has a `prepack` script that copies `../../README.md` in before packing, so every publish picks up the latest root README automatically.
