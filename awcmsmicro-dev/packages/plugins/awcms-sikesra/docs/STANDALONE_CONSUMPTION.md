# Standalone Consumption

This guide shows how to consume `@ahliweb/awcms-sikesra` from a standalone EmDash project without modifying EmDash core.

## Supported Integration Model

This plugin is a native in-process plugin.

- Use it in `plugins: []` inside `emdash({...})`.
- Do not treat it as a sandboxed plugin.
- Import the named factory `awcmsSikesraPlugin()` from `@ahliweb/awcms-sikesra`.

## Option A: Local Workspace Package

Use this when your EmDash site and the plugin live in the same pnpm workspace.

### Example layout

```text
your-workspace/
  package.json
  pnpm-workspace.yaml
  apps/
    site/
  packages/
	awcms-sikesra/
```

### Add the plugin package

1. Copy this plugin folder into `packages/awcms-sikesra/`.
2. Run `pnpm install` from the workspace root.
3. Run `pnpm --filter @ahliweb/awcms-sikesra build`.

### Add the dependency to the site

In the site's `package.json`:

```json
{
	"dependencies": {
		"@ahliweb/awcms-sikesra": "workspace:*"
	}
}
```

## Option B: Separate Local Repository

Use this when the plugin lives in its own repository outside the site repository.

### Prepare the plugin repository

1. Run `pnpm install` in the plugin repository.
2. Run `pnpm build`.

### Add the dependency to the site

In the site's `package.json`, reference the built plugin by local path:

```json
{
	"dependencies": {
		"@ahliweb/awcms-sikesra": "file:../awcms-sikesra"
	}
}
```

Then run `pnpm install` in the site repository.

## Enable The Plugin In EmDash

In `astro.config.mjs`:

```javascript
import node from "@astrojs/node";
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";

import { awcmsSikesraPlugin } from "@ahliweb/awcms-sikesra";

export default defineConfig({
	output: "server",
	adapter: node({ mode: "standalone" }),
	integrations: [
		react(),
		emdash({
			database: sqlite({ url: "file:./data.db" }),
			storage: local({
				directory: "./uploads",
				baseUrl: "/_emdash/api/media/file",
			}),
			plugins: [awcmsSikesraPlugin()],
		}),
	],
});
```

Notes:

- The current example factory accepts optional options, but the checked-in example implementation does not use them yet.
- The plugin belongs in `plugins: []`, not `sandboxed: []`.

## Keep Standard EmDash Boilerplate

Your site still needs the normal `src/live.config.ts` file:

```typescript
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
	_emdash: defineLiveCollection({ loader: emdashLoader() }),
};
```

## Run The Site

From the site project:

1. Run `pnpm install` if you have not already.
2. Run `pnpm dev`.
3. Open the EmDash admin at `/_emdash/admin`.

The plugin declares an admin page at `/overview` and a route at `dashboard/summary`. Those surfaces are part of the plugin package and become available once the site loads the plugin successfully.

## Troubleshooting

- If the site cannot resolve `@ahliweb/awcms-sikesra`, re-check whether you used `workspace:*` or `file:` consistently with your repository layout.
- If the plugin package changed but the site still sees stale output, rebuild the plugin with `pnpm build` and reinstall if needed.
- If you copied the plugin into a pnpm workspace, run installs from the workspace root, not only inside the package folder.
- If you are adapting the plugin for real use, review `emdash-plugin.jsonc` and `docs/INTERNAL_PUBLISH_CHECKLIST.md` before distributing it further.
