# SIKESRA From-Scratch Implementation Plan

Status: Active reset plan.

This plan intentionally does not rely on previous implementation commits. It keeps the repository as a self-contained EmDash host plus future SIKESRA native plugin, but treats all SIKESRA business behavior as needing rebuild and revalidation.

## Current Baseline

Repository role: `ahliweb/sikesra`, the deployment target for the SIKESRA + EmDash host.

Runtime baseline:

1. Root `/` is EmDash-owned and must render only the original EmDash/Astro host template.
2. Public SIKESRA route is `/sikesra` only.
3. EmDash admin and normal EmDash APIs remain EmDash-owned.
4. SIKESRA admin/API routes under `/_emdash/api/plugins/sikesra/*` are temporarily disabled with `503` until rebuilt through this plan.
5. `scripts/postbuild.mjs` is only a deployment adapter: set wrapper as worker entry, strip `cloudflare:workers` import, and generate `worker-wrapper.mjs`.
6. No script may patch EmDash source, `node_modules`, or generated EmDash admin chunks unless a future approved adapter ticket documents the divergence, tests, and rollback.

## Configuration Contract

Required files and roles:

| File | Role |
|---|---|
| `astro.config.mjs` | Astro + Cloudflare + EmDash integration, D1/R2 bindings, SIKESRA native plugin descriptor registration. |
| `wrangler.toml` | Local/source binding declaration for Worker, D1, R2, KV, Worker Loader, observability. |
| `package.json` | `npm` scripts only: `dev`, `typecheck`, `test`, `build`, `preview`, `deploy`. |
| `.github/workflows/deploy.yml` | `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, then Wrangler deploy on `main`. |
| `scripts/postbuild.mjs` | Minimal generated-output adapter. |
| `scripts/worker-wrapper-template.mjs` | Thin route boundary wrapper. |
| `scripts/sikesra-public-html.txt` | Temporary public-safe static `/sikesra` placeholder. Replace with service-backed public rendering in Phase 4. |

Disallowed scripts/configuration:

1. Scripts that patch EmDash source, `node_modules`, or compiled EmDash internals.
2. Scripts with hardcoded Cloudflare tokens or personal credentials.
3. Duplicate database repair scripts that mutate production D1 outside an approved operations runbook.
4. Package scripts that reference missing files.
5. CI jobs that are skipped because they look for another package manager's lockfile.

## Phase 0: Discovery Reset

Goal: confirm extension points before writing business code.

Tasks:

1. Re-read official EmDash plugin docs for native plugin registration, API routes, admin pages, Block Kit, Cloudflare deployment, D1, R2, and auth.
2. Reconfirm actual local paths: `src/index.ts`, `src/plugin-entry.ts`, `src/routes/registry.ts`, `migrations/`, `seeds/`, `scripts/`.
3. Update `docs/sikesra/IMPLEMENTATION_DECISIONS.md` with current from-scratch decisions.
4. Document any missing EmDash extension points before creating adapters.

Acceptance checks:

1. Decision log names exact files and commands.
2. No SIKESRA business behavior is added in this phase.
3. No EmDash source or compiled internals are patched.

## Phase 1: Native Plugin Shell

Goal: compile-safe plugin shell with no sensitive behavior.

Tasks:

1. Keep `sikesraPlugin()` descriptor registered in `astro.config.mjs`.
2. Rebuild `createPlugin()` with a minimal dashboard/admin placeholder route using EmDash plugin conventions.
3. Define the route registry shape but keep handlers non-mutating until security is ready.
4. Keep `/` delegated to EmDash through the worker wrapper.

Acceptance checks:

1. `npm run build` succeeds.
2. Root `/` returns EmDash host output after deploy.
3. `/_emdash/*` remains EmDash-owned.
4. `/sikesra` returns public-safe placeholder output.

## Phase 2: Database and Seeds

Goal: rebuild persistence from documentation rather than previous behavior.

Tasks:

1. Audit each migration against `docs/sikesra/03_data_model.md` and D1 limitations.
2. Add or revise one migration at a time.
3. Add repeatable seed files only after the referenced tables exist.
4. Separate production-safe baseline seeds from demo/dummy seeds.
5. Add a documented seed command sequence.

Acceptance checks:

1. Migrations apply on local D1.
2. Seeds are repeatable.
3. Business tables include tenant/site/timestamps/soft delete/actor columns unless documented.
4. Normal query paths can use tenant/site/deleted indexes.

## Phase 3: Security Foundation

Goal: build trusted context, permissions, ABAC, masking, and audit before workflows.

Tasks:

1. Build trusted request context from EmDash/session/backend state only.
2. Define `awcms:sikesra:*` permission catalog.
3. Implement route guard: authentication, RBAC, ABAC, region scope, sensitivity, status, and action.
4. Implement masking serializers for all sensitive fields.
5. Implement local audit fallback unless a shared EmDash/AWCMS adapter is available.

Acceptance checks:

1. Public users cannot access admin APIs.
2. Frontend-supplied tenant/site/role/permission/scope is ignored.
3. NIK/KIA hashes, raw R2 keys, private URLs, and highly restricted values never leave normal APIs.
4. High-risk actions require reason and write audit events.

## Phase 4: Public Aggregate Surface

Goal: safely replace `/sikesra` placeholder.

Tasks:

1. Implement public metadata service.
2. Implement public filters using only safe aggregate filter values.
3. Implement public summary with active/verified/non-deleted data and small-cell suppression.
4. Render `/sikesra` without importing or calling admin API clients.

Acceptance checks:

1. `/sikesra` loads without login.
2. Output is aggregate-only.
3. Small-cell suppression is applied.
4. No individual names, exact addresses, protected coordinates, documents, hashes, or private values are visible.

## Phase 5: Admin API Rebuild

Goal: rebuild versioned APIs by resource group.

Implementation order:

1. Settings read/update.
2. Dashboard scoped KPIs.
3. Official/local regions.
4. Entity list/detail/create/patch.
5. ID generation/correction.
6. Verification queue/decision.
7. Documents upload/complete/download proxy.
8. Import staging/promotion.
9. Duplicate review.
10. Exports/reports.
11. Audit browsing.

Acceptance checks for every endpoint group:

1. Request ID envelope.
2. Trusted context.
3. Validation.
4. Auth/RBAC/ABAC.
5. Tenant/site/deleted/region filters.
6. Masked serializer.
7. Audit event where required.
8. Focused tests or documented manual checks.

## Phase 6: Admin UI Rebuild

Goal: build EmDash-compatible admin screens after APIs exist.

Tasks:

1. Start with EmDash Block Kit placeholders only where sufficient.
2. Add React/Kumo screens only after API contracts stabilize.
3. Drive action availability from backend access flags.
4. Do not make hidden controls the only security mechanism.

Acceptance checks:

1. Admin UI requires login.
2. Permission failures are safe.
3. Screens are usable on desktop/tablet and responsive-basic on mobile.

## Phase 7: Import, Documents, Export, and Operations

Goal: add high-risk workflows only after security and audit are proven.

Tasks:

1. Excel import with staging before promotion.
2. R2 document handling with backend proxy/signed access and no raw key exposure.
3. Restricted export job creation, masking, reason capture, and audit.
4. Backup/restore and D1/R2 linkage validation.

Acceptance checks:

1. Import cannot bypass validation or duplicate review.
2. Document downloads enforce permission, ABAC, reason where needed, and audit.
3. Export never leaks restricted fields without explicit permission and audit.

## Validation Commands

Run before every completion report:

```bash
node --check scripts/postbuild.mjs
node --check scripts/worker-wrapper-template.mjs
npm run typecheck
npm test
npm run build
```

After deployment, manually verify:

```txt
/                                      -> EmDash host output, x-route: emdash-root
/sikesra                               -> public-safe SIKESRA placeholder or aggregate page
/_emdash/admin                         -> EmDash admin/auth shell
/_emdash/api/plugins/sikesra/*         -> disabled until rebuilt, then auth/ABAC enforced
```

## Documentation Rules

Update these files whenever integration behavior changes:

1. `docs/core/SIKESRA_INTEGRATION_OVERLAY.md` for route/binding/build/deploy changes.
2. `docs/sikesra/IMPLEMENTATION_DECISIONS.md` for confirmed extension points.
3. Relevant SIKESRA domain doc for API, data, security, UI, or operations changes.
