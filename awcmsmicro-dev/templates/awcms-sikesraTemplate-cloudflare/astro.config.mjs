import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { awcmsSikesraPlugin } from "@ahliweb/awcms-sikesra";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

const siteUrl = process.env.AWCMS_SIKESRA_SITE_URL ?? "https://sikesra.ahlikoding.com";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	prefetch: {
		prefetchAll: false,
		defaultStrategy: "hover",
	},
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	i18n: {
		defaultLocale: "en",
		locales: ["en", "id"],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto" }),
			storage: r2({ binding: "MEDIA" }),
			plugins: [
				awcmsSikesraPlugin({ tenantId: "t-local-dev" }),
			],
			sandboxed: [],
			sandboxRunner: sandbox(),
			siteUrl,
		}),
	],
	devToolbar: { enabled: false },
});
