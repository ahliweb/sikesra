# AWCMS-Micro Navigation Standard

This document records the upstream-safe navigation pattern for AWCMS-Micro.

## Rules

- Public nested navigation belongs in the template layer.
- Plugin nested navigation belongs inside the plugin page itself.
- EmDash admin sidebar stays native, flat, and unchanged.
- Navigation filtering is UX only; backend authorization still enforces access.

## Public Template

- Use EmDash `getMenu("primary")`.
- Render recursive submenu items.
- Keep active state, focus state, and mobile layout accessible.
- Keep local and Cloudflare templates behaviorally aligned.

### Auto-Generate Sub-Menu (Admin Convention)

Since the EmDash Admin core does not natively support drag-and-drop or explicit `parentId` assignments for creating nested menus in the UI, AWCMS-Micro provides an **automatic sub-menu linking convention** within the public templates (`PublicNavigation.astro`):

1. Create a parent menu in the Admin Dashboard (e.g., `primary`).
2. Add a menu item (e.g., "About").
3. To attach a sub-menu to "About", create a **new menu** in the Admin Dashboard using the naming convention: `[parentMenuName]-[itemSlug]`. For example: `primary-about`.
4. Any items added to this `primary-about` menu will automatically be fetched and rendered as a nested sub-menu dropdown under the "About" item in the public navigation.
5. This requires zero modifications to EmDash core and utilizes the standard `getMenu` API.

### Mobile Responsiveness & Usability

To ensure a solid user experience on smaller screens and touch devices, the templates follow these rules:

- **Responsive Header Layout**: The main navigation shell, utility links, search, and action buttons degrade from a horizontal flow to a stacked full-width column on mobile devices (`max-width: 48rem`). To prevent the sticky header from consuming excessive vertical screen space, all elements below the brand logo are hidden by default behind a collapsible "hamburger" menu toggle.
- **Always-Expanded Submenus**: On mobile view, nested submenus are natively expanded (`display: block`) as indented lists instead of relying on hover states. This prevents a classic mobile UX trap where tapping a parent link triggers navigation instead of opening the submenu.
- **Hover Bridges for Desktop**: Submenus triggered by hover on desktop include an invisible structural bridge (using negative `inset` on a `::before` pseudo-element). This prevents the submenu from prematurely collapsing when the cursor moves across the gap between the parent item and the dropdown.
- **Dark Mode Integrity**: EmDash UI components (like `LiveSearch`) that rely on custom CSS variables (e.g., `--emdash-search-bg`) must be explicitly mapped to the layout's global `:root` and `:root.dark` variables to ensure text remains visible and accessible during theme toggles.

## Plugin Example

- Use a plugin-owned header menu model.
- Filter menu items by permission or ABAC hints.
- Use tabs, cards, link groups, or breadcrumbs when dropdowns are not a good fit.
- Do not patch the EmDash sidebar for plugin navigation.

## Reference-Only SIKESRA Style

- Use SIKESRA-style labels only as example content.
- Keep public pages aggregate-safe.
- Keep sensitive or restricted data out of unauthorized navigation.

## Downstream Use

Downstream product repos such as `ahliweb/sikesra` can adopt the same layered pattern without carrying this repo's example data verbatim.
