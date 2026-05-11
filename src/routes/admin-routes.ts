import type { D1Binding } from "../repositories/db";
import { listEntities, type EntityListFilters } from "../services/entity";
import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { getAdminDashboard } from "../services/dashboard";
import { getRouteDb } from "./route-db";
import { createEntity, getEntityDetail, patchEntity, type EntityCreateInput, type EntityPatchInput } from "../services/entity";
import { getVerificationQueue, getVerificationTimeline, submitEntity, verifyEntity, type VerificationDecision, type VerificationLevel, type VerificationQueueFilters } from "../services/verification";
import { getImportBatch, getStagingRows, updateStagingRow } from "../repositories/import-repository";
import { generateUploadUrl, getEntityDocuments, completeUpload } from "../services/document";

interface PluginAdminInteraction {
	type?: string;
	page?: string;
	action_id?: string;
	block_id?: string;
	value?: unknown;
	values?: Record<string, unknown>;
}

interface VerificationDecisionFormState {
	verificationLevel: VerificationLevel;
	action: "verify" | "need_revision" | "reject";
	note: string;
	confirmAudit: boolean;
}

interface ImportCreateFormState {
	filename: string;
	objectTypeCode: string;
	sheetName: string;
}

interface DocumentUploadFormState {
	entityId: string;
	fileName: string;
	mimeType: string;
	sizeBytes: string;
	documentType: string;
	classification: string;
	checksumSha256: string;
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

const WIZARD_STEPS = [
	{ key: "jenis_data", label: "Jenis Data" },
	{ key: "wilayah_resmi", label: "Wilayah Resmi" },
	{ key: "wilayah_rinci_lokal", label: "Wilayah Rinci Lokal" },
	{ key: "identitas_utama", label: "Identitas Utama" },
	{ key: "atribut_inti", label: "Atribut Inti" },
	{ key: "detail_modul", label: "Detail Modul" },
	{ key: "relasi_orang", label: "Pengurus/Wali/Pengasuh" },
	{ key: "dokumen_pendukung", label: "Dokumen Pendukung" },
	{ key: "validasi_duplikasi", label: "Validasi dan Duplikasi" },
	{ key: "generate_id", label: "Generate ID" },
	{ key: "review_submit", label: "Review dan Submit" },
] as const;

type WizardStepKey = typeof WIZARD_STEPS[number]["key"];

interface WizardFormState {
	entityId?: string;
	objectTypeCode: string;
	objectSubtypeCode: string;
	districtCode: string;
	officialVillageCode: string;
	localRegionId: string;
	displayName: string;
	addressText: string;
	sensitivityLevel: string;
	sourceInput: string;
	sourceInstitution: string;
	latitude: string;
	longitude: string;
}

interface WizardValidationState {
	globalErrors: string[];
	sectionErrors: Partial<Record<WizardStepKey, string[]>>;
}

function defaultWizardState(): WizardFormState {
	return {
		objectTypeCode: "",
		objectSubtypeCode: "",
		districtCode: "",
		officialVillageCode: "",
		localRegionId: "",
		displayName: "",
		addressText: "",
		sensitivityLevel: "internal",
		sourceInput: "manual",
		sourceInstitution: "",
		latitude: "",
		longitude: "",
	};
}

function pageLabel(page: string): string {
	if (page === "entities/new") return "Buat Draft Baru";
	if (page.startsWith("entities/")) return "Detail Entitas";
	if (page.startsWith("verification/")) return "Review Verifikasi";
	if (page.startsWith("imports/")) return "Review Batch Import";
	if (page.startsWith("documents/")) return "Dokumen Entitas";
	return PAGE_LABELS[page] ?? PAGE_LABELS.overview;
}

function navButtons(currentPage: string) {
	return Object.entries(PAGE_LABELS).map(([page, label]) => ({
		type: "button",
		label,
		action_id: `nav_${page}`,
		style: page === currentPage ? "primary" : "secondary",
	}));
}

function scoreLabel(completionPercent: number, verificationPercent: number): string {
	if (completionPercent >= 85 && verificationPercent >= 85) return "Baik";
	if (completionPercent >= 65 && verificationPercent >= 65) return "Sedang";
	return "Perlu Perhatian";
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
	const label = pageLabel(page);
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

async function overviewBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);


	const dashboard = await getAdminDashboard(ctx, db);
	const blocks: Block[] = [
		...pageIntro("overview"),
		{
			type: "banner",
			variant: "default",
			title: "Dashboard Operasional SIKESRA",
			description: "Ringkasan ini mengikuti tenant, site, permission, dan region scope backend. Gunakan dashboard untuk memprioritaskan verifikasi, import, dokumen, dan pengawasan aktivitas.",
		},
		{
			type: "fields",
			fields: [
				{ label: "Tenant / Site", value: `${dashboard.scope.tenantId} / ${dashboard.scope.siteId}` },
				{ label: "Region Scope", value: dashboard.scope.regionScopeLabel || "all" },
				{ label: "Environment", value: routeCtx.request.url.includes("localhost") ? "Local" : "Cloudflare" },
				{ label: "Auth", value: "Terproteksi via EmDash" },
			],
		},
		{
			type: "stats",
			items: [
				{ label: "Total", value: String(dashboard.kpis.total), description: "Semua entitas aktif dalam scope" },
				{ label: "Draft", value: String(dashboard.kpis.draft), description: "Perlu dilengkapi operator" },
				{ label: "Diajukan", value: String(dashboard.kpis.submitted), description: "Sudah masuk workflow" },
				{ label: "Terverifikasi", value: String(dashboard.kpis.verified), description: "Siap dipakai laporan" },
				{ label: "Perlu Revisi", value: String(dashboard.kpis.needRevision), description: "Perlu tindakan operator / verifikator" },
				{ label: "Ditolak", value: String(dashboard.kpis.rejected), description: "Butuh tindak lanjut dan audit" },
			],
		},
		{ type: "header", text: "Antrian Kerja" },
		{
			type: "table",
			columns: [
				{ key: "label", label: "Antrian" },
				{ key: "total", label: "Jumlah", format: "badge" },
				{ key: "permission", label: "Permission" },
				{ key: "href", label: "Rute" },
			],
			rows: dashboard.workQueues
				.filter((queue) => ctx.permissions.includes(queue.permission))
				.map((queue) => ({
					label: queue.label,
					total: queue.total,
					permission: queue.permission,
					href: queue.href,
				})),
			empty_text: "Tidak ada antrian kerja yang tersedia untuk permission saat ini.",
		},
		{ type: "header", text: "Ringkasan Wilayah" },
		{
			type: "table",
			columns: [
				{ key: "regionName", label: "Wilayah" },
				{ key: "total", label: "Total", format: "badge" },
				{ key: "completionPercent", label: "Kelengkapan" },
				{ key: "verificationPercent", label: "Verifikasi" },
				{ key: "scoreLabel", label: "Skor" },
			],
			rows: dashboard.regionalSummary.map((row) => ({
				regionName: row.regionName,
				total: row.total,
				completionPercent: `${row.completionPercent}%`,
				verificationPercent: `${row.verificationPercent}%`,
				scoreLabel: row.scoreLabel ?? scoreLabel(row.completionPercent, row.verificationPercent),
			})),
			empty_text: "Belum ada data regional untuk scope saat ini.",
		},
		{ type: "header", text: "Ringkasan Atribut" },
		{
			type: "table",
			columns: [
				{ key: "label", label: "Atribut" },
				{ key: "total", label: "Jumlah", format: "badge" },
			],
			rows: dashboard.attributeSummary.map((item) => ({
				label: item.label,
				total: item.total,
			})),
			empty_text: "Atribut aman atau yang diizinkan policy belum tersedia pada scope ini.",
		},
		{ type: "header", text: "Aktivitas Terbaru" },
		{
			type: "table",
			columns: [
				{ key: "createdAt", label: "Waktu" },
				{ key: "actorId", label: "Aktor" },
				{ key: "summary", label: "Aktivitas" },
			],
			rows: dashboard.activity.map((item) => ({
				createdAt: item.createdAt,
				actorId: item.actorId,
				summary: item.summary,
			})),
			empty_text: "Belum ada aktivitas audit terbaru.",
		},
		{ type: "header", text: "Aksi Cepat" },
		{
			type: "actions",
			elements: [
				...(ctx.permissions.includes(SIKESRA_PERMISSIONS.ENTITY_READ) ? [{ type: "button", label: "Buka Registry", action_id: "nav_entities", style: "primary" }] : []),
				...(ctx.permissions.includes(SIKESRA_PERMISSIONS.VERIFICATION_VERIFY) ? [{ type: "button", label: "Antrian Verifikasi", action_id: "nav_verification", style: "secondary" }] : []),
				...(ctx.permissions.includes(SIKESRA_PERMISSIONS.IMPORT_READ) ? [{ type: "button", label: "Review Import", action_id: "nav_imports", style: "secondary" }] : []),
				...(ctx.permissions.includes(SIKESRA_PERMISSIONS.AUDIT_READ) ? [{ type: "button", label: "Lihat Audit", action_id: "nav_audit", style: "secondary" }] : []),
			],
		},
		{ type: "divider" },
		{ type: "header", text: "Rute Penting" },
		{ type: "fields", fields: apiFields() },
	];

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

