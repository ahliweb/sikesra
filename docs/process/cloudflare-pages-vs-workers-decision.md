# Cloudflare Frontend Decision

## Purpose

This document records the current architecture decision for how Cloudflare frontend surfaces relate to the Hono backend API.

## Decision

For the current SIKESRA baseline:

- Hono is the only backend API that may access PostgreSQL
- Cloudflare Pages, Workers, and Edge Functions may serve browser or edge-facing experiences, but they must call Hono for database-backed behavior
- do not introduce a Cloudflare Worker runtime that connects to PostgreSQL directly

## Current Baseline

- `sikesrakobar.ahlikoding.com` remains the reviewed browser-facing hostname
- `/_emdash/` remains the reviewed admin entry alias into the EmDash admin surface
- Cloudflare may host the frontend surface through Pages or another reviewed edge-delivery layer
- Hono on the Coolify-managed VPS owns auth, database access, file access, and provider integrations

## Why This Is The Decision

- it keeps PostgreSQL access behind one reviewed backend boundary
- it avoids reintroducing Hyperdrive, Tunnel, or direct edge-to-database transport complexity
- it lets Pages, Workers, and Edge Functions stay thin and interactive without duplicating core backend logic
- it preserves the EmDash-first single-host admin experience

## Rules If Additional Cloudflare Surfaces Are Added

- use Hono as the API boundary for database-backed reads and writes
- keep Turnstile, rate limiting, WAF, and other edge protections on Cloudflare where appropriate
- keep secrets scoped to the deployment surface that actually needs them
- do not treat frontend or edge code as a second application backend

## Validation

- docs review against the current repository state
- `pnpm lint`

## Cross-References

- `docs/process/cloudflare-hosted-runtime.md`
- `docs/architecture/overview.md`
- `docs/architecture/database-access.md`
- `docs/process/runtime-smoke-test.md`
