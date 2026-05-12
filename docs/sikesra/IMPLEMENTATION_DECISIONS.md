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
| Target module folder | Confirmed runtime plugin source is local `src/` with plugin entry export in `src/plugin-entry.ts` | `package.json` export map + local runtime deployment + `docs/core/SIKESRA_INTEGRATION_OVERLAY.md` | This repository is self-contained runtime/deploy target. Do not create `packages/plugins/sikesra/` here without an approved refactor. |
| Plugin registration convention | Use EmDash native plugin pattern: descriptor factory + runtime `createPlugin()` with `definePlugin(...)` | Native plugin guide | SIKESRA should be a native plugin (admin pages + internal runtime access). |
| Manifest convention | EmDash plugin descriptor in `astro.config.mjs` via `plugins: [sikesraPlugin(...)]`; local `module.manifest.json` remains AWCMS governance artifact | Config reference + native plugin guide | `module.manifest.json` is for AWCMS governance docs/process; EmDash runtime uses descriptor registration. |
| Admin route convention | EmDash plugin API routes mount under `/_emdash/api/plugins/<plugin-id>/<route-name>`; SIKESRA admin UI path remains `/_emdash/admin/plugins/sikesra/*` by project rule | API routes doc + SIKESRA docs | Build SIKESRA route group aligned to project-required namespace. |
| Admin sidebar grouping | EmDash native plugin admin pages are currently flat (`path`, `label`, optional `icon`) with no first-class sidebar group field; SIKESRA uses ordered label prefixes such as `Operasional / ...` and `Governance / ...` as the compatible fallback | EmDash plugin types in local install + plugin admin UI docs | Do not patch EmDash admin core just to add grouping metadata. |
| API route convention | Use project namespace `/_emdash/api/plugins/sikesra/v1/*`; map to EmDash route handlers in plugin runtime | SIKESRA architecture/API docs + API routes doc | EmDash default route shape is supported; add `v1/*` route names to keep versioned boundary. |
| Public route convention | Public page is `/sikesra`; root `/` is EmDash-owned and must not be served by SIKESRA | `scripts/worker-wrapper-template.mjs` route split + `src/worker.ts` root guard | Keep aggregate-safe only on `/sikesra`. |
| D1 migration path | Migrations live in repository `migrations/` with SIKESRA-prefixed SQL files | local repository structure | Deployment uses this repository only. |
| Seed path | Seeds live in repository `seeds/` and EmDash seed behavior is host-managed | local repository structure + EmDash setup routes | Custom seed files must validate against EmDash schema. |
| Test command | Repository commands are `npm run typecheck`, `npm test`, and `npm run build` | local `package.json` + active runtime validation | Generic core/scaffold docs may show `pnpm`; use `npm` scripts in this deployment repo. |
| Auth/session helper | EmDash passkey-first auth and provider model; use trusted server context (session/cookie or Cloudflare Access JWT) | Authentication + config reference | `buildContextFromEmDash()` is now fail-closed for admin/API flows; no implicit `system`/`admin` fallback remains. Public-safe routes use an explicit `public` context via `buildPublicContextFromEmDash()`. |
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
| Host repo exact plugin package path and workspace wiring | Resolved for this repository | Use local `src/` runtime source, `src/plugin-entry.ts`, and `astro.config.mjs` plugin registration | Generic `packages/plugins/sikesra/` is a reusable scaffold convention, not active here. |
| Host permission registry location for custom namespaces | Cannot wire `awcms:sikesra:*` into central UI/role assignment yet | Add thin registration adapter that imports SIKESRA permission catalog | Pending |
| Host shared audit adapter compatibility | Cannot decide shared vs local audit persistence definitively | Start local `awcms_sikesra_audit_logs`; add optional adapter interface for shared writer | Pending |
| Host shared ABAC engine compatibility | Cannot decide shared vs local ABAC evaluator definitively | Start local evaluator with pluggable policy provider; later bridge if shared engine exists | Pending |

## Phase 0 Acceptance (Option B Status)

Current state:

