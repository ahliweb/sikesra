# Architecture Decision Record: No Cloudflare Hyperdrive

## Status

Accepted

## Date

2026-04-27

## Context

The SIKESRA project previously explored using Cloudflare Hyperdrive as the PostgreSQL transport for a Cloudflare Worker–hosted backend. Hyperdrive accelerates database connections from Cloudflare Worker runtimes by maintaining a connection pool at the Cloudflare edge and forwarding queries to an origin PostgreSQL instance over a TLS-capable connection.

During that exploration, the following blockers and drawbacks were identified:

1. **TLS origin requirement**: Hyperdrive requires the origin database to present a TLS endpoint that Cloudflare can reach. Making a VPS-hosted PostgreSQL instance satisfy this requirement involved running a TLS-capable proxy (PgBouncer with client-side TLS). Configuring cert ownership, bind-mounts, and Coolify compose rendering for this proxy was fragile and repeatedly failed.

2. **Coolify compose rendering gaps**: Coolify's compose rendering did not reliably inject file-storage bind mounts for the proxy service, requiring manual `docker_compose_raw` patches that produced invalid YAML and caused silent service deletion.

3. **Limited debuggability**: Worker runtime logs and Hyperdrive connection diagnostics are not accessible through Coolify's API or standard operator tooling. Diagnosing `code: 2012` (connection refused at origin) required host-level access that was not available from the workspace.

4. **Architectural mismatch**: Hyperdrive is optimized for stateless Worker runtimes where each request may run on a different Cloudflare PoP. Once the decision was made to move the backend to a Hono service on a Coolify-managed VPS, the Worker runtime is no longer the application execution layer. A persistent Node.js service on the same VPS as PostgreSQL can use the internal Docker network directly, eliminating the need for Hyperdrive entirely.

5. **Increased attack surface**: Adding an edge-reachable TLS proxy in front of PostgreSQL introduces an additional attack surface and operational dependency with no benefit once the backend moves to the VPS.

## Decision

Do not use Cloudflare Hyperdrive in the SIKESRA production architecture.

- The Hono backend API runs as a Node.js service on the Coolify-managed VPS.
- The Hono backend connects to PostgreSQL through the internal Docker network using the hostname `postgres` (the Coolify-assigned Docker service name).
- No Cloudflare Worker is used as the application runtime.
- No Hyperdrive binding (`HYPERDRIVE`) is used in the active application path.
- No TLS proxy in front of PostgreSQL is needed for the runtime path.

## Consequences

**Positive**

- PostgreSQL is never exposed to the public internet or Cloudflare's edge. Only the Hono backend can reach it.
- No TLS proxy maintenance burden.
- No Coolify compose rendering workarounds.
- Connection pooling, timeouts, and retry behavior are under direct application control inside the Hono backend.
- Operator migrations can run from the VPS using the internal Docker network, without requiring a tunnel, Hyperdrive, or public DB exposure.
- Simpler secret management: no Hyperdrive configuration file is needed and no `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_*` variables remain in the active runtime path.

**Negative / Trade-offs**

- The backend is no longer hosted at Cloudflare edge PoPs. Latency is determined by the VPS location, not Cloudflare's global network. This is acceptable for the single-tenant, operator-centric SIKESRA use case.
- If Cloudflare Workers are introduced again for a specific use case (e.g., a lightweight edge function), they must not connect to PostgreSQL directly. They must call the Hono backend API instead.

## Migration Notes

The following artifacts referenced Hyperdrive as an active path and were updated or archived as part of the Hono-baseline cleanup:

- `.env.example` — remove `SIKESRA_HYPERDRIVE_*` and `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_*` variables.
- `docs/architecture/runtime-config.md` — remove `DATABASE_TRANSPORT=hyperdrive` as a production baseline.
- `docs/architecture/database-access.md` — remove Hyperdrive transport references.
- Any remaining Coolify service for the PgBouncer TLS proxy can be deleted once no traffic routes through it.

Historical planning documents may still discuss the earlier Worker and Hyperdrive path as superseded context, but the active repository runtime baseline no longer depends on those artifacts.

## Approved By

SIKESRA operator (`ahliweb`), 2026-04-27

## Related Issues

- `ahliweb/sikesra#60` — Restore reachable private PostgreSQL path (operator unblock, now superseded by this decision)
- `ahliweb/sikesra#61` — Repository assessment and architecture documentation update
- `ahliweb/sikesra#63` — Scaffold Hono API structure
- `ahliweb/sikesra#64` — PostgreSQL connection and migration workflow for target architecture
