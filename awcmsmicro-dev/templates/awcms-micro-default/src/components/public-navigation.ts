import type { MenuItem } from "emdash";

const ITEM_SLUG_SANITIZE_REGEX = /[^a-z0-9]+/g;
const ITEM_SLUG_TRIM_REGEX = /(^-|-$)/g;

export type PublicMenuLoader = (
	menuName: string,
	locale: string,
) => Promise<MenuItem[] | undefined>;

function slugifyMenuItemLabel(label: string): string {
	return label
		.toLowerCase()
		.replace(ITEM_SLUG_SANITIZE_REGEX, "-")
		.replace(ITEM_SLUG_TRIM_REGEX, "");
}

async function resolveMenuItems(
	items: MenuItem[],
	menuName: string,
	locale: string,
	loadSubMenu: PublicMenuLoader,
): Promise<MenuItem[]> {
	return Promise.all(
		items.map(async (item) => {
			const itemSlug = slugifyMenuItemLabel(item.label);
			const nestedMenuName = itemSlug ? `${menuName}-${itemSlug}` : menuName;
			const directChildren = item.children.length
				? item.children
				: itemSlug
					? await loadSubMenu(nestedMenuName, locale)
					: undefined;
			const children = directChildren?.length
				? await resolveMenuItems(directChildren, nestedMenuName, locale, loadSubMenu)
				: [];

			return {
				...item,
				children,
			};
		}),
	);
}

export async function resolvePublicNavigationItems(
	items: MenuItem[],
	menuName: string,
	locale: string,
	loadSubMenu: PublicMenuLoader,
): Promise<MenuItem[]> {
	return resolveMenuItems(items, menuName, locale, loadSubMenu);
}
