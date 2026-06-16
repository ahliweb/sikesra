# PRODUCT REQUIREMENT DOCUMENT v1.0

## SIKESRA — Sistem Informasi Kesejahteraan Sosial dan Keagamaan

**Instansi**: Pemerintah Kabupaten Kotawaringin Barat  
**Status Dokumen**: PRD v1.1 — Disesuaikan dengan hasil audit kode (Juni 2026)  
**Tanggal**: Juni 2026  
**Pemilik Proses Bisnis**: Dinas Sosial / Kemenag / BPBD Kab. Kotawaringin Barat  
**Pemilik Teknis**: Tim Pengembang Sistem Informasi Daerah  
**Platform Teknis**: AWCMS-Micro (Cloudflare Workers / D1 via storage collections / KV)  
**Pola Pengembangan**: Modular Plugin Ecosystem — Plugin `@ahliweb/awcms-sikesra` (plugin ID nyata: `awcms-sikesra`)  
**Klasifikasi**: Internal Pemerintahan / Perencanaan Produk  

> **Catatan status implementasi (v1.1)**: Audit kode langsung (Juni 2026) menemukan bahwa fitur registry, verifikasi, dokumen, ABAC, kontrol akses, dan audit **sudah terimplementasi** di plugin (39 route, 16 halaman admin) — bukan backlog kosong. Namun plugin ini dibangun di atas scaffold contoh AWCMS-Micro dan **belum memiliki otorisasi server-side nyata** (lihat `10.SECURITY_AND_PRIVACY_CHECKLIST.md` § 0). Bagian timeline/sprint di dokumen ini (§ 16) ditulis dengan asumsi awal "MVP belum dikerjakan" — bagian itu sudah digantikan oleh backlog hardening di `02.IMPLEMENTATION_BACKLOG.md`. Baca dokumen tersebut untuk rencana kerja yang akurat.

---

## DAFTAR ISI

1. Ringkasan Eksekutif
2. Latar Belakang dan Tujuan Sistem
3. Ruang Lingkup Sistem
4. Pemangku Kepentingan dan Pengguna
5. Kebutuhan Bisnis Inti
6. Arsitektur Sistem
7. Desain Basis Data dan Hubungan Data
8. Alur Kerja Setiap Modul
9. Kebutuhan UI/UX
10. Kebutuhan API dan Integrasi
11. Kebutuhan Keamanan — Auth, RBAC, ABAC, Audit
12. Kebutuhan Operasional
13. Standar Dokumentasi Teknis
14. Fase Implementasi
15. Prioritas Pengembangan (MoSCoW)
16. Kriteria Penerimaan
17. Risiko dan Mitigasi
18. Glosarium

---

## 1. RINGKASAN EKSEKUTIF

**SIKESRA** adalah sistem informasi registri sosial dan keagamaan Kabupaten Kotawaringin Barat yang dibangun sebagai plugin native di atas **AWCMS-Micro**. Sistem ini menyediakan pendataan, verifikasi multi-level, dan pengelolaan entitas sosial-keagamaan mulai dari level desa hingga kabupaten.

**Entitas yang didata**:
- Rumah Ibadah (Masjid, Gereja, Pura, Vihara, Klenteng)
- Lembaga Keagamaan (Ormas, Majelis Agama)
- Pendidikan Keagamaan (Pesantren, Madrasah, Sekolah Minggu, dll)
- Lembaga Kesejahteraan Sosial (LKS)
- Guru Agama (non-ASN)
- Anak Yatim / Yatim Piatu
- Penyandang Disabilitas
- Lansia Terlantar

**Alur inti MVP**:
```
Input Data (Desa) → Verifikasi Desa → Verifikasi Kecamatan → Verifikasi SOPD → Verifikasi Kabupaten → Aktif/Arsip
```

**Infrastruktur**: Cloudflare Workers (D1 / R2 / KV) — serverless, edge-native, siap integrasi pusat  
**Plugin**: `@ahliweb/awcms-sikesra` — native EmDash plugin  
**Timeline MVP**: Sprint 0–4 (±3 bulan)  
**Target Pilot**: 5–7 kecamatan di Kab. Kotawaringin Barat

