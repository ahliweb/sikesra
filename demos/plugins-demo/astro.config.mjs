import { sikesraPlugin } from "@ahliweb/plugin-sikesra";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { apiTestPlugin } from "@emdash-cms/plugin-api-test";
import { auditLogPlugin } from "@emdash-cms/plugin-audit-log";
import { embedsPlugin } from "@emdash-cms/plugin-embeds";
import { webhookNotifierPlugin } from "@emdash-cms/plugin-webhook-notifier";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

function isPluginEnabled(pluginId) {
	const raw = process.env.AWCMS_ENABLED_PLUGINS ?? "";
	const enabled = raw
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (enabled.length === 0) return true;
	return enabled.includes(pluginId);
}

const plugins = [
	isPluginEnabled("sikesra") ? sikesraPlugin() : null,
	isPluginEnabled("audit-log") ? auditLogPlugin() : null,
	isPluginEnabled("webhook-notifier") ? webhookNotifierPlugin() : null,
	isPluginEnabled("embeds") ? embedsPlugin() : null,
	isPluginEnabled("api-test") ? apiTestPlugin() : null,
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
