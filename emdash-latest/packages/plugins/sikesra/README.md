# SIKESRA Plugin Compatibility Shim

This package preserves backward compatibility for older imports that still reference `@ahliweb/plugin-sikesra`.

Included in this shim:

- Legacy descriptor compatibility with `@ahliweb/plugin-sikesra/sandbox`
- Re-export of the canonical implementation from `@ahliweb/awcms-micro-sikesra`
- Stable admin, API, and public SIKESRA route surfaces for existing import sites

The canonical implementation now lives in `packages/plugins/awcms-micro-sikesra/`.

## Preferred Registration

```ts
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { sikesraPlugin } from "@ahliweb/awcms-micro-sikesra";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [sikesraPlugin()],
		}),
	],
});
```

Older import sites may continue to use `@ahliweb/plugin-sikesra` during migration, but new work should target the canonical package.