	const normalizedPage = (input.page || "").replace(/^\//, "");
	if (normalizedPage.startsWith("documents/")) {
		return normalizedPage;
	}
	if (normalizedPage.startsWith("imports/")) {
		return normalizedPage;
	}
	if (normalizedPage.startsWith("verification/")) {
		return normalizedPage;
	}
	if (normalizedPage.startsWith("entities/") && normalizedPage !== "entities/new") {
		return normalizedPage;
	}

	if ((input.page || "").replace(/^\//, "") === "entities/new") {
		return "entities/new";
	}

	if (input.action_id?.startsWith("wizard_") || input.block_id?.startsWith("wizard_")) {
		return "entities/new";
	}

	if (input.action_id?.startsWith("verification_open_") || input.action_id?.startsWith("verification_decide_") || input.action_id === "verification_back_to_queue") {
		const id = /^verification_(?:open|decide)_(.+)$/.exec(input.action_id)?.[1];
		return id ? `verification/${id}` : "verification";
	}

	if (input.action_id?.startsWith("imports_open_") || input.action_id === "imports_back_to_list" || input.action_id?.startsWith("imports_save_row_")) {
		const id = /^imports_(?:open|save_row)_(.+)$/.exec(input.action_id)?.[1];
		return id ? `imports/${id}` : "imports";
	}

	if (input.action_id?.startsWith("documents_open_") || input.action_id === "documents_back_to_list" || input.action_id?.startsWith("documents_create_") || input.action_id?.startsWith("documents_complete_") || input.action_id?.startsWith("documents_refresh_") ) {
		const id = /^documents_(?:open|create|complete|refresh)_(.+)$/.exec(input.action_id)?.[1];
		return id ? `documents/${id}` : "documents";
	}

	if (input.block_id?.startsWith("entities_") || input.action_id?.startsWith("entities_")) {
		return "entities";
	}

	return normalizedPage || "overview";
}

function parseImportBatchId(page: string): string | undefined {
	if (!page.startsWith("imports/")) return undefined;
	return page.slice("imports/".length) || undefined;
}

function parseDocumentEntityId(page: string): string | undefined {
	if (!page.startsWith("documents/")) return undefined;
	return page.slice("documents/".length) || undefined;
}

function parseVerificationEntityId(page: string): string | undefined {
	if (!page.startsWith("verification/")) return undefined;
	return page.slice("verification/".length) || undefined;
}

function parseDetailEntityId(page: string): string | undefined {
	if (!page.startsWith("entities/") || page === "entities/new") return undefined;
	return page.slice("entities/".length) || undefined;
}

function option(label: string, value: string) {
	return { label, value };
}

function stringState(value: unknown, fallback = ""): string {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return fallback;
}

function parseVerificationFilters(input: PluginAdminInteraction): VerificationQueueFilters {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		level: stringValue(values.level) as VerificationQueueFilters["level"],
		moduleCode: stringValue(values.moduleCode),
		regionCode: stringValue(values.regionCode),
		submissionAge: stringValue(values.submissionAge) as VerificationQueueFilters["submissionAge"],
		risk: stringValue(values.risk) as VerificationQueueFilters["risk"],
		completeness: stringValue(values.completeness) as VerificationQueueFilters["completeness"],
		duplicateStatus: stringValue(values.duplicateStatus),
	};
}

function parseVerificationDecisionForm(input: PluginAdminInteraction, fallbackLevel: VerificationLevel): VerificationDecisionFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		verificationLevel: (stringValue(values.verificationLevel) as VerificationLevel) ?? fallbackLevel,
		action: (stringValue(values.action) as VerificationDecisionFormState["action"]) ?? "verify",
		note: stringState(values.note),
		confirmAudit: values.confirmAudit === true || values.confirmAudit === "true" || values.confirmAudit === "on",
	};
}

function parseImportCreateForm(input: PluginAdminInteraction): ImportCreateFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		filename: stringState(values.filename),
		objectTypeCode: stringState(values.objectTypeCode),
		sheetName: stringState(values.sheetName),
	};
}

function parseDocumentUploadForm(input: PluginAdminInteraction): DocumentUploadFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		entityId: stringState(values.entityId),
		fileName: stringState(values.fileName),
		mimeType: stringState(values.mimeType),
		sizeBytes: stringState(values.sizeBytes),
		documentType: stringState(values.documentType),
		classification: stringState(values.classification, "internal"),
		checksumSha256: stringState(values.checksumSha256),
	};
}

function stringValue(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function parseWizardState(input: PluginAdminInteraction): WizardFormState {
	const base = defaultWizardState();
	if (input.type !== "form_submit") return base;
	const values = input.values ?? {};
	return {
		entityId: stringValue(values.entityId),
		objectTypeCode: stringState(values.objectTypeCode),
		objectSubtypeCode: stringState(values.objectSubtypeCode),
		districtCode: stringState(values.districtCode),
		officialVillageCode: stringState(values.officialVillageCode),
		localRegionId: stringState(values.localRegionId),
		displayName: stringState(values.displayName),
		addressText: stringState(values.addressText),
		sensitivityLevel: stringState(values.sensitivityLevel, "internal"),
		sourceInput: stringState(values.sourceInput, "manual"),
		sourceInstitution: stringState(values.sourceInstitution),
		latitude: stringState(values.latitude),
		longitude: stringState(values.longitude),
	};
}

function validateWizardState(state: WizardFormState): WizardValidationState {
	const sectionErrors: Partial<Record<WizardStepKey, string[]>> = {};
	const push = (key: WizardStepKey, message: string) => {
		sectionErrors[key] ??= [];
		sectionErrors[key]!.push(message);
	};

	if (!state.objectTypeCode) push("jenis_data", "Jenis data wajib dipilih.");
	if (!state.objectSubtypeCode) push("jenis_data", "Subjenis data wajib dipilih.");
	if (!state.officialVillageCode) push("wilayah_resmi", "Desa/kelurahan resmi wajib dipilih.");
	if (!state.displayName.trim()) push("identitas_utama", "Nama tampil atau identitas utama wajib diisi.");
	if (!state.sensitivityLevel) push("atribut_inti", "Sensitivitas wajib dipilih.");
	if (!state.sourceInput) push("atribut_inti", "Sumber input wajib dipilih.");

	return {
		globalErrors: Object.values(sectionErrors).flat(),
		sectionErrors,
	};
}

function wizardStepStatus(key: WizardStepKey, state: WizardFormState): { percent: number; status: string } {
	switch (key) {
		case "jenis_data":
			return { percent: state.objectTypeCode && state.objectSubtypeCode ? 100 : state.objectTypeCode || state.objectSubtypeCode ? 50 : 0, status: state.objectTypeCode && state.objectSubtypeCode ? "Lengkap" : "Perlu dilengkapi" };
		case "wilayah_resmi":
			return { percent: state.officialVillageCode ? 100 : state.districtCode ? 50 : 0, status: state.officialVillageCode ? "Lengkap" : "Perlu dilengkapi" };
		case "wilayah_rinci_lokal":
			return { percent: state.localRegionId ? 100 : 0, status: state.localRegionId ? "Terisi" : "Opsional" };
		case "identitas_utama":
			return { percent: state.displayName ? (state.addressText ? 100 : 60) : 0, status: state.displayName ? "Lengkap minimum" : "Perlu dilengkapi" };
		case "atribut_inti":
			return { percent: state.sensitivityLevel && state.sourceInput ? 100 : 0, status: state.sensitivityLevel && state.sourceInput ? "Lengkap" : "Perlu dilengkapi" };
		default:
			return { percent: state.entityId ? 20 : 0, status: state.entityId ? "Tahap berikutnya tersedia setelah draft tersimpan" : "Simpan draft untuk melanjutkan" };
	}
}

function overallCompleteness(state: WizardFormState): number {
	const totals = WIZARD_STEPS.map((step) => wizardStepStatus(step.key, state).percent);
	return Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length);
}

function parseEntityIdFromAction(actionId?: string): string | undefined {
	if (!actionId) return undefined;
	const match = /^wizard_save_(.+)$/.exec(actionId);
	if (!match) return undefined;
	return match[1] === "new" ? undefined : match[1];
}

