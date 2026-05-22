# Security RBAC ABAC

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
