import type { MenuItem } from "emdash";
import { describe, expect, it } from "vitest";

import { resolvePublicNavigationItems } from "../../src/components/public-navigation";

describe("resolvePublicNavigationItems", () => {
	it("loads nested submenu menus recursively", async () => {
		const calls: string[] = [];
		const submenuItems: Record<string, MenuItem[] | undefined> = {
			"primary-products": [
				{
					id: "products-software",
					label: "Software",
					url: "/products/software",
					target: undefined,
					titleAttr: undefined,
					cssClasses: undefined,
					children: [],
				},
			],
			"primary-products-software": [
				{
					id: "products-saas",
					label: "SaaS",
					url: "/products/software/saas",
					target: undefined,
					titleAttr: undefined,
					cssClasses: undefined,
					children: [],
				},
			],
			"primary-about-team": [
				{
					id: "about-team-leadership",
					label: "Leadership",
					url: "/about/team/leadership",
					target: undefined,
					titleAttr: undefined,
					cssClasses: undefined,
					children: [],
				},
			],
		};

		const loader = async (menuName: string) => {
			calls.push(menuName);
			return submenuItems[menuName];
		};

		const items: MenuItem[] = [
			{
				id: "products",
				label: "Products",
				url: "/products",
				target: undefined,
				titleAttr: undefined,
				cssClasses: undefined,
				children: [],
			},
			{
				id: "about",
				label: "About",
				url: "/about",
				target: undefined,
				titleAttr: undefined,
				cssClasses: undefined,
				children: [
					{
						id: "about-team",
						label: "Team",
						url: "/about/team",
						target: undefined,
						titleAttr: undefined,
						cssClasses: undefined,
						children: [],
					},
				],
			},
		];

		const resolved = await resolvePublicNavigationItems(items, "primary", "en", loader);

		expect(calls).toEqual(
			expect.arrayContaining([
				"primary-products",
				"primary-products-software",
				"primary-about-team",
				"primary-products-software-saas",
				"primary-about-team-leadership",
			]),
		);
		expect(resolved[0]?.children[0]?.label).toBe("Software");
		expect(resolved[0]?.children[0]?.children[0]?.label).toBe("SaaS");
		expect(resolved[1]?.children[0]?.children[0]?.label).toBe("Leadership");
	});
});
