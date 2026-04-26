# Rate-Limit Storage Strategy

`AWM-071` originally described a non-database path, but the current deployment alignment work now requires shared counters that survive restarts and multi-instance rollout.

Decision:

- Mini stores rate-limit and temporary lockout counters in a shared SQL-backed store.
- Mini uses the dedicated `rate_limit_counters` table for the current implementation.

Why:

- Counter state is short-lived and window-based, but it must survive process restarts for the supported deployment path.
- The current single-tenant PostgreSQL deployment is the simplest shared coordination layer already present in the stack.
- Durable audit facts still remain separate from counter state even though both use PostgreSQL.

Required runtime capabilities:

- Atomic increment
- Read current counter state
- Reset by scope key
- TTL/window expiry support

Supported scope dimensions:

- IP address
- Account or user identity
- Route or action key

Expected backends:

- Shared SQL-backed counter table for the current repo implementation (`sikesrakobar` database)
- Redis or equivalent TTL-capable cache in a future revision if the contract changes
- Another shared counter service with the same semantics

Follow-on implications:

- `AWM-076` lockout logic now uses the shared storage contract implemented by `src/security/runtime-rate-limits.mjs` and `src/db/repositories/rate-limit-counters.mjs`.
- Durable security outcomes still go to `security_events` and `audit_logs`; counter state remains operational and TTL-bounded even though it is stored in SQL.
