import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { awcmsMicroDocsPlugin } from "@awcms-micro/plugin-docs";
import { awcmsMicroGalleryPlugin } from "@awcms-micro/plugin-gallery";
import { awcmsMicroExamplePlugin } from "@awcms-micro/plugin-sikesra";
import { d1, r2, sandbox } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

const siteUrl = process.env.AWCMS_MICRO_SITE_URL ?? "https://awcms-micro.ahlikoding.com";

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
				awcmsMicroDocsPlugin(),
				awcmsMicroExamplePlugin({ tenantId: "t-local-dev" }),
				awcmsMicroGalleryPlugin({
					maxImageBytes: 10485760,
					maxVideoBytes: 262144000,
					cloudflareImages: true,
					cloudflareStream: true,
				}),
			],
			sandboxed: [],
			sandboxRunner: sandbox(),
			siteUrl,
			admin: {
				logo: "/awcms-logo.png",
				favicon: "/awcms-logo.png",
				siteName: "AWCMS",
			},
		}),
	],
	devToolbar: { enabled: false },
});
