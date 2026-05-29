# Plugin-Enabled Astro Config

This document shows the `astro.config.mjs` shape used by the plugin-enabled `awcms-micro-default` local template.

Use it when you need to recreate the same example-plugin setup in a standalone EmDash site.

## When To Use This

Use this variant after:

1. installing `@awcms-micro/plugin-sikesra` into the site, and
2. building or linking the plugin so the site can resolve it.

Also make sure the site still includes the standard EmDash boilerplate such as `src/live.config.ts`.

For package installation and linking options, see `../../../packages/plugins/awcms-micro-sikesra/docs/STANDALONE_CONSUMPTION.md` while working inside this parent workspace.

## Example `astro.config.mjs`

```javascript
import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

import { awcmsMicroExamplePlugin } from "@awcms-micro/plugin-sikesra";

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			siteUrl: "https://example.awcms-micro.local",
			plugins: [awcmsMicroExamplePlugin()],
		}),
	],
	devToolbar: { enabled: false },
});
```

## Notes

- The example plugin is an in-process plugin, so it belongs in `plugins: []`.
- Do not move it to `sandboxed: []`.
- Review `siteUrl`, SQLite location, and uploads path before production use.
- The current example plugin factory accepts optional options, but the checked-in implementation does not use them yet.
