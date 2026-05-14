# SIKESRA Plugin Shell

This package restores the minimal SIKESRA plugin boundaries on top of EmDash without patching EmDash core.

Included in this shell:

- Plugin descriptor and sandbox entrypoint
- Admin mount under `/_emdash/admin/plugins/sikesra/*`
- Plugin API mount under `/_emdash/api/plugins/sikesra/*`
- Public-safe route group under `/_emdash/api/plugins/sikesra/public/*`
- Versioned rebuild placeholder under `/_emdash/api/plugins/sikesra/v1/*`

This package does not automatically create the site route at `/sikesra`. The host Astro app owns public pages, so mount that path in the app and call the plugin's public endpoints from there.

## Registration

```ts
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { sikesraPlugin } from "@ahliweb/plugin-sikesra";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [sikesraPlugin()],
		}),
	],
});
```

## Host Page

Create `src/pages/sikesra.astro` in the host app and fetch from:

- `/_emdash/api/plugins/sikesra/public/metadata`
- `/_emdash/api/plugins/sikesra/public/filters`
- `/_emdash/api/plugins/sikesra/public/summary`

That keeps the public page repo-local while the plugin keeps the data and admin boundaries isolated.
