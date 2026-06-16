# Skill: sikesra-data-d1

Use this skill when working on storage collections, KV, or data shape for SIKESRA.

> **Rewritten Juni 2026 after direct code audit.** The previous version of this skill described raw SQL tables (`CREATE TABLE sikesra_*`) that do not exist. The plugin persists data via `PluginStorageConfig` collections (backed by D1 under the hood, but the plugin never writes SQL directly). See `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8 for the full list of discrepancies.

## 1. Storage Model: Collections, Not Tables

```typescript
// src/runtime.ts — AWCMS_SIKESRA_STORAGE (the real, complete list)
export const AWCMS_SIKESRA_STORAGE = {
  auditEvents: { indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]] },
  accessChangeEvents: { indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]] },
  abacChangeEvents: { indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]] },
  registryEntities: { indexes: ["code", "entityType", "sensitivity", ["entityType", "sensitivity"]] },
  abacAttributeCatalog: { indexes: ["key", "targetType", "updatedAt", ["targetType", "updatedAt"]] },
  abacPolicyRules: { indexes: ["id", "effect", "updatedAt", ["effect", "updatedAt"]] },
  supportingDocuments: { indexes: ["registryEntityId", "documentType", "sensitivity", ["registryEntityId", "sensitivity"]] },
  verificationStageState: { indexes: ["registryEntityId", "stage", "updatedAt", ["registryEntityId", "updatedAt"]] },
  abacResourceAssignments: { indexes: ["resourceId", "updatedAt"] },
  abacSubjectAssignments: { indexes: ["subjectId", "updatedAt"] },
  contentSnapshots: { indexes: ["collection", "contentId", "timestamp", ["collection", "timestamp"], ["contentId", "timestamp"]] },
  settingsState: { indexes: ["key", "updatedAt"] },
  pluginState: { indexes: ["key", "updatedAt"] },
  permissionCatalog: { indexes: ["slug", "scope", "updatedAt", ["scope", "updatedAt"]] },
  roleCatalog: { indexes: ["slug", "updatedAt"] },
  rolePermissionAssignments: { indexes: ["roleSlug", "updatedAt"] },
  userRoleAssignments: { indexes: ["userId", "updatedAt"] },
  verificationEvents: { indexes: ["registryEntityId", "stage", "createdAt", ["registryEntityId", "createdAt"]] },
} satisfies PluginStorageConfig;
```

No `CREATE TABLE`, no `sikesra_*` prefix, no Kysely `sql` tagged templates anywhere in this plugin. Access is always `ctx.storage.<collectionName>.get/put/delete/exists/getMany/putMany/deleteMany/query/count`.

**Region tree and entity-type catalog are NOT collections** — they're static in-code arrays (`DEFAULT_REGION_TREE`, `DEFAULT_DATA_TYPES`) with an optional unvalidated KV override (`custom:regions`, `custom:data-types`). See §5.

## 2. Adding a New Collection

```typescript
// 1. Add to AWCMS_SIKESRA_STORAGE with the indexes you need
export const AWCMS_SIKESRA_STORAGE = {
  // ...existing entries...
  myNewCollection: { indexes: ["someField", "updatedAt"] },
} satisfies PluginStorageConfig;

// 2. Define the data shape (prefer adding to src/fixtures.ts if it's a
//    domain entity, or a local interface in runtime.ts if it's
//    infrastructure like audit/access/abac — follow the existing split,
//    see docs/prd/04.DATABASE_SCHEMA.md §2)

// 3. Access it
await ctx.storage.myNewCollection.put(id, data);
const items = await ctx.storage.myNewCollection.query({ limit: 50 });
```

No migration file to create, no `runner.ts` registration — this is specific to the SIKESRA plugin's framework (different from EmDash core's `_emdash_*` table migrations described in root `AGENTS.md`).

## 3. Real Collection-to-Type Mapping

| Collection | Type Actually Used | Source |
| --- | --- | --- |
| `registryEntities` | `SikesraReferenceRegistryEntity` | `src/fixtures.ts` |
| `supportingDocuments` | `SikesraReferenceSupportingDocument` | `src/fixtures.ts` |
| `verificationEvents` | `SikesraReferenceVerificationEvent` | `src/fixtures.ts` |
| `permissionCatalog` | `AccessPermission` (different from `fixtures.ts`'s lighter type) | `src/runtime.ts` |
| `roleCatalog` | `AccessRole` (different from `fixtures.ts`) | `src/runtime.ts` |
| `abacAttributeCatalog` | `AbacAttributeDefinition` (no `fixtures.ts` equivalent) | `src/runtime.ts` |
| `abacPolicyRules` | `AbacPolicyRule` (different from `fixtures.ts`'s `SikesraReferenceAbacPolicy`) | `src/runtime.ts` |
| `auditEvents` | `ExampleAuditEvent` (no `fixtures.ts` equivalent — name is a scaffold leftover) | `src/runtime.ts` |

Don't assume a type from `fixtures.ts` matches what a route handler actually reads/writes — check `docs/prd/04.DATABASE_SCHEMA.md` §2 first.

## 4. Enum Values (Verified)

```typescript
// verificationStage (9 values, fixed order)
const VERIFICATION_STAGE_FLOW = [
  "draft", "submitted_village", "verified_village",
  "submitted_district", "verified_district",
  "submitted_sopd", "verified_sopd",
  "submitted_regency", "active_verified",
] as const;

