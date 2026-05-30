import type { PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

import { version } from "../package.json";

export const AWCMS_DOCS_PLUGIN_ID = "awcms-micro-docs";

export const AWCMS_DOCS_ADMIN_PAGES = [{ path: "/", label: "Docs", icon: "book" }];

export function awcmsMicroDocsPlugin(): PluginDescriptor {
	return {
		id: AWCMS_DOCS_PLUGIN_ID,
		version,
		entrypoint: "@awcms-micro/plugin-docs",
		adminEntry: "@awcms-micro/plugin-docs/admin",
		capabilities: [],
		allowedHosts: [],
		adminPages: AWCMS_DOCS_ADMIN_PAGES,
	};
}

export function createPlugin(): ResolvedPlugin {
	return definePlugin({
		id: AWCMS_DOCS_PLUGIN_ID,
		version,
		capabilities: [],
		allowedHosts: [],
		admin: {
			entry: "@awcms-micro/plugin-docs/admin",
			pages: AWCMS_DOCS_ADMIN_PAGES,
		},
	});
}

export { getDocsCopy } from "./content.js";
export type { DocsCopy, DocsLocale } from "./content.js";

export default createPlugin;
