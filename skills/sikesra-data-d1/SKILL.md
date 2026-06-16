# Skill: sikesra-data-d1

Use this skill when working on D1 migrations, database schema, or plugin storage for SIKESRA.

---

## 1. D1 Naming Rules

```
Tables  : sikesra_* (ALL plugin tables must use this prefix)
KV keys : sikesra:* (colon separator)
R2 keys : sikesra/* (slash separator)
```

## 2. Migration Pattern (Idempoten)

Semua migration di install hook harus idempoten — aman dijalankan berkali-kali:

```typescript
// src/runtime.ts — install hook

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS sikesra_registry_entities (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  sensitivity TEXT NOT NULL DEFAULT 'internal',
  province_code TEXT NOT NULL,
  regency_code TEXT NOT NULL,
  district_code TEXT NOT NULL,
  village_code TEXT NOT NULL,
  verification_stage TEXT NOT NULL DEFAULT 'draft',
  input_level TEXT NOT NULL DEFAULT 'desa_kelurahan',
  public_summary TEXT,
  extra_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sre_code ON sikesra_registry_entities(code);
CREATE INDEX IF NOT EXISTS idx_sre_entity_type ON sikesra_registry_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_sre_stage ON sikesra_registry_entities(verification_stage);
CREATE INDEX IF NOT EXISTS idx_sre_village ON sikesra_registry_entities(village_code);
CREATE INDEX IF NOT EXISTS idx_sre_district ON sikesra_registry_entities(district_code);
`

const SEED_PERMISSIONS_SQL = `
INSERT OR IGNORE INTO sikesra_permission_catalog (slug, label, description) VALUES
  ('awcms:sikesra:dashboard:read', 'Baca Dashboard', 'Lihat overview'),
  ('awcms:sikesra:registry:read', 'Baca Registri', 'Lihat entitas registri'),
  ('awcms:sikesra:registry:write', 'Kelola Registri', 'Buat dan ubah entitas'),
  ('awcms:sikesra:verification:read', 'Baca Verifikasi', 'Lihat antrian verifikasi'),
  ('awcms:sikesra:verification:verify', 'Lakukan Verifikasi', 'Approve/reject entitas')
  -- ... dst
`

async function installPlugin(ctx: PluginContext) {
  // Run each SQL statement
  await ctx.db.exec(CREATE_TABLES_SQL)
  await ctx.db.exec(SEED_PERMISSIONS_SQL)
  await ctx.db.exec(SEED_ROLES_SQL)

  // Audit setelah install
  await ctx.storage.auditEvents.create(createAuditRecord({
    kind: "plugin.installed",
    scope: "sikesra:lifecycle",
    actor: "system",
    summary: "Plugin SIKESRA installed",
    metadata: {}
  }))
}
```

## 3. Full Table List (11 tabel)

| Tabel | Isi |
|-------|-----|
| `sikesra_registry_entities` | Entitas sosial-keagamaan |
| `sikesra_verification_events` | Riwayat verifikasi per entitas |
| `sikesra_supporting_documents` | Metadata dokumen pendukung |
| `sikesra_audit_events` | Semua audit events |
| `sikesra_permission_catalog` | Daftar permissions |
| `sikesra_role_catalog` | Daftar roles |
| `sikesra_role_permission_assignments` | Mapping role → permission |
| `sikesra_user_role_assignments` | Mapping user → role + region_scope |
| `sikesra_abac_attribute_catalog` | Atribut ABAC |
| `sikesra_abac_policy_rules` | Policy rules ABAC |
| `sikesra_abac_subject_assignments` | Subject attributes |
| `sikesra_abac_resource_assignments` | Resource attributes |

## 4. Enum Values

```typescript
// verification_stage (urutan wajib diikuti)
const VERIFICATION_STAGES = [
  "draft",
  "submitted_village",
  "verified_village",
  "submitted_district",
  "verified_district",
  "submitted_sopd",
  "verified_sopd",
  "submitted_regency",
  "active_verified",
] as const

// sensitivity
const SENSITIVITY_LEVELS = ["public_safe", "internal", "restricted", "highly_restricted"] as const

