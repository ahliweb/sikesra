# Auth And Authorization

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash provides the host auth boundary, session shell, and admin integration points.

### Mini Overlay

Mini adds governance-specific identity and policy behavior:

- explicit user lifecycle states
- RBAC permission catalog and role mapping
- ABAC refinement rules
- step-up authentication for high-risk admin actions
- audit-only rollout flags for selected ABAC deny paths

## Authentication Flows

Mini currently supports:

- password login
- active session issuance and revocation
- lockout handling for repeated failures
- password reset and forced password reset
- TOTP-based 2FA
- recovery codes
- step-up 2FA for privileged actions

## Authorization Model

Mini uses RBAC as the baseline and ABAC as the refinement layer.

### RBAC

RBAC answers: does the active role set grant the permission at all?

### ABAC

ABAC answers: even if the permission exists, should the action still be denied or constrained because of context?

Current ABAC inputs include:

- subject staff level
- target staff level
- protected-target status
- logical region scope
- administrative region scope
- ownership context
- session strength and step-up state where required by the route or action

## Rollout Safety

Mini includes authorization rollout flags that can convert selected ABAC denies into `ALLOW_ABAC_AUDIT_ONLY` results.

This is intended for controlled rollout and validation, not steady-state policy bypass.

## Operator Implications

- Missing RBAC permission should still deny normally.
- Protected-target and region-scope rules should deny normally unless an audit-only rollout flag is intentionally enabled.
- Step-up protected actions still require fresh two-factor verification.

## Current Permission Coverage

- Core governance and admin features use the canonical permission catalog seeded through the default permission and role-permission migrations.
- Plugin routes should declare and enforce normalized permission codes through the shared plugin authorization helpers.
- The current protected `/api/v1/*` session routes now use canonical edge permissions instead of relying on route-local auth checks alone.
- See `docs/governance/permission-matrix.md` for the maintained first-party inventory.

## Cross-References

- `src/services/authorization/service.mjs`
- `src/services/authorization/flags.mjs`
- `docs/governance/permission-matrix.md`
- `docs/security/operations.md`
- `docs/process/migration-deployment-checklist.md`
