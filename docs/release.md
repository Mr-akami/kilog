# Release

Releases are driven by [tagpr](https://github.com/Songmu/tagpr) and published via GitHub
Actions (`.github/workflows/release.yml`) using npm
[Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers). No `NPM_TOKEN` is
required.

Only one package is published: `@mr-akami/kilog` (`packages/kilog`).

## Author workflow

Nothing to do per pull request. Merge to `main` and tagpr keeps a release pull request
("[tagpr] prepare for release ...") up to date with the accumulated changelog and the next
version.

Merging that release pull request:

1. tags the merge commit,
2. creates the GitHub Release,
3. and the same workflow run then builds and `npm publish`es `packages/kilog`.

## Versioning

CalVer, configured in `.tagpr`:

```ini
calendarVersioning = true   # YYYY.MM0D.MICRO
```

So a release cut on 2026-08-18 is `v2026.818.0`, and a second release the same day is
`v2026.818.1`. The month is intentionally unpadded — a zero-padded segment (`2026.0818.0`)
is not valid semver and npm rejects it.

`versionFile = packages/kilog/package.json` keeps the published version in sync with the
git tag. Editing the version in the release pull request overrides the computed one.
Major/minor labels are ignored under CalVer.

## Required GitHub / npm setup

- Settings → Actions → General → Workflow permissions → "Read and write" +
  "Allow GitHub Actions to create and approve pull requests"
- On npmjs.com, for the `@mr-akami/kilog` package: Settings → Trusted Publisher → GitHub Actions
  - Organization: `Mr-akami`
  - Repository: `kilog`
  - Workflow filename: `release.yml`
  - Environment name: (leave empty)
- (Recommended) Settings → Publishing access → "Require two-factor authentication and
  disallow tokens"

## First publish (bootstrap — once)

Trusted Publishing requires the package to exist on npm before its trusted publisher can be
configured, so the first publish is manual.

```bash
# 1. Prerequisites: npm login (2FA), clean working tree
pnpm install --frozen-lockfile
pnpm build
pnpm test

# 2. Temporarily drop provenance (no OIDC locally):
#    packages/kilog/package.json
#      "publishConfig": { "access": "public", "provenance": true }
#    → "publishConfig": { "access": "public" }
#    and set an initial CalVer version, e.g. "2026.818.0".

# 3. Publish
pnpm --filter @mr-akami/kilog publish --access public --no-git-checks

# 4. Restore "provenance": true and commit.
# 5. Configure the Trusted Publisher on npmjs.com (see above).
# 6. Verify
npm view @mr-akami/kilog version
```

## Legacy `@kilog/*` packages

The pre-consolidation releases were published as nine packages under the `kilog` npm org. They are frozen at `1.3.1` and deprecated:

```bash
for p in core cli web-ui register runtime-node vite-plugin nextjs-plugin wrangler-plugin kilog; do
  npm deprecate "@kilog/$p" "moved to @mr-akami/kilog — npm i -D @mr-akami/kilog"
done
```

They are not unpublished (npm disallows it beyond 72 hours), and the org stays in place
because it still owns those names.
