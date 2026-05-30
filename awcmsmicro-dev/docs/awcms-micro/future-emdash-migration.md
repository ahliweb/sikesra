# Future EmDash Migration Guide

This document describes how to migrate AWCMS-Micro plugins and templates when upstream EmDash eventually implements native support for grouped/nested sidebar navigation.

## Future-Proof Design

The AWCMS-Micro compatibility layer is built to be **fully forward-compatible** and easily removable once official support lands.

- **Emdash Adapter**: The function `adaptToEmdashPages` flattens manifests to `emdash.pages` when the compatibility layer is active. When native support is introduced, this adapter will be deleted, allowing the manifest to feed directly to EmDash's layout registry.
- **Feature Flags**: Two environment variables manage the active compatibility layer:
  - `AWCMS_USE_EMDASH_ADMIN_NAV`: Set to `true` to switch to native EmDash admin navigation behavior.
  - `AWCMS_ENABLE_PLUGIN_SIDEBAR_PLACEMENT`: Controls if the custom navigation items appear in the sidebar.

## Disabling the Custom UI Layer

To deprecate the compatibility rendering layer:

1. **Enable the Native Flag**:
   In your workspace environment config or `.env` files, change:

   ```bash
   AWCMS_USE_EMDASH_ADMIN_NAV=true
   ```

   This tells the custom components to render nothing (or transparently pass-through) and switches core routing/sidebar registers to trust native EmDash handlers.

2. **Remove Adapter Flatteners**:
   In each plugin's `admin.tsx` file, replace:
   ```ts
   // OLD (compatibility mode)
   export const AWCMS_EXAMPLE_ADMIN_PAGES = adaptToEmdashPages(AWCMS_EXAMPLE_MANIFEST);
   ```
   With a direct export matching EmDash's future manifest-based page registration pattern.

## Rollback Steps

If native EmDash navigation causes regressions or layout breaks:

1. Revert environment flags back to compatibility defaults:
   ```bash
   AWCMS_USE_EMDASH_ADMIN_NAV=false
   ```
2. Re-apply the flattening adapter `adaptToEmdashPages` in plugin registrations.
3. Validate sidebar grouping and locale lookups in the admin dashboard.
