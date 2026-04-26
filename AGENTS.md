# Repository Instructions

## Scope

This repository, `awcms-mini-sikesra`, is the only writable implementation workspace for SIKESRA Kobar work.

Treat every other repository as read-only reference unless the user explicitly says otherwise. In particular:

- `ahliweb/sikesra` is the canonical issue tracker for SIKESRA work.
- `ahliweb/awcms-mini` is upstream reference only.
- Local sibling worktrees outside `/home/data/dev_react/awcms-mini-sikesra` are reference material only.

## Runtime Baseline

- Keep the app EmDash-first and single-tenant.
- Use Cloudflare Worker runtime for production deployment.
- Use `sikesrakobar.ahlikoding.com` as the single browser-facing host.
- Use `/_emdash/` as the reviewed admin entry alias on the same host.
- Use R2 bucket `sikesra` through Worker binding `MEDIA_BUCKET`.
- Use PostgreSQL database `sikesrakobar` on the Coolify-managed VPS.
- Use Hyperdrive binding `HYPERDRIVE` for the reviewed production database transport.

## Security Rules

- Never commit real credentials, tokens, private keys, connection strings, NIK/KIA, No KK, personal data, or private documents.
- Keep `.env`, `.env.local`, `.dev.vars`, generated Worker secret files, and secret-bearing artifacts untracked.
- Treat SIKESRA beneficiary, child, elderly, disability, religion, contact, health, and document data as sensitive.
- Prefer least-privilege runtime roles and Cloudflare-managed Worker secrets.
- Keep Coolify and Cloudflare operator credentials separate from application runtime credentials.

## Workflow

- Start implementation from an issue in `ahliweb/sikesra`.
- Keep changes atomic and dependency-aware.
- Use `docs/process/ai-workflow-planning-templates.md` for planning and execution prompts.
- Validate docs/config-only work with `pnpm lint` when available.
- Validate runtime or TypeScript changes with `pnpm check` plus issue-specific checks.

## Source Layout

- `src/plugins/sikesra-admin/` is the writable SIKESRA extension surface for EmDash-first admin/plugin work.
- Keep upstream AWCMS Mini source in `ahliweb/awcms-mini` as read-only reference; do not copy generated artifacts, local env files, or build output from upstream.
- `tests/unit/` contains dependency-light regression tests for SIKESRA plugin descriptors and security-sensitive helper behavior.
- Use `pnpm check` for source changes in this repository; it runs secret hygiene and unit tests.
