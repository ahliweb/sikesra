import * as React from "react";
import { vi, describe, expect, it, beforeEach } from "vitest";

import { render } from "../utils/render.tsx";
import { TestWrapper } from "../utils/test-helpers.tsx";

vi.mock("@cloudflare/kumo", () => {
	const Sidebar = Object.assign(
		({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
			<aside {...props}>{children}</aside>
		),
		{
			Provider: ({ children }: React.PropsWithChildren) => <>{children}</>,
			Header: ({ children }: React.PropsWithChildren) => (
				<header data-sidebar="header">{children}</header>
			),
			Content: ({ children }: React.PropsWithChildren) => (
				<div data-sidebar="content">{children}</div>
			),
			Footer: ({ children }: React.PropsWithChildren) => (
				<footer data-sidebar="footer">{children}</footer>
			),
			Group: ({ children }: React.PropsWithChildren) => (
				<section data-sidebar="group">{children}</section>
			),
			Menu: ({ children }: React.PropsWithChildren) => <nav data-sidebar="menu">{children}</nav>,
			MenuItem: ({ children }: React.PropsWithChildren) => (
				<div data-sidebar="menu-item">{children}</div>
			),
			MenuBadge: ({ children }: React.PropsWithChildren) => (
				<span data-sidebar="menu-badge">{children}</span>
			),
			Separator: () => <div data-sidebar="separator" />,
			GroupLabel: ({ children }: React.PropsWithChildren) => (
				<div data-sidebar="group-label">{children}</div>
			),
			GroupContent: ({ children }: React.PropsWithChildren) => (
				<div data-sidebar="group-content">{children}</div>
			),
		},
	);

	return {
		Sidebar,
		Tooltip: ({ children }: React.PropsWithChildren) => <>{children}</>,
		useSidebar: () => ({ state: "expanded" }),
	};
});

vi.mock("@tanstack/react-router", async () => {
	const actual =
		await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
	return {
		...actual,
		Link: ({ children, to, ...props }: any) => (
			<a href={to} {...props}>
				{children}
			</a>
		),
		useLocation: () => ({ pathname: "/" }),
	};
});

vi.mock("../../src/lib/api/current-user", () => ({
	useCurrentUser: () => ({ data: { role: 50 } }),
}));

vi.mock("../../src/lib/api/comments", () => ({
	fetchCommentCounts: () => Promise.resolve({ pending: 0 }),
}));

let mockedPluginAdmins: Record<string, { pages?: Record<string, unknown> }> = {};

beforeEach(() => {
	mockedPluginAdmins = {};
});

vi.mock("../../src/lib/plugin-context", () => ({
	usePluginAdmins: () => mockedPluginAdmins,
}));

const { buildSidebarPluginGroups, humanizePluginLabel, resolveSidebarIcon, SidebarNav } =
	await import("../../src/components/Sidebar");

describe("SidebarNav helpers", () => {
	it("humanizes plugin labels and resolves icons", () => {
		expect(humanizePluginLabel("awcms-micro-sikesra")).toBe("Awcms Micro Sikesra");
		expect(humanizePluginLabel("awcms-micro-sikesra", "Registry")).toBe("Registry");
		expect(resolveSidebarIcon("book")).toBeDefined();
		expect(resolveSidebarIcon("shield")).toBeDefined();
		expect(resolveSidebarIcon("code")).toBeDefined();
		expect(resolveSidebarIcon("unknown-icon")).toBeDefined();
	});

	it("sorts plugin groups alphabetically and keeps page icons contextual", () => {
		const groups = buildSidebarPluginGroups(
			{
				collections: {},
				plugins: {
					"zeta-plugin": {
						name: "Zeta Plugin",
						enabled: true,
						adminMode: "blocks",
						adminPages: [{ path: "/settings", label: "Settings", icon: "gear" }],
					},
					"alpha-plugin": {
						name: "Alpha Plugin",
						enabled: true,
						adminMode: "blocks",
						adminPages: [{ path: "/overview", label: "Overview", icon: "chart" }],
					},
				},
				taxonomies: [],
			},
			{},
		);

		expect(groups.map((group) => group.label)).toEqual(["Alpha Plugin", "Zeta Plugin"]);
		expect(groups[0]?.items[0]?.label).toBe("Overview");
		expect(groups[1]?.items[0]?.label).toBe("Settings");
		expect(groups[0]?.items[0]?.icon).toBe(resolveSidebarIcon("chart"));
		expect(groups[1]?.items[0]?.icon).toBe(resolveSidebarIcon("gear"));
	});

	it("includes docs plugin pages in sidebar groups", () => {
		const groups = buildSidebarPluginGroups(
			{
				collections: {},
				plugins: {
					"awcms-micro-docs": {
						enabled: true,
						adminMode: "react",
						adminPages: [{ path: "/", label: "Docs", icon: "book" }],
					},
				},
				taxonomies: [],
			},
			{
				"awcms-micro-docs": { pages: { "/": {} } },
			},
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.label).toBe("Docs");
		expect(groups[0]?.items[0]?.label).toBe("Docs");
		expect(groups[0]?.items[0]?.icon).toBe(resolveSidebarIcon("book"));
	});

	it("renders a single separator after dashboard", async () => {
		mockedPluginAdmins = {
			"awcms-micro-docs": { pages: { "/": () => null } },
		};
		const screen = await render(
			<TestWrapper>
				<SidebarNav
					manifest={{
						collections: { pages: { label: "Pages" } },
						plugins: {
							"awcms-micro-docs": {
								enabled: true,
								adminMode: "react",
								adminPages: [{ path: "/", label: "Docs", icon: "book" }],
							},
							"alpha-plugin": {
								name: "Alpha Plugin",
								enabled: true,
								adminMode: "blocks",
								adminPages: [{ path: "/overview", label: "Overview", icon: "chart" }],
							},
						},
						taxonomies: [],
					}}
				/>
			</TestWrapper>,
		);

		await expect.element(screen.getByText("Dashboard")).toBeInTheDocument();
		const groupLabels = Array.from(
			document.querySelectorAll('[data-sidebar="group-label"]'),
			(node) => node.textContent,
		);
		expect(groupLabels.slice(0, 2)).toEqual(["Alpha Plugin", "Docs"]);
		await expect.element(screen.getByRole("link", { name: "Docs" })).toBeInTheDocument();
		await expect.element(screen.getByText("Alpha Plugin")).toBeInTheDocument();
		expect(document.querySelectorAll('[data-sidebar="separator"]').length).toBe(5);
	});
});
