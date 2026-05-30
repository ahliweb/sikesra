import { describe, expect, it } from "vitest";

import { buildNavItems } from "../../src/components/AdminCommandPalette";

describe("AdminCommandPalette navigation", () => {
	it("places plugin pages before built-in menus and sorts plugins alphabetically", () => {
		const items = buildNavItems(
			{
				collections: {
					articles: { label: "Articles", labelSingular: "Article" },
				},
				plugins: {
					"zeta-plugin": {
						enabled: true,
						adminMode: "blocks",
						adminPages: [{ path: "/settings", label: "Settings", icon: "gear" }],
					},
					"alpha-plugin": {
						enabled: true,
						adminMode: "blocks",
						adminPages: [{ path: "/overview", label: "Overview", icon: "chart" }],
					},
				},
				taxonomies: [],
			},
			50,
		);

		const ids = items.map((item) => item.id);
		expect(ids.slice(0, 3)).toEqual([
			"dashboard",
			"plugin-plugin-alpha-plugin-/plugins/alpha-plugin/overview",
			"plugin-plugin-zeta-plugin-/plugins/zeta-plugin/settings",
		]);
		expect(ids.indexOf("plugin-plugin-alpha-plugin-/plugins/alpha-plugin/overview")).toBeLessThan(
			ids.indexOf("collection-articles"),
		);
		expect(ids.indexOf("plugin-plugin-zeta-plugin-/plugins/zeta-plugin/settings")).toBeLessThan(
			ids.indexOf("media"),
		);
	});
});
