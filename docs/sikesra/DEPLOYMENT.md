# SIKESRA Deployment Overlay

The deployment overlay stays outside EmDash core and lives in repo-local config and scripts.

## Cloudflare Bindings

Use `infra/sikesra/wrangler.jsonc` as the binding contract for a SIKESRA host Worker.

Required bindings:

- `DB` for the EmDash baseline database
- `SIKESRA_DB` for the SIKESRA application database boundary
- `MEDIA` for general media storage
- `SIKESRA_DOCUMENTS` for classified SIKESRA file storage
- `SESSION` for auth/session KV
- `LOADER` for plugin worker loading

Required secrets / env:

- `CF_ACCESS_AUDIENCE` when the host app uses Cloudflare Access auth

## Cloudflare Access

If the host app is configured with `auth: access(...)`, the Worker alone is not enough. The public hostname must also be protected by a Cloudflare Access application so requests to `/_emdash/*` receive a `Cf-Access-Jwt-Assertion` header (or `CF_Authorization` cookie).

Minimum checks:

- Set the `CF_ACCESS_AUDIENCE` secret on the deployed Worker.
- Protect the deployed admin surface, typically `https://<host>/_emdash/*`, with a Cloudflare Access application.
- Verify that unauthenticated browser requests are challenged by Access before they reach the Worker.

Replace the placeholder IDs before deployment.

## Postbuild Adapter

If the host app builds an EmDash Worker into `dist/server`, patch in the repo-local wrapper with:

```bash
pnpm sikesra:postbuild
```

Environment overrides:

- `SIKESRA_DIST_DIR` to point at a different generated server directory
- `SIKESRA_WRAPPER_TEMPLATE` to use a different wrapper template path

The wrapper template lives at `infra/sikesra/worker-wrapper-template.mjs` and keeps the `/sikesra` and SIKESRA plugin namespaces explicit without patching EmDash source packages.

## Smoke Check

After deploy, verify the admin plugin route envelope with:

```bash
pnpm sikesra:smoke-admin
```

Optional environment variables:

- `SIKESRA_BASE_URL`
- `SIKESRA_ADMIN_PAGE`
- `SIKESRA_ADMIN_COOKIE`
- `SIKESRA_EXPECT_UNAUTHORIZED=1`

This checks that `/_emdash/api/plugins/sikesra/admin` returns the expected EmDash `data.blocks` payload shape.
