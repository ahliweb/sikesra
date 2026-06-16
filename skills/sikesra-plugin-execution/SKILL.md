# Skill: sikesra-plugin-execution

Use this skill when working on SIKESRA plugin scaffold, hooks, lifecycle, navigation, or runtime wiring.

> **Rewritten Juni 2026 after direct code audit.** Previous version of this skill described patterns (`ctx.locals.user`, `checkPermission()`, plugin ID `awcms-micro-sikesra`) that do not exist in the real codebase. See `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8 for the full list of discrepancies found.

## 1. Plugin Identity (Verified Against Code)

```text
npm name : @ahliweb/awcms-sikesra (version 0.1.1)
plugin ID: awcms-sikesra   ← NOT awcms-micro-sikesra
dir      : awcmsmicro-dev/packages/plugins/awcms-sikesra/
format   : native (EmDash trusted plugin), built on top of an AWCMS-Micro
           example/reference plugin scaffold — see §6 below.
```

## 2. File Responsibilities (Verified)

| File | Real Responsibility |
| --- | --- |
| `src/index.ts` | `awcmsSikesraPlugin()` (descriptor) + `createPlugin()` (the one actually used in production) |
| `src/runtime.ts` | **The single source of truth** — storage config, ~39 routes, hooks, manifest, region/data-type defaults (2870 lines) |
| `src/admin.tsx` | Admin UI, 16 pages + 3 widgets (React + Kumo) |
| `src/admin-copy.ts` | Localized copy strings (en+id), imported by `admin.tsx` — NOT a backup file |
| `src/navigation.ts` | Barrel re-export of `./navigation/*` |
| `src/permissions.ts` | `AWCMS_SIKESRA_PERMISSIONS` — **only used in tests**, NOT imported by `runtime.ts` or `admin.tsx`. Don't treat it as authoritative. |
| `src/audit.ts` | **Dead code.** Defines its own `createAuditRecord()`/`ExampleAuditEvent`, imported by nothing. The real implementation lives in `runtime.ts` (~line 1535). |
| `src/fixtures.ts` | Types + reference data. Only `SikesraReferenceRegistryEntity`/`SikesraReferenceSupportingDocument`/`SikesraReferenceVerificationEvent` are used as the actual collection types — ABAC/permission/role types here differ from what `runtime.ts` really uses. |
| `src/sandbox.ts` | Sandboxed entry |

## 3. How to Add a Route (Real Pattern)

Routes live in `sharedRouteEntries` in `src/runtime.ts`, exposed via `createNativeRoutes()`/`createSandboxRoutes()`. There is no per-route `path`/`method` REST shape — routes are named entries in a record:

```typescript
// Pattern used by existing routes in runtime.ts
const myRoute: RouteHandler = async (routeCtx, ctx) => {
  // 1. Business logic + storage (collections, NOT SQL)
  const items = await ctx.storage.registryEntities.query({ limit: 50 });

  // 2. Audit (always, for mutations)
  await appendAuditEvent(
    ctx,
    createAuditRecord({ kind: "my.action", scope: "sikesra:my-scope", actor: "...", summary: "..." }),
  );

  return { data: items };
};

// Registered in sharedRouteEntries:
const sharedRouteEntries: Record<string, RouteEntry> = {
  "my/route": { public: false, handler: myRoute },
  // ...
};
```

**Critical gap to know before adding a mutating route**: none of the existing `*/save` routes check permission or verified identity before writing (see `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` §0). Don't copy that pattern uncritically into new code — if your task is in EPIC-H1 (hardening), add the check; if it's an unrelated task, flag the gap in your PR description rather than silently inheriting it.

## 4. How to Add a Hook (Real Pattern)

Hooks live in `sharedHooks` / `createSharedHooks()` in `src/runtime.ts`:

```typescript
const sharedHooks: SandboxedPlugin["hooks"] = {
  "plugin:install": async (_event, ctx) => {
    await ensureAccessCatalogSeeded(ctx);
    await ensureAbacCatalogSeeded(ctx);
    await appendAuditEvent(ctx, createAuditRecord({ kind: "plugin.install", scope: "lifecycle", actor: "system", summary: "..." }));
  },
  "plugin:activate": async (_event, ctx) => { /* re-seed, schedule cron */ },
  "plugin:deactivate": async (_event, ctx) => { /* cancel cron */ },
  "plugin:uninstall": async (event, ctx) => { /* respects event.deleteData */ },
  "content:beforeSave": async (event, ctx) => { /* snapshot + audit, ALL EmDash collections, not just SIKESRA */ },
  cron: async (event, ctx) => { if (event.name !== "governance-summary") return; /* ... */ },
  "page:metadata": async (event, ctx) => { /* inject meta tags */ },
};
```

There is no `install`/`activate`/`deactivate`/`uninstall` without the `plugin:` prefix, and no `content:afterCreate` — the real hook names are `content:beforeSave`/`content:afterSave`/`content:beforeDelete`/`content:afterDelete`/`content:afterPublish`/`content:afterUnpublish`.

## 5. Navigation Manifest Pattern (Real)

```typescript
// src/runtime.ts
export const AWCMS_SIKESRA_MANIFEST: AwcmsModuleManifest = {
  id: "awcms-sikesra",   // NOT awcms-micro-sikesra
  // ... 16 pages registered here: overview, registry, documents, import,
  // verification, audit, reports, access/permissions, access/roles,
  // access/matrix, access/preview, abac/attributes, abac/policies,
  // abac/preview, regions, data-types
};

