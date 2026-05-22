import { isPluginEnabledForValidation, sikesraPlugin } from "@ahliweb/awcms-micro-sikesra";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { apiTestPlugin } from "@emdash-cms/plugin-api-test";
import { auditLogPlugin } from "@emdash-cms/plugin-audit-log";
import { embedsPlugin } from "@emdash-cms/plugin-embeds";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

const plugins = [
	isPluginEnabledForValidation("sikesra", process.env.AWCMS_ENABLED_PLUGINS) ? sikesraPlugin() : null,
	isPluginEnabledForValidation("audit-log", process.env.AWCMS_ENABLED_PLUGINS) ? auditLogPlugin() : null,
	isPluginEnabledForValidation("webhook-notifier", process.env.AWCMS_ENABLED_PLUGINS) ? webhookNotifierPlugin() : null,
	isPluginEnabledForValidation("embeds", process.env.AWCMS_ENABLED_PLUGINS) ? embedsPlugin() : null,
	isPluginEnabledForValidation("api-test", process.env.AWCMS_ENABLED_PLUGINS) ? apiTestPlugin() : null,
].filter(Boolean);

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	integrations: [
		react(),
			emdash({
				database: d1({ binding: "DB", session: "auto" }),
				storage: r2({ binding: "MEDIA" }),
				plugins,
			}),
		],
});
