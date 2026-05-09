# Contributing

This repository uses documentation-first, security-first implementation for SIKESRA.

## Before You Start

Read `AGENTS.md` and the relevant files in `docs/sikesra/` before making changes.

Feature implementation must not begin until Phase 0 discovery is complete and `docs/sikesra/IMPLEMENTATION_DECISIONS.md` exists.

## Development Rules

1. Keep changes small and reviewable.
2. Do not modify EmDash core unless explicitly approved in the implementation decision log.
3. Keep SIKESRA behavior isolated in the SIKESRA plugin/module boundary.
4. Enforce tenant, site, soft delete, RBAC, ABAC, region scope, masking, and audit server-side.
5. Add tests when a test convention exists; otherwise document manual checks.
6. Update documentation when implementation behavior diverges from the plan.

## Branches and Commits

Use one branch per issue or tightly related work group.

Recommended branch examples:

```txt
docs/implementation-decisions
feat/sikesra-plugin-shell
feat/sikesra-settings-migration
fix/sikesra-region-scope
test/sikesra-masking
```

Recommended commit examples:

```txt
docs: add implementation decision log
feat: scaffold sikesra plugin shell
feat: add sikesra settings migration
fix: enforce region scope on entity list
test: add sikesra masking coverage
```

## Pull Request Checklist

Before requesting review, confirm:

1. Relevant documentation was read.
2. Changed files match the ticket scope.
3. No secrets, local databases, private uploads, or personal data are committed.
4. No unrelated EmDash core changes were made.
5. Tests or manual checks are listed.
6. Security and privacy rules are preserved.
7. Documentation is updated if behavior changed.

## Security Review Required

Request security-focused review for changes that touch:

1. Authentication or session context.
2. Permission registration or route guards.
3. ABAC evaluator or policies.
4. Masking or serializers.
5. D1 migrations containing sensitive fields.
6. R2 upload, preview, download, or key generation.
7. Import staging, duplicate override, or promotion.
8. Export, audit, or public aggregation.
