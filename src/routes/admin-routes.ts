import type { D1Binding } from "../repositories/db";
import { listEntities, type EntityListFilters } from "../services/entity";
import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS } from "../security/permissions";

interface PluginAdminInteraction {
	type?: string;
	page?: string;
	action_id?: string;
	block_id?: string;
	value?: unknown;
	values?: Record<string, unknown>;
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

const DATA_STATUS_LABELS: Record<string, string> = {
	draft: "Draft",
	submitted: "Diajukan",
	active: "Aktif",
	archived: "Arsip",
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
	pending: "Menunggu",
	submitted_village: "Submit Desa",
	verified_village: "Verifikasi Desa",
	submitted_subdistrict: "Submit Kecamatan",
	verified_subdistrict: "Verifikasi Kecamatan",
	submitted_regency: "Submit Kabupaten",
	verified: "Terverifikasi",
	need_revision: "Perlu Perbaikan",
	rejected: "Ditolak",
};

const SENSITIVITY_LABELS: Record<string, string> = {
	public_safe: "Publik Aman",
	internal: "Internal",
	restricted: "Terbatas",
	highly_restricted: "Sangat Terbatas",
};

const SOURCE_INPUT_LABELS: Record<string, string> = {
	manual: "Manual",
	import: "Import",
	integration: "Integrasi",
};

const DUPLICATE_STATUS_LABELS: Record<string, string> = {
	unknown: "Belum Dinilai",
	none: "Tidak Ada",
	candidate: "Kandidat",
	confirmed: "Terkonfirmasi",
	resolved: "Selesai",
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
			text: "Gunakan halaman ini sebagai surface admin SIKESRA yang stabil selama rebuild bertahap berlangsung. Akses detail tetap harus mengikuti auth, permission, dan ABAC di backend.",
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

function resolvePage(input: PluginAdminInteraction): string {
	if (input.type === "block_action" && input.action_id?.startsWith("nav_")) {
		return input.action_id.slice(4) || "overview";
	}

	if (input.block_id?.startsWith("entities_") || input.action_id?.startsWith("entities_")) {
		return "entities";
	}

	return (input.page || "").replace(/^\//, "") || "overview";
}

function option(label: string, value: string) {
	return { label, value };
}

function stringValue(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function numberValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
}

function parseRegistryFilters(input: PluginAdminInteraction): EntityListFilters {
	if (input.type === "block_action" && input.action_id === "entities_reset") {
		return {};
	}

	const values = input.type === "form_submit" ? input.values ?? {} : {};

	return {
		keyword: stringValue(values.keyword),
		objectTypeCode: stringValue(values.objectTypeCode),
		objectSubtypeCode: stringValue(values.objectSubtypeCode),
		districtCode: stringValue(values.districtCode),
		villageCode: stringValue(values.villageCode),
		localRegionId: stringValue(values.localRegionId),
		statusData: stringValue(values.statusData) as EntityListFilters["statusData"],
		statusVerification: stringValue(values.statusVerification),
		sensitivityLevel: stringValue(values.sensitivityLevel) as EntityListFilters["sensitivityLevel"],
		sourceInput: stringValue(values.sourceInput) as EntityListFilters["sourceInput"],
		duplicateStatus: stringValue(values.duplicateStatus) as EntityListFilters["duplicateStatus"],
		completenessMin: numberValue(values.completenessMin),
		completenessMax: numberValue(values.completenessMax),
	};
}

async function loadSelectOptions(db: D1Binding, tenantId: string, siteId: string, filters: EntityListFilters) {
	const objectTypes = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	let objectSubtypes: { results: Array<{ type_code: string; code: string; name: string }> } = { results: [] };
	if (filters.objectTypeCode) {
		objectSubtypes = await db.prepare(
			"SELECT type_code, code, name FROM awcms_sikesra_object_subtypes WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND type_code = ? ORDER BY sort_order, name",
		).bind(tenantId, siteId, filters.objectTypeCode).all<{ type_code: string; code: string; name: string }>();
	}

	const districtRows = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'district' ORDER BY name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	const villageParams: unknown[] = [tenantId, siteId];
	let villageSql = "SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'village'";
	if (filters.districtCode) {
		villageSql += " AND code LIKE ?";
		villageParams.push(`${filters.districtCode}%`);
	}
	villageSql += " ORDER BY name LIMIT 200";
	const villageRows = await db.prepare(villageSql).bind(...villageParams).all<{ code: string; name: string }>();

	let localRegionRows: Array<{ id: string; level: string; code_local?: string | null; name: string }> = [];
	if (filters.villageCode) {
		const localResult = await db.prepare(
			"SELECT id, level, code_local, name FROM awcms_sikesra_local_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND official_village_code = ? ORDER BY name LIMIT 200",
		).bind(tenantId, siteId, filters.villageCode).all<{ id: string; level: string; code_local?: string | null; name: string }>();
		localRegionRows = localResult.results;
	}

	return {
		objectTypes: objectTypes.results,
		objectSubtypes: objectSubtypes.results,
		districts: districtRows.results,
		villages: villageRows.results,
		localRegions: localRegionRows,
	};
}

function activeFilterCount(filters: EntityListFilters): number {
	return Object.values(filters).filter((value) => value !== undefined && value !== null && value !== "").length;
}

function formatOfficialRegion(summary: {
	officialRegion: {
		district?: { name: string };
		village?: { name: string };
	};
}): string {
	const district = summary.officialRegion.district?.name;
	const village = summary.officialRegion.village?.name;
	if (district && village) return `${district} / ${village}`;
	return village ?? district ?? "Belum ditetapkan";
}

function formatLocalRegion(summary: { localRegion?: { items: Array<{ level: string; codeLocal?: string; name: string }> } }): string {
	const first = summary.localRegion?.items?.[0];
	if (!first) return "-";
	return first.codeLocal ? `${first.level.toUpperCase()} ${first.codeLocal} / ${first.name}` : `${first.level.toUpperCase()} / ${first.name}`;
}

function formatType(summary: { objectTypeName: string; objectSubtypeName: string }): string {
	return `${summary.objectTypeName} / ${summary.objectSubtypeName}`;
}

function formatVerificationStatus(status: string): string {
	return VERIFICATION_STATUS_LABELS[status] ?? status;
}

function formatDataStatus(status: string): string {
	return DATA_STATUS_LABELS[status] ?? status;
}

function contextualActions(
	summary: {
		statusData: string;
		statusVerification: string;
		duplicateStatus?: string;
	},
	permissions: readonly string[],
): string {
	const actions = ["Buka detail"];
	if (permissions.includes(SIKESRA_PERMISSIONS.ENTITY_UPDATE) && summary.statusData === "draft") {
		actions.push("Edit");
	}
	if (permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_SUBMIT) && (summary.statusData === "draft" || summary.statusVerification === "need_revision")) {
		actions.push("Submit");
	}
	if (permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_VERIFY) && summary.statusVerification.startsWith("submitted")) {
		actions.push("Verifikasi");
	}
	if (summary.duplicateStatus === "candidate") {
		actions.push("Tinjau duplikasi");
	}
	return actions.join(" | ");
}

async function registryBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = routeCtx.env?.SIKESRA_DB;
	const filters = parseRegistryFilters(input);

