# Roles And Permissions

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash supplies the host admin and extension model.

### Mini Overlay

Mini defines the role and permission governance model itself.

Mini owns:

- the explicit role catalog
- the explicit permission catalog
- role-to-permission mapping
- protected-role semantics
- staff-level metadata
- user role assignment history

## Role Model

Roles are explicit catalog entries with:

- unique slug
- display name
- `staff_level`
- `is_assignable`
- `is_protected`
- system/non-system metadata

Protected roles are operationally significant because:

- peer or higher protected targets are denied by default
- role changes affecting protected users require more care
- mandatory 2FA rollout can now target protected roles first

## Permission Model

Permissions are explicit catalog entries rather than hidden grants.

Each permission carries:

- code
- domain
- resource
- action
- protected marker

## Admin Operations

The admin plugin currently provides:

- role list view
- permission matrix view with staged diff preview
- user-detail role assignment controls

## Cross-References

- `docs/governance/auth-and-authorization.md`
- `docs/security/operations.md`
- `docs/admin/operations-guide.md`
