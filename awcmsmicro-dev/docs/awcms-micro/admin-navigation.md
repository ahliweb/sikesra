# AWCMS-Micro Admin Navigation

This document explains the custom, migration-safe admin navigation compatibility layer used in AWCMS-Micro.

## Why a Compatibility Layer?

EmDash currently supports a flat page-based admin navigation structure. AWCMS-Micro, however, requires a structured, grouped, and hierarchical navigation menu for plugins (e.g., grouping access control views under a "Governance" menu).

To support this without modifying EmDash's core package (which would block seamless upstream synchronization), AWCMS-Micro keeps the compatibility layer inside the example plugin boundary and exposes it through `@awcms-micro/plugin-sikesra/navigation`.

## Core Design Principles

1. **Zero Modifications to EmDash Core**: AWCMS-Micro must never edit core files in `packages/core` or `packages/admin`.
2. **Plugin-Owned Logic**: Navigation behavior lives in plugin-owned code and can be consumed by templates without introducing a new shared core layer.
3. **Declaration in Manifests**: Plugins declare their structured navigation inside `emdash-plugin.jsonc` or a module manifest schema.
4. **Dynamic Translation & Resolution**: Labels are translated using locale-fallback registries before rendering.
5. **Namespace Isolation**: Plugins are sandboxed to their own `/plugins/<plugin-id>` routes. Any attempt to cross namespaces or traverse paths is rejected.

## Defining Grouped Navigation in manifests

Each plugin defines its navigation in its manifest:

```json
{
	"id": "awcms-micro-sikesra",
	"name": "Example Plugin",
	"navigation": {
		"groups": [
			{
				"id": "governance",
				"labelKey": "awcms.nav.group.governance",
				"fallbackLabel": "Governance",
				"sidebarPlacement": "after-dashboard",
				"sidebarPriority": 10,
				"items": [
					{
						"id": "overview",
						"labelKey": "awcms.nav.overview",
						"fallbackLabel": "Overview",
						"path": "/overview",
						"sortOrder": 10
					},
					{
						"id": "access-control",
						"labelKey": "awcms.nav.access",
						"fallbackLabel": "Access Control",
						"path": "/access/permissions",
						"sortOrder": 20,
						"children": [
							{
								"id": "permissions",
								"labelKey": "awcms.nav.permissions",
								"fallbackLabel": "Permissions",
								"path": "/access/permissions",
								"sortOrder": 10
							}
						]
					}
				]
			}
		]
	}
}
```

## Navigation Normalizer (`normalizeAdminNav`)

The normalizer processes raw manifests and ensures they are safe and sorted:

- **Sorting**: Groups are sorted by `sidebarPriority` (lower priority values float to top). Items and children are sorted by `sortOrder`, falling back to label alphabetical order.
- **Permission Filtering**: Interactive items require permissions (e.g. `awcms:example:permissions:read`). If the logged-in user lacks this permission, the item is removed.
- **Duplicate ID Detection**: Detects and throws errors if duplicate Group, Item, or Child IDs are registered across plugins.
- **Path Guard**: Validates that all URLs are local and contained within `/plugins/<plugin-id>`. Any external URLs (e.g., starting with `https://` or `//`) or path traversal sequences (e.g. `..`) throw errors to prevent security vulnerabilities.
