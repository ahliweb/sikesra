import type { EmDashRouteContext } from "./handler-utils";

interface PluginAdminInteraction {
	type?: string;
	page?: string;
	action_id?: string;
	value?: unknown;
}

type Block = Record<string, unknown>;

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

function overviewBlocks(): Block[] {
	const blocks: Block[] = [...pageIntro("overview")];

	blocks.push(
		{ type: "fields", fields: [
			{ label: "Status", value: "Placeholder aktif" },
			{ label: "Mode", value: "Admin Block Kit" },
			{ label: "Keamanan", value: "Tetap lewat auth EmDash" },
			{ label: "Tahap", value: "Rebuild bertahap" },
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

function getBlocksForPage(page: string) {
	if (page === "overview") {
		return overviewBlocks();
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

	let page = (input.page || "").replace(/^\//, "") || "overview";
	if (input.type === "block_action" && input.action_id?.startsWith("nav_")) {
		page = input.action_id.slice(4) || "overview";
	}

	return {
		blocks: getBlocksForPage(page),
	};
}
