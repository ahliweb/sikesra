# Skill: sikesra-api-rbac

Use this skill when implementing API routes, RBAC permission checks, ABAC filters, or audit logging for SIKESRA — and especially when working on EPIC-H1 hardening (`docs/prd/02.IMPLEMENTATION_BACKLOG.md`).

> **Rewritten Juni 2026 after direct code audit.** The previous version of this skill described a REST-style route shape (`path`/`method`, `ctx.locals.user`, Kysely SQL pagination) that doesn't exist in this plugin. See `docs/prd/05.API_CONTRACT.md` and `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` §0 before writing any route code here.

## 0. The Most Important Fact First

**No route in this plugin checks permission or verified identity today.** Every `*/save` route (`registry/save`, `documents/save`, `verification/advance`, `verification/reject`, `settings/save`, all `access/*/save`, all `abac/*/save`, `regions/save`, `data-types/save`) writes directly from `routeCtx.input` with no authorization gate. If your task is EPIC-H1 (adding the gate), this is exactly the gap you're closing. If your task is unrelated, don't copy this pattern into new code, and don't assume existing routes are safe to call without further checks.

## 1. Real Route Entry Shape

Routes are named entries in `sharedRouteEntries` (a `Record<string, RouteEntry>`), not REST paths with HTTP methods:

```typescript
// Pattern actually used in src/runtime.ts
const registrySaveRoute: RouteHandler = async (routeCtx, ctx) => {
  const entity = parseRegistryInput(routeCtx.input);
  await ctx.storage.registryEntities.put(entity.id, entity);

  await appendAuditEvent(
    ctx,
    createAuditRecord({
      kind: "registry.created",
      scope: "sikesra:registry",
      actor: actorFromContent(entity), // currently NOT a verified identity — see §0
      summary: `Entitas ${entity.label} dibuat`,
      metadata: { entityId: entity.id, entityType: entity.entityType },
    }),
  );

  return { data: entity };
};

const sharedRouteEntries: Record<string, RouteEntry> = {
  "registry/save": { public: false, handler: registrySaveRoute },
  // ...38 more entries, see docs/prd/05.API_CONTRACT.md
};
```

### Recommended Pattern for Hardening (H1-01/H1-02/H1-03) — Not Yet Implemented

```typescript
const registrySaveRoute: RouteHandler = async (routeCtx, ctx) => {
  // STEP 1 (H1-01): verified identity, NOT a client-supplied header/body field
  const userId = getVerifiedUserId(ctx); // replaces getRequestUserId()'s unsigned-header read
  if (!userId) return { error: { code: "UNAUTHENTICATED", message: "Not signed in" } };

  // STEP 2 (H1-02): permission check against permissionCatalog/roleCatalog/userRoleAssignments
  const allowed = await hasPermission(ctx, userId, "awcms:sikesra:registry:write");
  if (!allowed) return { error: { code: "FORBIDDEN", message: "Missing permission" } };

  // STEP 3: parse + validate input (Zod)
  const entity = parseRegistryInput(routeCtx.input);

  // STEP 4 (H1-03): ABAC gate — evaluateAbacDecision() already exists, just isn't called here yet
  const decision = await evaluateAbacDecision(ctx, {
    action: "registry.write",
    subject: await getSubjectAttributes(ctx, userId),
    resource: { resourceType: "registry_entity", villageCode: entity.region.villageCode },
  });
  if (decision.result === "deny") return { error: { code: "FORBIDDEN", message: "ABAC denied" } };

  // STEP 5: business logic + write
  await ctx.storage.registryEntities.put(entity.id, entity);

  // STEP 6: audit (already done correctly today)
  await appendAuditEvent(ctx, createAuditRecord({ kind: "registry.created", scope: "sikesra:registry", actor: userId, summary: `...` }));

  return { data: entity };
};
```

`getVerifiedUserId()` and `hasPermission()` don't exist yet — they're the deliverable of H1-01/H1-02, not something you can import today.

## 2. Permission Strings: Two Sources, Not in Sync

