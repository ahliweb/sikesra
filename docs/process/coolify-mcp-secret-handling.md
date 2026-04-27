# Coolify MCP Secret Handling

## Purpose

This runbook defines the supported pattern for configuring Coolify MCP access without committing tokens to the AWCMS Mini SIKESRA repository.

It is aligned with the current baseline:

- AWCMS Mini SIKESRA uses Cloudflare as the public edge while the Hono backend API runs on Coolify
- PostgreSQL runs on a protected VPS managed through Coolify
- Coolify administrative automation is an operator workflow, not an in-app runtime feature

## Core Rule

Treat Coolify MCP credentials as operator-local or environment-managed secrets, not repository configuration.

That means:

- do not commit Coolify tokens to tracked files
- do not paste Coolify tokens into GitHub issues, PR bodies, or docs examples
- do not embed Coolify tokens in maintained scripts under `scripts/**`
- do not reuse Coolify administrative tokens as application runtime credentials
- do not source `.env` files as shell code when a parser-based env loader is available

## Supported Storage Pattern

Coolify's currently documented secret surface is the Environment Variables UI for each resource, with support for locked secrets, build-vs-runtime scoping, and Docker Build Secrets for sensitive build-time inputs.

For this repository, treat that surface as the reviewed Coolify-side equivalent of a password manager for Coolify-managed resources.

Use one of these local-only secret locations:

1. `.env.local` for the live token and any other local-only operator secrets
2. `.env.<environment>.local` when a local operator workflow needs environment-specific credentials without mixing them into the generic local file
3. a shell secret manager or password-manager CLI integration
4. the MCP client's local secret or environment-variable configuration if supported

Tracked local env-style files should stay limited to `.env.example`. The repo now treats tracked `.env*` and `.dev.vars*` files as a secret-hygiene failure so operator-local Coolify, Cloudflare, and PostgreSQL secrets do not drift into source control.

For Coolify-managed resources on the VPS:

- store sensitive values in Coolify Environment Variables as locked secrets when they must exist on the Coolify side
- leave `Runtime Variable` enabled and disable `Build Variable` unless the secret is genuinely required during image build
- use Coolify Docker Build Secrets instead of normal build arguments when a reviewed Docker build step truly needs sensitive material
- avoid copying those same secrets into tracked repository files, copied shell snippets, or generic operator notes

Preferred pattern:

- store the live Coolify token in a local-only secret location
- expose it to the MCP client through an environment variable or client-managed secret reference
- keep the repository limited to documentation of the variable name and workflow, not the token value
- keep any environment-specific local token overrides in ignored env files. The current SIKESRA helper loads `.env.local` before `.env` so local secrets override safe defaults without shell-sourcing the file.
- when a Coolify-managed service itself needs a password, API token, or connection string, prefer a Coolify locked secret at the resource level instead of reusing the MCP token or writing the value into local scripts

## Recommended Variable Pattern

If an operator needs a documented local variable name, prefer a neutral local-only name such as:

```text
COOLIFY_MCP_TOKEN=<local-only-secret>
```

This variable name is documentation guidance only. The live value must stay outside tracked files.

For direct Coolify API and MCP clients, this repo now uses the live API naming from Coolify tooling:

```text
COOLIFY_BASE_URL=https://app.coolify.io
COOLIFY_ACCESS_TOKEN=<local-only-secret>
```

`https://app.coolify.io` is the Coolify Cloud API base URL.

If you want a tracked example for non-secret local defaults, keep only `COOLIFY_BASE_URL` in `.env.example` and keep `COOLIFY_ACCESS_TOKEN` in `.env.local` or `.env.<environment>.local`.

The local helper now loads env files through `scripts/_local-env.mjs` rather than sourcing them as shell code. Scripts that use Coolify API credentials require `COOLIFY_BASE_URL` plus `COOLIFY_ACCESS_TOKEN` to come from env-managed configuration instead of script defaults.

## Local CLI And MCP Workflow

For Coolify Cloud:

1. keep `COOLIFY_BASE_URL` in `.env`, `.env.<environment>`, or `.env.local` as needed, and keep `COOLIFY_ACCESS_TOKEN` in `.env.local` or `.env.<environment>.local`
2. run `coolify context set-token cloud "$COOLIFY_ACCESS_TOKEN"` to configure the CLI locally
3. use the configured MCP client or direct read-only scripts only after those values are present in local env-managed configuration

The tracked helper reads env files through the shared Node loader without executing the files as shell code. It never stores the token in the script itself.

For Cloudflare-side deployment secrets, keep operator credentials and reviewed secret values in deployment-managed storage or CI/CD-managed environment storage rather than tracked files. Use tracked `.env.example` values only for placeholders and non-secret defaults.

## Direct API Verification

When the Coolify MCP client surface is not available in the current tool session, use direct read-only Coolify API calls only when `COOLIFY_BASE_URL` and `COOLIFY_ACCESS_TOKEN` are already available through the supported env-managed path.

Read-only verification may include:

1. `GET /api/v1/version`
2. `GET /api/v1/servers`
3. `GET /api/v1/resources`
4. `GET /api/v1/databases`
5. `GET /api/v1/servers/{uuid}`
6. `GET /api/v1/databases/{uuid}`

For the current AWCMS Mini SIKESRA Coolify/PostgreSQL management-plane posture, use the combined read-only runtime readiness check first:

```bash
node scripts/verify-runtime-readiness.mjs
```