1. Upstream EmDash conventions are confirmed from docs.
2. SIKESRA architectural constraints remain unchanged.
3. Repository-specific base paths and command conventions are confirmed for `ahliweb/sikesra` in `docs/core/SIKESRA_INTEGRATION_OVERLAY.md`.

Host repository audit update:

1. This repository now has runtime scaffold files (`astro.config.mjs`, `package.json`, `src/`, `scripts/worker-wrapper-template.mjs`, `scripts/postbuild.mjs`, migrations, seeds, and docs).
2. Remaining unresolved items are helper-implementation specifics (shared permission registry helper, shared ABAC/audit adapter implementation), not path-discovery blockers.

Phase 0 is fully complete only when:

1. The remaining `TBD in host repo` items are filled with concrete file paths/commands.
2. Later tickets can name exact files instead of placeholders.
3. Missing extension points are either resolved or tracked with approved adapter plans.
4. No SIKESRA business feature is implemented in EmDash core.

## Scratch Redevelopment Status (2026-05-11)

Runtime repository: `ahliweb/sikesra`.

Active baseline:

1. Root `/` and normal content routes are EmDash/Astro host-owned.
2. SIKESRA public placeholder is limited to `/sikesra`.
3. `/_emdash/api/plugins/sikesra/admin` is enabled for EmDash Block Kit rendering.
4. `/_emdash/api/plugins/sikesra/public/*` is enabled for public-safe aggregate data used by `/sikesra`.
5. Unfinished `/_emdash/api/plugins/sikesra/v1/*` routes return `503` until rebuilt through `docs/sikesra/IMPLEMENTATION_PLAN.md`.
6. `scripts/postbuild.mjs` is a minimal generated-output adapter only.
7. `scripts/worker-wrapper-template.mjs` is a thin route boundary wrapper only.
8. `astro.config.mjs` registers the SIKESRA plugin descriptor, but business APIs beyond the admin Block Kit shell and public-safe surface must be rebuilt and revalidated.

Do not treat previous implementation layers as complete. Rebuild them in this order:

1. Phase 0 decision log refresh.
2. Plugin shell and route registry.
3. Migrations and repeatable seeds.
4. Trusted context, RBAC, ABAC, masking, audit.
5. Public aggregate services.
6. Admin APIs by endpoint group.
7. Admin UI after API contracts are stable.
8. Import, documents, exports, backup/restore.

## Synchronization Rules (Runtime)

1. Plugin activation state in `_plugin_state` controls `/sikesra` availability.
2. During scratch rebuild, `/_emdash/api/plugins/sikesra/admin` remains enabled for plugin-shell rendering.
3. During scratch rebuild, `/_emdash/api/plugins/sikesra/public/*` remains enabled for aggregate-safe public responses used by `/sikesra`.
4. During scratch rebuild, unfinished `/_emdash/api/plugins/sikesra/v1/*` routes intentionally return `503` until security and handlers are rebuilt.
5. When plugin status is `inactive`, `/sikesra` must return `404`.
6. Root `/` is always EmDash host-owned; SIKESRA must never inject root HTML.
7. Plugin descriptor and runtime entry must stay synchronized via `sikesraPlugin()` in `astro.config.mjs` and `createPlugin` export in `src/plugin-entry.ts`.
8. Hybrid wrapper must preserve EmDash CSP hardening while appending `https://static.cloudflareinsights.com` to `script-src` where needed.
9. No script may patch EmDash source, `node_modules`, or generated EmDash admin chunks without a separately approved adapter decision.
10. Future SIKESRA admin Block Kit responses must use EmDash's plugin API envelope (`data.blocks`), not a raw `{ blocks }` payload.
11. Public-safe route handlers must build an explicit `public` request context; authenticated admin/API handlers must fail closed when trusted identity, role, or site context is missing.

## Implementation Status (2026-05-12)