async function loadWizardOptions(db: D1Binding, tenantId: string, siteId: string, state: WizardFormState) {
	const objectTypes = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	let objectSubtypes: Array<{ code: string; name: string }> = [];
	if (state.objectTypeCode) {
		const subtypes = await db.prepare(
			"SELECT code, name FROM awcms_sikesra_object_subtypes WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND type_code = ? ORDER BY sort_order, name",
		).bind(tenantId, siteId, state.objectTypeCode).all<{ code: string; name: string }>();
		objectSubtypes = subtypes.results;
	}

	const districts = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'district' ORDER BY name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	const villageParams: unknown[] = [tenantId, siteId];
	let villageSql = "SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'village'";
	if (state.districtCode) {
		villageSql += " AND code LIKE ?";
		villageParams.push(`${state.districtCode}%`);
	}
	villageSql += " ORDER BY name LIMIT 300";
	const villages = await db.prepare(villageSql).bind(...villageParams).all<{ code: string; name: string }>();

	let localRegions: Array<{ id: string; level: string; code_local?: string | null; name: string }> = [];
	if (state.officialVillageCode) {
		const localResult = await db.prepare(
			"SELECT id, level, code_local, name FROM awcms_sikesra_local_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND official_village_code = ? ORDER BY name LIMIT 300",
		).bind(tenantId, siteId, state.officialVillageCode).all<{ id: string; level: string; code_local?: string | null; name: string }>();
		localRegions = localResult.results;
	}

	return {
		objectTypes: objectTypes.results,
		objectSubtypes,
		districts: districts.results,
		villages: villages.results,
		localRegions,
	};
}

async function loadImportOptions(db: D1Binding, tenantId: string, siteId: string) {
	const objectTypes = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();
	return { objectTypes: objectTypes.results };
}

async function loadDocumentEntityOptions(db: D1Binding, tenantId: string, siteId: string) {
	const rows = await db.prepare(
		`SELECT id, display_name FROM awcms_sikesra_entities
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY updated_at DESC LIMIT 100`,
	).bind(tenantId, siteId).all<{ id: string; display_name: string }>();
	return rows.results;
}

function buildIdPreview(state: WizardFormState): string {
	if (!state.officialVillageCode || !state.objectTypeCode || !state.objectSubtypeCode) {
		return "[kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]";
	}
	const subtypeCode = state.objectSubtypeCode.slice(-2).padStart(2, "0");
	return `${state.officialVillageCode}${state.objectTypeCode}${subtypeCode}000001`;
}

function wizardPanels(state: WizardFormState, validation: WizardValidationState): Block[] {
	return [{
		type: "tab",
		default_tab: 0,
		panels: WIZARD_STEPS.map((step) => {
			const status = wizardStepStatus(step.key, state);
			const errors = validation.sectionErrors[step.key] ?? [];
			return {
				label: `${step.label}`,
				blocks: [
					{ type: "header", text: step.label },
					{ type: "fields", fields: [
						{ label: "Status", value: status.status },
						{ label: "Kelengkapan", value: `${status.percent}%` },
					] },
					...(errors.length ? [{ type: "banner", variant: "alert", title: "Perlu perhatian", description: errors.join(" ") }] : []),
					{ type: "context", text:
						step.key === "detail_modul" ? "Detail modul per jenis data akan diaktifkan setelah fondasi wizard inti stabil." :
						step.key === "relasi_orang" ? "Data pengurus, wali, atau pengasuh akan menggunakan relasi orang terstruktur." :
						step.key === "dokumen_pendukung" ? "Dokumen pendukung akan memerlukan klasifikasi, checksum, dan audit akses." :
						step.key === "validasi_duplikasi" ? "Validasi dan preview duplikasi akan ditampilkan setelah backend validator section-ready tersedia." :
						step.key === "generate_id" ? "ID SIKESRA hanya dapat dihasilkan setelah validasi minimum backend terpenuhi. RT/RW tidak memengaruhi format ID." :
						step.key === "review_submit" ? "Tahap review akhir akan mengunci draft sebelum submit ke workflow verifikasi." :
						"Lengkapi bagian ini melalui form draft di bawah lalu simpan secara berkala." },
				],
			};
		}),
	}];
}

