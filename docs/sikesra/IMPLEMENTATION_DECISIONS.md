# SIKESRA Implementation Decisions

Status: Active in `ahliweb/sikesra` (this repository). Hybrid worker deployment is the runtime source of truth.

This log captures confirmed repository conventions and synchronization rules for EmDash host + SIKESRA plugin behavior in this repository.

## EmDash Docs Sources Used

1. `https://docs.emdashcms.com/llms.txt`
2. `https://docs.emdashcms.com/plugins/creating-native-plugins/your-first-native-plugin/`
3. `https://docs.emdashcms.com/plugins/creating-plugins/api-routes/`
4. `https://docs.emdashcms.com/reference/configuration/`
5. `https://docs.emdashcms.com/guides/authentication/`
6. `https://docs.emdashcms.com/deployment/database/`
7. `https://docs.emdashcms.com/deployment/cloudflare/`

## Decision Log

| Area | Decision | Source / Evidence | Notes |
|---|---|---|---|
| Target module folder | Confirmed runtime plugin source is local `src/` with plugin entry export in `src/plugin-entry.ts` | `package.json` export map + local runtime deployment | This repository is self-contained runtime/deploy target. |
| Plugin registration convention | Use EmDash native plugin pattern: descriptor factory + runtime `createPlugin()` with `definePlugin(...)` | Native plugin guide | SIKESRA should be a native plugin (admin pages + internal runtime access). |
| Manifest convention | EmDash plugin descriptor in `astro.config.mjs` via `plugins: [sikesraPlugin(...)]`; local `module.manifest.json` remains AWCMS governance artifact | Config reference + native plugin guide | `module.manifest.json` is for AWCMS governance docs/process; EmDash runtime uses descriptor registration. |
| Admin route convention | EmDash plugin API routes mount under `/_emdash/api/plugins/<plugin-id>/<route-name>`; SIKESRA admin UI path remains `/_emdash/admin/plugins/sikesra/*` by project rule | API routes doc + SIKESRA docs | Build SIKESRA route group aligned to project-required namespace. |
| API route convention | Use project namespace `/_emdash/api/plugins/sikesra/v1/*`; map to EmDash route handlers in plugin runtime | SIKESRA architecture/API docs + API routes doc | EmDash default route shape is supported; add `v1/*` route names to keep versioned boundary. |
| Public route convention | Public page is `/sikesra`; root `/` is EmDash-owned and must not be served by SIKESRA | `scripts/worker-wrapper-template.mjs` route split + `src/worker.ts` root guard | Keep aggregate-safe only on `/sikesra`. |
| D1 migration path | Migrations live in repository `migrations/` with SIKESRA-prefixed SQL files | local repository structure | Deployment uses this repository only. |
| Seed path | Seeds live in repository `seeds/` and EmDash seed behavior is host-managed | local repository structure + EmDash setup routes | Custom seed files must validate against EmDash schema. |
| Test command | Host baseline commands confirmed: `pnpm typecheck`, `pnpm build`, `pnpm test` | `ahliweb/awcms-micro/package.json` + `docs/CONVENTIONS.md` | `pnpm test` is currently placeholder output in host scaffold and must be replaced by real tests as suites are added. |
| Auth/session helper | EmDash passkey-first auth and provider model; use trusted server context (session/cookie or Cloudflare Access JWT) | Authentication + config reference | Implement a SIKESRA request-context builder that reads trusted session data only. |
| Permission registry helper | Not implemented yet in host scaffold; define at `packages/awcms/permissions` (planned) and consumed by plugin package | Host scaffold structure (`packages/awcms/`) + SIKESRA security namespace rule | Current status: host path family confirmed, concrete helper file not yet created. |
| ABAC extension point | Not provided as first-class EmDash core feature; use module-local ABAC service first, later bridge to shared AWCMS ABAC if available | EmDash docs scope + SIKESRA security docs | Local fallback approved. |
| Audit service | EmDash has plugin ecosystem support (including audit-style plugins), but SIKESRA must implement required action catalog and redaction; use local audit table/service unless host offers compatible shared audit | Native plugin pattern + SIKESRA security docs | Local fallback approved. |
| R2/media helper | EmDash Cloudflare adapter supports R2 storage binding (`r2({ binding: "MEDIA" })`) | Config reference + deploy cloudflare docs | SIKESRA can use dedicated binding for module documents/imports/exports in addition to host media strategy. |
| Public data delivery | Prefer Astro loader/public-safe service; no admin API client usage on `/sikesra` | SIKESRA UI + architecture docs | Keep aggregate-only with suppression. |
| Import parser | Module-local implementation required (Excel -> staging -> validation -> duplicate review -> promotion) | SIKESRA SOP + backlog docs | Not an EmDash built-in concern. |
| PDF/document handling | Use R2-backed storage + D1 metadata; never expose raw storage keys; private access via signed/proxy flow | SIKESRA security/SOP + EmDash storage patterns | Module responsibility. |
| Approved core adapters | None yet | N/A | No EmDash core modification approved at this stage. |

## Immediate Implementation Consequences

1. Start SIKESRA implementation in this repo as a native EmDash plugin/module package, not as EmDash core changes.
2. Keep a module-local ABAC/audit implementation as fallback unless the target AWCMS host exposes compatible shared services.
3. Implement API routes using EmDash plugin route handlers and map them into the `sikesra/v1/*` namespace.
4. Keep `/sikesra` implemented as Astro/public-safe delivery, never using admin API client.
5. Keep all credentials out of source files and use `.env` / GitHub Secrets only.

