import { vi, describe, it, expect } from "vitest";

vi.mock("@cloudflare/kumo", () => {
	return {
		LinkButton: () => null,
	};
});

import {
	AwcmsModuleManifestSchema,
	normalizeAdminNav,
	adaptToEmdashPages,
	resolveLabel,
} from "../src/navigation.js";
import { AWCMS_SIKESRA_MANIFEST } from "../src/runtime.js";

describe("AWCMS-Micro navigation kit", () => {
	it("validates a manifest and preserves sidebar placement defaults", () => {
		const parsed = AwcmsModuleManifestSchema.parse({
			id: "plugin-test",
			name: "Test Plugin",
			navigation: {
				groups: [
					{
						id: "group-1",
						labelKey: "nav.group1",
						fallbackLabel: "Group 1",
						sidebarPlacement: "after-dashboard",
						items: [
							{
								id: "item-1",
								labelKey: "nav.item1",
								fallbackLabel: "Item 1",
								path: "/subpath",
							},
						],
					},
				],
			},
			i18n: {
				defaultLocale: "en",
				supportedLocales: ["en", "id"],
			},
		});

		expect(parsed.id).toBe("plugin-test");
		expect(parsed.navigation?.groups?.[0]?.sidebarPlacement).toBe("after-dashboard");
	});

	it("sorts groups and nested items while normalizing plugin-local paths", () => {
		const result = normalizeAdminNav([
			{
				id: "plugin-a",
				name: "Plugin A",
				navigation: {
					groups: [
						{
							id: "group-high-priority",
							labelKey: "nav.high",
							fallbackLabel: "High Priority",
							sidebarPriority: 10,
							sortOrder: 1,
							items: [
								{
									id: "item-b",
									labelKey: "nav.item.b",
									fallbackLabel: "Item B",
									path: "/b",
									sortOrder: 2,
								},
								{
									id: "item-a",
									labelKey: "nav.item.a",
									fallbackLabel: "Item A",
									path: "/a",
									sortOrder: 1,
									children: [
										{
											id: "child-2",
											labelKey: "nav.child2",
											fallbackLabel: "Child 2",
											path: "/child2",
											sortOrder: 2,
										},
										{
											id: "child-1",
											labelKey: "nav.child1",
											fallbackLabel: "Child 1",
											path: "/child1",
											sortOrder: 1,
										},
									],
								},
							],
						},
					],
				},
			},
		]);

		expect(result[0]?.id).toBe("group-high-priority");
		expect(result[0]?.items[0]?.id).toBe("item-a");
		expect(result[0]?.items[0]?.children?.[0]?.id).toBe("child-1");
		expect(result[0]?.items[0]?.path).toBe("/_emdash/admin/plugins/plugin-a/a");
	});

	it("orders sidebar groups by sidebar priority before sort order", () => {
		const result = normalizeAdminNav([
			{
				id: "plugin-a",
				name: "Plugin A",
				navigation: {
					groups: [
						{
							id: "settings-group",
							labelKey: "nav.settings",
							fallbackLabel: "Settings",
							sidebarPlacement: "before-emdash-default",
							sidebarPriority: 40,
							sortOrder: 40,
							items: [
								{
									id: "settings-item",
									labelKey: "nav.settings.item",
									fallbackLabel: "Settings Item",
									path: "/settings",
								},
							],
						},
						{
							id: "dashboard-group",
							labelKey: "nav.dashboard",
							fallbackLabel: "Dashboard",
							sidebarPlacement: "after-dashboard",
							sidebarPriority: 10,
							sortOrder: 10,
							items: [
								{
									id: "dashboard-item",
									labelKey: "nav.dashboard.item",
									fallbackLabel: "Dashboard Item",
									path: "/overview",
								},
							],
						},
					],
				},
			},
		]);

		expect(result.map((group) => ({
			id: group.id,
			sidebarPlacement: group.sidebarPlacement,
			sidebarPriority: group.sidebarPriority,
		}))).toEqual([
			{ id: "dashboard-group", sidebarPlacement: "after-dashboard", sidebarPriority: 10 },
			{ id: "settings-group", sidebarPlacement: "before-emdash-default", sidebarPriority: 40 },
		]);
	});

	it("filters denied items and resolves labels by locale fallback", () => {
		const permissions = new Set(["allowed"]);
		const groups = normalizeAdminNav(
			[
				{
					id: "plugin-p",
					name: "Plugin P",
					navigation: {
						groups: [
							{
								id: "group-p",
								labelKey: "nav.p",
								fallbackLabel: "Group P",
								items: [
									{
										id: "item-allowed",
										labelKey: "nav.allowed",
										fallbackLabel: "Allowed",
										path: "/allowed",
									},
									{
										id: "item-denied",
										labelKey: "nav.denied",
										fallbackLabel: "Denied",
										path: "/denied",
										permission: "admin:only",
									},
								],
							},
						],
					},
				},
			],
			{
				hasPermission: (permission) => permissions.has(permission),
			}
		);

		expect(groups[0]?.items).toHaveLength(1);
		expect(resolveLabel("nav.title", "Default Title", { en: { "nav.title": "English Title" } }, "fr", "en")).toBe(
			"English Title"
		);
	});

	it("adapts grouped navigation to flat EmDash admin pages", () => {
		const pages = adaptToEmdashPages({
			id: "awcms-sikesra",
			name: "Example Plugin",
			navigation: {
				groups: [
					{
						id: "group-1",
						labelKey: "nav.group1",
						fallbackLabel: "Group 1",
						items: [
							{
								id: "overview",
								labelKey: "nav.overview",
								fallbackLabel: "Overview",
								path: "/overview",
							},
						],
					},
				],
			},
		});

		expect(pages).toEqual([{ path: "/overview", label: "Overview", labelKey: "nav.overview", icon: undefined }]);
	});

	it("assigns contextual icons to the SIKESRA sidebar groups", () => {
		expect(AWCMS_SIKESRA_MANIFEST.navigation?.groups?.map((group) => ({ id: group.id, icon: group.icon }))).toEqual([
			{ id: "dashboard-group", icon: "chart" },
			{ id: "content-group", icon: "file" },
			{ id: "governance-group", icon: "shield" },
			{ id: "settings-group", icon: "gear" },
		]);
	});
});
