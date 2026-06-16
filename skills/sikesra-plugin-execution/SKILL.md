# Skill: sikesra-plugin-execution

Use this skill when working on SIKESRA plugin scaffold, hooks, lifecycle, navigation, or runtime wiring.

---

## 1. Plugin Identity

```
npm name : @ahliweb/awcms-sikesra
plugin ID: awcms-micro-sikesra
dir      : awcmsmicro-dev/packages/plugins/awcms-sikesra/
format   : native (EmDash trusted plugin)
```

## 2. File Responsibilities

| File | Tanggung Jawab |
|------|---------------|
| `src/index.ts` | Plugin descriptor (`awcmsSikesraPlugin`) + `createPlugin()` |
| `src/runtime.ts` | Storage config, routes, hooks, manifest — ini file utama |
| `src/admin.tsx` | Admin UI (React + Kumo) |
| `src/navigation.ts` | Navigation module manifest + emdash adapter |
| `src/permissions.ts` | `AWCMS_SIKESRA_PERMISSIONS` const |
| `src/audit.ts` | `createAuditRecord()` helper |
| `src/fixtures.ts` | Reference fixtures + TypeScript types |
| `src/sandbox.ts` | Sandboxed server-side entry |

## 3. How to Add a Route

Routes live in `createNativeRoutes()` in `src/runtime.ts`:

```typescript
export function createNativeRoutes(): NativePluginRoute[] {
  return [
    {
      path: "/_emdash/api/plugins/awcms-sikesra/my-endpoint",
      method: "GET",
      handler: async (request: Request, ctx: PluginContext): Promise<Response> => {
        // 1. Auth check
        const user = (ctx.locals as { user?: unknown }).user as User | undefined
        if (!user) return new Response(null, { status: 401 })

        // 2. Permission check
        const hasPermission = checkPermission(user, AWCMS_SIKESRA_PERMISSIONS.dashboardRead)
        if (!hasPermission) return new Response(null, { status: 403 })

        // 3. Business logic + storage
        const data = await ctx.storage.auditEvents.findMany({ limit: 10 })

        // 4. Return envelope
        return Response.json({
          data: { items: data },
          meta: { requestId: crypto.randomUUID(), timestamp: new Date().toISOString() }
        })
      }
    }
  ]
}
```

## 4. How to Add a Hook

Hooks live in `createSharedHooks()` in `src/runtime.ts`:

```typescript
export function createSharedHooks() {
  return {
    install: async (ctx: PluginContext) => {
      // Run migrations, seed data
    },
    activate: async (ctx: PluginContext) => {
      // Validate storage is ready
    },
    deactivate: async (ctx: PluginContext) => {
      // Cleanup
    },
    uninstall: async (ctx: PluginContext) => {
      // Drop tables (with confirmation)
    },
    "content:afterCreate": async (ctx: PluginContext, payload: unknown) => {
      // React to content creation
    },
    "cron:daily": async (ctx: PluginContext) => {
      // Audit retention cleanup
    },
  }
}
```

## 5. Navigation Manifest Pattern

```typescript
// src/runtime.ts
export const AWCMS_SIKESRA_MANIFEST: AwcmsModuleManifest = {
  id: "awcms-micro-sikesra",
  version: pkg.version,
  label: { en: "SIKESRA", id: "SIKESRA" },
  pages: [
    {
      id: "overview",
      path: "/overview",
      label: { en: "Overview", id: "Ikhtisar" },
      permission: "awcms:sikesra:dashboard:read",
    },
    // ... 8 more pages
  ],
  i18n: { locales: ["en", "id"], defaultLocale: "en" },
}

export const AWCMS_SIKESRA_ADMIN_PAGES = adaptToEmdashPages(AWCMS_SIKESRA_MANIFEST)
```

## 6. Storage Access Pattern

Plugin storage is accessed via `ctx.storage.*` (not raw SQL in route handlers):

```typescript
// Read
const events = await ctx.storage.auditEvents.findMany({ limit: 50 })
const entity = await ctx.storage.registryEntities.findOne({ id: "ulid" })

// Write
await ctx.storage.auditEvents.create({ id: "ulid", kind: "...", ... })
await ctx.storage.registryEntities.update({ id: "ulid" }, { label: "New Label" })

// Delete
await ctx.storage.registryEntities.delete({ id: "ulid" })
```

## 7. Build & Test Commands

```bash
# Build plugin
pnpm --filter @ahliweb/awcms-sikesra build

# Type check
pnpm --filter @ahliweb/awcms-sikesra typecheck

# Tests
pnpm --filter @ahliweb/awcms-sikesra test

# Lint (run after every edit)
pnpm --silent lint:quick

# Format before commit
pnpm format
```

## 8. Changeset

Setiap perubahan behavior plugin perlu changeset:

```bash
pnpm changeset --empty
# Edit .changeset/*.md:
```

```markdown
---
"@ahliweb/awcms-sikesra": patch
---

Adds health check endpoint.
```

## 9. Protected Paths

Jangan modifikasi file di luar plugin dir kecuali diminta eksplisit:

```
# PROTECTED — jangan ubah kecuali diminta
awcmsmicro-dev/packages/core/      ← core AWCMS-Micro
awcmsmicro-dev/packages/plugins/   ← plugin lain
docs/                              ← governance docs
scripts/                           ← sync scripts
emdash-latest/                     ← reference only, jangan edit
```

## 10. Common Gotchas

- Import internal harus pakai `.js` extension: `import { ... } from "./audit.js"`
- `import type` untuk type-only imports (verbatimModuleSyntax)
- Plugin ID di manifest: `awcms-micro-sikesra` (bukan `@ahliweb/awcms-sikesra`)
- Jangan gunakan `process.env` — gunakan `import.meta.env`
- Semua plugin storage di namespace `sikesra_*`, jangan campur dengan core tables
