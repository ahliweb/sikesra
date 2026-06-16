# Root Documentation

This directory contains the root maintenance documentation for the parent-workspace layout used by this repository.

It follows the same governance split used by `awcms-micro`:

- root `docs/` explains repository structure, synchronization, boundaries, and operator workflow
- `docs/prd/` contains the full Product Requirement Document suite for SIKESRA
- `emdash-latest/` remains the checked-in EmDash reference tree; no separate `emdash/` checkout is required
- `awcmsmicro-dev/` remains the active downstream implementation tree

## SIKESRA PRD Documents

Product and implementation docs for the SIKESRA plugin live in `docs/prd/`:

- `docs/prd/PRODUCT_REQUIREMENT_DOCUMENT.md` — PRD utama (gambaran bisnis + semua kebutuhan)
- `docs/prd/01.AI_IMPLEMENTATION_PROMPT.md` — Hard rules + invariants + code patterns untuk AI agent
- `docs/prd/02.IMPLEMENTATION_BACKLOG.md` — Semua item backlog per EPIC
- `docs/prd/03.PLUGIN_ARCHITECTURE.md` — Arsitektur plugin + manifest + storage
- `docs/prd/04.DATABASE_SCHEMA.md` — Full DDL + seed data + enum values
- `docs/prd/05.API_CONTRACT.md` — Semua endpoint + request/response shape
- `docs/prd/07.REPOSITORY_EXECUTION_SOP.md` — SOP kerja di repo ini
- `docs/prd/08.GITHUB_ISSUE_TEMPLATES.md` — Template GitHub issue
- `docs/prd/09.SPRINT_EXECUTION_PLAN.md` — Sprint planning + exit criteria
- `docs/prd/20.MASTER_DOCUMENT_INDEX.md` — Index + panduan navigasi dokumen
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
