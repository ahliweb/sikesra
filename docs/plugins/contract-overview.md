# Plugin Governance Contract Overview

## EmDash Core Vs Mini Overlay

### EmDash Core

EmDash owns the plugin host model and runtime extension surface.

### Mini Overlay

Mini adds governance-aware contract helpers so plugins can participate in the same permission, authorization, audit, and region-scoping model as first-party governance features.

## Contract Pieces

Mini currently provides:

- EmDash plugin definitions created with `definePlugin(...)`
- first-party plugin descriptors that register `id`, `entrypoint`, `options`, `adminEntry`, `adminPages`, and `adminWidgets` with the host
- plugin permission registration helper
- plugin route authorization helper
- plugin service authorization helper
- plugin audit helper
- plugin region-awareness helper

## Current Terminology

- A plugin definition is the runtime object returned from `definePlugin(...)`.
- A plugin descriptor is the build-time registration object Mini exposes for EmDash to discover and load a plugin entrypoint.
- Plugin routes are the handler entries declared inside the plugin definition.
- First-party admin experience currently ships through the `awcms-users-admin` plugin rather than a separate admin shell.

## Design Goal

Plugins should consume shared governance services instead of bypassing them with ad hoc route logic or direct database policy assumptions.

## Sample Adoption

The internal governance sample plugin demonstrates the contract end to end:

- runtime definition and registration descriptor
- permission manifest
- protected route declaration
- service-level authorization
- scoped resource resolution
- plugin-tagged audit entry

The `awcms-users-admin` plugin demonstrates the same model for first-party governance and admin routes.

## Cross-References

- `docs/admin/operations-guide.md`
- `docs/plugins/permission-registration.md`
- `src/plugins/awcms-users-admin/index.mjs`
- `src/plugins/internal-governance-sample/index.mjs`