---

## 2. LATAR BELAKANG DAN TUJUAN SISTEM

### 2.1 Latar Belakang

Kabupaten Kotawaringin Barat memiliki kebutuhan mendata dan mengelola entitas sosial-keagamaan yang tersebar di 6 kecamatan, 86 desa/kelurahan. Saat ini pendataan dilakukan secara manual berbasis formulir kertas atau spreadsheet, menyebabkan:

- Data tidak terpadu antar dinas (Sosial, Kemenag, BPBD)
- Tidak ada jalur verifikasi terstruktur (validasi hanya di tingkat kabupaten)
- Tidak ada visibilitas real-time status data per wilayah
- Tidak ada kontrol akses berbasis wilayah (data desa bisa diakses bebas)
- Tidak ada jejak audit perubahan data

### 2.2 Tujuan Sistem

| # | Tujuan | Indikator Keberhasilan |
|---|--------|----------------------|
| T1 | Registri terpadu entitas sosial-keagamaan | 100% entitas terdaftar dan terverifikasi |
| T2 | Alur verifikasi multi-level terstruktur | Verifikasi ≤ 7 hari kerja per level |
| T3 | Kontrol akses berbasis wilayah (ABAC) | Petugas desa hanya akses data desa sendiri |
| T4 | Jejak audit setiap perubahan data | 100% mutasi tercatat dengan aktor |
| T5 | Dashboard publik yang aman | Hanya data aggregate yang dipublikasi |
| T6 | Fondasi integrasi data nasional | Siap sinkronisasi ke DTKS / PDDIKTI / Simkatmawa |

### 2.3 Kerangka Regulasi

- UU No. 11 Tahun 2009 tentang Kesejahteraan Sosial
- PP No. 95 Tahun 2018 tentang SPBE
- Permendagri No. 12 Tahun 2006 tentang Kewenangan Daerah
- Peraturan Bupati tentang Pendataan Sosial Daerah

---

## 3. RUANG LINGKUP SISTEM

### 3.1 Dalam Lingkup (In Scope)

- Plugin `@ahliweb/awcms-sikesra` sebagai core modul
- Admin UI berbasis Kumo (React, EmDash admin surface)
- Multi-level verification workflow (5 stage)
- RBAC + ABAC dengan wilayah sebagai dimensi utama
- Audit log per event
- Dashboard publik (aggregate, anonimisasi)
- D1 storage (plugin-owned namespace)
- R2 untuk dokumen pendukung

### 3.2 Luar Lingkup (Out of Scope — MVP)

- Integrasi real-time ke DTKS / SATUDATA
- Mobile app native (iOS/Android)
- Notifikasi push / email (post-MVP)
- Cetak laporan PDF (post-MVP)
- Penggajian / tunjangan guru agama (plugin terpisah)

---

## 4. PEMANGKU KEPENTINGAN DAN PENGGUNA

### 4.1 Pemangku Kepentingan

| Peran | Instansi | Kepentingan |
|-------|----------|-------------|
| Kadis | Dinas Sosial / Kemenag | Dashboard agregat, laporan kinerja |
| Kabid | Dinas Sosial / Kemenag | Verifikasi level kabupaten |
| Kasi | Bidang teknis | Verifikasi level SOPD |
| Camat | Kecamatan | Verifikasi level kecamatan |
| Kades/Lurah | Desa/Kelurahan | Input dan verifikasi level desa |
| Petugas Lapangan | Desa/Kelurahan | Input data entitas |
| Admin Sistem | Tim IT | Manajemen sistem, RBAC, ABAC |

### 4.2 Level Pengguna (User Level)

```
admin_sikesra > kabupaten > sopd > kecamatan > desa_kelurahan
```

| Level | Cakupan Wilayah | Hak Akses Utama |
|-------|----------------|-----------------|
| `admin_sikesra` | Semua | Full CRUD + Admin + ABAC |
| `kabupaten` | Semua kecamatan | Verifikasi final, laporan |
| `sopd` | Sesuai SOPD | Verifikasi SOPD, setting |
| `kecamatan` | Kecamatan sendiri | Verifikasi kecamatan, view all desa |
| `desa_kelurahan` | Desa/kelurahan sendiri | Input + edit draft + submit |

