import { describe, expect, it } from "vitest";

import {
	createImportBatch,
	listImportRows,
	mapAndValidateImportRows,
	parseCsvFile,
	promoteImportRows,
	rollbackImportPromotion,
	stageImportRows,
	type ImportBatch,
	type ImportStagingRow,
	type ImportStorageContext,
} from "../src/import.js";
import { buildTrustedRequestContext } from "../src/index.js";

function createRuntime(): ImportStorageContext & {
	batches: Map<string, ImportBatch>;
	rows: Map<string, ImportStagingRow>;
	promoted: Map<string, Record<string, unknown>>;
	audit: Map<string, Record<string, unknown>>;
} {
	const batches = new Map<string, ImportBatch>();
	const rows = new Map<string, ImportStagingRow>();
	const promoted = new Map<string, Record<string, unknown>>();
	const audit = new Map<string, Record<string, unknown>>();
	return {
		storage: {
			importBatches: {
				async put(id, data) {
					batches.set(id, data);
				},
				async get(id) {
					return batches.get(id) ?? null;
				},
				async query(options) {
					let items = Array.from(batches.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(([key, value]) => data[key as keyof ImportBatch] === value),
					);
					return { items: items.slice(0, options?.limit ?? items.length) };
				},
			},
			importRows: {
				async put(id, data) {
					rows.set(id, data);
				},
				async get(id) {
					return rows.get(id) ?? null;
				},
				async query(options) {
					let items = Array.from(rows.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(
							([key, value]) => data[key as keyof ImportStagingRow] === value,
						),
					);
					items.sort((a, b) => a.data.rowNumber - b.data.rowNumber);
					return { items: items.slice(0, options?.limit ?? items.length) };
				},
			},
			promotedEntities: {
				async put(id, data) {
					promoted.set(id, data);
				},
				async get(id) {
					return promoted.get(id) ?? null;
				},
				async delete(id) {
					return promoted.delete(id);
				},
				async query(options) {
					let items = Array.from(promoted.entries(), ([id, data]) => ({ id, data }));
					const where = options?.where ?? {};
					items = items.filter(({ data }) =>
						Object.entries(where).every(([key, value]) => data[key] === value),
					);
					return { items: items.slice(0, options?.limit ?? items.length) };
				},
			},
			auditEntries: {
				async put(id, data) {
					audit.set(id, data);
				},
			},
		},
		kv: {
			async get() {
				return null;
			},
		},
		batches,
		rows,
		promoted,
		audit,
	};
}

function makeContext(overrides = {}) {
	return buildTrustedRequestContext({
		requestId: "req-1",
		tenantId: "tenant-1",
		siteId: "site-1",
		userId: "user-1",
		roles: ["admin"],
		permissions: [],
		regionScope: {},
		...overrides,
	});
}

describe("SIKESRA import workflow", () => {
	it("parses csv rows", () => {
		const parsed = parseCsvFile("name,village\nAlpha,6201021001\nBeta,6201021002\n");
		expect(parsed.headers).toEqual(["name", "village"]);
		expect(parsed.rows).toHaveLength(2);
	});

	it("creates batches and stages rows", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const batch = await createImportBatch(runtime, { originalFilename: "import.csv" }, ctx);
		const staged = await stageImportRows(
			runtime,
			batch.id,
			{
				rows: [
					{ displayName: "Alpha", officialVillageCode: "6201021001" },
					{ displayName: "Beta", officialVillageCode: "6201021002" },
				],
			},
			ctx,
		);
		expect(staged.staged).toBe(2);
		expect(runtime.audit.size).toBeGreaterThanOrEqual(2);
	});

	it("maps and validates staging rows", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const batch = await createImportBatch(runtime, { originalFilename: "import.csv" }, ctx);
		await stageImportRows(
			runtime,
			batch.id,
			{
				rows: [
					{ Name: "Alpha", Village: "6201021001" },
					{ Name: "", Village: "bad" },
				],
			},
			ctx,
		);
		const result = await mapAndValidateImportRows(
			runtime,
			batch.id,
			[
				{ sourceColumn: "Name", targetField: "displayName" },
				{ sourceColumn: "Village", targetField: "officialVillageCode" },
			],
			ctx,
		);
		expect(result.staged).toBe(2);
		expect(result.validationErrors).toBe(1);
	});

	it("promotes valid rows and isolates duplicate-review rows without decisions", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const batch = await createImportBatch(runtime, { originalFilename: "import.csv" }, ctx);
		await stageImportRows(
			runtime,
			batch.id,
			{
				rows: [
					{ Name: "Alpha", Village: "6201021001" },
					{ Name: "Alpha", Village: "6201021001" },
				],
			},
			ctx,
		);
		const mapped = await mapAndValidateImportRows(
			runtime,
			batch.id,
			[
				{ sourceColumn: "Name", targetField: "displayName" },
				{ sourceColumn: "Village", targetField: "officialVillageCode" },
			],
			ctx,
		);
		const rows = await listImportRows(runtime, batch.id, ctx);
		const promotion = await promoteImportRows(
			runtime,
			batch.id,
			rows.map((row) => row.id),
			{},
			ctx,
		);
		expect(mapped.staged).toBe(2);
		expect(promotion.promoted).toBe(1);
		expect(promotion.skipped).toBe(1);
	});

	it("rolls back promoted rows", async () => {
		const runtime = createRuntime();
		const ctx = makeContext();
		const batch = await createImportBatch(runtime, { originalFilename: "import.csv" }, ctx);
		await stageImportRows(
			runtime,
			batch.id,
			{ rows: [{ Name: "Alpha", Village: "6201021001" }] },
			ctx,
		);
		await mapAndValidateImportRows(
			runtime,
			batch.id,
			[
				{ sourceColumn: "Name", targetField: "displayName" },
				{ sourceColumn: "Village", targetField: "officialVillageCode" },
			],
			ctx,
		);
		const rows = await listImportRows(runtime, batch.id, ctx);
		await promoteImportRows(
			runtime,
			batch.id,
			rows.map((row) => row.id),
			{},
			ctx,
		);
		const rollback = await rollbackImportPromotion(runtime, batch.id, ctx);
		expect(rollback.rolledBack).toBe(1);
		expect(rollback.deletedEntityIds).toHaveLength(1);
	});
});
