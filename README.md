# AWCMS-Micro SIKESRA

This repository is the implementation workspace for **SIKESRA** (`Sistem Informasi Kesejahteraan Rakyat`) as an **AWCMS-Micro** and **EmDash-compatible** module.

SIKESRA is planned as a governed public-service data module for welfare, religious, institutional, vulnerable-person, document, verification, import, reporting, audit, and public aggregate workflows.

## Repository Status

Current status: documentation and implementation planning.

The codebase is intentionally not scaffolded yet. The next engineering step is Phase 0 discovery: identify the real EmDash/AWCMS-Micro extension points, write the implementation decision log, then scaffold the smallest compatible SIKESRA plugin/module shell.

## Architecture Rule

EmDash upstream is the architectural authority. AWCMS-Micro is the governed implementation layer. SIKESRA business behavior must live in an isolated plugin/module boundary unless a missing extension point is discovered, documented, reviewed, and implemented through the smallest safe adapter.

Do not fork or rewrite EmDash core for SIKESRA business logic.

## Documentation Map

| Path | Purpose |
|---|---|
| `docs/core/` | 15-part AWCMS-Micro core documentation based on EmDash compatibility, governance, storage, plugins, ABAC, frontend, security, Cloudflare, upstream sync, and roadmap. |
| `docs/sikesra/` | Canonical SIKESRA product, architecture, data model, API, UI, security, SOP, backlog, sprint plan, validation, and handoff documentation. |
| `docs/sikesra/IMPLEMENTATION_PLAN.md` | Consolidated executable implementation plan for SIKESRA development. |

Start with these files:

1. `docs/sikesra/README.md`
2. `docs/sikesra/IMPLEMENTATION_PLAN.md`
3. `docs/sikesra/08_implementation_backlog.md`
4. `docs/sikesra/11_ai_implementation_handoff.md`
5. `docs/core/README.md`

## Required First Work

Before implementing features, complete:

1. `SIKESRA-001`: audit repository structure and extension points.
2. `SIKESRA-002`: create `docs/sikesra/IMPLEMENTATION_DECISIONS.md`.
3. Confirm plugin/module target path.
4. Confirm manifest, admin route, API route, public route, migration, seed, test, auth, permission, audit, ABAC, and R2/media conventions.
5. Document missing extension points and the smallest adapter proposal.

No feature ticket should use speculative paths after Phase 0.

## Target Route Boundaries

| Surface | Route | Rule |
|---|---|---|
| Public page | `/sikesra` | No login. Aggregate-safe data only. |
| Admin UI | `/_emdash/admin/plugins/sikesra/*` | Login and permission required. |
| Admin API | `/_emdash/api/plugins/sikesra/v1/*` | Login, RBAC, ABAC, region scope, masking, audit. |
| Public data | Astro loader or public-safe plugin endpoint | Must never expose admin/internal detail. |

## Non-Negotiable Security Rules

1. All admin APIs require authentication and base RBAC permission.
2. Object-level reads, writes, downloads, exports, and verification decisions require ABAC.
3. Tenant, site, deleted status, and backend-computed region scope must be enforced in repository queries.
4. Sensitive values must be masked server-side before serialization.
5. NIK/KIA hashes, raw R2 keys, and private document URLs must not be returned through normal APIs.
6. Public `/sikesra` output must be aggregate-only and use small-cell suppression.
7. Excel import must use staging before promotion.
8. High-risk actions must require reason where configured and write audit events.

## Target Data Rules

SIKESRA MVP uses Cloudflare D1-compatible SQL and R2-compatible file storage.

Custom physical tables must use the `awcms_sikesra_` prefix. Business tables must include tenant/site columns, timestamps, soft delete, and actor columns unless an exception is documented in the implementation decision log.

The main SIKESRA identifier format is:

```txt
[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]
```

## MVP Critical Path

```txt
Discovery -> plugin foundation -> database -> security -> public/admin dashboards -> regions/registry -> wizard -> ID -> verification -> documents -> import/dedup/promotion -> reports/audit/settings -> hardening -> release candidate
```

## Development Workflow

Use small, reviewable branches and PRs. One issue should produce one clear outcome. One branch should solve one issue or one tightly related group of issues.

Every implementation ticket should include:

1. Exact files to create or edit after repository discovery.
2. Relevant documentation sections to read first.
3. Security and privacy rules that must not be violated.
4. Tests or manual checks required before completion.
5. Confirmation that no unrelated EmDash core change was made.

## Validation

Use `docs/sikesra/10_validation_checklist.md` before implementation starts, before each phase merge, and before MVP release.

MVP is not ready until P0 security, privacy, cross-region, masking, import, document, verification, export, audit, and backup/restore checks pass.

## License

See `LICENSE`.