---

## 5. KEBUTUHAN BISNIS INTI

### 5.1 Manajemen Registri

- CRUD entitas dengan tipe: `rumah_ibadah`, `lembaga_keagamaan`, `pendidikan_keagamaan`, `lks`, `guru_agama`, `anak_yatim`, `disabilitas`, `lansia_terlantar`
- Setiap entitas punya: kode unik, label, tipe, wilayah (provinsi-kabupaten-kecamatan-desa), stage verifikasi, sensitivity level
- Filter berdasarkan tipe, wilayah, stage, sensitivity
- Paginasi berbasis cursor

### 5.2 Dokumen Pendukung

- Upload dokumen per entitas (akta, SK, foto, sertifikat)
- Metadata: tipe dokumen, judul, tanggal terbit, verifikator
- Sensitivity level per dokumen
- Storage di R2 (plugin namespace)

### 5.3 Alur Verifikasi

```
draft
  └─ submitted_village   (petugas desa submit)
       └─ verified_village    (kades/lurah approve)
            └─ submitted_district  (otomatis setelah verified_village)
                 └─ verified_district  (camat approve)
                      └─ submitted_sopd
                           └─ verified_sopd  (kasi/kabid approve)
                                └─ submitted_regency
                                     └─ active_verified  (kabupaten approve)
```

- Setiap transisi: actor, timestamp, notes, result (approved/needs_review/rejected)
- `needs_review` → kembali ke stage sebelumnya
- `rejected` → kembali ke draft

### 5.4 Audit Log

- Setiap mutasi mencatat: kind, scope, actor, summary, metadata, timestamp
- Retention: configurable (default 90 hari)
- Filter: kind, scope, actor, rentang tanggal

### 5.5 Dashboard Publik

- Aggregate per kategori: total + verified (bukan data per-record)
- Suppressed categories (small_cell_threshold untuk privasi)
- Label publik yang aman, tanpa PII

---

## 6. ARSITEKTUR SISTEM

### 6.1 Stack Teknis

```
Frontend Admin    : React + Kumo Design System + Lingui (i18n)
Backend Runtime   : AWCMS-Micro + Cloudflare Workers
Database          : Cloudflare D1 (SQLite at edge)
Storage           : Cloudflare R2
Cache/Session     : Cloudflare KV
Auth              : EmDash passkey + magic link
Plugin            : @ahliweb/awcms-sikesra (native EmDash plugin)
```

### 6.2 Diagram Arsitektur

```
Admin Browser
    │
    ▼
EmDash Admin UI (/_emdash/admin/*)
    │   ├── Plugin Admin Pages (SIKESRA)
    │   └── Plugin Widgets
    │
    ▼
AWCMS-Micro Plugin Runtime
    │
    ├── Plugin Routes  (/_emdash/api/plugins/awcms-sikesra/*)
    │       ├── /overview         (summary dashboard)
    │       ├── /registry         (CRUD entitas)
    │       ├── /registry/:id/verify  (verifikasi)
    │       ├── /documents        (dokumen pendukung)
    │       ├── /audit            (audit log)
    │       ├── /access/*         (RBAC catalog)
    │       ├── /abac/*           (ABAC catalog)
    │       └── /public/status    (public-safe aggregate)
    │
    ├── Plugin Storage (D1 — namespace sikesra_*)
    │       ├── sikesra_registry_entities
    │       ├── sikesra_supporting_documents
    │       ├── sikesra_verification_events
    │       ├── sikesra_audit_events
    │       ├── sikesra_permission_catalog
    │       ├── sikesra_role_catalog
    │       ├── sikesra_role_permission_assignments
    │       ├── sikesra_user_role_assignments
    │       ├── sikesra_abac_attribute_catalog
    │       ├── sikesra_abac_policy_rules
    │       ├── sikesra_abac_subject_assignments
    │       └── sikesra_abac_resource_assignments
    │
    └── Plugin Hooks
            ├── install / activate / deactivate / uninstall
            ├── content:afterCreate / afterUpdate
            ├── cron (audit retention, backfill)
            └── page:metadata
```

