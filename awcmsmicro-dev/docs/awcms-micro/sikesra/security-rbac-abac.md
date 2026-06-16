# Security RBAC ABAC (ARCHIVED — see `README.md` in this directory)

> Superseded by `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md`. References `packages/plugins/sikesra/src/security/*.ts`, files that don't exist in the current plugin — kept only as historical record. The real plugin has **no dedicated security module at all** today; see `docs/prd/10.SECURITY_AND_PRIVACY_CHECKLIST.md` §0 for the actual (critical) state of authorization.

## RBAC

The permission namespace is `awcms:sikesra:<resource>:<action>`.

## ABAC

ABAC decisions must consider:

- subject scope
- region scope
- module scope
- verification level
- sensitivity level
- route class and request context

## Source Of Truth

- `packages/plugins/sikesra/src/security/permissions.ts`
- `packages/plugins/sikesra/src/security/abac.ts`
- `packages/plugins/sikesra/src/security/masking.ts`
- `packages/plugins/sikesra/src/security/audit.ts`

Detailed policy intent remains in `docs/sikesra/06_security_rbac_abac.md`.
