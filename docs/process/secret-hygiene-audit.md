# Secret Hygiene Audit

## Purpose

This runbook standardizes how AWCMS Mini SIKESRA operators and maintainers audit maintained scripts, docs, and helper commands for unsafe secret handling.

Use it when:

- reviewing new scripts or automation helpers
- refreshing operator docs that mention tokens, secrets, or passwords
- checking whether tracked examples still normalize unsafe credential patterns
- validating that local-only secrets stay outside the repository

## Current Repository Finding

The current maintained `scripts/**` entrypoints reviewed in this pass did not confirm embedded live credentials in checked-in code.

The current maintained script entrypoints now use the shared `scripts/_local-env.mjs` helper where local env loading is required, so secret loading stays auditable and consistent without sourcing env files as shell code.

The reviewed local command scripts read connection strings and tokens only from ignored env files or the inherited process environment. Credential-bearing Hyperdrive and PostgreSQL values must stay in `.env.local`, Cloudflare-managed secrets, Coolify locked secrets, or an equivalent local secret store, not in tracked scripts.

This repository is currently a SIKESRA runtime/config workspace and does not contain the full app build wrapper. If app build scripts are added here later, they must remove generated `dist/server/.dev.vars*` files after local builds so local operator secrets from `.env.local` do not linger inside Cloudflare build artifact trees.

The reviewed local env helper now centralizes parser-based env loading in `scripts/_local-env.mjs`. The current SIKESRA scripts intentionally load `.env.local` before `.env`, so local operator secrets override tracked-safe defaults without sourcing env files as shell code.

The current repository posture should therefore be described as:

- no confirmed committed live credentials in the reviewed maintained scripts
- ongoing need for prevention and audit hardening
- local-only and deployment-managed secret handling should remain explicit in docs and examples

This runbook should not be used to overstate a leak that has not been confirmed.

## Secret Storage Rules

- keep production and operator secrets out of source control
- keep local-only secrets in `.env.local`, `.env.<environment>.local`, or an equivalent local secret store
- keep production runtime secrets in deployment-managed environment variables, Cloudflare-managed secrets, or equivalent server-only storage
- for Coolify-managed resources, prefer Coolify locked secrets with runtime-only scope by default and Docker Build Secrets only when a reviewed build flow genuinely needs sensitive input
- keep operator automation secrets separate from runtime application secrets
- do not place live tokens, passwords, or keys in issue bodies, tracked scripts, or committed examples

## Audit Targets

Review these surfaces in order:

1. maintained scripts under `scripts/**`
2. `.env.example` and other tracked configuration examples
3. deployment and operator docs under `docs/process/**` and `docs/security/**`
4. repository entry docs such as `README.md`

## Audit Checklist

- check for hardcoded passwords, tokens, API keys, or credential-bearing URLs
- check for inline command examples that encourage replacing placeholders directly in tracked files
- check for scripts that print secrets to stdout, stderr, or thrown error messages
- check for scripts that bypass the documented `.env` and `.env.local` loading pattern
- check for production-like default values in tracked examples where placeholders would be safer
- check that docs distinguish local-only secrets from deployment-managed secrets
- check that secret examples use placeholders such as `<password>` or `replace-with-...`, not realistic reusable values

## Expected Patterns

Preferred repository patterns:

- `.env.example` contains placeholder values only
- `.env.local` and `.env.<environment>.local` are local-only and untracked
- `.env.<environment>` may be used for non-secret environment-specific defaults, but should stay untracked unless it is promoted into `.env.example`-style placeholder guidance
- generated Cloudflare local secret files such as `dist/server/.dev.vars` are treated as disposable local artifacts and removed after reviewed build flows
- scripts use the shared local env loading pattern rather than reimplementing it ad hoc
- scripts parse env files as environment data rather than execute them through the shell
- scripts fail clearly when required env vars are missing
- docs describe variable names and storage locations without including live values
- Coolify, Cloudflare, and database credentials remain separate by purpose and scope
- Coolify-managed credentials use locked secrets and runtime/build scoping rather than generic copied `.env` text unless the value is intentionally operator-local only

## Automated Coverage

The repository now includes `node scripts/check-secret-hygiene.mjs` as the focused automated regression check for reviewed maintained surfaces. If a future `package.json` is added, a `pnpm check:secret-hygiene` alias may wrap the same script.

Current scan scope:

- `.env.example`
- `.dev.vars.example`
- `package.json`
- `wrangler.jsonc`
- `AGENTS.md`
- `scripts/**/*.mjs`
- `src/**/*.mjs`
- `tests/**/*.mjs`
- `docs/process/**/*.md`
- `docs/security/**/*.md`
- tracked-file inventory for local secret file classes that must remain untracked

Current detection focus:

- hardcoded sensitive env assignments such as `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, and `*_ENCRYPTION_KEY`
- inline high-entropy literals near secret-bearing names
- credential-bearing URLs with embedded usernames and passwords
- inline Bearer-token values
- tracked local secret files such as `.env`, `.env.local`, `.env.<environment>`, `.dev.vars`, and `.dev.vars.<environment>`

Current reviewed allowlist behavior:

- placeholders such as `<password>`, `<local-only-secret>`, and `replace-with-...` remain allowed
- env indirection such as shell-variable references remains allowed
- reviewed non-secret defaults such as `COOLIFY_BASE_URL=https://app.coolify.io` remain allowed
- `.env.example` remains the only reviewed tracked env-style example file

Current `.env.example` variable coverage:

- runtime and application secrets: `DATABASE_URL`, `APP_SECRET`, `MINI_TOTP_ENCRYPTION_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `EDGE_API_JWT_SECRET`
- operator automation secrets: `CLOUDFLARE_API_TOKEN`, `COOLIFY_ACCESS_TOKEN`
- Cloudflare account and Tunnel variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_TUNNEL_ID`, `CLOUDFLARE_TUNNEL_NAME`, `CLOUDFLARE_TUNNEL_TOKEN`
- Cloudflare Access variables: `CLOUDFLARE_ACCESS_APP_ID`, `CLOUDFLARE_ACCESS_APP_AUD`, `CLOUDFLARE_ACCESS_CLIENT_ID`, `CLOUDFLARE_ACCESS_CLIENT_SECRET`, `CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID`

If a new maintained path needs coverage, extend the scanner target list and add or update focused tests in the same issue-scoped change so the allowlist stays explicit and reviewable.

## Cleanup Rules

If the audit finds a confirmed issue:

1. replace the tracked secret or unsafe example with a placeholder or env-based lookup
2. update the nearest operator or runtime doc so the supported storage location is explicit
3. rotate the affected credential if there is any chance it was live
4. capture the cleanup in an issue-scoped change rather than bundling unrelated script cleanup into the same fix

If the audit does not find confirmed live secrets:

- document the finding accurately
- tighten any examples that still normalize unsafe patterns
- avoid overstating the result as a confirmed credential leak

## Current Standards Alignment

- OWASP Secrets Management guidance: centralize and standardize secret handling, apply least privilege, avoid plaintext secret transport, and keep rotation and auditability explicit for operator credentials.
- Cloudflare Workers guidance: keep sensitive values out of Wrangler `vars`, prefer Worker secrets for deployed runtime values, and keep `.env*` or `.dev.vars*` files untracked in local development.
- Coolify guidance: use Coolify Environment Variables with locked secrets for sensitive resource-side values, keep runtime-only variables out of the build phase by default, and prefer Docker Build Secrets over ordinary build args for reviewed build-time secrets.
- Current Mini operator posture: Cloudflare hosts the runtime, PostgreSQL runs on a Coolify-managed VPS, and EmDash remains the host architecture, so operator automation secrets must stay distinct from application runtime credentials.

## Current Example Guidance

- use placeholder database passwords in `.env.example` instead of literal local defaults
- keep Coolify MCP tokens out of tracked files and issue bodies
- keep `CLOUDFLARE_API_TOKEN` out of tracked files and issue bodies
- keep any elevated Cloudflare token scopes, including Tunnel-edit tokens, in local-only or CI/CD-managed secret storage
- keep `CLOUDFLARE_TUNNEL_TOKEN` in server-managed secret storage on the VPS connector host, not in `.env.local`; rotate immediately if leaked
- do not rely on generated `dist/server/.dev.vars` files as a secret store; for deployed Workers keep sensitive values in Cloudflare-managed secrets instead of local dev vars or Wrangler `[vars]`
- keep DNS-edit Cloudflare token scopes in local-only or CI/CD-managed secret storage as well
- keep Cloudflare Access/Zero Trust variables in the appropriate storage class:
  - `CLOUDFLARE_ACCESS_CLIENT_ID` and `CLOUDFLARE_ACCESS_CLIENT_SECRET` in Cloudflare-managed Worker secrets or CI/CD-managed secrets
  - `CLOUDFLARE_ACCESS_APP_ID`, `CLOUDFLARE_ACCESS_APP_AUD`, and `CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID` in `.env.local` or operator notes
- keep Cloudflare Turnstile and JWT secrets in server-only configuration
- keep production database credentials distinct from local development placeholders
- when PostgreSQL or other service credentials must exist inside Coolify-managed resources, keep them in Coolify locked secrets instead of copied repository env files or reusable shell snippets
- do not reintroduce `VPS_ROOT_PASSWORD` into `.env.local`, `.env.example`, or any maintained script; the reviewed VPS recovery path now uses key-only SSH instead
- `.env.example` now documents all operator-managed variable classes with placeholder values and explicit storage-class guidance; update it when new operator variables are introduced

## Validation

- `node scripts/check-secret-hygiene.mjs` for the focused automated regression check
- `pnpm lint` for docs and config-example updates when a package manifest is available
- focused review of changed examples for residual secret exposure
- `pnpm check` only if the audit changes runtime or script behavior

## Cross-References

- `docs/process/secret-hygiene-coolify-cloudflare-topology-plan-2026.md`
- `docs/process/ai-workflow-planning-templates.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/security/operations.md`