### 6.3 Prinsip Arsitektur

- Plugin-owned: semua data di namespace plugin, tidak menyentuh core EmDash tables
- Route-explicit: setiap endpoint dideklarasikan di `runtime.ts`
- Audit-first: setiap mutasi menulis audit event
- ABAC-aware: setiap query difilter berdasarkan `verifierRegionScope` dan `verifierOrgScope`

---

## 7. DESAIN BASIS DATA

### 7.1 Tabel Utama

**`sikesra_registry_entities`**
```sql
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
created_at TEXT NOT NULL DEFAULT (datetime('now')),
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```
**Indexes**: `code`, `entity_type`, `verification_stage`, `village_code`, `district_code`, `regency_code`, `(entity_type, sensitivity)`

**`sikesra_verification_events`**
```sql
id TEXT PRIMARY KEY,
registry_entity_id TEXT NOT NULL REFERENCES sikesra_registry_entities(id),
stage TEXT NOT NULL,
actor TEXT NOT NULL,
input_level TEXT,
verifier_level TEXT,
verifier_region_scope TEXT,
verifier_org_scope TEXT,
result TEXT NOT NULL,
notes TEXT,
created_at TEXT NOT NULL DEFAULT (datetime('now'))
```
**Indexes**: `registry_entity_id`, `actor`, `created_at`

**`sikesra_supporting_documents`**
```sql
id TEXT PRIMARY KEY,
registry_entity_id TEXT NOT NULL REFERENCES sikesra_registry_entities(id),
document_type TEXT NOT NULL,
title TEXT NOT NULL,
sensitivity TEXT NOT NULL DEFAULT 'internal',
issued_at TEXT,
verified_by TEXT,
r2_key TEXT,
created_at TEXT NOT NULL DEFAULT (datetime('now'))
```

### 7.2 Tabel Akses (RBAC)

- `sikesra_permission_catalog`: slug, label, description
- `sikesra_role_catalog`: slug, label, description
- `sikesra_role_permission_assignments`: role_slug, permission_slug
- `sikesra_user_role_assignments`: user_id, role_slug, region_scope

### 7.3 Tabel ABAC

- `sikesra_abac_attribute_catalog`: id, key, label, value_type
- `sikesra_abac_policy_rules`: id, label, effect, actions, required_subject, required_resource, required_context
- `sikesra_abac_subject_assignments`: id, subject_id, attributes (JSON)
- `sikesra_abac_resource_assignments`: id, resource_id, attributes (JSON)

---

## 8. ALUR KERJA MODUL

### 8.1 Alur Input Data

1. Petugas desa login → buka halaman Registri
2. Pilih tipe entitas → isi form wizard (step: info dasar → wilayah → detail → dokumen)
3. Simpan sebagai `draft`
4. Submit ke verifikasi desa (`submitted_village`)

### 8.2 Alur Verifikasi

1. Kades/Lurah menerima notifikasi (badge di navigation)
2. Buka queue verifikasi → filter per wilayah, tipe, stage
3. Review data + dokumen → approve / request revision / reject
4. Sistem catat verification event + update stage
5. Lanjut ke level berikutnya secara otomatis

### 8.3 Alur ABAC

1. Admin konfigurasi attribute catalog (user.level, user.district_code, resource.village_code, dll)
2. Admin buat policy rules (effect=allow/deny, actions, required_subject, required_resource)
3. Pada setiap request: ABAC engine evaluasi subject → resource → context → allow/deny
4. Hasil evaluasi dicatat di audit jika result=deny

---

## 9. KEBUTUHAN UI/UX

### 9.1 Prinsip Desain

- **Kumo Design System**: wajib, tidak boleh custom component yang sudah ada di Kumo
- **RTL-safe**: semua layout pakai logical Tailwind (ms-*, me-*, ps-*, pe-*)
- **Lingui i18n**: semua string user-facing harus via `t\`...\`` atau `<Trans>`
- **Dark mode**: otomatis via Kumo CSS tokens, tidak boleh `dark:` prefix manual
- **Accessibility**: semua kontrol harus punya aria-label yang dilokalisasi

