# SIKESRA Plugin Shell

This package restores the minimal SIKESRA plugin boundaries on top of EmDash without patching EmDash core.

Included in this shell:

- Plugin descriptor and sandbox entrypoint
- AWCMS governance manifest at `module.manifest.json`
- Admin mount under `/_emdash/admin/plugins/sikesra/*`
- Plugin API mount under `/_emdash/api/plugins/sikesra/*`
- Public-safe route group under `/_emdash/api/plugins/sikesra/public/*`
- Versioned rebuild placeholder under `/_emdash/api/plugins/sikesra/v1/*`
- Package-local security overlay utilities for permissions, ABAC, masking, route guards, and audit helpers
- Plugin-owned SQL migration artifacts in `migrations/`
- Repeatable baseline seeds in `seeds/`

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

## Schema Artifacts

The preserved D1 schema in `update-backup/d1/` has been split into plugin-owned migration artifacts matching the canonical order from `docs/sikesra/03_data_model.md`:

- `migrations/0001_sikesra_settings_and_master.sql`
- `migrations/0002_sikesra_regions.sql`
- `migrations/0003_sikesra_entities_core.sql`
- `migrations/0004_sikesra_detail_modules.sql`
- `migrations/0005_sikesra_relationships_and_attributes.sql`
- `migrations/0006_sikesra_abac.sql`
- `migrations/0007_sikesra_verification.sql`
- `migrations/0008_sikesra_documents.sql`
- `migrations/0009_sikesra_imports.sql`
- `migrations/0010_sikesra_deduplication.sql`
- `migrations/0011_sikesra_benefits_exports_audit.sql`
- `migrations/0012_sikesra_public_summary.sql`

Baseline repeatable seeds live in `seeds/` for settings, object types, and object subtypes.
