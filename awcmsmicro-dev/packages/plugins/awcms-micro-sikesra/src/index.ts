import type { PluginDescriptor, ResolvedPlugin } from "emdash";
import { definePlugin } from "emdash";

import { version } from "../package.json";
export { SIKESRA_REFERENCE_FIXTURES } from "./fixtures.js";
import {
	AWCMS_SIKESRA_ADMIN_PAGES,
	AWCMS_SIKESRA_ADMIN_WIDGETS,
	AWCMS_SIKESRA_ALLOWED_HOSTS,
	AWCMS_SIKESRA_CAPABILITIES,
	AWCMS_SIKESRA_DESCRIPTOR_STORAGE,
	AWCMS_SIKESRA_FIELD_WIDGETS,
	AWCMS_SIKESRA_PLUGIN_ID,
	AWCMS_SIKESRA_PORTABLE_TEXT_BLOCKS,
	AWCMS_SIKESRA_SETTINGS_SCHEMA,
	AWCMS_SIKESRA_STORAGE,
	AWCMS_SIKESRA_MANIFEST,
	createNativeRoutes,
	createSharedHooks,
} from "./runtime.js";

export interface AwcmsMicroExamplePluginOptions {
	tenantId?: string;
	siteId?: string;
}

export function awcmsMicroExamplePlugin(
	options: AwcmsMicroExamplePluginOptions = {},
): PluginDescriptor<AwcmsMicroExamplePluginOptions> {
	return {
		id: AWCMS_SIKESRA_PLUGIN_ID,
		version,
		entrypoint: "@awcms-micro/plugin-sikesra",
		adminEntry: "@awcms-micro/plugin-sikesra/admin",
		options,
		format: "native",
		capabilities: [...AWCMS_SIKESRA_CAPABILITIES],
		allowedHosts: AWCMS_SIKESRA_ALLOWED_HOSTS,
		// @ts-expect-error EmDash PluginDescriptor currently doesn't support compound index arrays in its types but supports them at runtime
		storage: AWCMS_SIKESRA_DESCRIPTOR_STORAGE,
		adminPages: AWCMS_SIKESRA_ADMIN_PAGES,
		adminWidgets: AWCMS_SIKESRA_ADMIN_WIDGETS,
		i18n: AWCMS_SIKESRA_MANIFEST.i18n,
	};
}

export function createPlugin(_options: AwcmsMicroExamplePluginOptions = {}): ResolvedPlugin {
	return definePlugin({
		id: AWCMS_SIKESRA_PLUGIN_ID,
		version,
		capabilities: [...AWCMS_SIKESRA_CAPABILITIES],
		allowedHosts: AWCMS_SIKESRA_ALLOWED_HOSTS,
		storage: AWCMS_SIKESRA_STORAGE,
		admin: {
			entry: "@awcms-micro/plugin-sikesra/admin",
			settingsSchema: AWCMS_SIKESRA_SETTINGS_SCHEMA,
			pages: AWCMS_SIKESRA_ADMIN_PAGES,
			widgets: AWCMS_SIKESRA_ADMIN_WIDGETS,
			portableTextBlocks: AWCMS_SIKESRA_PORTABLE_TEXT_BLOCKS,
			fieldWidgets: AWCMS_SIKESRA_FIELD_WIDGETS,
			i18n: AWCMS_SIKESRA_MANIFEST.i18n,
		} as any,
		routes: createNativeRoutes(),
		hooks: createSharedHooks(),
	});
}

export default createPlugin;