### 9.2 Halaman Admin (Admin Pages)

| Halaman | Path | Deskripsi |
|---------|------|-----------|
| Overview / Dashboard | `/overview` | Summary counters, modul cards, recent events |
| Registri | `/registry` | Daftar entitas + wizard input |
| Verifikasi | `/verification` | Queue verifikasi berdasarkan level user |
| Dokumen | `/documents` | List dokumen pendukung + upload |
| Laporan | `/reports` | Statistik aggregate per kategori/wilayah |
| Audit | `/audit` | Timeline audit events |
| Pengaturan | `/settings` | Konfigurasi plugin (mode, retention, dll) |
| Akses & Peran | `/access/*` | RBAC: permission catalog, role catalog, assignments |
| ABAC | `/abac/*` | Attribute catalog, policy rules, preview |

### 9.3 Komponen Shared

- `PageHeader`: gradient accent, eyebrow badge, action slot
- `Card`: header dengan ikon opsional
- `MetricCard`: nilai besar + ikon + hint
- `EntityTypePill`: badge warna per tipe entitas (🕌 rumah ibadah, 🏛️ lembaga, dll)
- `VerificationStepper`: wizard vertikal untuk alur verifikasi
- `TimelineList`: audit events dengan ikon per kind
- `RegionSelector`: hierarki provinsi → kabupaten → kecamatan → desa
- `SensitivityBadge`: visual level sensitivity

---

## 10. KEBUTUHAN API DAN INTEGRASI

### 10.1 API Route Groups

**Public (tanpa auth)**
- `GET /public/status` — aggregate count per kategori (suppressed, aman)

**Plugin Admin (butuh auth + permission)**
- `GET /overview` — summary + counters + recent events
- `GET /registry` — list entitas (filter + paginasi cursor)
- `POST /registry` — buat entitas baru
- `GET /registry/:id` — detail entitas
- `PUT /registry/:id` — update entitas
- `POST /registry/:id/verify` — submit verifikasi (approve/needs_review/reject)
- `GET /documents` — list dokumen
- `POST /documents` — upload dokumen
- `GET /audit` — list audit events (filter)
- `GET /access/permissions` — permission catalog
- `GET /access/roles` — role catalog
- `POST /access/roles` — buat role
- `GET /abac/attributes` — attribute catalog
- `GET /abac/policies` — policy rules
- `POST /abac/preview` — evaluasi ABAC tanpa enforce

### 10.2 Response Envelope

```typescript
// Success list
{ data: { items: T[], nextCursor?: string }, meta: { requestId, timestamp } }

// Success single
{ data: T, meta: { requestId, timestamp } }

// Error
{ error: { code: string, message: string }, meta: { requestId, timestamp } }
```

### 10.3 CSRF & Auth

- Semua state-changing routes (POST/PUT/DELETE) wajib header `X-EmDash-Request: 1`
- Auth via EmDash session middleware
- Permission check via `requirePerm()` dari `#api/authorize.js`
- ABAC check via plugin ABAC engine

---

## 11. KEBUTUHAN KEAMANAN

### 11.1 RBAC Permissions

```
awcms:sikesra:dashboard:read
awcms:sikesra:settings:read
awcms:sikesra:settings:update
awcms:sikesra:audit:read
awcms:sikesra:permissions:read / write
awcms:sikesra:roles:read / write
awcms:sikesra:access-preview:read
awcms:sikesra:abac-attributes:read / write
awcms:sikesra:abac-policies:read / write
awcms:sikesra:abac-preview:read
awcms:sikesra:registry:read / write / verify
awcms:sikesra:documents:read / write
awcms:sikesra:verification:read / verify
```

### 11.2 ABAC Constraints

- Dimensi utama: `user.level`, `user.district_code`, `user.village_code`
- `desa_kelurahan`: hanya akses `village_code` sendiri
- `kecamatan`: akses semua desa di `district_code` sendiri
- `sopd`: akses semua kecamatan sesuai scope SOPD
- `kabupaten`: akses semua data
- Policy: effect=allow/deny, actions=["read","write","verify"], required_subject + resource

