import type { AwcmsModuleManifest } from "./module-manifest.schema.js";

export type EmdashAdminPage = {
	path: string;
	label: string;
	labelKey?: string;
	icon?: string;
};

export function getUseEmdashAdminNav(): boolean {
	if (typeof process !== "undefined" && process.env) {
		return process.env.AWCMS_USE_EMDASH_ADMIN_NAV === "true";
	}
	return false;
}

export function getEnablePluginSidebarPlacement(): boolean {
	if (typeof process !== "undefined" && process.env) {
		return process.env.AWCMS_ENABLE_PLUGIN_SIDEBAR_PLACEMENT !== "false";
	}
	return true;
}

export function adaptToEmdashPages(manifest: AwcmsModuleManifest): EmdashAdminPage[] {
	const pages: EmdashAdminPage[] = [];

	if (!manifest.navigation) {
		return pages;
	}

	const addItems = (
		items: Array<{
			path: string;
			labelKey?: string;
			fallbackLabel: string;
			icon?: string;
			children?: any[];
		}>,
	) => {
		for (const item of items) {
			if (item.children?.length) {
				addItems(item.children);
				continue;
			}

			pages.push({
				path: item.path,
				label: item.fallbackLabel,
				labelKey: item.labelKey,
				icon: item.icon,
			});
		}
	};

	if (manifest.navigation.groups) {
		for (const group of manifest.navigation.groups) {
			addItems(group.items);
		}
	}

	if (manifest.navigation.items) {
		addItems(manifest.navigation.items);
	}

	return pages;
}