	if (!db) {
		return [
			...pageIntro("entities"),
			{
				type: "banner",
				variant: "alert",
				title: "Binding database tidak tersedia",
				description: "Halaman Registry membutuhkan akses ke env.SIKESRA_DB agar dapat memuat daftar entitas.",
			},
		];
	}

	const [result, options] = await Promise.all([
		listEntities(db, { filters, page: 1, perPage: 20 }, ctx),
		loadSelectOptions(db, ctx.tenantId, ctx.siteId, filters),
	]);

	const verifiedCount = result.items.filter((item) => item.statusVerification === "verified").length;
	const restrictedCount = result.items.filter((item) => item.sensitivityLevel === "restricted" || item.sensitivityLevel === "highly_restricted").length;
	const followUpCount = result.items.filter((item) => item.statusVerification.startsWith("submitted") || item.statusVerification === "need_revision").length;

	const blocks: Block[] = [
		...pageIntro("entities"),
		{
			type: "banner",
			variant: "default",
			title: "Registry SIKESRA",
			description: "Daftar ini mengikuti cakupan tenant, site, soft-delete, dan region scope dari backend. Nama sensitif ditampilkan dalam kondisi ter-mask bila diperlukan.",
		},
		{
			type: "stats",
			items: [
				{ label: "Total hasil", value: String(result.meta.total ?? result.items.length), description: "Setelah filter dan scope backend" },
				{ label: "Terverifikasi", value: String(verifiedCount), description: "Pada halaman saat ini" },
				{ label: "Perlu tindak lanjut", value: String(followUpCount), description: "Submit atau revisi" },
				{ label: "Data terbatas", value: String(restrictedCount), description: "Restricted atau highly restricted" },
			],
		},
		{
			type: "form",
			block_id: "entities_filters",
			fields: [
				{ type: "text_input", action_id: "keyword", label: "Keyword", placeholder: "Nama atau ID SIKESRA", initial_value: filters.keyword ?? "" },
				{ type: "select", action_id: "objectTypeCode", label: "Jenis data", initial_value: filters.objectTypeCode ?? "", options: [option("Semua jenis", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "objectSubtypeCode", label: "Subjenis data", initial_value: filters.objectSubtypeCode ?? "", options: [option(filters.objectTypeCode ? "Semua subjenis untuk jenis ini" : "Pilih jenis data terlebih dahulu", ""), ...options.objectSubtypes.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "districtCode", label: "Kecamatan", initial_value: filters.districtCode ?? "", options: [option("Semua kecamatan", ""), ...options.districts.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "villageCode", label: "Desa/Kelurahan", initial_value: filters.villageCode ?? "", options: [option(filters.districtCode ? "Semua desa/kelurahan di kecamatan ini" : "Pilih kecamatan terlebih dahulu atau tampilkan semua", ""), ...options.villages.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "localRegionId", label: "Wilayah lokal", initial_value: filters.localRegionId ?? "", options: [option(filters.villageCode ? "Semua wilayah lokal desa ini" : "Pilih desa/kelurahan terlebih dahulu", ""), ...options.localRegions.map((row) => option(`${row.level.toUpperCase()}${row.code_local ? ` ${row.code_local}` : ""} / ${row.name}`, row.id))] },
				{ type: "select", action_id: "statusData", label: "Status data", initial_value: filters.statusData ?? "", options: [option("Semua status data", ""), ...Object.entries(DATA_STATUS_LABELS).map(([value, label]) => option(label, value))] },
				{ type: "select", action_id: "statusVerification", label: "Status verifikasi", initial_value: filters.statusVerification ?? "", options: [option("Semua status verifikasi", ""), ...Object.entries(VERIFICATION_STATUS_LABELS).map(([value, label]) => option(label, value))] },
				{ type: "select", action_id: "sensitivityLevel", label: "Sensitivitas", initial_value: filters.sensitivityLevel ?? "", options: [option("Semua sensitivitas", ""), ...Object.entries(SENSITIVITY_LABELS).map(([value, label]) => option(label, value))] },
				{ type: "select", action_id: "sourceInput", label: "Sumber input", initial_value: filters.sourceInput ?? "", options: [option("Semua sumber", ""), ...Object.entries(SOURCE_INPUT_LABELS).map(([value, label]) => option(label, value))] },
				{ type: "select", action_id: "duplicateStatus", label: "Status duplikasi", initial_value: filters.duplicateStatus ?? "", options: [option("Semua status duplikasi", ""), ...Object.entries(DUPLICATE_STATUS_LABELS).map(([value, label]) => option(label, value))] },
				{ type: "number_input", action_id: "completenessMin", label: "Kelengkapan minimum", initial_value: filters.completenessMin },
				{ type: "number_input", action_id: "completenessMax", label: "Kelengkapan maksimum", initial_value: filters.completenessMax },
			],
			submit: { label: "Terapkan filter", action_id: "entities_apply_filters" },
		},
		{
			type: "actions",
			elements: [
				{ type: "button", label: "Reset filter", action_id: "entities_reset", style: "secondary" },
			],
		},
		{
			type: "fields",
			fields: [
				{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
				{ label: "Filter aktif", value: String(activeFilterCount(filters)) },
				{ label: "Per halaman", value: "20" },
				{ label: "Masking sensitif", value: "Aktif sesuai permission backend" },
			],
		},
		{ type: "context", text: "Kolom Registry mengikuti spesifikasi SIKESRA: ID, jenis/subjenis, nama tampil, wilayah resmi, wilayah lokal, status data, status verifikasi, kelengkapan, sensitivitas, dan aksi kontekstual." },
		{
			type: "table",
			block_id: "entities_registry_table",
			columns: [
				{ key: "sikesraId20", label: "ID SIKESRA", format: "code" },
				{ key: "type", label: "Jenis / Subjenis" },
				{ key: "displayName", label: "Nama Tampil" },
				{ key: "officialRegion", label: "Wilayah Resmi" },
				{ key: "localRegion", label: "Wilayah Lokal" },
				{ key: "statusData", label: "Status Data", format: "badge" },
				{ key: "statusVerification", label: "Status Verifikasi", format: "badge" },
				{ key: "completeness", label: "Kelengkapan" },
				{ key: "sensitivity", label: "Sensitivitas", format: "badge" },
				{ key: "actions", label: "Aksi" },
			],
			rows: result.items.map((item) => ({
				sikesraId20: item.sikesraId20 ?? "Belum dibuat",
				type: formatType(item),
				displayName: item.masked ? `${item.displayName} (masked)` : item.displayName,
				officialRegion: formatOfficialRegion(item),
				localRegion: formatLocalRegion(item),
				statusData: formatDataStatus(item.statusData),
				statusVerification: formatVerificationStatus(item.statusVerification),
				completeness: `${item.completenessPercent}%`,
				sensitivity: SENSITIVITY_LABELS[item.sensitivityLevel] ?? item.sensitivityLevel,
				actions: contextualActions(item, ctx.permissions),
			})),
			empty_text: "Tidak ada data yang cocok dengan filter dan scope backend saat ini.",
		},
	];

	return blocks;
}

function getBlocksForPage(page: string) {
	if (page === "overview") {
		return Promise.resolve(overviewBlocks());
	}

	if (page === "entities") {
		throw new Error("entities page must be resolved via registryBlocks");
	}

	if (page in PAGE_LABELS) {
		return Promise.resolve(simplePageBlocks(page));
	}

	return Promise.resolve([
		{
			type: "banner",
			variant: "alert",
			title: "Halaman tidak dikenal",
			description: `page: ${page}`,
		},
		{ type: "actions", elements: navButtons("overview") },
	]);
}

export async function pluginAdminHandler(routeCtx: EmDashRouteContext<PluginAdminInteraction>) {
	const input = routeCtx.input ?? {};
	const page = resolvePage(input);

	if (page === "entities") {
		return {
			blocks: await registryBlocks(routeCtx, input),
		};
	}

	return {
		blocks: await getBlocksForPage(page),
	};
}