### 11.3 Sensitivity Levels

- `public_safe`: aman dipublikasi (aggregate)
- `internal`: hanya petugas login
- `restricted`: hanya verifikator level kecamatan ke atas
- `highly_restricted`: hanya admin_sikesra / kabupaten

### 11.4 Audit Requirements

- Setiap mutasi CRUD: `kind=registry.created/updated/deleted`
- Setiap verifikasi: `kind=verification.approved/rejected/needs_review`
- Setiap perubahan RBAC: `kind=access.role_assigned/permission_granted`
- Setiap perubahan ABAC: `kind=abac.policy_created/updated`
- Audit retention: 90 hari (configurable)

---

## 12. KEBUTUHAN OPERASIONAL

### 12.1 Deployment

- Cloudflare Workers via Wrangler
- D1 database: `sikesra` (ID: `e2902bf9-1648-4a46-8971-e4acadfa09ec`)
- R2 bucket: `sikesra`
- KV namespace: `sikesra-session` (ID: `29e3fd9bbf2f448fa3b36185b8be299a`)

### 12.2 Backup

- D1 backup script: `pnpm d1:backup:sikesra`
- Backup ke file lokal + checksum
- Restore dari SQL dump

### 12.3 Monitoring

- Cloudflare Workers analytics (request count, errors, latency)
- Audit log sebagai trail operasional
- Cron hook untuk retention cleanup

---

## 13. STANDAR DOKUMENTASI TEKNIS

- Setiap fitur baru harus punya changeset di `.awcms-changesets/`
- Semua keputusan teknis dicatat di `docs/decision-records.md`
- Breaking changes: bump versi + changeset + catatan di CHANGELOG.md
- Plugin docs di `awcmsmicro-dev/packages/plugins/awcms-sikesra/docs/`

---

## 14. FASE IMPLEMENTASI (Historis — Lihat Catatan)

> **Catatan v1.1**: Rencana sprint di bawah ditulis dengan asumsi awal "MVP belum dikerjakan". Audit kode Juni 2026 menemukan seluruh item Sprint 0-4 di bawah **sudah ada implementasinya** di kode (39 route, 16 halaman admin) — dipertahankan di sini sebagai catatan historis ruang lingkup fungsional, bukan rencana kerja aktif. Rencana kerja aktif sekarang adalah backlog hardening di `02.IMPLEMENTATION_BACKLOG.md` (EPIC-H1/H2/H3), karena gap nyata adalah otorisasi server-side dan konsistensi tipe, bukan fitur yang belum dibuat.

### Sprint 0 — Foundation (sudah ada di kode)

- Plugin scaffold + storage collections
- Navigation wiring
- Basic admin shell

### Sprint 1 — UI/UX Foundation (sudah ada di kode)

- Shared component kit (Kumo-based)
- App shell + sidebar
- Design tokens
- i18n scaffold (en + id)

### Sprint 2 — Registry Core (sudah ada di kode, dokumen metadata-only)

- CRUD entitas registry (`registry/save`, `registry/list`)
- Form wizard (tipe → wilayah → detail)
- Filter + paginasi
- Dokumen pendukung (metadata only — **tidak ada upload file nyata ke R2**, lihat `16.RISK_REGISTER_AND_MITIGATION_PLAN.md` RT-04)

### Sprint 3 — Verifikasi Workflow (sudah ada di kode, otorisasi belum nyata)

- Verification queue (`verification/list`)
- Approve / needs_review / reject flow (`verification/advance`, `verification/reject`)
- Level verifier dicek, tapi sumber identitasnya **bisa dipalsukan klien** — lihat `10.SECURITY_AND_PRIVACY_CHECKLIST.md` § 0

### Sprint 4 — Keamanan & Dashboard (UI dan model data ada, enforcement belum)