export const AWCMS_SIKESRA_ADMIN_PAGES = adaptToEmdashPages(AWCMS_SIKESRA_MANIFEST);
```

Permission strings referenced in the manifest are inline string literals, not imported from `src/permissions.ts` (which is unsynced — see `docs/prd/02.IMPLEMENTATION_BACKLOG.md` H2-02).

## 6. Why This Plugin Looks "Generic" in Places

Hook log messages literally say `"Installed the AWCMS-Micro example plugin"`. `package.json` keywords include `"example"`, `"tenant-ready"`. This plugin started from AWCMS-Micro's example/reference plugin scaffold, with SIKESRA domain content (8 entity types, 9 verification stages, region tree) layered on top. Don't assume every internal name (`ExampleAuditEvent`, `ExampleSettings`) is SIKESRA-specific — some are scaffold leftovers (tracked as `docs/prd/02.IMPLEMENTATION_BACKLOG.md` H2-04).

## 7. Storage Access Pattern

```typescript
// Read
const items = await ctx.storage.registryEntities.query({ limit: 50 });
const one = await ctx.storage.registryEntities.get(id);

// Write
await ctx.storage.registryEntities.put(id, entityData);

// Delete
await ctx.storage.registryEntities.delete(id);
```

No `findMany`/`findOne`/`create`/`update` methods — the real `StorageCollection<T>` interface is `get/put/delete/exists/getMany/putMany/deleteMany/query/count`. See `docs/prd/04.DATABASE_SCHEMA.md`.

## 8. Build & Test Commands

```bash
pnpm --filter @ahliweb/awcms-sikesra build
pnpm --filter @ahliweb/awcms-sikesra typecheck
pnpm --filter @ahliweb/awcms-sikesra test
pnpm --silent lint:quick
pnpm format
```

## 9. Changeset

```bash
pnpm changeset --empty
```

```markdown
---
"@ahliweb/awcms-sikesra": patch
---

Adds server-side permission check to registry/save.
```

## 10. Protected Paths

```text
awcmsmicro-dev/packages/core/      ← core AWCMS-Micro
awcmsmicro-dev/packages/plugins/   ← other plugins
docs/                               ← governance docs
scripts/                            ← sync scripts
emdash-latest/                      ← reference only, do not edit
```

## 11. Common Gotchas

- Internal imports need `.js` extension: `import { ... } from "./fixtures.js"`
- `import type` for type-only imports (`verbatimModuleSyntax`)
- Plugin ID in manifest/descriptor: `awcms-sikesra` (NOT `awcms-micro-sikesra`)
- Never import from `src/audit.ts` — it's dead code; use `createAuditRecord()`/`appendAuditEvent()` from `runtime.ts`
- Don't treat `src/permissions.ts` as the source of truth for permission strings — check the manifest in `runtime.ts` first
- Storage field names are `camelCase` (`entityType`, `villageCode`), not `snake_case`
- There is no server-side authorization on mutating routes today — read `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` §0 before assuming otherwise
