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

```text
@ahliweb/awcms-sikesra (native EmDash plugin)
│
├── src/index.ts      Plugin descriptor + createPlugin()
├── src/runtime.ts    Storage, routes, hooks, manifest
├── src/admin.tsx     Admin UI (React + Kumo + Lingui)
├── src/navigation.ts Navigation models + emdash adapter
├── src/permissions.ts AWCMS_SIKESRA_PERMISSIONS
├── src/audit.ts      createAuditRecord() helper
├── src/fixtures.ts   Reference fixtures + TypeScript types
└── src/sandbox.ts    Sandboxed server entry
```

**API prefix**: `/_emdash/api/plugins/awcms-sikesra/`  
**D1 prefix**: `sikesra_*`  
**KV prefix**: `sikesra:*`  
**R2 prefix**: `sikesra/`  

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

Issues MVP tersedia di <https://github.com/ahliweb/sikesra/issues>:

- **#376** — Context Capsule (pinned) — baca ini sebelum mulai
- **#377** — [EPIC-01-001] Plugin scaffold + D1 migrations (Sprint 0)
- **#378** — [EPIC-01-002] Navigation manifest + admin shell (Sprint 0)
- **#379** — [EPIC-01-003] Health check endpoint (Sprint 0)
- **#380** — [EPIC-00-UX-01] App shell + sidebar (Sprint 1)
- **#381** — [EPIC-00-UX-02] Shared component kit (Sprint 1)
- **#382** — [EPIC-07-001] Settings API + UI (Sprint 1)
- **#383** — [EPIC-02-001] Registry CRUD API (Sprint 2)
- **#384** — [EPIC-02-002] Registry list UI + form wizard (Sprint 2)
- **#385** — [EPIC-03-001] Verification queue + verify action API (Sprint 3)
- **#386** — [EPIC-03-002] Verification UI (Sprint 3)
- **#387** — [EPIC-04-001] Documents upload + download (Sprint 2)
- **#388** — [EPIC-05-001] ABAC engine + preview (Sprint 4)
- **#389** — [EPIC-06-001] Audit log UI + public status (Sprint 4)
- **#390** — [EPIC-06-002] Reports dashboard (Sprint 4)

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
| Plugin Architecture | `docs/prd/03.PLUGIN_ARCHITECTURE.md` |
| Database Schema | `docs/prd/04.DATABASE_SCHEMA.md` |
| API Contract | `docs/prd/05.API_CONTRACT.md` |
| Sprint Plan | `docs/prd/09.SPRINT_EXECUTION_PLAN.md` |
| Issue Index | `docs/prd/25.AI_READY_ISSUE_PLAYBOOK.md` |
| Repository SOP | `docs/prd/07.REPOSITORY_EXECUTION_SOP.md` |

---

## Related Repositories

- [ahliweb/awcms-micro](https://github.com/ahliweb/awcms-micro) — AWCMS-Micro upstream
- [ahliweb/sikesra](https://github.com/ahliweb/sikesra) — This repository

## License

MIT (root) + package-specific licenses. See `LICENSE` and individual `package.json` files.