- ABAC engine (logika evaluasi ada — `evaluateAbacDecision()` — tapi tidak menggerbang mutasi nyata)
- RBAC catalog UI (`access/permissions`, `access/roles`, `access/matrix`)
- ABAC preview (simulasi read-only)
- Dashboard publik aggregate (`public/status` — **ini satu-satunya kontrol privasi yang sudah berfungsi nyata**)
- Audit log UI + retention

---

## 15. PRIORITAS PENGEMBANGAN (MoSCoW)

### Must Have (MVP)
- Plugin foundation + D1 schema migration
- CRUD registry entities (8 tipe)
- Multi-level verification workflow (5 stage)
- RBAC permission check
- Audit logging (semua mutasi)
- Admin UI shell + halaman registry + verifikasi
- Public status endpoint (aggregate)

### Should Have (Sprint 3–4)
- ABAC policy engine
- RegionSelector dengan hierarki lengkap
- Dokumen pendukung dengan R2
- Dashboard reporting dengan chart

### Could Have (Post-MVP)
- Notifikasi (email/push) saat stage berubah
- Export data (CSV/Excel)
- PDF laporan per kecamatan
- Bulk import via spreadsheet

### Won't Have (v1.0)
- Mobile app native
- Integrasi real-time DTKS / SATUDATA
- Penggajian / tunjangan (plugin terpisah)

---

## 16. KRITERIA PENERIMAAN

| ID | Kriteria | Cara Verifikasi |
|----|----------|-----------------|
| AC-01 | Plugin load tanpa error di project EmDash | `pnpm dev` + admin panel accessible |
| AC-02 | CRUD registry entities berfungsi | Buat, edit, hapus entitas; konfirmasi di D1 |
| AC-03 | Verification workflow 5 stage lengkap | Ikuti alur draft → active_verified |
| AC-04 | ABAC filtering: desa hanya lihat desanya | Login desa X → tidak bisa lihat desa Y |
| AC-05 | Audit log tercatat tiap mutasi | Buat entitas → cek audit table |
| AC-06 | Public endpoint tidak bocor data sensitif | GET /public/status → hanya aggregate |
| AC-07 | UI RTL-safe (Bahasa Arab layout) | Switch locale → cek visual |
| AC-08 | Semua string dilokalisasi | EMDASH_PSEUDO_LOCALE=1 → tidak ada hardcoded |
| AC-09 | TypeCheck bersih | `pnpm typecheck` → 0 error |
| AC-10 | Tests passing | `pnpm test` → semua pass |

---

## 17. RISIKO DAN MITIGASI

| ID | Risiko | Dampak | Mitigasi |
|----|--------|--------|----------|
| R01 | ABAC complexity overhead | Lambat per request | Cache attribute lookup di KV |
| R02 | D1 query limit (Workers) | Gagal pada load tinggi | Batch query, request cache |
| R03 | Region tree stale (data wilayah) | Data tidak akurat | KV cache `custom:data-types`, configurable |
| R04 | Plugin drift dari upstream EmDash | Build error setelah sync | Protected paths + CI typecheck |
| R05 | Data sensitif bocor di public endpoint | Privacy violation | Sensitivity level filter + aggregate suppression |

---

## 18. GLOSARIUM

| Term | Definisi |
|------|----------|
| SIKESRA | Sistem Informasi Kesejahteraan Sosial dan Keagamaan |
| AWCMS-Micro | Upstream CMS framework berbasis EmDash + Cloudflare |
| EmDash | CMS engine (Astro-native, plugin-based) |
| D1 | Cloudflare's edge SQLite database |
| ABAC | Attribute-Based Access Control |
| RBAC | Role-Based Access Control |
| Verifikasi multi-level | Validasi bertahap: desa → kecamatan → SOPD → kabupaten |
| Registry Entity | Entitas sosial-keagamaan yang didaftarkan |
| Sensitivity Level | Klasifikasi akses data: public_safe → internal → restricted → highly_restricted |
| Stage | Tahap verifikasi entitas dalam alur verifikasi |
| SOPD | Satuan Organisasi Perangkat Daerah |
| input_level | Level pemerintahan yang menginput data entitas |
| verifier_level | Level pemerintahan yang memverifikasi |
