import { getRequestContext } from "emdash";
import type { EmDashRouteContext } from "./handler-utils";
import type { D1Binding } from "../repositories/db";

interface PluginAdminInteraction {
	type?: string;
	page?: string;
	action_id?: string;
	value?: unknown;
}

type Block = Record<string, unknown>;
type QueryDb = {
	selectFrom: (table: string) => {
		select: (cb: (eb: { fn: { countAll: () => { as: (name: string) => unknown } } }) => unknown) => {
			where: (column: string, op: string, value: unknown) => {
				where: (column: string, op: string, value: unknown) => {
					executeTakeFirst: () => Promise<{ cnt?: number | string | bigint } | undefined>;
				};
			};
		};
	};
};

const PAGE_LABELS: Record<string, string> = {
	overview: "Dashboard",
	entities: "Data Utama",
	verification: "Verifikasi",
	imports: "Import Excel",
	documents: "Dokumen",
	reports: "Laporan",
	regions: "Wilayah",
	access: "Atribut & Akses",
	audit: "Audit",
	settings: "Pengaturan",
};

async function countWhere(db: D1Binding | QueryDb, table: string, tenantId: string, siteId: string, extra = "") {
	if ("selectFrom" in db) {
		if (extra.trim()) return 0;
		const row = await db
			.selectFrom(table)
			.select((eb) => eb.fn.countAll().as("cnt"))
			.where("tenant_id", "=", tenantId)
			.where("site_id", "=", siteId)
			.executeTakeFirst();
		return Number(row?.cnt ?? 0);
	}

	const sql = `SELECT COUNT(*) as cnt FROM ${table} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL ${extra}`;
	const row = await db.prepare(sql).bind(tenantId, siteId).first<{ cnt: number }>();
	return row?.cnt ?? 0;
}

function resolveDb(routeCtx: EmDashRouteContext<PluginAdminInteraction>): D1Binding | QueryDb | undefined {
	const requestDb = getRequestContext()?.db as QueryDb | undefined;
	return routeCtx.env?.SIKESRA_DB ?? requestDb;
}

function navButtons(currentPage: string) {
	return Object.entries(PAGE_LABELS).map(([page, label]) => ({
		type: "button",
		label,
		action_id: `nav_${page}`,
		style: page === currentPage ? "primary" : "secondary",
	}));
}

function apiFields() {
	return [
		{ label: "Admin Block Kit", value: "/_emdash/api/plugins/sikesra/admin" },
		{ label: "Entities API", value: "/_emdash/api/plugins/sikesra/v1/entities" },
		{ label: "Settings API", value: "/_emdash/api/plugins/sikesra/v1/settings" },
		{ label: "Public Summary", value: "/_emdash/api/plugins/sikesra/public/summary" },
	];
}

function pageIntro(page: string) {
	const label = PAGE_LABELS[page] ?? PAGE_LABELS.overview;
	return [
		{
			type: "banner",
			variant: "default",
			title: `SIKESRA ${label}`,
			description: "Admin plugin shell aktif. Detail workflow akan dihardening bertahap sesuai implementation plan.",
		},
		{ type: "header", text: label },
		{
			type: "section",
			text: "Gunakan halaman ini sebagai placeholder stabil selama rebuild SIKESRA berlangsung. Surface admin tetap tersedia tanpa mengandalkan block payload yang belum tervalidasi penuh.",
		},
		{ type: "actions", elements: navButtons(page) },
	];
}

async function overviewBlocks(db: D1Binding | QueryDb | undefined, tenantId: string, siteId: string): Promise<Block[]> {
	const blocks: Block[] = [...pageIntro("overview")];

	if (!db) {
		blocks.push({
			type: "banner",
			variant: "alert",
			title: "Database tidak tersedia",
			description: "Database runtime SIKESRA belum tersedia di request context ini.",
		});
		return blocks;
	}

	const [entityCount, importCount, exportCount, policyCount] = await Promise.all([
		countWhere(db, "awcms_sikesra_entities", tenantId, siteId),
		countWhere(db, "awcms_sikesra_import_batches", tenantId, siteId),
		countWhere(db, "awcms_sikesra_export_jobs", tenantId, siteId),
		countWhere(db, "awcms_sikesra_abac_policies", tenantId, siteId),
	]);

	blocks.push(
		{ type: "fields", fields: [
			{ label: "Total Entitas", value: String(entityCount) },
			{ label: "Batch Import", value: String(importCount) },
			{ label: "Job Ekspor", value: String(exportCount) },
			{ label: "Kebijakan ABAC", value: String(policyCount) },
		] },
		{ type: "divider" },
		{ type: "header", text: "Rute Penting" },
		{ type: "fields", fields: apiFields() },
	);

	return blocks;
}

function simplePageBlocks(page: string): Block[] {
	const label = PAGE_LABELS[page] ?? PAGE_LABELS.overview;
	return [
		...pageIntro(page),
		{ type: "fields", fields: [
			{ label: "Status", value: "Placeholder aktif" },
			{ label: "Halaman", value: label },
			{ label: "Mode", value: "Admin Block Kit" },
			{ label: "Keamanan", value: "Tetap lewat auth EmDash" },
		] },
		{ type: "divider" },
		{ type: "section", text: "Endpoint bisnis SIKESRA di bawah v1 tetap dipisahkan dan dapat dihardening bertahap tanpa memblokir admin shell plugin." },
		{ type: "fields", fields: apiFields() },
	];
}

async function getBlocksForPage(page: string, db: D1Binding | QueryDb | undefined, tenantId: string, siteId: string) {
	if (page === "overview") {
		return overviewBlocks(db, tenantId, siteId);
	}

	if (page in PAGE_LABELS) {
		return simplePageBlocks(page);
	}

	return [
		{
			type: "banner",
			variant: "alert",
			title: "Halaman tidak dikenal",
			description: `page: ${page}`,
		},
		{ type: "actions", elements: navButtons("overview") },
	];
}

export async function pluginAdminHandler(routeCtx: EmDashRouteContext<PluginAdminInteraction>) {
	const input = routeCtx.input ?? {};
	const db = resolveDb(routeCtx);
	const tenantId = routeCtx.site?.tenantId ?? "default";
	const siteId = routeCtx.site?.id ?? "default";

	let page = (input.page || "").replace(/^\//, "") || "overview";
	if (input.type === "block_action" && input.action_id?.startsWith("nav_")) {
		page = input.action_id.slice(4) || "overview";
	}

	return {
		blocks: await getBlocksForPage(page, db, tenantId, siteId),
	};
}