// user/input/verifier level
const USER_LEVELS = ["desa_kelurahan", "kecamatan", "sopd", "kabupaten", "admin_sikesra"] as const

// entity_type
const ENTITY_TYPES = [
  "rumah_ibadah", "lembaga_keagamaan", "pendidikan_keagamaan",
  "lks", "guru_agama", "anak_yatim", "disabilitas", "lansia_terlantar"
] as const
```

## 5. Index Discipline

Setiap kolom yang dipakai di WHERE atau ORDER BY harus punya index:

```sql
-- Single column index
CREATE INDEX IF NOT EXISTS idx_sre_village ON sikesra_registry_entities(village_code);

-- Composite index
CREATE INDEX IF NOT EXISTS idx_sre_type_sensitivity ON sikesra_registry_entities(entity_type, sensitivity);

-- Partial index (jika ada kondisi)
CREATE INDEX IF NOT EXISTS idx_sve_pending ON sikesra_verification_events(registry_entity_id)
  WHERE result = 'pending';
```

Naming: `idx_{table_short}_{column}` atau `idx_{table_short}_{purpose}`

## 6. KV Pattern

```typescript
// Read settings dari KV
const settings = await ctx.kv.get<SikesraSettings>("sikesra:settings")
const effectiveSettings = settings ?? DEFAULT_SETTINGS

// Write settings ke KV
await ctx.kv.put("sikesra:settings", JSON.stringify(newSettings))

// Cache dengan TTL (1 jam)
await ctx.kv.put("sikesra:public-status-cache", JSON.stringify(aggregate), { expirationTtl: 3600 })

// Read cached data
const cached = await ctx.kv.get<PublicAggregate>("sikesra:public-status-cache")
```

## 7. R2 Pattern

```typescript
// Upload
const r2Key = `sikesra/documents/${entityId}/${documentId}/${filename}`
await ctx.storage.r2.put(r2Key, fileBuffer, {
  httpMetadata: { contentType: mimeType }
})

// Signed download URL (5 menit)
const signedUrl = await ctx.storage.r2.createSignedUrl(r2Key, { expiresIn: 300 })
return Response.redirect(signedUrl)

// Delete
await ctx.storage.r2.delete(r2Key)
```

## 8. Avoid SQL Injection

```typescript
// ❌ SALAH — string interpolation
const rows = await ctx.db.exec(`SELECT * FROM sikesra_${tableName}`)

// ✅ BENAR — gunakan Kysely dengan validated identifier
import { validateIdentifier } from "#database/validate.js"
validateIdentifier(tableName)  // throws jika tidak valid
const rows = await ctx.db.selectFrom(sql.ref(`sikesra_${tableName}`) as any).execute()

// ✅ BENAR — gunakan parameter untuk values
const rows = await ctx.db
  .selectFrom("sikesra_registry_entities")
  .where("village_code", "=", villageCode)  // parameterized
  .execute()
```

## 9. Verifikasi Stage Transition Logic

```typescript
const STAGE_ORDER = [
  "draft",
  "submitted_village", "verified_village",
  "submitted_district", "verified_district",
  "submitted_sopd", "verified_sopd",
  "submitted_regency",
  "active_verified",
]

function getPreviousStage(stage: string): string | null {
  const idx = STAGE_ORDER.indexOf(stage)
  return idx > 0 ? STAGE_ORDER[idx - 1]! : null
}

function getNextStage(stage: string): string | null {
  const idx = STAGE_ORDER.indexOf(stage)
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1]! : null
}

// Level yang boleh approve stage ini
const STAGE_VERIFIER_LEVEL: Record<string, SikesraUserLevel[]> = {
  "draft": ["desa_kelurahan"],
  "submitted_village": ["desa_kelurahan", "kecamatan"],
  "verified_village": ["kecamatan"],
  "submitted_district": ["kecamatan"],
  "verified_district": ["sopd", "kecamatan"],
  "submitted_sopd": ["sopd"],
  "verified_sopd": ["kabupaten", "sopd"],
  "submitted_regency": ["kabupaten", "admin_sikesra"],
}
```

## 10. Full Schema Reference

Lihat `docs/prd/04.DATABASE_SCHEMA.md` untuk full DDL + seed data SQL yang lengkap.
