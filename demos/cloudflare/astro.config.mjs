// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { isPluginEnabledForValidation, sikesraPlugin } from "@ahliweb/plugin-sikesra";
import {
	d1,
	r2,
	sandbox,
	cloudflareCache,
	cloudflareImages,
	cloudflareStream,
} from "@emdash-cms/cloudflare";
import { formsPlugin } from "@emdash-cms/plugin-forms";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig, fontProviders } from "astro/config";
import emdash from "emdash/astro";

const plugins = [
	isPluginEnabledForValidation("sikesra", process.env.AWCMS_ENABLED_PLUGINS) ? sikesraPlugin() : null,
	isPluginEnabledForValidation("forms", process.env.AWCMS_ENABLED_PLUGINS) ? formsPlugin() : null,
].filter(Boolean);
const sandboxedPlugins = [
	isPluginEnabledForValidation("webhook-notifier", process.env.AWCMS_ENABLED_PLUGINS) ? webhookNotifierPlugin() : null,
].filter(Boolean);

export default defineConfig({
	output: "server",
	adapter: cloudflare({
		imageService: "cloudflare",
	}),
	i18n: {
		defaultLocale: "en",
		locales: ["en", "fr", "es"],
		fallback: {
			fr: "en",
			es: "en",
		},
	},
	image: {
		// Enable responsive images globally
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
			emdash({
			// D1 database - binding name must match wrangler.jsonc
			// session: "auto" enables read replicas (nearest replica for anon,
			// bookmark-based consistency for authenticated users)
			database: d1({ binding: "DB", session: "auto" }),
			// R2 storage for media
			storage: r2({ binding: "MEDIA" }),
			// Media providers - Cloudflare Images and Stream
			// Reads from env vars at runtime: CF_ACCOUNT_ID, CF_IMAGES_TOKEN, CF_STREAM_TOKEN
			// Or customize with accountIdEnvVar/apiTokenEnvVar options
			mediaProviders: [
				cloudflareImages({
					accountIdEnvVar: "CF_MEDIA_ACCOUNT_ID",
					apiTokenEnvVar: "CF_MEDIA_API_TOKEN",
					accountHash: "5LGXGUnHU18h6ehN_xjpXQ",
				}),
				cloudflareStream({
					accountIdEnvVar: "CF_MEDIA_ACCOUNT_ID",
					apiTokenEnvVar: "CF_MEDIA_API_TOKEN",
				}),
			],
			// Trusted plugins (run in host worker)
				plugins,
				// Sandboxed plugins (run in isolated workers)
				sandboxed: sandboxedPlugins,
			// Sandbox runner for Cloudflare
			sandboxRunner: sandbox(),
			// Plugin marketplace
			marketplace: "https://marketplace.emdashcms.com",
		}),
	],
	experimental: {
		cache: {
			provider: cloudflareCache(),
		},
		routeRules: {
			"/": {
				maxAge: 3_600,
				swr: 864_000,
			},
			"/[...slug]": {
				maxAge: 3_600,
				swr: 864_000,
			},
		},
	},
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [400, 500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