### Fully Implemented
- Plugin registration, route registry (48 routes), handler utilities
- Request context (fail-closed), permissions (37), ABAC evaluator, masking, route guard
- API envelope, entity CRUD, verification service, import service, document service
- Dashboard service, public services, region service, audit service, export service, settings service
- Completeness validation service with field rules per object type, batch validation, and audit logging
- R2 storage adapter with centralized key generation, tenant/site isolation, proxy endpoint, and security controls
- InMemoryD1Binding with functional SQL support (INSERT, SELECT, UPDATE, DELETE, WHERE, ORDER BY, LIMIT)
- Confirmation dialogs for high-risk actions (verification decisions, settings save, ID generation) with audit consequence banners
- Comprehensive security regression tests (54 tests covering RBAC, ABAC, masking, region scope, storage, completeness, audit)
- D1/R2 backup and restore procedures (automated backups, manual exports, disaster recovery runbook, maintenance tasks)
- Mobile responsiveness across admin surfaces (responsive stats chunking, mobile table limits, mobile detection hints)
- Admin Block Kit UI (3600+ lines covering all major screens)
- 13 migrations, 5 seeds
- kysely upgraded to 0.28.17 (CVE-2026-44635 fixed)
- ABAC policy and attribute CRUD services with 14 v1 API endpoints (create, update, activate, deactivate, delete, list, detail, preview)
- XLSX export generation with exceljs library, supporting all report types with formatting and auto-filter

### Remaining P0 Gaps (Tracked via GitHub Issues)
| Issue | Gap | Priority |
|---|---|---|

### Completed P0 Gaps
| Issue | Gap | Status |
|---|---|---|
| #155 | ID generation service | ✅ Implemented with sequence table, code history, and audit |
| #156 | Verification v1 API routes | ✅ Implemented queue, submit, verify, timeline endpoints wired to registry |
| #157 | Deduplication service | ✅ Implemented detection, risk scoring, decision persistence, and v1 API routes |
| #158 | Public /sikesra Astro page | ✅ Created with aggregate-safe data, small-cell suppression, filter bar, KPIs, charts with table alternatives |
| #159 | Completeness validation service | ✅ Implemented with field rules per object type, batch validation, audit logging, and 3 v1 API endpoints |
| #160 | R2 storage adapter | ✅ Implemented centralized adapter with key generation, tenant/site isolation, proxy endpoint, and security controls |
| #161 | Comprehensive test coverage | ✅ Added 29 security regression tests covering RBAC, ABAC, masking, region scope, storage, completeness, and audit (54 total tests) |
| #162 | Backup/restore procedures | ✅ Documented D1/R2 backup schedules, export/import procedures, disaster recovery runbook, and maintenance tasks |
| #163 | InMemoryD1Binding fix | ✅ Implemented functional in-memory D1 adapter with INSERT, SELECT, UPDATE, DELETE, WHERE, ORDER BY, LIMIT support |
| #167 | Convert public page to Astro component | ✅ Integrated with EmDash layout, mobile-first, Indonesian formal language |
| #170 | Confirmation dialogs for high-risk actions | ✅ Added explicit confirmation for verification decisions, settings save, and ID generation with audit consequence banners |
| #174 | Mobile responsiveness across admin surfaces | ✅ Added responsive stats chunking, mobile table column limits, mobile detection hints, and optimized layouts for all major admin screens |

### Completed P1 Gaps
| Issue | Gap | Status |
|---|---|---|
| #164 | ABAC policy and attribute definition CRUD services | ✅ Implemented with 14 v1 API endpoints, audit logging, and policy preview |
| #165 | XLSX export generation and enhanced export job lifecycle | ✅ Implemented with exceljs library, supporting all report types with formatting |

### Remaining P1 Gaps (Post-MVP)
| Issue | Gap | Priority |
|---|---|---|

### Recommended Implementation Order
1. #155: ID generation service (blocks import promotion, entity creation) ✅
2. #156: Verification v1 API routes (service exists, just needs wiring) ✅
3. #157: Deduplication service (blocks import promotion) ✅
4. #159: Completeness validation service (blocks submit and ID generation) ✅
5. #158: Public /sikesra page (public-facing requirement) ✅
6. #160: R2 storage adapter (security consistency) ✅
7. #163: InMemoryD1Binding fix (enables repository testing) ✅
8. #161: Comprehensive test coverage (security regression protection) ✅
9. #162: Backup/restore procedures (operations requirement) ✅
10. #164, #165: Post-MVP hardening
