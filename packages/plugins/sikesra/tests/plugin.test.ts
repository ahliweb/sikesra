import { describe, expect, it } from "vitest";

import { version } from "../package.json";
import defaultPlugin from "../src/sandbox-entry.js";
import {
	SIKESRA_ADMIN_BASE,
	SIKESRA_API_BASE,
	SIKESRA_PLUGIN_ID,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_ROUTE_NAMES,
	sikesraPlugin,
} from "../src/index.js";

describe("sikesraPlugin descriptor", () => {
	it("declares the standard plugin shell metadata", () => {
		const descriptor = sikesraPlugin();

		expect(descriptor.id).toBe(SIKESRA_PLUGIN_ID);
		expect(descriptor.version).toBe(version);
		expect(descriptor.format).toBe("standard");
		expect(descriptor.entrypoint).toBe("@ahliweb/plugin-sikesra/sandbox");
		expect(descriptor.adminPages).toEqual([
			{ path: "/", label: "SIKESRA", icon: "shield" },
			{ path: "/operations", label: "Operations", icon: "gear" },
		]);
		expect(descriptor.adminWidgets).toEqual([{ id: "overview", title: "SIKESRA", size: "third" }]);
	});

	it("exports the restored route boundaries", () => {
		expect(SIKESRA_PUBLIC_ROUTE).toBe("/sikesra");
		expect(SIKESRA_ADMIN_BASE).toBe("/_emdash/admin/plugins/sikesra");
		expect(SIKESRA_API_BASE).toBe("/_emdash/api/plugins/sikesra");
		expect(SIKESRA_ROUTE_NAMES).toEqual([
			"admin",
			"public/metadata",
			"public/filters",
			"public/summary",
			"v1/status",
			"v1/security/manifest",
		]);
	});
});

describe("sikesra sandbox shell", () => {
	it("registers every expected shell route", () => {
		expect(Object.keys(defaultPlugin.routes)).toEqual([...SIKESRA_ROUTE_NAMES]);
	});

	it("renders the overview admin page through the plugin admin route", async () => {
		const response = await defaultPlugin.routes.admin.handler(
			{ input: { type: "page_load", page: "/" }, request: new Request("http://localhost") },
			{} as never,
		);

		expect(response).toEqual(
			expect.objectContaining({
				blocks: expect.arrayContaining([
					expect.objectContaining({ type: "header", text: "SIKESRA" }),
				]),
			}),
		);
	});

	it("renders the overview widget through the same admin route", async () => {
		const response = await defaultPlugin.routes.admin.handler(
			{
				input: { type: "page_load", page: "widget:overview" },
				request: new Request("http://localhost"),
			},
			{} as never,
		);

		expect(response).toEqual(
			expect.objectContaining({
				blocks: expect.arrayContaining([
					expect.objectContaining({ type: "header", text: "SIKESRA" }),
				]),
			}),
		);
	});

	it("returns only aggregate-safe placeholder metadata on the public route", async () => {
		const response = await defaultPlugin.routes["public/metadata"].handler(
			{ input: {}, request: new Request("http://localhost") },
			{} as never,
		);

		expect(response).toEqual(
			expect.objectContaining({
				enabled: true,
				title: "SIKESRA",
			}),
		);
		expect(JSON.stringify(response)).not.toMatch(/nik|kia|address|person/i);
	});

	it("returns an empty but valid public summary envelope", async () => {
		const response = await defaultPlugin.routes["public/summary"].handler(
			{ input: {}, request: new Request("http://localhost") },
			{} as never,
		);

		expect(response).toEqual(
			expect.objectContaining({
				kpis: {
					totalEntities: 0,
					verifiedEntities: 0,
					activeVillages: 0,
					latestUpdateAt: null,
				},
				suppression: {
					threshold: 5,
					suppressedCells: 0,
				},
			}),
		);
		expect(JSON.stringify(response)).not.toMatch(/nik|kia|hash/i);
	});

	it("exposes a versioned placeholder status route for follow-up work", async () => {
		const response = await defaultPlugin.routes["v1/status"].handler(
			{ input: {}, request: new Request("http://localhost") },
			{} as never,
		);

		expect(response).toEqual({
			status: "rebuild-pending",
			message:
				"The SIKESRA shell is mounted. Data, policy, and operational endpoints will be restored in follow-up issues.",
		});
	});

	it("exposes the security manifest through a non-public versioned route", async () => {
		const response = await defaultPlugin.routes["v1/security/manifest"].handler(
			{ input: {}, request: new Request("http://localhost") },
			{} as never,
		);

		expect(response).toEqual(
			expect.objectContaining({
				permissions: expect.arrayContaining(["awcms:sikesra:entity:read"]),
				highRiskAuditActions: expect.arrayContaining(["code.correct", "security.sensitive_reveal"]),
			}),
		);
	});
});
