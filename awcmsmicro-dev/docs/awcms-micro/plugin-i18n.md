# Plugin i18n & Label Resolution

This document describes how bilingual (Indonesian/English) translation works for AWCMS-Micro plugin navigation and UI elements.

## Translation Keys & Fallbacks

Plugins define translation maps under the `i18n` property in their manifest. Each navigation group, item, or child refers to a `labelKey` and includes a `fallbackLabel` for environments where no matching key is translated.

### Manifest Configuration Example

```json
{
	"id": "awcms-micro-sikesra",
	"navigation": {
		"groups": [
			{
				"id": "settings",
				"labelKey": "awcms.nav.group.settings",
				"fallbackLabel": "Settings",
				"items": [
					{
						"id": "general",
						"labelKey": "awcms.nav.general",
						"fallbackLabel": "General Settings",
						"path": "/settings"
					}
				]
			}
		]
	},
	"i18n": {
		"defaultLocale": "en",
		"supportedLocales": ["en", "id"],
		"messages": {
			"en": {
				"awcms.nav.group.settings": "Settings",
				"awcms.nav.general": "General Settings"
			},
			"id": {
				"awcms.nav.group.settings": "Pengaturan",
				"awcms.nav.general": "Pengaturan Umum"
			}
		}
	}
}
```

## How Labels are Resolved (`resolveLabel`)

When rendering, AWCMS-Micro resolves keys in the following strict fallback order:

1. **Requested Locale**: Checks if the active user interface locale (e.g. `id`) has a message matching `labelKey`.
2. **Default Locale**: Checks the default locale (configured as `en`) for the `labelKey`.
3. **Fallback Label**: Returns the literal `fallbackLabel` string defined on the menu item.
4. **Label Key**: If everything else fails, the `labelKey` itself (e.g., `awcms.nav.general`) is displayed.

### Example Execution

```ts
import { resolveLabel } from "@awcms-micro/plugin-sikesra/navigation";

const messages = {
	en: { "nav.title": "English Title" },
	id: { "nav.title": "Judul Indonesia" },
};

// 1. Exact match for Indonesian
resolveLabel("nav.title", "Default Title", messages, "id");
// Returns: "Judul Indonesia"

// 2. Fallback to English (default) when French is requested
resolveLabel("nav.title", "Default Title", messages, "fr", "en");
// Returns: "English Title"

// 3. Fallback to literal label when key is missing entirely
resolveLabel("missing.key", "Default Title", messages, "fr", "en");
// Returns: "Default Title"
```

## Shared UI Components

UI components like `AwcmsPluginHeaderMenu` and `PluginLocalNav` automatically accept `locale` and `manifest.i18n` props and utilize `resolveLabel` internally to dynamically translate navigation menus on the fly.