## Missing Extension Points (Currently Known)

| Missing Extension Point | Impact | Smallest Adapter Proposal | Approved? |
|---|---|---|---|
| Host repo exact plugin package path and workspace wiring | Resolved to host convention | Use `packages/plugins/sikesra/` and host `astro.config.mjs` `plugins: []` integration point | Resolved |
| Host permission registry location for custom namespaces | Cannot wire `awcms:sikesra:*` into central UI/role assignment yet | Add thin registration adapter that imports SIKESRA permission catalog | Pending |
| Host shared audit adapter compatibility | Cannot decide shared vs local audit persistence definitively | Start local `awcms_sikesra_audit_logs`; add optional adapter interface for shared writer | Pending |
| Host shared ABAC engine compatibility | Cannot decide shared vs local ABAC evaluator definitively | Start local evaluator with pluggable policy provider; later bridge if shared engine exists | Pending |

## Phase 0 Acceptance (Option B Status)

Current state:

1. Upstream EmDash conventions are confirmed from docs.
2. SIKESRA architectural constraints remain unchanged.
3. Host-repo-specific base paths and command conventions are now confirmed from `ahliweb/awcms-micro` scaffold.

Host repository audit update:

1. `ahliweb/awcms-micro` now has runtime scaffold files (`astro.config.mjs`, `package.json`, `src/live.config.ts`, `wrangler.jsonc`) and conventions (`docs/CONVENTIONS.md`).
2. Remaining unresolved items are helper-implementation specifics (permission registry helper file, shared ABAC/audit adapter implementation), not path-discovery blockers.

Phase 0 is fully complete only when:

1. The remaining `TBD in host repo` items are filled with concrete file paths/commands.
2. Later tickets can name exact files instead of placeholders.
3. Missing extension points are either resolved or tracked with approved adapter plans.
4. No SIKESRA business feature is implemented in EmDash core.

## Implementation Scaffold Status (2026-05-09)

Runtime repository: `ahliweb/sikesra`.

Completed layers:

1. 11 D1 migration files in `migrations/sikesra/` covering all table groups.
2. 3 seed files in `seeds/sikesra/` (types/subtypes, attributes, ABAC policies).
3. 8 repository modules with real D1 SQL and tenant/site/scope enforcement.
4. 13 service modules with full API contract types (entity/region/settings/documents wired to repos).
5. 4 security modules (ABAC evaluator, masking, permissions, request context).
6. 2 API utility modules (response envelope, request ID).
7. 17 registered API route handlers auto-mounted to EmDash plugin via SIKESRA_ROUTES registry.
8. Architecture validation test file in `src/__tests__/architecture.test.ts`.
9. Plugin is registered as a native EmDash plugin in host `astro.config.mjs`.

Remaining for MVP:

1. Wire D1/R2 bindings from Cloudflare Worker env.
2. Implement auth/session context derivation from EmDash session.
3. Wire ABAC policy loading from D1.
4. Complete R2 document upload integration.
5. Build full admin UI pages under EmDash plugin admin shell.
6. Add repository-level integration tests.
7. Validate backup/restore procedures.

## Synchronization Rules (Runtime)

1. Plugin activation state in `_plugin_state` controls `/sikesra` and `/_emdash/api/plugins/sikesra/*` availability.
2. When plugin status is `inactive`, public/API SIKESRA routes must return `404`.
3. Root `/` is always EmDash host-owned; SIKESRA must never inject root HTML.
4. Plugin descriptor and runtime entry must stay synchronized via `sikesraPlugin()` in `astro.config.mjs` and `createPlugin` export in `src/plugin-entry.ts`.
5. EmDash plugin admin surfaces require plugin route `admin` (`/_emdash/api/plugins/sikesra/admin`) for Block Kit page/widget interaction; missing this route causes repeated admin `404` retries.
6. Hybrid wrapper must preserve EmDash CSP hardening while appending `https://static.cloudflareinsights.com` to `script-src` and a compatible `script-src-elem` policy (including inline script compatibility required by EmDash admin shell) for admin responses.
7. Public SIKESRA page clients must call plugin public APIs using same-origin paths (`window.location.origin + /_emdash/api/plugins/sikesra/*` or relative paths), never hardcoded workers.dev hosts, to avoid route drift and CORS failures on custom domains.
8. Root homepage (`/`) is EmDash host-owned and must not be shadowed by static `public/index.html` assets from SIKESRA; SIKESRA public surface remains `/sikesra`.
9. Runtime SIKESRA admin Block Kit rendering for `/_emdash/api/plugins/sikesra/admin` is handled in `scripts/worker-wrapper-template.mjs` after delegating to EmDash for route/auth checks, because native EmDash plugin route context does not expose raw Cloudflare bindings such as `env.SIKESRA_DB`.
10. SIKESRA admin Block Kit responses must use EmDash's plugin API envelope (`data.blocks`), not a raw `{ blocks }` payload, because the admin client reads `(await response.json()).data.blocks`.
11. `scripts/postbuild.mjs` patches the generated EmDash admin bundle so SIKESRA plugin pages render as a top `SIKESRA` sidebar group while leaving EmDash source packages unchanged.
12. The same postbuild patch also applies compact SIKESRA sidebar spacing and cache-busts the patched admin bundle filename so browsers load the updated sidebar group label/layout after deploy.
13. Until full React/admin route pages exist, SIKESRA Block Kit buttons should return workflow panels or navigate between pages; backend APIs remain authoritative for mutations and high-risk actions.
