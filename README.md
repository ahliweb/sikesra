# AWCMS SIKESRA

**SIKESRA** (Sistem Informasi Kesejahteraan Sosial dan Keagamaan) adalah plugin registry sosial-keagamaan berbasis [AWCMS-Micro](https://github.com/ahliweb/awcms-micro) untuk Kabupaten Kotawaringin Barat.

Plugin: `@ahliweb/awcms-sikesra` | Platform: Cloudflare Workers / D1 / R2 / KV

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Dev server (template cloudflare)
cd awcmsmicro-dev
pnpm --filter awcms-sikesraTemplate dev
# → http://localhost:4321

# Auth bypass untuk dev testing
curl "http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin"

# Build plugin
pnpm --filter @ahliweb/awcms-sikesra build

# Run tests
pnpm --filter @ahliweb/awcms-sikesra test

# Typecheck
pnpm --filter @ahliweb/awcms-sikesra typecheck

# Sync dari upstream
pnpm sync:upstream
```

---

## What is SIKESRA?

SIKESRA mendata dan mengelola 8 tipe entitas sosial-keagamaan di Kab. Kotawaringin Barat:

| Tipe | Label |
| ---- | ----- |
| `rumah_ibadah` | 🕌 Masjid, Gereja, Pura, Vihara, Klenteng |
| `lembaga_keagamaan` | 🏛️ Ormas, Majelis Agama |
| `pendidikan_keagamaan` | 📚 Pesantren, Madrasah, Sekolah Minggu |
| `lks` | 🤝 Lembaga Kesejahteraan Sosial |
| `guru_agama` | 👨‍🏫 Guru Agama Non-ASN |
| `anak_yatim` | 🧒 Anak Yatim/Yatim Piatu |
| `disabilitas` | ♿ Penyandang Disabilitas |
| `lansia_terlantar` | 👴 Lansia Terlantar |

**Alur verifikasi**:

```text
Draft → Desa → Kecamatan → SOPD → Kabupaten → Aktif
```

---

## Repository Structure

```text
sikesra/
├── awcmsmicro-dev/                    # Downstream implementation workspace
│   ├── packages/plugins/
│   │   └── awcms-sikesra/             # Plugin SIKESRA (protected)
│   ├── templates/
│   │   ├── awcms-sikesraTemplate/     # Default template (protected)
│   │   └── awcms-sikesraTemplate-cloudflare/  # Cloudflare template (protected)
│   └── demos/
│       └── cloudflare/                # Demo boundary
├── emdash-latest/                     # EmDash baseline (reference only)
├── docs/
│   ├── prd/                           # Product requirement docs (SIKESRA)
│   └── *.md                           # Governance docs
├── skills/                            # AI execution skills
│   ├── sikesra-plugin-execution/      # Plugin scaffold + hooks
│   ├── sikesra-data-d1/               # D1 migrations + storage
│   ├── sikesra-api-rbac/              # API routes + RBAC/ABAC
│   └── sikesra-ui-admin/              # Admin UI + Kumo + i18n
├── scripts/                           # Sync and validation scripts
└── update-backup/                     # Sync backups
```

---

## Plugin Architecture

> **Plugin ID nyata**: `awcms-sikesra` (bukan `awcms-micro-sikesra`). Storage memakai `PluginStorageConfig` collections (`ctx.storage.<collectionName>`), bukan tabel SQL. Lihat `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8 untuk daftar lengkap penyimpangan yang ditemukan lewat audit kode Juni 2026.

```text
@ahliweb/awcms-sikesra (native EmDash plugin, ID: awcms-sikesra)
│
├── src/index.ts       Plugin descriptor + createPlugin()
├── src/runtime.ts     Sumber kebenaran: storage collections, 39 route, hooks, manifest
├── src/admin.tsx      Admin UI (React + Kumo + Lingui), 16 halaman + 3 widget
├── src/admin-copy.ts  String/copy lokal en+id, dipakai admin.tsx
├── src/navigation.ts  Navigation models + emdash adapter
├── src/permissions.ts Hanya dipakai test, TIDAK dipakai runtime.ts
├── src/audit.ts       Dead code — jangan diimpor
├── src/fixtures.ts    Reference fixtures + TypeScript types
└── src/sandbox.ts     Sandboxed server entry
```

**API prefix**: `/_emdash/api/plugins/awcms-sikesra/`
**Storage**: collections (lihat `docs/prd/04.DATABASE_SCHEMA.md`), bukan tabel SQL
**KV keys**: `custom:regions`, `custom:data-types` (override tanpa validasi shape)

---

## Skills for AI Agents

Load skill sesuai tipe pekerjaan:

| Pekerjaan | Skill File |
| --------- | ---------- |
| Plugin scaffold / hooks | `skills/sikesra-plugin-execution/SKILL.md` |
| D1 migrations / storage | `skills/sikesra-data-d1/SKILL.md` |
| API routes / RBAC / ABAC | `skills/sikesra-api-rbac/SKILL.md` |
| Admin UI / Kumo / i18n | `skills/sikesra-ui-admin/SKILL.md` |
| Plugin EmDash upstream | `awcmsmicro-dev/skills/creating-plugins/SKILL.md` |

Baca `docs/prd/01.AI_IMPLEMENTATION_PROMPT.md` untuk hard rules dan invariants.

---

## GitHub Issues

> Audit kode Juni 2026 menemukan bahwa fitur registry/verifikasi/dokumen/ABAC/akses/audit **sudah terimplementasi** (39 route, 16 halaman admin) — backlog "MVP dari nol" sebelumnya (#377-390) sudah ditutup. Backlog aktif sekarang adalah **hardening** (otorisasi server-side yang belum ada, konsistensi tipe internal, test coverage), lihat `docs/prd/02.IMPLEMENTATION_BACKLOG.md`.

Issues hardening tersedia di <https://github.com/ahliweb/sikesra/issues>:

- **#376** — Context Capsule (pinned, sudah diperbarui) — baca ini sebelum mulai
- **#391-394** — EPIC-H1: Otorisasi Server-Side Nyata (identitas, permission check, ABAC gate, validasi shape)
- **#395-398, #404** — EPIC-H2: Konsistensi Tipe dan Nama Internal (termasuk H2-05: bersihkan artefak Generasi 1/2)
- **#399-402** — EPIC-H3: Test Coverage untuk Fitur yang Sudah Ada

---

## Upstream Sync Workflow

```text
awcms-micro ──sync──▶ awcmsmicro-dev/
   (upstream)        (SIKESRA custom)
```

```bash
# Preview sync (safe)
pnpm sync:dry-run

# Sync dengan backup (recommended)
pnpm sync:upstream

# Validasi protected paths
pnpm validate:boundaries
```

---

## Protected Paths

Path berikut **tidak pernah ditimpa** saat sync upstream:

| Path | Tujuan |
| ---- | ------ |
| `awcmsmicro-dev/packages/plugins/awcms-sikesra/` | Plugin SIKESRA |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate/` | Template default |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/` | Template Cloudflare |
| `docs/` | Governance + PRD docs |
| `skills/` | AI execution skills |
| `scripts/` | Sync scripts |

---

## Repository History — Tiga Generasi Penamaan SIKESRA

Riwayat git repo ini menyimpan tiga generasi arsitektur/penamaan SIKESRA yang berbeda — penting dipahami agar tidak salah membaca dokumen/path lama sebagai instruksi yang masih berlaku. Detail lengkap di `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8a.

| Generasi | Penamaan | Status |
| --- | --- | --- |
| 1 (awal) | `packages/plugins/sikesra/` + `infra/sikesra/`, tabel SQL `awcms_sikesra_*` | Ditinggalkan 22 Mei 2026 saat restrukturisasi repo; riwayatnya bukan ancestor HEAD saat ini |
| 2 (rencana) | `awcms-micro-sikesra` untuk plugin/template/demo | Tidak pernah selesai dieksekusi; dokumen terkait sudah diberi notice ARCHIVED |
| 3 (nyata, aktif) | `awcms-sikesra` | Satu-satunya yang dipakai `.github/workflows/deploy-sikesra.yml` dan `wrangler.jsonc` produksi |

Sisa artefak Generasi 1/2 yang masih ada di repo (dengan penanganannya):

- `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` — duplikat plugin lama, tidak direferensikan apa pun, menunggu keputusan hapus (issue #404 / backlog H2-05)
- `scripts/archive/` — 5 script Generasi 1 yang diarsipkan dengan README penjelasan (jangan dijalankan)
- `awcmsmicro-dev/docs/awcms-micro/sikesra/*` — dokumen Generasi 2, sudah diberi notice ARCHIVED, menunjuk ke `docs/prd/` sebagai acuan

---

## Cloudflare Configuration

| Service | Name | ID |
| ------- | ---- | -- |
| D1 Database | `sikesra` | `e2902bf9-1648-4a46-8971-e4acadfa09ec` |
| R2 Bucket | `sikesra` | — |
| KV Namespace | `sikesra-session` | `29e3fd9bbf2f448fa3b36185b8be299a` |

```bash
# D1 backup
pnpm d1:backup:sikesra

# Deploy
cd awcmsmicro-dev && wrangler deploy
```

---

## Documentation

| Dokumen | Path |
| ------- | ---- |
| PRD Utama | `docs/prd/PRODUCT_REQUIREMENT_DOCUMENT.md` |
| AI Implementation Guide | `docs/prd/01.AI_IMPLEMENTATION_PROMPT.md` |
| Backlog Hardening (EPIC-H1/H2/H3) | `docs/prd/02.IMPLEMENTATION_BACKLOG.md` |
| Plugin Architecture (+ §8 penyimpangan kode) | `docs/prd/03.PLUGIN_ARCHITECTURE.md` |
| Storage Collections | `docs/prd/04.DATABASE_SCHEMA.md` |
| API Contract (39 route nyata) | `docs/prd/05.API_CONTRACT.md` |
| Security Checklist (§0 temuan kritis) | `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` |
| Sprint Plan | `docs/prd/09.SPRINT_EXECUTION_PLAN.md` |
| Master Document Index | `docs/prd/20.MASTER_DOCUMENT_INDEX.md` |
| Issue Index | `docs/prd/25.AI_READY_ISSUE_PLAYBOOK.md` |
| Repository SOP | `docs/prd/07.REPOSITORY_EXECUTION_SOP.md` |

---

## Rekomendasi Proses Berikutnya (Hardening, Bukan Fitur Baru)

Lihat `docs/prd/02.IMPLEMENTATION_BACKLOG.md` untuk rincian lengkap. Ringkasan urutan kerja:

1. **EPIC-H1 (#391-394) — prioritas tertinggi.** Tutup gap otorisasi server-side sebelum data warga sungguhan (kategori sensitif: anak yatim, disabilitas, lansia terlantar) masuk ke sistem ini. Kerjakan H1-01 (identitas terverifikasi) lebih dulu — item H1 lain bergantung padanya.
2. **EPIC-H2 (#395-398, #404) dan EPIC-H3 (#399-402) — bisa paralel dengan H1.** Tidak bergantung pada hardening otorisasi; cocok dikerjakan kontributor lain secara bersamaan.
3. **Setelah H1/H2/H3 selesai** — baru pertimbangkan fitur baru dari `docs/prd/13.FUTURE_ROADMAP_AND_PHASE2_BACKLOG.md` (integrasi data wilayah resmi, notifikasi, ekspor laporan).

**Pertimbangan kemudahan pengembangan/pemeliharaan ke depan**:

- Jangan menambah collection/route baru sebelum H1 selesai — setiap penambahan baru di atas fondasi tanpa otorisasi memperbesar permukaan masalah.
- Setelah H2-01 (rekonsiliasi level verifikasi) selesai, refactor lanjutan ke kode verifikasi jadi lebih aman dilakukan AI agent junior karena tidak ada lagi dua union type yang membingungkan.
- Keputusan soal `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` (hapus/pertahankan, lihat issue #404) sebaiknya diselesaikan lebih dulu sebelum integrasi besar berikutnya, agar tidak ada kebingungan dua plugin saat onboarding kontributor baru.

---

## Related Repositories

- [ahliweb/awcms-micro](https://github.com/ahliweb/awcms-micro) — AWCMS-Micro upstream
- [ahliweb/sikesra](https://github.com/ahliweb/sikesra) — This repository

## License

MIT (root) + package-specific licenses. See `LICENSE` and individual `package.json` files.
