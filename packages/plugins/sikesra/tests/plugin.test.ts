import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { version } from "../package.json";
import {
	SIKESRA_ADMIN_BASE,
	SIKESRA_API_BASE,
	SIKESRA_PLUGIN_ID,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_ROUTE_NAMES,
	sikesraPlugin,
} from "../src/index.js";
import defaultPlugin from "../src/sandbox-entry.js";

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

	it("ships the governance manifest required by the canonical docs", () => {
		const manifestPath = new URL("../module.manifest.json", import.meta.url);
		const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
			id: string;
			routes: { public: string[]; apiNamespace: string };
			permissions: string[];
		};

		expect(manifest.id).toBe(SIKESRA_PLUGIN_ID);
		expect(manifest.routes.public).toContain(SIKESRA_PUBLIC_ROUTE);
		expect(manifest.routes.apiNamespace).toBe("/_emdash/api/plugins/sikesra/v1/*");
		expect(manifest.permissions).toContain("awcms:sikesra:entity:read");
	});

	it("ships plugin-owned migration and seed artifacts for the preserved D1 schema", () => {
		const migrationFiles = [
			"0001_sikesra_settings_and_master.sql",
			"0002_sikesra_regions.sql",
			"0003_sikesra_entities_core.sql",
			"0004_sikesra_detail_modules.sql",
			"0005_sikesra_relationships_and_attributes.sql",
			"0006_sikesra_abac.sql",
			"0007_sikesra_verification.sql",
			"0008_sikesra_documents.sql",
			"0009_sikesra_imports.sql",
			"0010_sikesra_deduplication.sql",
			"0011_sikesra_benefits_exports_audit.sql",
			"0012_sikesra_public_summary.sql",
		].map((file) => new URL(`../migrations/${file}`, import.meta.url));
		const seedFiles = [
			"0001_sikesra_settings.seed.json",
			"0002_sikesra_object_types.seed.json",
			"0003_sikesra_object_subtypes.seed.json",
		].map((file) => new URL(`../seeds/${file}`, import.meta.url));

		for (const migrationPath of migrationFiles) {
			const sql = readFileSync(migrationPath, "utf8");
			expect(sql).toContain("BEGIN;");
			expect(sql).toContain("COMMIT;");
		}

		for (const seedPath of seedFiles) {
			const seed = JSON.parse(readFileSync(seedPath, "utf8")) as { tenantId: string; siteId: string };
			expect(seed.tenantId).toBe("00000000-0000-0000-0000-000000000001");
			expect(seed.siteId).toBe("main");
		}
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
			"v1/exports/reports",
			"v1/exports/jobs",
			"v1/exports/jobs/get",
			"v1/exports/jobs/create",
			"v1/exports/jobs/generate",
			"v1/exports/jobs/download",
			"v1/documents/upload-url",
			"v1/documents/complete",
			"v1/entities/documents",
			"v1/documents/download",
			"v1/documents/verify",
			"v1/documents/replace",
			"v1/imports/create",
			"v1/imports/stage",
			"v1/imports/map-validate",
			"v1/imports/rows",
			"v1/imports/promote",
			"v1/imports/rollback",
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

	it("derives private route permissions from the trusted injected request context", async () => {
		const editorRequest = new Request("http://localhost", {
			headers: {
				"x-emdash-plugin-context": encodeURIComponent(
					JSON.stringify({
						requestId: "req-editor",
						tenantId: "tenant-1",
						siteId: "main",
						userId: "editor-1",
						role: 40,
						roleName: "EDITOR",
					}),
				),
			},
		});
		const adminRequest = new Request("http://localhost", {
			headers: {
				"x-emdash-plugin-context": encodeURIComponent(
					JSON.stringify({
						requestId: "req-admin",
						tenantId: "tenant-1",
						siteId: "main",
						userId: "admin-1",
						role: 50,
						roleName: "ADMIN",
					}),
				),
			},
		});

		const editorResponse = await defaultPlugin.routes["v1/exports/reports"].handler(
			{ input: {}, request: editorRequest, requestMeta: { ip: "127.0.0.1", userAgent: "vitest" } },
			{ plugin: { id: "sikesra" } } as never,
		);
		const adminResponse = await defaultPlugin.routes["v1/exports/reports"].handler(
			{ input: {}, request: adminRequest, requestMeta: { ip: "127.0.0.1", userAgent: "vitest" } },
			{ plugin: { id: "sikesra" } } as never,
		);

		expect(editorResponse).toEqual({
			reports: [expect.objectContaining({ id: "entity_summary" })],
		});
		expect(adminResponse).toEqual(
			expect.objectContaining({
				reports: expect.arrayContaining([
					expect.objectContaining({ id: "entity_summary" }),
					expect.objectContaining({ id: "verification_status" }),
					expect.objectContaining({ id: "audit_evidence" }),
				]),
			}),
		);
	});
});
