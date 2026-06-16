# Root Documentation

This directory contains the root maintenance documentation for the parent-workspace layout used by this repository.

It follows the same governance split used by `awcms-micro`:

- root `docs/` explains repository structure, synchronization, boundaries, and operator workflow
- `docs/prd/` contains the full Product Requirement Document suite for SIKESRA
- `emdash-latest/` remains the checked-in EmDash reference tree; no separate `emdash/` checkout is required
- `awcmsmicro-dev/` remains the active downstream implementation tree

## SIKESRA PRD Documents

Product and implementation docs for the SIKESRA plugin live in `docs/prd/` — **1 PRD induk + 25 dokumen teknis pendukung**. Seluruh dokumen ditulis ulang/dikoreksi Juni 2026 setelah audit kode langsung menemukan bahwa fitur registry/verifikasi/dokumen/ABAC/akses/audit sudah terimplementasi (39 route, 16 halaman admin), plugin ID nyata adalah `awcms-sikesra` (bukan `awcms-micro-sikesra`), dan storage memakai `PluginStorageConfig` collections (bukan tabel SQL). Mulai dari `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8 untuk daftar lengkap penyimpangan yang ditemukan.

- `docs/prd/PRODUCT_REQUIREMENT_DOCUMENT.md` — PRD utama (gambaran bisnis + catatan status v1.1)
- `docs/prd/01.AI_IMPLEMENTATION_PROMPT.md` — Hard rules + invariants + HR-07 (gap otorisasi)
- `docs/prd/02.IMPLEMENTATION_BACKLOG.md` — Backlog hardening EPIC-H1/H2/H3 (bukan backlog dari nol)
- `docs/prd/03.PLUGIN_ARCHITECTURE.md` — Arsitektur plugin nyata + §8 daftar penyimpangan
- `docs/prd/04.DATABASE_SCHEMA.md` — Storage collections nyata + shape field
- `docs/prd/05.API_CONTRACT.md` — 39 route nyata + catatan otorisasi
- `docs/prd/06.UAT_AND_DEPLOYMENT_CHECKLIST.md` — Skenario UAT hardening + checklist deploy
- `docs/prd/07.REPOSITORY_EXECUTION_SOP.md` — SOP kerja di repo ini
- `docs/prd/08.GITHUB_ISSUE_TEMPLATES.md` — Template GitHub issue
- `docs/prd/09.SPRINT_EXECUTION_PLAN.md` — Rencana eksekusi EPIC-H1/H2/H3
- `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` — §0 temuan kritis (baca sebelum sentuh route mutasi)
- `docs/prd/11.USER_MANUAL_AND_SOP.md` s.d. `docs/prd/19.OPERATIONS_SUPPORT_AND_MAINTENANCE_PLAN.md` — dokumen governance/operasional pendukung (SOP pengguna, change control, roadmap, training, KPI, risk register, data governance, integration governance, ops)
- `docs/prd/21.ADDENDUM_MASTER_DATA_WILAYAH.md` s.d. `docs/prd/24.TECHNICAL_IMPLEMENTATION_REFERENCES.md` — addendum wilayah/tipe data/personil + mapping PRD ke kode
- `docs/prd/20.MASTER_DOCUMENT_INDEX.md` — Index lengkap + panduan navigasi dokumen
- `docs/prd/25.AI_READY_ISSUE_PLAYBOOK.md` — Playbook + coverage index GitHub issues

## Canonical Governance Documents

- `repository-assessment.md`
- `decision-records.md`
- `operator-workflow.md`
- `awcms-micro-versioning.md`
- `awcms-micro-licensing.md`

## Supporting Documents

- `awcmsmicro-dev-protected-paths.md`
- `divergence-log.md`
- `iso-alignment.md`

## Scope

These documents describe repository maintenance and downstream governance. Product-specific SIKESRA implementation details are in `docs/prd/` (product requirements) and `awcmsmicro-dev/packages/plugins/awcms-sikesra/docs/` (plugin technical docs).