async function wizardBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	let state = parseWizardState(input);
	let successMessage = "";
	let validation = validateWizardState(state);

	if (input.type === "form_submit" && input.action_id?.startsWith("wizard_save_")) {
		const entityId = parseEntityIdFromAction(input.action_id) ?? state.entityId;
		if (validation.globalErrors.length === 0) {
			if (!entityId) {
				const created = await createEntity(db, {
					objectTypeCode: state.objectTypeCode,
					objectSubtypeCode: state.objectSubtypeCode,
					displayName: state.displayName,
					officialVillageCode: state.officialVillageCode,
					localRegionId: state.localRegionId || undefined,
					sensitivityLevel: state.sensitivityLevel as EntityCreateInput["sensitivityLevel"],
					sourceInput: state.sourceInput as EntityCreateInput["sourceInput"],
					sourceInstitution: state.sourceInstitution || undefined,
				}, ctx);
				state = { ...state, entityId: created.id };
				successMessage = `Draft berhasil dibuat dengan ID internal ${created.id}. Lanjutkan pengisian per langkah.`;
			} else {
				await patchEntity(db, entityId, {
					displayName: state.displayName,
					localRegionId: state.localRegionId || undefined,
					addressText: state.addressText || undefined,
					sensitivityLevel: state.sensitivityLevel as EntityPatchInput["sensitivityLevel"],
					sourceInput: state.sourceInput || undefined,
					sourceInstitution: state.sourceInstitution || undefined,
					latitude: numberValue(state.latitude),
					longitude: numberValue(state.longitude),
				}, ctx);
				state = { ...state, entityId };
				successMessage = `Draft ${entityId} berhasil diperbarui.`;
			}
		}
	}

	validation = validateWizardState(state);
	const options = await loadWizardOptions(db, ctx.tenantId, ctx.siteId, state);
	const overall = overallCompleteness(state);

	return [
		...pageIntro("entities/new"),
		{
			type: "banner",
			variant: "default",
			title: "Create Wizard SIKESRA",
			description: "Wizard ini memandu pembuatan draft melalui 11 langkah. Simpan draft secara berkala untuk mempertahankan progres kerja operator.",
		},
		...(successMessage ? [{ type: "banner", variant: "success", title: "Draft tersimpan", description: successMessage }] : []),
		...(validation.globalErrors.length ? [{ type: "banner", variant: "alert", title: "Lengkapi field wajib", description: validation.globalErrors.join(" ") }] : []),
		{ type: "fields", fields: [
			{ label: "Draft ID", value: state.entityId ?? "Belum dibuat" },
			{ label: "Kelengkapan Overall", value: `${overall}%` },
			{ label: "Autosave", value: state.entityId ? "Perubahan tersimpan saat Simpan Draft ditekan" : "Draft dibuat saat field minimum terpenuhi dan disimpan" },
			{ label: "Catatan Verifikator", value: "Belum ada catatan verifikator untuk draft ini" },
		] },
		...wizardPanels(state, validation),
		{ type: "header", text: "Progress Langkah" },
		{
			type: "table",
			columns: [
				{ key: "step", label: "Langkah" },
				{ key: "status", label: "Status" },
				{ key: "percent", label: "Kelengkapan" },
			],
			rows: WIZARD_STEPS.map((step, index) => {
				const info = wizardStepStatus(step.key, state);
				return { step: `${index + 1}. ${step.label}`, status: info.status, percent: `${info.percent}%` };
			}),
		},
		{ type: "header", text: "Form Draft Inti" },
		{ type: "context", text: "Field bertanda wajib harus diisi sebelum draft dapat dibuat. Field lain dapat dilengkapi bertahap. Sensitivitas menampilkan dampak masking pada layar operator dan publik." },
		{
			type: "form",
			block_id: "wizard_entity_form",
			fields: [
				{ type: "text_input", action_id: "entityId", label: "Entity ID (sistem)", initial_value: state.entityId ?? "", placeholder: "Akan terisi setelah draft dibuat" },
				{ type: "select", action_id: "objectTypeCode", label: "Langkah 1. Jenis Data (wajib)", initial_value: state.objectTypeCode, options: [option("Pilih jenis data", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "objectSubtypeCode", label: "Langkah 1. Subjenis Data (wajib)", initial_value: state.objectSubtypeCode, options: [option(state.objectTypeCode ? "Pilih subjenis data" : "Pilih jenis data terlebih dahulu", ""), ...options.objectSubtypes.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "districtCode", label: "Langkah 2. Kecamatan (recommended)", initial_value: state.districtCode, options: [option("Pilih kecamatan", ""), ...options.districts.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "officialVillageCode", label: "Langkah 2. Desa/Kelurahan Resmi (wajib)", initial_value: state.officialVillageCode, options: [option(state.districtCode ? "Pilih desa/kelurahan" : "Pilih kecamatan terlebih dahulu atau tampilkan semua", ""), ...options.villages.map((row) => option(row.name, row.code))] },
				{ type: "select", action_id: "localRegionId", label: "Langkah 3. Wilayah Lokal (opsional)", initial_value: state.localRegionId, options: [option(state.officialVillageCode ? "Pilih wilayah lokal" : "Pilih desa/kelurahan terlebih dahulu", ""), ...options.localRegions.map((row) => option(`${row.level.toUpperCase()}${row.code_local ? ` ${row.code_local}` : ""} / ${row.name}`, row.id))] },
				{ type: "text_input", action_id: "displayName", label: "Langkah 4. Identitas Utama / Nama Tampil (wajib)", initial_value: state.displayName, placeholder: "Contoh: Masjid Al-Ikhlas Sidorejo" },
				{ type: "text_input", action_id: "addressText", label: "Langkah 4. Alamat Ringkas (recommended)", initial_value: state.addressText, placeholder: "Alamat ringkas sesuai kewenangan operator" },
				{ type: "select", action_id: "sensitivityLevel", label: "Langkah 5. Sensitivitas (wajib)", initial_value: state.sensitivityLevel, options: [
					option("Publik Aman", "public_safe"),
					option("Internal", "internal"),
					option("Terbatas", "restricted"),
					option("Sangat Terbatas", "highly_restricted"),
				] },
				{ type: "select", action_id: "sourceInput", label: "Langkah 5. Sumber Input (wajib)", initial_value: state.sourceInput, options: [
					option("Manual", "manual"),
					option("Import", "import"),
					option("Integrasi", "integration"),
				] },
				{ type: "text_input", action_id: "sourceInstitution", label: "Langkah 5. Sumber Institusi (opsional)", initial_value: state.sourceInstitution, placeholder: "Contoh: Sekretariat Daerah / Operator Kecamatan" },
				{ type: "number_input", action_id: "latitude", label: "Langkah 6. Latitude (opsional)" , initial_value: numberValue(state.latitude) },
				{ type: "number_input", action_id: "longitude", label: "Langkah 6. Longitude (opsional)", initial_value: numberValue(state.longitude) },
			],
			submit: { label: state.entityId ? "Simpan Draft" : "Buat dan Simpan Draft", action_id: `wizard_save_${state.entityId ?? "new"}` },
		},
		{ type: "fields", fields: [
			{ label: "Preview ID SIKESRA", value: buildIdPreview(state) },
			{ label: "Aturan ID", value: "RT/RW/wilayah lokal tidak memengaruhi format ID SIKESRA" },
			{ label: "Duplicate Warning", value: state.displayName && state.officialVillageCode ? "Preview duplikasi akan diaktifkan setelah validator backend siap" : "Lengkapi identitas dan wilayah untuk evaluasi duplikasi" },
			{ label: "Masking Preview", value: state.sensitivityLevel === "highly_restricted" ? "Nama dan field sensitif akan dimasking ketat" : state.sensitivityLevel === "restricted" ? "Nama sensitif akan dimasking bila permission tidak cukup" : "Field inti dapat tampil sesuai kebijakan" },
		] },
		{ type: "header", text: "Tahap Lanjutan" },
		{ type: "table", columns: [
			{ key: "step", label: "Tahap" },
			{ key: "status", label: "Status" },
			{ key: "note", label: "Catatan" },
		], rows: [
			{ step: "Detail Modul", status: state.entityId ? "Siap berikutnya" : "Menunggu draft", note: "Form detail per jenis data diaktifkan setelah draft inti tersimpan" },
			{ step: "Pengurus / Wali / Pengasuh", status: state.entityId ? "Siap berikutnya" : "Menunggu draft", note: "Relasi orang akan mengikuti tabel entity_people dan person_profiles" },
			{ step: "Dokumen Pendukung", status: state.entityId ? "Siap berikutnya" : "Menunggu draft", note: "Upload dan klasifikasi dokumen memerlukan flow R2 + metadata D1" },
			{ step: "Validasi / Duplikasi", status: state.entityId ? "Siap berikutnya" : "Menunggu draft", note: "Validasi section-key dan preview kandidat duplikasi akan memakai endpoint khusus" },
			{ step: "Generate ID / Review Submit", status: state.entityId ? "Menunggu validasi" : "Menunggu draft", note: "ID final hanya dibuat setelah validasi minimum backend terpenuhi" },
		] },
	];
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

async function loadVerificationOptions(db: D1Binding, tenantId: string, siteId: string) {
	const objectTypes = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();
	const districts = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'district' ORDER BY name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();
	return {
		objectTypes: objectTypes.results,
		districts: districts.results,
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

function formatVerificationRisk(risk: string): string {
	if (risk === "high") return "Risiko Tinggi";
	if (risk === "medium") return "Risiko Sedang";
	return "Risiko Rendah";
}

function importStageStatus(status: string): string {
	if (status === "promoted") return "Selesai";
	if (status === "validated") return "Siap Promosi";
	if (status === "mapped") return "Perlu Validasi";
	if (status === "uploaded") return "Perlu Mapping";
	if (status === "failed") return "Gagal";
	return status || "Draft";
}

function rowStatusLabel(status: string): string {
	return ({
		pending: "Pending",
		valid: "Valid",
		invalid: "Invalid",
		corrected: "Corrected",
		duplicate_review: "Duplicate Review",
		promoted: "Promoted",
		skipped: "Skipped",
		failed: "Failed",
	} as Record<string, string>)[status] ?? status;
}

function documentClassificationLabel(value: string): string {
	return ({
		internal: "Internal",
		restricted: "Restricted",
		highly_restricted: "Highly Restricted",
	} as Record<string, string>)[value] ?? value;
}

function determineDefaultLevel(status: string): VerificationLevel {
	if (status === "submitted_subdistrict") return "kecamatan";
	if (status === "submitted_regency") return "kabupaten";
	return "desa";
}

async function verificationQueueBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const filters = parseVerificationFilters(input);
	const [queue, options] = await Promise.all([
		getVerificationQueue(db, filters, ctx),
		loadVerificationOptions(db, ctx.tenantId, ctx.siteId),
	]);

	return [
		...pageIntro("verification"),
		{ type: "banner", variant: "default", title: "Queue Verifikasi", description: "Antrian ini difilter oleh permission, status, dan region scope backend. Gunakan tombol review untuk membuka layar pemeriksaan entitas." },
		{ type: "stats", items: [
			{ label: "Total antrian", value: String(queue.length), description: "Queue setelah filter" },
			{ label: "Risiko tinggi", value: String(queue.filter((item) => item.riskLevel === "high").length), description: "Perlu prioritas review" },
			{ label: "Butuh revisi", value: String(queue.filter((item) => item.currentStatus === "need_revision").length), description: "Draft revisi menunggu tindak lanjut" },
		] },
		{ type: "form", block_id: "verification_filters", fields: [
			{ type: "select", action_id: "level", label: "Level", initial_value: filters.level ?? "", options: [option("Semua level", ""), option("Desa", "desa"), option("Kecamatan", "kecamatan"), option("Kabupaten", "kabupaten"), option("OPD", "opd")] },
			{ type: "select", action_id: "moduleCode", label: "Module", initial_value: filters.moduleCode ?? "", options: [option("Semua module", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "regionCode", label: "Region", initial_value: filters.regionCode ?? "", options: [option("Semua region", ""), ...options.districts.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "submissionAge", label: "Submission age", initial_value: filters.submissionAge ?? "", options: [option("Semua umur submit", ""), option("Hari ini", "today"), option("<= 3 hari", "3d"), option("<= 7 hari", "7d"), option("<= 30 hari", "30d")] },
			{ type: "select", action_id: "risk", label: "Risk", initial_value: filters.risk ?? "", options: [option("Semua risk", ""), option("Rendah", "low"), option("Sedang", "medium"), option("Tinggi", "high")] },
			{ type: "select", action_id: "completeness", label: "Completeness", initial_value: filters.completeness ?? "", options: [option("Semua kelengkapan", ""), option("< 50%", "lt50"), option("50% - 79%", "50to79"), option(">= 80%", "80plus")] },
			{ type: "select", action_id: "duplicateStatus", label: "Duplicate status", initial_value: filters.duplicateStatus ?? "", options: [option("Semua status duplikasi", ""), ...Object.entries(DUPLICATE_STATUS_LABELS).map(([value, label]) => option(label, value))] },
		], submit: { label: "Terapkan filter", action_id: "verification_apply_filters" } },
		{ type: "header", text: "Daftar Review" },
		...(queue.length ? queue.flatMap((item) => ([
			{ type: "section", text: `${item.displayName} | ${item.objectTypeCode}/${item.objectSubtypeCode} | ${item.currentStatus} | ${item.completenessPercent}% | ${formatVerificationRisk(item.riskLevel)}`, accessory: { type: "button", label: "Review", action_id: `verification_open_${item.entityId}`, style: "primary" } },
			{ type: "context", text: `Wilayah ${item.officialVillageCode} · Submit ${item.submittedAt} · Duplicate ${DUPLICATE_STATUS_LABELS[item.duplicateStatus] ?? item.duplicateStatus}` },
		])) : [{ type: "empty", title: "Antrian kosong", description: "Tidak ada item verifikasi yang cocok dengan filter dan scope backend saat ini." }]),
	];
}

async function verificationReviewBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entityId = parseVerificationEntityId(page);
	if (!entityId) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Review verifikasi tidak valid", description: `page: ${page}` }];
	}

	const detail = await getEntityDetail(db, entityId, ctx);
	if (!detail) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Entitas verifikasi tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` }];
	}

	const defaultLevel = determineDefaultLevel(detail.entity.statusVerification);
	let decisionFeedback = "";
	let decisionErrors: string[] = [];

	if (input.type === "form_submit" && input.action_id === `verification_decide_${entityId}`) {
		const decisionState = parseVerificationDecisionForm(input, defaultLevel);
		if (!decisionState.confirmAudit) {
			decisionErrors.push("Konfirmasi audit wajib dicentang sebelum keputusan dikirim.");
		}
		if ((decisionState.action === "need_revision" || decisionState.action === "reject") && !decisionState.note.trim()) {
			decisionErrors.push("Alasan wajib diisi untuk keputusan revisi atau penolakan.");
		}
		if (decisionErrors.length === 0) {
			const result = await verifyEntity(db, entityId, {
				action: decisionState.action,
				note: decisionState.note,
				verificationLevel: decisionState.verificationLevel,
			}, ctx);
			decisionFeedback = `Keputusan verifikasi tersimpan. Status baru: ${result.newStatus}.`;
		}
	}

	const refreshedDetail = decisionFeedback ? await getEntityDetail(db, entityId, ctx) : detail;
	const timeline = await getVerificationTimeline(db, entityId, ctx);
	const activeDetail = refreshedDetail ?? detail;
	const checklistRows = [
		{ item: "Official region valid", status: activeDetail.entity.officialRegion.village ? "Ya" : "Periksa" },
		{ item: "Local region reasonable", status: activeDetail.entity.localRegion?.items?.length ? "Ya" : "Opsional / belum ada" },
		{ item: "Identity complete", status: activeDetail.entity.displayName ? "Ya" : "Periksa" },
		{ item: "Required attributes complete", status: activeDetail.entity.completenessPercent >= 80 ? "Cukup" : "Perlu perhatian" },
		{ item: "Required documents present", status: Array.isArray(activeDetail.documents) && activeDetail.documents.length ? "Ada" : "Belum ada" },
		{ item: "Duplicate warnings reviewed", status: DUPLICATE_STATUS_LABELS[activeDetail.entity.duplicateStatus ?? "unknown"] ?? "unknown" },
		{ item: "Sensitive classification correct", status: SENSITIVITY_LABELS[activeDetail.entity.sensitivityLevel] ?? activeDetail.entity.sensitivityLevel },
	];

	return [
		...pageIntro(page),
		{ type: "banner", variant: "default", title: `Review Verifikasi: ${activeDetail.entity.displayName}`, description: "Gunakan layar ini untuk meninjau ringkasan, checklist, dokumen, duplikasi, dan mengirim keputusan verifikasi yang akan diaudit." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Queue", action_id: "verification_back_to_queue", style: "secondary" }] },
		...(decisionFeedback ? [{ type: "banner", variant: "success", title: "Keputusan tersimpan", description: decisionFeedback }] : []),
		...(decisionErrors.length ? [{ type: "banner", variant: "alert", title: "Keputusan belum dikirim", description: decisionErrors.join(" ") }] : []),
		{ type: "fields", fields: [
			{ label: "ID SIKESRA", value: activeDetail.entity.sikesraId20 ?? "Belum dibuat" },
			{ label: "Status Verifikasi", value: formatVerificationStatus(activeDetail.entity.statusVerification) },
			{ label: "Level Saat Ini", value: activeDetail.entity.verificationLevel ?? defaultLevel },
			{ label: "Kelengkapan", value: `${activeDetail.entity.completenessPercent}%` },
		] },
		{ type: "tab", default_tab: 0, panels: [
			{ label: "Summary", blocks: [
				{ type: "fields", fields: [
					{ label: "Jenis / Subjenis", value: `${activeDetail.entity.objectTypeName} / ${activeDetail.entity.objectSubtypeName}` },
					{ label: "Wilayah Resmi", value: activeDetail.entity.officialRegion.village?.name ?? activeDetail.entity.officialRegion.district?.name ?? "-" },
					{ label: "Wilayah Lokal", value: activeDetail.entity.localRegion?.items?.[0]?.name ?? "-" },
					{ label: "Next Action", value: String(activeDetail.verification?.["nextAction"] ?? "Belum tersedia") },
				] },
			] },
			{ label: "Checklist", blocks: [
				{ type: "table", columns: [{ key: "item", label: "Checklist" }, { key: "status", label: "Status" }], rows: checklistRows },
			] },
			{ label: "Dokumen", blocks: [
				{ type: "table", columns: [{ key: "label", label: "Dokumen" }, { key: "value", label: "Nilai" }, { key: "access", label: "Akses" }], rows: (activeDetail.documents ?? []).map((row) => ({ label: String(row["label"] ?? "Dokumen"), value: String(row["value"] ?? "-"), access: String(row["access"] ?? "-") })), empty_text: "Belum ada dokumen pendukung yang terhubung." },
			] },
			{ label: "Duplikasi", blocks: [
				{ type: "fields", fields: [
					{ label: "Duplicate Status", value: DUPLICATE_STATUS_LABELS[activeDetail.entity.duplicateStatus ?? "unknown"] ?? (activeDetail.entity.duplicateStatus ?? "unknown") },
					{ label: "Risk", value: activeDetail.entity.duplicateStatus === "candidate" ? "Tinggi" : activeDetail.entity.completenessPercent < 50 ? "Tinggi" : activeDetail.entity.completenessPercent < 80 ? "Sedang" : "Rendah" },
					{ label: "Summary", value: activeDetail.entity.duplicateStatus === "candidate" ? "Perlu review kandidat duplikasi sebelum finalisasi." : "Tidak ada sinyal duplikasi kritis pada ringkasan saat ini." },
				] },
			] },
			{ label: "Timeline", blocks: [
				{ type: "table", columns: [{ key: "createdAt", label: "Waktu" }, { key: "level", label: "Level" }, { key: "action", label: "Keputusan" }, { key: "note", label: "Catatan" }], rows: timeline.map((item) => ({ createdAt: item.createdAt, level: item.verificationLevel, action: item.action, note: item.note ?? "-" })), empty_text: "Belum ada event verifikasi." },
			] },
		] },
		{ type: "header", text: "Decision Panel" },
		{ type: "context", text: "Revisi dan penolakan wajib menyertakan alasan. Mengirim keputusan berarti Anda mengonfirmasi bahwa tindakan ini akan dicatat ke audit trail SIKESRA." },
		{ type: "form", block_id: "verification_decision_form", fields: [
			{ type: "select", action_id: "verificationLevel", label: "Level Verifikasi", initial_value: defaultLevel, options: [option("Desa", "desa"), option("Kecamatan", "kecamatan"), option("Kabupaten", "kabupaten"), option("OPD", "opd")] },
			{ type: "select", action_id: "action", label: "Keputusan", initial_value: "verify", options: [option("Verify", "verify"), option("Need revision", "need_revision"), option("Reject", "reject")] },
			{ type: "text_input", action_id: "note", label: "Alasan / Catatan", multiline: true, initial_value: "", placeholder: "Wajib diisi untuk need revision atau reject" },
			{ type: "checkbox", action_id: "confirmAudit", label: "Saya memahami keputusan ini akan diaudit" },
		], submit: { label: "Kirim Keputusan", action_id: `verification_decide_${entityId}` } },
	];
}

async function importsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const options = await loadImportOptions(db, ctx.tenantId, ctx.siteId);
	let notice = "";
	const form = parseImportCreateForm(input);

	if (input.type === "form_submit" && input.action_id === "imports_create_batch") {
		if (form.filename.trim()) {
			const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			const now = new Date();
			const yyyy = String(now.getUTCFullYear());
			const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
			const safeName = form.filename.trim().replace(/[^a-zA-Z0-9._-]+/g, "-");
			await db.prepare(
				`INSERT INTO awcms_sikesra_import_batches
				 (id, tenant_id, site_id, r2_key, original_filename, sheet_name, status, object_type_code, created_by, updated_by)
				 VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?, ?, ?)`,
			).bind(
				id,
				ctx.tenantId,
				ctx.siteId,
				`tenants/${ctx.tenantId}/sites/${ctx.siteId}/modules/sikesra/imports/${yyyy}/${mm}/${safeName}`,
				form.filename.trim(),
				form.sheetName || null,
				form.objectTypeCode || null,
				ctx.userId,
				ctx.userId,
			).run();
			notice = `Batch import ${id} berhasil dibuat. Lanjutkan ke tahap mapping dan validasi.`;
		}
	}

	const rows = await db.prepare(
		`SELECT id, original_filename, sheet_name, status, object_type_code, row_count, valid_row_count, invalid_row_count, promoted_row_count, created_at, updated_at
		 FROM awcms_sikesra_import_batches
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY created_at DESC LIMIT 20`,
	).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

	return [
		...pageIntro("imports"),
		{ type: "banner", variant: "default", title: "Import Center SIKESRA", description: "Pusat import menata alur upload workbook, pemetaan kolom, staging row, validasi, duplicate review, promosi, dan laporan hasil secara bertahap." },
		...(notice ? [{ type: "banner", variant: "success", title: "Batch dibuat", description: notice }] : []),
		{ type: "stats", items: [
			{ label: "Batch aktif", value: String(rows.results.length), description: "20 batch terbaru" },
			{ label: "Perlu mapping", value: String(rows.results.filter((row) => String(row.status) === "uploaded").length), description: "Upload baru menunggu mapping" },
			{ label: "Siap promosi", value: String(rows.results.filter((row) => String(row.status) === "validated").length), description: "Sudah tervalidasi" },
			{ label: "Gagal", value: String(rows.results.filter((row) => String(row.status) === "failed").length), description: "Perlu investigasi" },
		] },
		{ type: "form", block_id: "imports_create_form", fields: [
			{ type: "text_input", action_id: "filename", label: "Upload workbook (nama file)", initial_value: form.filename, placeholder: "contoh: data-rumah-ibadah-2026.xlsx" },
			{ type: "text_input", action_id: "sheetName", label: "Select sheet (opsional untuk draft shell)", initial_value: form.sheetName, placeholder: "contoh: Sheet1 / Data Yatim" },
			{ type: "select", action_id: "objectTypeCode", label: "Jenis data target", initial_value: form.objectTypeCode, options: [option("Pilih jenis data", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
		], submit: { label: "Buat Batch Import", action_id: "imports_create_batch" } },
		{ type: "header", text: "Daftar Batch" },
		...(rows.results.length ? rows.results.flatMap((row) => ([
			{ type: "section", text: `${String(row.original_filename ?? "upload.xlsx")} | ${importStageStatus(String(row.status ?? "uploaded"))} | ${String(row.row_count ?? 0)} row`, accessory: { type: "button", label: "Buka Batch", action_id: `imports_open_${String(row.id)}`, style: "primary" } },
			{ type: "context", text: `Sheet ${String(row.sheet_name ?? "belum dipilih")} · valid ${String(row.valid_row_count ?? 0)} · invalid ${String(row.invalid_row_count ?? 0)} · promoted ${String(row.promoted_row_count ?? 0)}` },
		])) : [{ type: "empty", title: "Belum ada batch import", description: "Buat batch pertama untuk memulai alur upload workbook dan staging row." }]),
	];
}

async function importBatchDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const batchId = parseImportBatchId(page);
	if (!batchId) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Batch import tidak valid", description: `page: ${page}` }];
	}

	if (input.type === "form_submit" && input.action_id === `imports_save_row_${batchId}`) {
		const values = input.values ?? {};
		const rowId = stringValue(values.rowId);
		if (rowId) {
			await updateStagingRow(db, rowId, {
				mappedData: { correctedPreview: stringState(values.correctedPreview) },
				validationErrors: stringState(values.validationNote) ? { note: [stringState(values.validationNote)] } : undefined,
				rowStatus: (stringValue(values.rowStatus) as any) ?? undefined,
			}, ctx);
		}
	}

	const batch = await getImportBatch(db, batchId, ctx);
	if (!batch) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Batch import tidak ditemukan", description: `ID ${batchId} tidak tersedia pada scope backend saat ini.` }];
	}

	const stagingRows = await getStagingRows(db, batchId, ctx);
	const selectedRow = stagingRows.find((row) => row.rowStatus === "invalid" || row.rowStatus === "duplicate_review") ?? stagingRows[0];
	const duplicateRows = stagingRows.filter((row) => row.rowStatus === "duplicate_review");
	const invalidRows = stagingRows.filter((row) => row.rowStatus === "invalid");

	return [
		...pageIntro(page),
		{ type: "banner", variant: "default", title: `Batch Import ${batch.id}`, description: "Gunakan halaman batch untuk menavigasi setiap tahap import: upload workbook, mapping, validasi, staging preview, koreksi invalid row, duplicate review, promosi, dan laporan hasil." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Daftar Batch", action_id: "imports_back_to_list", style: "secondary" }] },
		{ type: "fields", fields: [
			{ label: "Workbook", value: batch.originalFilename },
			{ label: "Sheet", value: batch.sheetName ?? "Belum dipilih" },
			{ label: "Status", value: importStageStatus(batch.status) },
			{ label: "Row count", value: String(batch.rowCount) },
			{ label: "Valid row", value: String(batch.validRowCount) },
			{ label: "Invalid row", value: String(batch.invalidRowCount) },
			{ label: "Promoted row", value: String(batch.promotedRowCount) },
			{ label: "Dibuat", value: batch.createdAt },
		] },
		{ type: "table", columns: [{ key: "step", label: "Tahap" }, { key: "status", label: "Status" }, { key: "note", label: "Catatan" }], rows: [
			{ step: "1. Upload workbook", status: "Selesai", note: `File ${batch.originalFilename} tercatat di batch shell.` },
			{ step: "2. Select sheet", status: batch.sheetName ? "Selesai" : "Perlu dipilih", note: batch.sheetName ?? "Pilih sheet target sebelum parsing row." },
			{ step: "3. Map columns", status: batch.status === "uploaded" ? "Menunggu" : "Berjalan / selesai", note: "Pemetaan kolom akan menargetkan field SIKESRA sesuai jenis data." },
			{ step: "4. Validate mapping", status: batch.status === "validated" || batch.status === "promoted" ? "Selesai" : batch.status === "mapped" ? "Siap divalidasi" : "Menunggu", note: "Validasi wajib memeriksa tipe data, region, dan required field." },
			{ step: "5. Preview staging rows", status: stagingRows.length ? "Tersedia" : "Belum tersedia", note: `${stagingRows.length} row staging pada batch ini.` },
			{ step: "6. Correct invalid rows", status: invalidRows.length ? "Perlu tindakan" : "Tidak ada invalid row", note: `${invalidRows.length} row invalid memerlukan koreksi.` },
			{ step: "7. Review duplicate candidates", status: duplicateRows.length ? "Perlu review" : "Tidak ada kandidat", note: `${duplicateRows.length} row berstatus duplicate review.` },
			{ step: "8. Promote selected valid rows", status: batch.status === "promoted" ? "Selesai" : batch.status === "validated" ? "Siap promosi" : "Menunggu", note: "Promosi tidak sama dengan verifikasi akhir." },
			{ step: "9. Display import report", status: batch.status === "promoted" ? "Siap ditampilkan" : "Akan lengkap setelah promosi", note: "Laporan merangkum valid, invalid, duplicate, promoted, skipped, dan failed." },
		] },
		{ type: "tab", default_tab: 0, panels: [
			{ label: "Staging Preview", blocks: [
				{ type: "table", columns: [{ key: "rowNumber", label: "Row" }, { key: "rowStatus", label: "Status" }, { key: "duplicateRisk", label: "Risk" }, { key: "rawPreview", label: "Preview" }], rows: stagingRows.map((row) => ({ rowNumber: row.rowNumber, rowStatus: rowStatusLabel(row.rowStatus), duplicateRisk: row.duplicateRisk ?? "-", rawPreview: JSON.stringify(row.rawData).slice(0, 80) })), empty_text: "Belum ada staging row untuk batch ini." },
			] },
			{ label: "Correct Invalid Rows", blocks: [
				...(selectedRow ? [
					{ type: "fields", fields: [
						{ label: "Row terpilih", value: String(selectedRow.rowNumber) },
						{ label: "Status", value: rowStatusLabel(selectedRow.rowStatus) },
						{ label: "Validation errors", value: selectedRow.validationErrors ? JSON.stringify(selectedRow.validationErrors) : "-" },
					] },
					{ type: "form", block_id: "imports_correct_row", fields: [
						{ type: "text_input", action_id: "rowId", label: "Row ID", initial_value: selectedRow.id },
						{ type: "text_input", action_id: "correctedPreview", label: "Corrected preview", multiline: true, initial_value: JSON.stringify(selectedRow.mappedData ?? selectedRow.rawData, null, 2) },
						{ type: "text_input", action_id: "validationNote", label: "Catatan validasi", multiline: true, initial_value: selectedRow.validationErrors ? JSON.stringify(selectedRow.validationErrors) : "" },
						{ type: "select", action_id: "rowStatus", label: "Status row", initial_value: selectedRow.rowStatus, options: [option("Valid", "valid"), option("Invalid", "invalid"), option("Corrected", "corrected"), option("Duplicate Review", "duplicate_review"), option("Skipped", "skipped"), option("Failed", "failed")] },
					], submit: { label: "Simpan Koreksi", action_id: `imports_save_row_${batchId}` } },
				] : [{ type: "empty", title: "Tidak ada row yang perlu dikoreksi", description: "Invalid row atau duplicate review belum tersedia pada batch ini." }]),
			] },
			{ label: "Duplicate Review", blocks: [
				{ type: "table", columns: [{ key: "rowNumber", label: "Row" }, { key: "risk", label: "Risk" }, { key: "decision", label: "Aksi Operator" }], rows: duplicateRows.map((row) => ({ rowNumber: row.rowNumber, risk: row.duplicateRisk ?? "-", decision: row.duplicateRisk === "blocking" ? "Butuh keputusan dan alasan" : "Review sebelum promosi" })), empty_text: "Belum ada kandidat duplikasi untuk direview." },
			] },
			{ label: "Promote & Report", blocks: [
				{ type: "fields", fields: [
					{ label: "Promote readiness", value: batch.status === "validated" ? "Siap promosi" : batch.status === "promoted" ? "Sudah dipromosikan" : "Belum siap" },
					{ label: "Promoted rows", value: String(batch.promotedRowCount) },
					{ label: "Import report", value: batch.status === "promoted" ? "Laporan siap ditinjau" : "Laporan akan lengkap setelah promosi" },
				] },
				{ type: "context", text: "Promosi valid row dan duplicate override tetap memerlukan backend workflow lengkap sebelum tombol eksekusi diaktifkan." },
			] },
		] },
	];
}

async function documentsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entities = await loadDocumentEntityOptions(db, ctx.tenantId, ctx.siteId);
	const entityPreview = entities.slice(0, 12);

	return [
		...pageIntro("documents"),
		{ type: "banner", variant: "default", title: "Document Center", description: "Pusat dokumen menampilkan upload guidance, klasifikasi, checksum, status verifikasi, dan akses yang aman. Raw R2 key tidak pernah ditampilkan ke operator." },
		{ type: "stats", items: [
			{ label: "Entitas siap dokumen", value: String(entities.length), description: "100 entitas terbaru pada scope" },
			{ label: "Accepted type", value: "PDF / JPG / PNG", description: "Disesuaikan dari policy upload" },
			{ label: "Maks ukuran", value: "10 MB", description: "Mengikuti batas upload modul" },
		] },
		{ type: "fields", fields: [
			{ label: "Klasifikasi wajib", value: "Internal / Restricted / Highly Restricted" },
			{ label: "Akses download", value: "Harus melalui backend response URL/proxy" },
			{ label: "Checksum", value: "Ditampilkan setelah konfirmasi upload" },
			{ label: "Quarantine / failed", value: "Ditandai sebagai status khusus saat tersedia" },
		] },
		{ type: "header", text: "Entitas Untuk Review Dokumen" },
		...(entityPreview.length ? entityPreview.flatMap((row) => ([
			{ type: "section", text: `${row.display_name}`, accessory: { type: "button", label: "Kelola Dokumen", action_id: `documents_open_${row.id}`, style: "primary" } },
			{ type: "context", text: `Entity ID: ${row.id}` },
		])) : [{ type: "empty", title: "Belum ada entitas", description: "Tidak ada entitas pada scope backend untuk dikelola dokumennya." }]),
	];
}

async function documentDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entityId = parseDocumentEntityId(page);
	if (!entityId) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Target dokumen tidak valid", description: `page: ${page}` }];
	}

	const entity = await getEntityDetail(db, entityId, ctx);
	if (!entity) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Entitas dokumen tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` }];
	}

	let notice = "";
	const form = parseDocumentUploadForm(input);

	if (input.type === "form_submit" && input.action_id === `documents_create_${entityId}`) {
		if (form.fileName.trim() && form.mimeType.trim() && form.documentType.trim() && numberValue(form.sizeBytes)) {
			const upload = await generateUploadUrl({
				fileName: form.fileName.trim(),
				mimeType: form.mimeType.trim(),
				sizeBytes: numberValue(form.sizeBytes) ?? 0,
				classification: form.classification as any,
			}, ctx, undefined, db);
			await completeUpload({
				fileObjectId: upload.fileObjectId,
				entityId,
				documentType: form.documentType.trim(),
				classification: form.classification as any,
				checksumSha256: form.checksumSha256 || undefined,
			}, ctx, db);
			notice = `Dokumen ${form.fileName.trim()} dicatat untuk entitas ${entityId}. Upload URL backend: ${upload.uploadUrl}`;
		}
	}

	const documents = await getEntityDocuments(db, entityId, ctx);
	return [
		...pageIntro(page),
		{ type: "banner", variant: "default", title: `Dokumen Entitas: ${entity.entity.displayName}`, description: "Upload, metadata, status verifikasi, dan akses dokumen harus tetap aman. R2 key mentah tidak ditampilkan." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Document Center", action_id: "documents_back_to_list", style: "secondary" }] },
		...(notice ? [{ type: "banner", variant: "success", title: "Dokumen dicatat", description: notice }] : []),
		{ type: "fields", fields: [
			{ label: "Entitas", value: entity.entity.displayName },
			{ label: "ID SIKESRA", value: entity.entity.sikesraId20 ?? "Belum dibuat" },
			{ label: "Akses download", value: entity.access.canDownloadDocuments ? "Diizinkan" : "Terbatas" },
			{ label: "Sensitivitas entitas", value: SENSITIVITY_LABELS[entity.entity.sensitivityLevel] ?? entity.entity.sensitivityLevel },
		] },
		{ type: "form", block_id: "documents_upload_form", fields: [
			{ type: "text_input", action_id: "entityId", label: "Entity ID", initial_value: entityId },
			{ type: "text_input", action_id: "fileName", label: "Nama file upload", initial_value: form.fileName, placeholder: "contoh: sk-pendirian.pdf" },
			{ type: "text_input", action_id: "mimeType", label: "MIME type", initial_value: form.mimeType, placeholder: "application/pdf" },
			{ type: "number_input", action_id: "sizeBytes", label: "Ukuran file (bytes)", initial_value: numberValue(form.sizeBytes) },
			{ type: "text_input", action_id: "documentType", label: "Document type", initial_value: form.documentType, placeholder: "akta_pendirian / foto_lokasi / surat_keterangan" },
			{ type: "select", action_id: "classification", label: "Classification", initial_value: form.classification || "internal", options: [option("Internal", "internal"), option("Restricted", "restricted"), option("Highly Restricted", "highly_restricted")] },
			{ type: "text_input", action_id: "checksumSha256", label: "Checksum SHA-256 (opsional)", initial_value: form.checksumSha256, placeholder: "Masukkan checksum setelah konfirmasi upload" },
		], submit: { label: "Catat Dokumen", action_id: `documents_create_${entityId}` } },
		{ type: "context", text: "Accepted type dan max size harus ditampilkan jelas pada operasional. Upload aktual tetap harus melalui backend response URL/proxy dan tidak boleh mengekspos raw R2 key." },
		{ type: "table", columns: [
			{ key: "documentType", label: "Document Type" },
			{ key: "classification", label: "Classification" },
			{ key: "verification", label: "Verification Status" },
			{ key: "mimeType", label: "MIME" },
			{ key: "sizeBytes", label: "Size" },
			{ key: "checksum", label: "Checksum" },
			{ key: "actions", label: "Allowed Actions" },
		], rows: documents.map((doc) => ({
			documentType: doc.documentType,
			classification: documentClassificationLabel(doc.classification),
			verification: doc.isVerified ? "Verified" : "Pending",
			mimeType: doc.mimeType ?? "-",
			sizeBytes: doc.sizeBytes != null ? `${doc.sizeBytes} bytes` : "-",
			checksum: form.fileName === doc.documentType ? (form.checksumSha256 || "Menunggu checksum") : "Tersimpan via metadata backend",
			actions: entity.access.canDownloadDocuments ? "Preview / Download via backend" : "Lihat metadata saja",
		})), empty_text: "Belum ada dokumen yang ditautkan ke entitas ini." },
		{ type: "table", columns: [
			{ key: "rule", label: "Aturan UI Dokumen" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Accepted types dan max size tampil", status: "Aktif pada form" },
			{ rule: "Document type wajib", status: "Wajib diisi" },
			{ rule: "Classification wajib", status: "Wajib diisi" },
			{ rule: "Checksum dan upload status", status: "Ditampilkan setelah pencatatan" },
			{ rule: "Quarantine / failed", status: "Disiapkan sebagai state operasional lanjutan" },
		] },
	];
}

async function entityDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entityId = parseDetailEntityId(page);

	if (!entityId) {
		return [
			...pageIntro(page),
			{ type: "banner", variant: "alert", title: "Detail entitas tidak valid", description: `page: ${page}` },
		];
	}

	const detail = await getEntityDetail(db, entityId, ctx);
	if (!detail) {
		return [
			...pageIntro(page),
			{ type: "banner", variant: "alert", title: "Entitas tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` },
		];
	}

	const primaryActions = [
		...(detail.access.canEdit ? [{ type: "button", label: "Edit Draft", action_id: `nav_entities/${entityId}`, style: "primary" }] : []),
		...(detail.access.canSubmit ? [{ type: "button", label: "Siapkan Submit", action_id: `nav_entities/${entityId}`, style: "secondary" }] : []),
		...(detail.access.canVerify ? [{ type: "button", label: "Verifikasi", action_id: "nav_verification", style: "secondary" }] : []),
		...(detail.access.canGenerateCode ? [{ type: "button", label: "Generate ID", action_id: `nav_entities/${entityId}`, style: "secondary" }] : []),
	];

	const latestAudit = Array.isArray(detail.audit) && detail.audit.length > 0 ? detail.audit[0] as Record<string, unknown> : null;

	return [
		...pageIntro(page),
		{ type: "banner", variant: "default", title: detail.entity.displayName, description: "Detail entitas ini mengikuti masking, permission, dan ABAC backend. Aksi utama dikendalikan oleh access flags dari backend." },
		{ type: "fields", fields: [
			{ label: "ID SIKESRA", value: detail.entity.sikesraId20 ?? "Belum dibuat" },
			{ label: "Status Data", value: formatDataStatus(detail.entity.statusData) },
			{ label: "Status Verifikasi", value: formatVerificationStatus(detail.entity.statusVerification) },
			{ label: "Sensitivitas", value: SENSITIVITY_LABELS[detail.entity.sensitivityLevel] ?? detail.entity.sensitivityLevel },
		] },
		...(primaryActions.length ? [{ type: "actions", elements: primaryActions }] : []),
		{ type: "columns", columns: [[
			{ type: "header", text: "Ringkasan Entitas" },
			{ type: "fields", fields: [
				{ label: "Jenis / Subjenis", value: String(detail.summary["typeLabel"] ?? "-") },
				{ label: "Wilayah Resmi", value: formatOfficialRegion(detail.entity) },
				{ label: "Wilayah Lokal", value: formatLocalRegion(detail.entity) },
				{ label: "Sumber Input", value: String(detail.summary["sourceInput"] ?? detail.entity.sourceInput ?? "-") },
				{ label: "Dibuat", value: String(detail.summary["createdAt"] ?? detail.entity.createdAt) },
				{ label: "Diperbarui", value: String(detail.summary["updatedAt"] ?? detail.entity.updatedAt) },
			] },
			{ type: "tab", default_tab: 0, panels: [
				{ label: "Ringkasan", blocks: [
					{ type: "fields", fields: [
						{ label: "Nama Tampil", value: detail.entity.displayName },
						{ label: "Alamat", value: String(detail.summary["addressText"] ?? "-") },
						{ label: "Koordinat", value: String(detail.summary["coordinates"] ?? "-") },
						{ label: "Verified By", value: String(detail.summary["verifiedBy"] ?? "-") },
					] },
				] },
				{ label: "Detail Modul", blocks: [
					{ type: "fields", fields: [
						{ label: "Status", value: String(detail.details?.["moduleStatus"] ?? "Belum tersedia") },
						{ label: "Entity Kind", value: String(detail.details?.["entityKind"] ?? detail.entity.entityKind) },
					] },
					{ type: "context", text: "Detail modul spesifik per jenis data akan diperkaya seiring rebuild service/detail table berikutnya." },
				] },
				{ label: "Atribut", blocks: [
					{ type: "table", columns: [
						{ key: "label", label: "Atribut" },
						{ key: "value", label: "Nilai" },
					], rows: (detail.attributes ?? []).map((row) => ({ label: String(row["label"] ?? row["key"] ?? "Atribut"), value: String(row["value"] ?? "-") })), empty_text: "Belum ada atribut yang ditampilkan." },
				] },
				{ label: "Dokumen", blocks: [
					{ type: "table", columns: [
						{ key: "label", label: "Item" },
						{ key: "value", label: "Nilai" },
						{ key: "access", label: "Akses" },
					], rows: (detail.documents ?? []).map((row) => ({ label: String(row["label"] ?? "Dokumen"), value: String(row["value"] ?? "-") , access: String(row["access"] ?? "-") })), empty_text: "Belum ada dokumen yang ditautkan." },
				] },
				{ label: "Verifikasi", blocks: [
					{ type: "fields", fields: [
						{ label: "Status", value: String(detail.verification?.["statusVerification"] ?? detail.entity.statusVerification) },
						{ label: "Level", value: String(detail.verification?.["verificationLevel"] ?? detail.entity.verificationLevel ?? "none") },
						{ label: "Aksi Berikutnya", value: String(detail.verification?.["nextAction"] ?? "Belum tersedia") },
					] },
				] },
				{ label: "Riwayat Bantuan/Layanan", blocks: [
					{ type: "table", columns: [
						{ key: "label", label: "Ringkasan" },
						{ key: "value", label: "Nilai" },
					], rows: (detail.benefits ?? []).map((row) => ({ label: String(row["label"] ?? "Riwayat"), value: String(row["value"] ?? "-") })), empty_text: "Belum ada riwayat bantuan/layanan." },
				] },
				{ label: "Audit", blocks: [
					{ type: "table", columns: [
						{ key: "createdAt", label: "Waktu" },
						{ key: "action", label: "Aksi" },
						{ key: "actorId", label: "Aktor" },
					], rows: (detail.audit ?? []).map((row) => ({ createdAt: String(row["createdAt"] ?? "-"), action: String(row["action"] ?? "-"), actorId: String(row["actorId"] ?? "-") })), empty_text: "Belum ada aktivitas audit terkait entitas ini." },
				] },
			] },
		], [
			{ type: "header", text: "Panel Tindak Lanjut" },
			{ type: "fields", fields: [
				{ label: "Kelengkapan", value: `${detail.entity.completenessPercent}%` },
				{ label: "Duplicate Status", value: DUPLICATE_STATUS_LABELS[detail.entity.duplicateStatus ?? "unknown"] ?? (detail.entity.duplicateStatus ?? "unknown") },
				{ label: "Next Verification", value: String(detail.verification?.["nextAction"] ?? "Belum tersedia") },
				{ label: "Recent Note", value: latestAudit ? String(latestAudit["reason"] ?? latestAudit["action"] ?? "-") : "Belum ada catatan terbaru" },
			] },
			{ type: "header", text: "Access Flags" },
			{ type: "fields", fields: [
				{ label: "canEdit", value: detail.access.canEdit ? "Ya" : "Tidak" },
				{ label: "canSubmit", value: detail.access.canSubmit ? "Ya" : "Tidak" },
				{ label: "canVerify", value: detail.access.canVerify ? "Ya" : "Tidak" },
				{ label: "canGenerateCode", value: detail.access.canGenerateCode ? "Ya" : "Tidak" },
				{ label: "canDownloadDocuments", value: detail.access.canDownloadDocuments ? "Ya" : "Tidak" },
			] },
			{ type: "table", columns: [
				{ key: "action", label: "Aksi Ditolak" },
				{ key: "reasonCode", label: "Alasan" },
			], rows: detail.access.deniedActions.map((item) => ({ action: item.action, reasonCode: item.reasonCode })), empty_text: "Tidak ada aksi yang sedang ditolak oleh access flags." },
		]] },
	];
}

async function registryBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const filters = parseRegistryFilters(input);

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

function getBlocksForPage(page: string, routeCtx?: EmDashRouteContext<PluginAdminInteraction>) {
	if (page === "overview") {
		if (!routeCtx) throw new Error("overview page requires route context");
		return overviewBlocks(routeCtx);
	}

	if (page === "documents") {
		if (!routeCtx) throw new Error("documents page requires route context");
		return documentsBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page.startsWith("documents/")) {
		if (!routeCtx) throw new Error("document entity page requires route context");
		return documentDetailBlocks(routeCtx, page, routeCtx.input ?? {});
	}

	if (page === "imports") {
		if (!routeCtx) throw new Error("imports page requires route context");
		return importsBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page.startsWith("imports/")) {
		if (!routeCtx) throw new Error("import batch detail page requires route context");
		return importBatchDetailBlocks(routeCtx, page, routeCtx.input ?? {});
	}

	if (page === "verification") {
		if (!routeCtx) throw new Error("verification page requires route context");
		return verificationQueueBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page.startsWith("verification/")) {
		if (!routeCtx) throw new Error("verification review page requires route context");
		return verificationReviewBlocks(routeCtx, page, routeCtx.input ?? {});
	}

	if (page.startsWith("entities/") && page !== "entities/new") {
		if (!routeCtx) throw new Error("entity detail page requires route context");
		return entityDetailBlocks(routeCtx, page);
	}

	if (page === "entities/new") {
		throw new Error("entities/new page must be resolved via wizardBlocks");
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

	if (page === "entities/new") {
		return {
			blocks: await wizardBlocks(routeCtx, input),
		};
	}

	if (page === "documents") {
		return {
			blocks: await documentsBlocks(routeCtx, input),
		};
	}

	if (page.startsWith("documents/")) {
		return {
			blocks: await documentDetailBlocks(routeCtx, page, input),
		};
	}

	if (page === "imports") {
		return {
			blocks: await importsBlocks(routeCtx, input),
		};
		}

	if (page.startsWith("imports/")) {
		return {
			blocks: await importBatchDetailBlocks(routeCtx, page, input),
		};
	}

	if (page === "verification") {
		return {
			blocks: await verificationQueueBlocks(routeCtx, input),
		};
	}

	if (page.startsWith("verification/")) {
		return {
			blocks: await verificationReviewBlocks(routeCtx, page, input),
		};
	}

	if (page.startsWith("entities/") && page !== "entities/new") {
		return {
			blocks: await entityDetailBlocks(routeCtx, page),
		};
	}

	if (page === "entities") {
		return {
			blocks: await registryBlocks(routeCtx, input),
		};
	}

	return {
		blocks: await getBlocksForPage(page, routeCtx),
	};
}
