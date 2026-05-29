import type { AwcmsModuleManifest } from "./module-manifest.schema.js";

export type NormalizeOptions = {
	hasPermission?: (permission: string) => boolean;
	preserveEmptyGroups?: boolean;
};

export type NormalizedNavItem = {
	id: string;
	labelKey: string;
	fallbackLabel: string;
	path: string;
	routerPath: string;
	icon?: string;
	sortOrder: number;
	permission?: string;
	children?: NormalizedNavItem[];
};

export type NormalizedNavGroup = {
	id: string;
	labelKey: string;
	fallbackLabel: string;
	icon?: string;
	sortOrder: number;
	sidebarPlacement: string;
	sidebarPriority: number;
	items: NormalizedNavItem[];
};

const MULTIPLE_SLASHES = /\/+/g;
const TRAILING_SLASH = /\/$/;

function normalizePath(pluginId: string, path: string): { path: string; routerPath: string } {
	if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
		throw new Error(`Unsafe path: external URLs are not allowed: ${path}`);
	}
	if (path.includes("..") || path.includes("./")) {
		throw new Error(`Unsafe path: path traversal is not allowed: ${path}`);
	}

	const cleanPath = ("/" + path).replace(MULTIPLE_SLASHES, "/").replace(TRAILING_SLASH, "");
	const expectedPrefix = `/plugins/${pluginId}`;
	let routerPath = "";
	if (cleanPath.startsWith(expectedPrefix)) {
		routerPath = cleanPath;
	} else if (cleanPath.startsWith("/plugins/")) {
		throw new Error(`Unsafe path: escaping plugin namespace not allowed: ${path}`);
	} else {
		routerPath = `/plugins/${pluginId}${cleanPath}`.replace(MULTIPLE_SLASHES, "/");
	}

	const fullPath = `/_emdash/admin${routerPath}`.replace(MULTIPLE_SLASHES, "/");
	return { path: fullPath, routerPath };
}

export function normalizeAdminNav(
	manifests: AwcmsModuleManifest[],
	options: NormalizeOptions = {}
): NormalizedNavGroup[] {
	const { hasPermission = () => true, preserveEmptyGroups = false } = options;

	const groupsMap = new Map<string, NormalizedNavGroup>();
	const seenIds = new Set<string>();

	for (const manifest of manifests) {
		const pluginId = manifest.id;

		if (manifest.navigation?.groups) {
			for (const group of manifest.navigation.groups) {
				if (seenIds.has(group.id)) {
					throw new Error(`Duplicate group ID detected: ${group.id}`);
				}
				seenIds.add(group.id);

				const normalizedItems: NormalizedNavItem[] = [];

				for (const item of group.items) {
					if (seenIds.has(item.id)) {
						throw new Error(`Duplicate item ID detected: ${item.id}`);
					}
					seenIds.add(item.id);

					if (item.permission && !hasPermission(item.permission)) {
						continue;
					}

					const { path: fullPath, routerPath } = normalizePath(pluginId, item.path);

					const normalizedChildren: NormalizedNavItem[] = [];
					if (item.children) {
						for (const child of item.children) {
							if (seenIds.has(child.id)) {
								throw new Error(`Duplicate child item ID detected: ${child.id}`);
							}
							seenIds.add(child.id);

							if (child.permission && !hasPermission(child.permission)) {
								continue;
							}

							const { path: childFullPath, routerPath: childRouterPath } = normalizePath(pluginId, child.path);

							normalizedChildren.push({
								id: child.id,
								labelKey: child.labelKey,
								fallbackLabel: child.fallbackLabel,
								path: childFullPath,
								routerPath: childRouterPath,
								icon: child.icon,
								sortOrder: child.sortOrder ?? 100,
								permission: child.permission,
							});
						}
						normalizedChildren.sort((a, b) => {
							if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
							return a.fallbackLabel.localeCompare(b.fallbackLabel);
						});
					}

					normalizedItems.push({
						id: item.id,
						labelKey: item.labelKey,
						fallbackLabel: item.fallbackLabel,
						path: fullPath,
						routerPath,
						icon: item.icon,
						sortOrder: item.sortOrder ?? 100,
						permission: item.permission,
						children: normalizedChildren.length > 0 ? normalizedChildren : undefined,
					});
				}

				normalizedItems.sort((a, b) => {
					if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
					return a.fallbackLabel.localeCompare(b.fallbackLabel);
				});

				if (normalizedItems.length === 0 && !preserveEmptyGroups) {
					continue;
				}

				groupsMap.set(group.id, {
					id: group.id,
					labelKey: group.labelKey,
					fallbackLabel: group.fallbackLabel,
					icon: group.icon,
					sortOrder: group.sortOrder ?? 100,
					sidebarPlacement: group.sidebarPlacement ?? "plugin-local-only",
					sidebarPriority: group.sidebarPriority ?? 1000,
					items: normalizedItems,
				});
			}
		}
	}

	const groupsList = [...groupsMap.values()];
	groupsList.sort((a, b) => {
		if (a.sidebarPriority !== b.sidebarPriority) return a.sidebarPriority - b.sidebarPriority;
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
		return a.fallbackLabel.localeCompare(b.fallbackLabel);
	});

	return groupsList;
}