// sensitivity
const SENSITIVITY_LEVELS = ["public_safe", "internal", "restricted", "highly_restricted"] as const;

// VerificationUserLevel (alias SikesraUserLevel — used on entity/event)
const USER_LEVELS = ["desa_kelurahan", "kecamatan", "sopd", "kabupaten", "admin_sikesra"] as const;

// VerificationLevel (DIFFERENT union — used for stage→verifier bucketing, NOT the same as above)
const VERIFICATION_LEVEL_BUCKETS = ["desa_kelurahan", "kecamatan", "sopd", "kabupaten_admin", "tampil"] as const;

// entityType (8 parent types, each with subTypes — see DEFAULT_DATA_TYPES)
const ENTITY_TYPES = [
  "rumah_ibadah", "lembaga_keagamaan", "pendidikan_keagamaan",
  "lks", "guru_agama", "anak_yatim", "disabilitas", "lansia_terlantar",
] as const;
```

`VerificationLevel` and `VerificationUserLevel` are two different, only partially overlapping unions — see `docs/prd/02.IMPLEMENTATION_BACKLOG.md` H2-01 before writing code that assumes they're interchangeable. Level `"tampil"` (= stage `active_verified`) currently allows zero verifiers (`getAllowedVerifierLevels("tampil")` returns `[]`).

## 5. Region and Entity-Type Pattern: Static + Unvalidated KV Override

```typescript
// Real pattern used by regions/get and data-types/get
const tree = (await ctx.kv.get<AdministrativeProvince[]>("custom:regions")) ?? DEFAULT_REGION_TREE;

// Real pattern used by regions/save — NO VALIDATION (this is a known gap, H1-04)
await ctx.kv.put("custom:regions", JSON.stringify(input));
```

If your task is H1-04 (validate shape), add Zod validation here. If your task is unrelated, don't copy the unvalidated write pattern into new code.

## 6. KV Pattern (Settings)

```typescript
// Settings collection is settingsState, but cross-cutting settings also use KV in places — check runtime.ts before assuming which
const settings = await getSettings(ctx); // wraps storage read + DEFAULT_SETTINGS fallback
await persistSettings(ctx, nextSettings);
```

Settings shape is `ExampleSettings` (6 fields exactly): `publicStatusLabel`, `auditRetentionDays`, `governanceMode`, `metadataCanonicalBase`, `smallCellThreshold`, `sikesraPublicEnabled`. See `docs/prd/04.DATABASE_SCHEMA.md` §3.

## 7. No R2 Usage Found

A full grep of `src/runtime.ts` for R2/media/signed-URL patterns returned zero matches. `documents/save` stores metadata only — there is no file upload to R2 in this plugin today. Don't assume document upload works end-to-end; verify before building on top of it.

## 8. Avoid SQL Injection (General Rule, Not Specific to This Plugin)

This plugin doesn't write SQL directly, so this is mostly inherited guidance from root `AGENTS.md` for any EmDash-core-adjacent code you might touch:

```typescript
// If you ever touch EmDash core query code: never interpolate into sql.raw()
// Use sql`...${value}...` for values, sql.ref() for identifiers.
```

## 9. Verification Stage Transition Logic (Real)

```typescript
function getNextVerificationStage(stage: VerificationStage): VerificationStage | null {
  const index = VERIFICATION_STAGE_FLOW.indexOf(stage);
  return index >= 0 && index < VERIFICATION_STAGE_FLOW.length - 1 ? VERIFICATION_STAGE_FLOW[index + 1] : null;
}

function getAllowedVerifierLevels(level: VerificationLevel): VerificationUserLevel[] {
  if (level === "desa_kelurahan") return ["desa_kelurahan"];
  if (level === "kecamatan") return ["kecamatan"];
  if (level === "sopd") return ["sopd"];
  if (level === "kabupaten_admin") return ["kabupaten", "admin_sikesra"];
  return []; // level "tampil" — no verifiers allowed
}
```

## 10. Full Reference

See `docs/prd/04.DATABASE_SCHEMA.md` for the complete collection list, field shapes, and enum values.