This command checks the current PostgreSQL resource and Cloudflare-side posture together, emits only redacted posture fields, and exits non-zero while any required runtime posture check fails.

This SIKESRA repo does not currently include separate Coolify-only audit wrappers. If those are added later, they must use `scripts/_local-env.mjs`, emit only redacted posture fields, and avoid raw management-plane payloads. Any focused Coolify PostgreSQL audit command must use `COOLIFY_BASE_URL` plus `COOLIFY_ACCESS_TOKEN` through the same env-managed path, read only documented detail endpoints, omit secret-bearing fields from output, and exit non-zero when the API posture violates the reviewed expectations.

For PostgreSQL SSL remediation, use the Coolify dashboard or another reviewed Coolify-supported management path. Coolify's documented database update endpoint rejected `enable_ssl` and `ssl_mode` fields with validation errors during this review, so the API-backed repository command is currently verification-only for SSL state.

For reviewed PostgreSQL VPS server connection posture, use Coolify dashboard/API read-only evidence and copy back only non-secret fields. A future repository command may wrap this if server posture checks become routine.

Coolify's documented Terminal Access feature is dashboard-interactive; it is not a public REST command-execution endpoint. If local SSH certificate/key access is unavailable, use the Coolify dashboard terminal to inspect `sshd_config` and copy back only non-secret settings such as `PasswordAuthentication`, `PermitRootLogin`, and `PubkeyAuthentication`.

Before copying API output into docs, issues, logs, or summaries, redact fields whose names or values may contain:

- passwords
- tokens
- private keys
- connection strings
- DSNs or database URLs
- service URLs that embed credentials
- environment variable arrays or maps

The current API-confirmed database inventory for AWCMS Mini SIKESRA is recorded in `docs/process/postgresql-vps-hardening.md`. Treat that inventory as management-plane evidence for issue planning, not as permission to expose secret-bearing Coolify responses in repository artifacts.

## Operator Workflow

1. Generate or obtain the smallest-scope Coolify token available for the intended operator task.
2. Store the token in a local-only secret location such as `.env.local`, `.env.<environment>.local`, or an external secret manager.
3. Configure the MCP client to read that token from the local environment or secret store.
4. Verify the token is not echoed in wrapper scripts, shell history helpers, or captured command logs.
5. Keep Coolify administrative credentials separate from:
   - `DATABASE_URL`
   - Cloudflare runtime secrets
   - Turnstile secrets
   - edge API JWT secrets

## Explicitly Avoid

- committing a live Coolify token to `.env.example`
- adding a live Coolify token to shell scripts or repository config files
- placing a Coolify token in issue bodies, issue comments, or PR descriptions
- documenting copy-paste examples that encourage replacing placeholders directly inside tracked files
- using Coolify credentials for runtime application access to PostgreSQL or Cloudflare

## Rotation Guidance

Rotate the Coolify token if it may have been exposed through:

- shell history
- terminal transcripts
- issue comments or PR bodies
- pasted examples in tracked docs
- CI logs or command output

After rotation:

1. update the local-only secret store
2. confirm the MCP client still authenticates correctly
3. verify the old token is no longer usable

## Minimum Replacement Scope

For the remaining manual cleanup tracked in the scoped SIKESRA issue, prefer the smallest replacement Coolify token that still supports the reviewed operator workflow in this repository.

That means:

- local Coolify MCP and direct API inspection for the current PostgreSQL resource only
- no application-runtime use
- no reuse outside operator workflows

When replacing `COOLIFY_ACCESS_TOKEN`:

1. create the new token through the reviewed Coolify operator surface
2. store it only in `.env.local` or another local-only secret manager
3. run `pnpm coolify:mcp` or the equivalent local operator flow to confirm the new token works
4. verify the old token is rejected or deleted

If Coolify does not expose granular scopes for the current token type, still keep the replacement token single-purpose and operator-local.

## Separation Of Concerns

Keep these credentials separate by purpose:

- Coolify MCP token: operator automation credential
- `DATABASE_URL`: application runtime database credential
- Cloudflare runtime secrets: deployment/runtime secrets for the Worker
- Turnstile and JWT secrets: server-only application security secrets

This separation reduces blast radius and keeps least-privilege boundaries clearer.

## Security Baseline

- prefer parser-based environment loading over shell evaluation for local secret files
- keep Cloudflare deployment secrets server-only, using `wrangler secret put` or reviewed CI/CD secret storage for deployed Worker secrets
- keep operator tokens least-privileged and scoped only to the Cloudflare or Coolify surfaces needed for the reviewed task
- rotate tokens after suspected exposure and document the rotation owner and reason
- keep PostgreSQL credentials distinct from Coolify and Cloudflare administrative credentials
- keep environment-specific local operator secrets in untracked `.env.<environment>.local` files rather than tracked config or script defaults when a workflow needs per-environment separation
- on Coolify-managed resources, keep passwords and connection strings as locked runtime secrets by default and use Docker Build Secrets only for reviewed build-time needs

This baseline aligns with the current AWCMS Mini SIKESRA posture:

- EmDash-first application hosted on Cloudflare Workers
- PostgreSQL hosted on a Coolify-managed VPS
- database transport and edge rollout work separated from normal application runtime secrets

## Validation

- `pnpm lint` for docs-only changes
- focused review that no live token value appears in tracked files, issue bodies, or operator examples

## Cross-References

- `docs/process/secret-hygiene-audit.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/postgresql-vps-hardening.md`
- `docs/security/operations.md`
