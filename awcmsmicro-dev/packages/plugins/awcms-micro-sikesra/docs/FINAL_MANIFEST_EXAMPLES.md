# Final Manifest Examples

These examples show what a completed `emdash-plugin.jsonc` can look like once placeholder values have been replaced.

## Internal Monorepo Release

Use this when the plugin is published from a subdirectory inside a larger internal repository.

```jsonc
{
	"$schema": "https://emdashcms.com/schemas/emdash-plugin.schema.json",
	"slug": "awcms-micro-sikesra",
	"version": "0.3.0",
	"license": "LicenseRef-AW-NC-1.0",
	"publisher": "did:plc:yourinternalpublisherdid",
	"author": { "name": "Platform Team" },
	"name": "AWCMS-Micro Example Plugin",
	"description": "Internal EmDash-compatible plugin used as the reference implementation for AWCMS-Micro packaging and registry metadata.",
	"keywords": ["awcms-micro", "emdash", "plugin", "internal"],
	"repo": {
		"url": "https://github.com/your-org/your-monorepo",
		"directory": "packages/plugins/awcms-micro-sikesra",
	},
	"security": {
		"url": "https://github.com/your-org/your-monorepo/security",
	},
	"capabilities": [],
	"allowedHosts": [],
	"storage": {
		"audit": {
			"indexes": ["timestamp", "action", ["resource", "timestamp"]],
		},
	},
	"admin": {
		"pages": [{ "path": "/overview", "label": "Overview", "icon": "stack" }],
	},
}
```

## Standalone Repository Release

Use this when the plugin has been moved into its own repository and published independently.

```jsonc
{
	"$schema": "https://emdashcms.com/schemas/emdash-plugin.schema.json",
	"slug": "awcms-micro-sikesra",
	"version": "1.0.0",
	"license": "LicenseRef-AW-NC-1.0",
	"publisher": "plugins.example.com",
	"author": { "name": "AWCMS Platform Team" },
	"name": "AWCMS-Micro Example Plugin",
	"description": "Standalone EmDash-compatible plugin distributed internally as the AWCMS-Micro reference example.",
	"keywords": ["awcms-micro", "emdash", "plugin", "tenant-ready"],
	"repo": {
		"url": "https://github.com/your-org/awcms-micro-sikesra-plugin",
		"directory": ".",
	},
	"security": {
		"url": "https://security.example.com/products/awcms-micro-sikesra-plugin",
	},
	"capabilities": [],
	"allowedHosts": [],
	"storage": {
		"audit": {
			"indexes": ["timestamp", "action", ["resource", "timestamp"]],
		},
	},
	"admin": {
		"pages": [{ "path": "/overview", "label": "Overview", "icon": "stack" }],
	},
}
```

## How To Use These Examples

- Copy the scenario that matches your release model.
- Paste it over `emdash-plugin.jsonc`.
- Re-run the steps in `docs/INTERNAL_PUBLISH_CHECKLIST.md`.
- Update `package.json` metadata to match the same repository model.