```typescript
// src/permissions.ts — ONLY used by tests, NOT the source of truth
export const AWCMS_SIKESRA_PERMISSIONS = {
  accessPreviewRead: "awcms:sikesra:access-preview:read", // doesn't match manifest!
  // ...
};

// src/runtime.ts manifest — what's ACTUALLY used for nav-level gating
permission: "awcms:sikesra:preview:read", // note: no "access-" segment
```

Before writing a permission check, grep `src/runtime.ts`'s manifest for the real string — don't trust `src/permissions.ts` until H2-02 reconciles them.

## 3. ABAC: Logic Exists, Wiring Doesn't

```typescript
// evaluateAbacDecision() in runtime.ts (~line 1814) is correctly implemented:
// - default-deny when no policy matches
// - priority-based policy matching
// It is called from exactly two places today: abacPreviewRoute and
// abacEnforceDemoRoute — both read-only simulations. abacEnforceDemoRoute
// evaluates a decision but NEVER blocks anything, regardless of result.
```

H1-03 is calling this function from real mutation routes and actually respecting `deny`.

## 4. Region/ABAC Attribute Shape (For Reference, Not Yet Wired to Real Auth)

```typescript
// Region scope lives on registry entities as:
interface RegistryRegion { provinceCode: string; regencyCode: string; districtCode: string; villageCode: string; }

// ABAC subject/resource attributes are free-form Record<string, string>,
// stored in abacSubjectAssignments / abacResourceAssignments collections.
// See docs/prd/03.PLUGIN_ARCHITECTURE.md §7 for the evaluation algorithm.
```

## 5. Response Shape (Real)

Route handlers return a plain object (`{ data }` or `{ error }`), not a `Response`/`Response.json()` — the adapter layer (`createNativeRoutes()`/`createSandboxRoutes()`) wraps it:

```typescript
return { data: entity };
return { error: { code: "VALIDATION_ERROR", message: "..." } };
```

There's no `{ data, meta }` envelope with `requestId`/`timestamp` confirmed in this plugin's routes — verify the actual adapter behavior in `runtime.ts` before assuming a specific envelope shape; don't invent one.

## 6. Pagination (Verify Before Reusing)

`audit/list` is described as paginated with a cursor, max 50. Before implementing cursor pagination elsewhere, read the actual `auditListRoute` implementation in `runtime.ts` rather than assuming a generic Kysely-based cursor pattern — this plugin doesn't use Kysely.

## 7. Audit Event Pattern (Real, This Part Already Works)

```typescript
import { createAuditRecord } from "../runtime.js"; // NOT from "./audit.js" — that's dead code

await appendAuditEvent(
  ctx,
  createAuditRecord({
    kind: "registry.created",       // domain.action
    scope: "sikesra:registry",      // plugin scope
    actor: actorString,             // currently NOT a verified identity, see §0
    summary: `Entitas ${label} (${entityType}) dibuat`,
    metadata: { entityId, entityType, villageCode },
  }),
);
```

## 8. Error Codes Actually Used vs Aspirational

The plugin does not currently raise structured `SIKESRA_*` error codes like `SIKESRA_LEVEL_MISMATCH`/`SIKESRA_REGION_FORBIDDEN` from route handlers — those were aspirational in the old version of this skill. If you're adding hardening (H1-02/H1-03), introducing consistent error codes is a reasonable part of that work, but check current handler behavior first rather than assuming these codes already exist.

## 9. Public Route (No Auth) — The One Pattern That's Genuinely Safe to Copy

```typescript
// public/status — the ONLY route with public: true, and the only one
// with a real privacy control (small-cell suppression) already working
const publicStatusRoute: RouteHandler = async (_routeCtx, ctx) => {
  const settings = await getSettings(ctx);
  const threshold = settings.smallCellThreshold;
  const entities = await ctx.storage.registryEntities.query({});
  // group by entityType, compute total/verified, mark suppressed if total < threshold
  return { data: { categories, caveat: "..." } };
};
```

## 10. Dokumen Terkait

- `docs/prd/05.API_CONTRACT.md` — full 39-route list + authorization notes
- `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` §0 — critical findings
- `docs/prd/02.IMPLEMENTATION_BACKLOG.md` EPIC-H1 — the actual hardening work items
