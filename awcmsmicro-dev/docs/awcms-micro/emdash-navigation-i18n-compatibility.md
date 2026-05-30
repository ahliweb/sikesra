# EmDash Navigation and i18n Capability Matrix for AWCMS-Micro

This document provides a matrix of navigation and internationalization (i18n) capabilities currently offered by the EmDash CMS core, identifies the current feature gaps, and details the AWCMS-Micro migration-safe compatibility strategy.

## 1. Capability Matrix

| Feature Area               | Supported in EmDash Core | Mechanism / API in EmDash                                                                        |
| :------------------------- | :----------------------- | :----------------------------------------------------------------------------------------------- |
| **Public Nested Menus**    | Yes                      | Nested `children` supported recursively via the `MenuItem` type and `getMenu()` API.             |
| **Public Content i18n**    | Yes                      | Handled using Astro's built-in i18n configuration and EmDash translation groups in the database. |
| **Plugin Admin Pages**     | Yes                      | Plugin admin page registration via standard plugin metadata `admin.pages` array.                 |
| **Grouped Admin Sidebar**  | No                       | Lacks support for grouped, nested, or collapsible plugin navigation in the admin sidebar.        |
| **Bilingual Admin Labels** | No                       | Plugin page labels are currently static strings without native multi-locale translation support. |

---

## 2. EmDash Core vs. AWCMS-Micro Strategy

### Public Nested Menus

- **Current Support**: EmDash public menus officially support hierarchical nodes (`MenuItem.children` array).
- **AWCMS-Micro Approach**: Public frontend templates (such as primary navigation headers) should directly query the official `getMenu()` API with the current Astro locale to render nested menus. No custom data storage or menu adapters are required for public pages.

### Public Content i18n

- **Current Support**: Content internationalization matches the Astro multi-language routing conventions. Translation groups link equivalent pages/posts across locales.
- **AWCMS-Micro Approach**: AWCMS-Micro templates use Astro's standard routing and dynamic locale detection, with custom language switchers that trace translation groups to switch cleanly between languages (e.g. Indonesian/English).

### Plugin Admin Navigation & Labeling

- **Core Limitation**: The standard EmDash plugin page registration accepts only a flat list of pages with a single static label string:
  ```json
  "admin": {
    "pages": [
      { "path": "/overview", "label": "Overview", "icon": "stack" }
    ]
  }
  ```
- **AWCMS-Micro Strategy**: To achieve grouped/nested menus and bilingual labels without modifying the EmDash codebase, AWCMS-Micro implements a decoupled adapter/compatibility layer:
  1. **Manifest-Driven Schema**: Plugins declare their hierarchical navigation hierarchy and translations in their manifest using `AwcmsModuleManifest`.
  2. **Normalizer & Resolvers**: A standard normalization library sorts groups/items, validates paths, applies permission filters, and resolves localized labels using a strict fallback chain: `requested locale -> default locale -> fallbackLabel -> labelKey`.
  3. **Compatibility Adapter**: An adapter flattens AWCMS nested navigation manifests down to the simple `admin.pages` structures expected by EmDash core.
  4. **Custom Header/Local Renderers**: The actual hierarchical rendering is handled by an AWCMS header component and plugin-local sidebars using the full, normalized AWCMS navigation tree, while leaving the default EmDash sidebar intact.

---

## 3. Migration and Rollback Plan

When a future version of EmDash introduces native support for grouped admin sidebars and translated plugin labels:

### Migration Steps

1. **Schema Mapping**: Update the AWCMS `emdash-adapter.ts` to map the custom grouping/placement metadata directly to the new official EmDash properties, rather than flattening them.
2. **Disable Custom Renderers**: Toggle the feature flags (`AWCMS_USE_EMDASH_ADMIN_NAV=true`, `AWCMS_ENABLE_PLUGIN_SIDEBAR_PLACEMENT=false`) to opt into the new native sidebar groups.
3. **Rollback Adapters**: Clean up the custom header dropdown rendering in the templates in favor of the official sidebar.

### Rollback Strategy

If a newer EmDash version breaks compatibility or has bugs in its experimental sidebar grouping:

1. Re-enable custom AWCMS-Micro rendering by setting `AWCMS_USE_EMDASH_ADMIN_NAV=false` and `AWCMS_ENABLE_PLUGIN_SIDEBAR_PLACEMENT=true`.
2. The adapters will immediately resume intercepting the manifest and injecting the fallback components, ensuring no admin pages or routes are broken.
