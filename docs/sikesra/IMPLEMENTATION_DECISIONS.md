# SIKESRA Implementation Decisions

Status: Phase 0 (Option B) initialized from upstream EmDash docs via `https://docs.emdashcms.com/llms.txt`.

This log captures what is already confirmed from upstream documentation and what still requires repository-specific confirmation when integrating with the target AWCMS-Micro host repo.

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
| Target module folder | `TBD in host repo`; default target remains `packages/plugins/sikesra/` | `docs/sikesra/02_architecture.md` + core docs part 2 conventions | Must be confirmed against the actual host repo structure. |
| Plugin registration convention | Use EmDash native plugin pattern: descriptor factory + runtime `createPlugin()` with `definePlugin(...)` | Native plugin guide | SIKESRA should be a native plugin (admin pages + internal runtime access). |
| Manifest convention | EmDash plugin descriptor in `astro.config.mjs` via `plugins: [sikesraPlugin(...)]`; local `module.manifest.json` remains AWCMS governance artifact | Config reference + native plugin guide | `module.manifest.json` is for AWCMS governance docs/process; EmDash runtime uses descriptor registration. |
| Admin route convention | EmDash plugin API routes mount under `/_emdash/api/plugins/<plugin-id>/<route-name>`; SIKESRA admin UI path remains `/_emdash/admin/plugins/sikesra/*` by project rule | API routes doc + SIKESRA docs | Build SIKESRA route group aligned to project-required namespace. |
| API route convention | Use project namespace `/_emdash/api/plugins/sikesra/v1/*`; map to EmDash route handlers in plugin runtime | SIKESRA architecture/API docs + API routes doc | EmDash default route shape is supported; add `v1/*` route names to keep versioned boundary. |
| Public route convention | Public page must be `/sikesra`, served from host Astro routes/loader (not admin API client) | SIKESRA architecture/UI docs | Keep aggregate-safe only. |
| D1 migration path | EmDash on D1 supports migration flow via Wrangler; plugin/business tables managed by module migration convention in host repo | Database options + deploy cloudflare docs | Exact migration file path and command still `TBD` in host repo. |
| Seed path | EmDash seed support exists (`.emdash/seed.json` or configured path), but SIKESRA domain seed files should follow host module seed convention | Database options + core docs | Exact seed file path and invoke command still `TBD` in host repo. |
| Test command | `TBD in host repo`; should include unit + integration (and e2e if present) | SIKESRA handoff + validation docs | Must be captured from host `package.json` scripts once repo selected. |
| Auth/session helper | EmDash passkey-first auth and provider model; use trusted server context (session/cookie or Cloudflare Access JWT) | Authentication + config reference | Implement a SIKESRA request-context builder that reads trusted session data only. |
| Permission registry helper | Baseline EmDash permission model exists; SIKESRA must register `awcms:sikesra:*` namespace in AWCMS layer | Auth docs + SIKESRA security docs | Host repo must define where custom permissions are registered. |
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
| Host repo exact plugin package path and workspace wiring | Cannot finalize ticket file paths | Add one discovery ticket in target host repo to map exact folder, package name, and registration entrypoint | Pending |
| Host permission registry location for custom namespaces | Cannot wire `awcms:sikesra:*` into central UI/role assignment yet | Add thin registration adapter that imports SIKESRA permission catalog | Pending |
| Host shared audit adapter compatibility | Cannot decide shared vs local audit persistence definitively | Start local `awcms_sikesra_audit_logs`; add optional adapter interface for shared writer | Pending |
| Host shared ABAC engine compatibility | Cannot decide shared vs local ABAC evaluator definitively | Start local evaluator with pluggable policy provider; later bridge if shared engine exists | Pending |

## Phase 0 Acceptance (Option B Status)

Current state:

1. Upstream EmDash conventions are confirmed from docs.
2. SIKESRA architectural constraints remain unchanged.
3. Host-repo-specific paths/helpers are still pending and must be confirmed in the actual integration repository.

Phase 0 is fully complete only when:

1. The remaining `TBD in host repo` items are filled with concrete file paths/commands.
2. Later tickets can name exact files instead of placeholders.
3. Missing extension points are either resolved or tracked with approved adapter plans.
4. No SIKESRA business feature is implemented in EmDash core.
