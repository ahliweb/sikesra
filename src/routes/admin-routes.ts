import type { D1Binding } from "../repositories/db";
import { listEntities, type EntityListFilters } from "../services/entity";
import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS, SIKESRA_PERMISSION_LIST } from "../security/permissions";
import { getAdminDashboard } from "../services/dashboard";
import { getRouteDb } from "./route-db";
import { createEntity, getEntityDetail, patchEntity, type EntityCreateInput, type EntityPatchInput } from "../services/entity";
import { getVerificationQueue, getVerificationTimeline, submitEntity, verifyEntity, type VerificationDecision, type VerificationLevel, type VerificationQueueFilters } from "../services/verification";
import { getImportBatch, getStagingRows, updateStagingRow } from "../repositories/import-repository";
import { generateUploadUrl, getEntityDocuments, completeUpload } from "../services/document";
import { createLocalRegion, type LocalRegionCreateInput } from "../services/region";
import { buildAbacSubject, evaluateAbac, type AbacInput, type AbacResource } from "../security/abac";
import { loadAbacPolicies } from "../repositories/abac-repository";
import { REPORT_CATALOG, requiresReasonForReport, type ReportMeta } from "./report-routes";

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

interface ReportCreateFormState {
	reportKey: string;
	fieldPreset: string;
	format: string;
	reason: string;
	filterRegion: string;
	filterModule: string;
	filterYear: string;
	filterVerificationStatus: string;
}

interface LocalRegionAdminFormState {
	officialVillageCode: string;
	parentId: string;
	level: string;
	codeLocal: string;
	name: string;
	description: string;
	latitude: string;
	longitude: string;
}

interface AccessPreviewFormState {
	resourceType: string;
	action: string;
	officialVillageCode: string;
	localRegionId: string;
	sensitivityLevel: string;
	statusData: string;
	statusVerification: string;
	documentClassification: string;
	requireReason: string;
}

interface ReportFieldPreview {
	key: string;
	label: string;
	sensitivity: keyof typeof SENSITIVITY_LABELS;
	behavior: string;
}

interface ReportFieldPreset {
	key: string;
	label: string;
	description: string;
	fields: ReportFieldPreview[];
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

const OFFICIAL_REGION_LEVEL_LABELS: Record<string, string> = {
	province: "Provinsi",
	regency: "Kabupaten/Kota",
	district: "Kecamatan",
	village: "Desa/Kelurahan",
};

const LOCAL_REGION_LEVEL_LABELS: Record<string, string> = {
	dusun: "Dusun",
	lingkungan: "Lingkungan",
	rw: "RW",
	rt: "RT",
	blok: "Blok",
	zona: "Zona",
	area_petugas: "Area Petugas",
};

const ACCESS_ROLE_CATALOG = [
	{ role: "super_admin", scope: "Site/system", notes: "Akses tertinggi untuk konfigurasi, tetap diaudit pada aksi kritis." },
	{ role: "admin_kabupaten", scope: "Regency", notes: "Mengelola data lintas kecamatan sesuai kewenangan kabupaten." },
	{ role: "admin_kecamatan", scope: "District", notes: "Mengelola data dan workflow dalam kecamatan yang ditugaskan." },
	{ role: "admin_desa_kelurahan", scope: "Village", notes: "Fokus pada entry/update/submit di desa atau kelurahan." },
	{ role: "pimpinan_viewer", scope: "Leadership scope", notes: "Aggregate-first, detail dibatasi kecuali ada izin eksplisit." },
	{ role: "auditor", scope: "Audit scope", notes: "Membaca bukti audit dan export evidence dengan redaksi." },
	{ role: "opd_teknis", scope: "OPD/module/region", notes: "Validasi teknis sesuai domain dan wilayah tugas." },
] as const;

const ACCESS_PREVIEW_ACTIONS = [
	{ value: "read", label: "Read detail" },
	{ value: "create", label: "Create" },
	{ value: "update", label: "Update" },
	{ value: "submit", label: "Submit verifikasi" },
	{ value: "verify", label: "Verify" },
	{ value: "download", label: "Download" },
] as const;

const REPORT_VERIFICATION_FILTERS = [
	{ value: "", label: "Semua status verifikasi" },
	{ value: "pending", label: "Menunggu" },
	{ value: "submitted", label: "Sudah diajukan" },
	{ value: "verified", label: "Terverifikasi" },
	{ value: "need_revision", label: "Perlu perbaikan" },
	{ value: "rejected", label: "Ditolak" },
] as const;

const REPORT_FIELD_PRESETS: Record<string, ReportFieldPreset[]> = {
	entity_summary: [
		{
			key: "executive_summary",
			label: "Ringkasan Pimpinan",
			description: "Agregat aman untuk pimpinan: volume data, persebaran wilayah, dan status verifikasi.",
			fields: [
				{ key: "total_entities", label: "Total entitas", sensitivity: "internal", behavior: "Angka agregat, aman untuk analitik internal." },
				{ key: "verified_entities", label: "Total terverifikasi", sensitivity: "internal", behavior: "Digunakan untuk memantau progres validasi." },
				{ key: "by_object_type", label: "Rekap jenis/subjenis", sensitivity: "internal", behavior: "Kelompok agregat per jenis data tanpa identitas individu." },
				{ key: "by_region", label: "Rekap wilayah", sensitivity: "internal", behavior: "Tingkat kecamatan/desa sesuai scope backend." },
			],
		},
		{
			key: "operations_summary",
			label: "Ringkasan Operasional",
			description: "Menambahkan indikator antrian operasional dan kualitas data untuk admin internal.",
			fields: [
				{ key: "total_entities", label: "Total entitas", sensitivity: "internal", behavior: "Agregat internal." },
				{ key: "verification_backlog", label: "Backlog verifikasi", sensitivity: "internal", behavior: "Menunjukkan item yang menunggu tindak lanjut." },
				{ key: "completeness_band", label: "Band kelengkapan", sensitivity: "internal", behavior: "Persentase kualitas data per band." },
				{ key: "source_input_mix", label: "Komposisi sumber input", sensitivity: "internal", behavior: "Membedakan manual, import, dan integrasi." },
			],
		},
	],
	verification_status: [
		{
			key: "verification_control",
			label: "Kontrol Verifikasi",
			description: "Daftar kerja verifikasi dengan identitas yang tetap dikendalikan masking backend.",
			fields: [
				{ key: "sikesra_id20", label: "ID SIKESRA", sensitivity: "internal", behavior: "Identifier operasional untuk rekonsiliasi." },
				{ key: "display_name_masked", label: "Nama tampil termasking", sensitivity: "restricted", behavior: "Nama tetap dimask sesuai policy dan scope." },
				{ key: "official_region", label: "Wilayah resmi", sensitivity: "internal", behavior: "Wilayah sesuai scope verifikator/pimpinan." },
				{ key: "verification_status", label: "Status verifikasi", sensitivity: "internal", behavior: "Menunjukkan posisi workflow saat ini." },
				{ key: "verifier_note_excerpt", label: "Ringkas catatan verifikator", sensitivity: "restricted", behavior: "Catatan disingkat untuk mencegah oversharing." },
			],
		},
	],
	entity_detail_restricted: [
		{
			key: "restricted_case_pack",
			label: "Paket Kasus Terbatas",
			description: "Field detail untuk investigasi kasus yang membutuhkan dasar kewenangan dan audit.",
			fields: [
				{ key: "sikesra_id20", label: "ID SIKESRA", sensitivity: "internal", behavior: "Identifier utama." },
				{ key: "display_name_masked", label: "Nama tampil termasking", sensitivity: "restricted", behavior: "Tetap mengikuti masking jika clearance tidak penuh." },
				{ key: "address_masked", label: "Alamat termasking", sensitivity: "restricted", behavior: "Alamat rinci tidak dibuka penuh pada export biasa." },
				{ key: "sensitivity_level", label: "Label sensitivitas", sensitivity: "internal", behavior: "Menegaskan konsekuensi akses data." },
				{ key: "document_completeness", label: "Kelengkapan dokumen", sensitivity: "internal", behavior: "Hanya metadata dokumen, bukan file privat." },
			],
		},
	],
	audit_evidence: [
		{
			key: "audit_pack",
			label: "Paket Bukti Audit",
			description: "Ringkasan audit teredaksi untuk pemeriksaan kepatuhan dan investigasi insiden.",
			fields: [
				{ key: "request_id", label: "Request ID", sensitivity: "internal", behavior: "Dipakai untuk korelasi insiden." },
				{ key: "actor_id", label: "Aktor", sensitivity: "restricted", behavior: "Identitas aktor ditampilkan sesuai policy audit." },
				{ key: "action", label: "Aksi", sensitivity: "internal", behavior: "Nama aksi yang diaudit." },
				{ key: "resource", label: "Resource", sensitivity: "internal", behavior: "Resource dan ID yang terdampak." },
				{ key: "reason_redacted", label: "Alasan teredaksi", sensitivity: "restricted", behavior: "Nilai alasan diringkas atau di-redact bila perlu." },
			],
		},
	],
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
	if (page.startsWith("reports/")) return "Detail Export Job";
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
	if (normalizedPage.startsWith("reports/")) {
		return normalizedPage;
	}
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

	if (input.action_id?.startsWith("reports_open_") || input.action_id === "reports_back_to_list") {
		const id = /^reports_open_(.+)$/.exec(input.action_id)?.[1];
		return id ? `reports/${id}` : "reports";
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

function parseReportJobId(page: string): string | undefined {
	if (!page.startsWith("reports/")) return undefined;
	return page.slice("reports/".length) || undefined;
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

function parseReportCreateForm(input: PluginAdminInteraction): ReportCreateFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		reportKey: stringState(values.reportKey),
		fieldPreset: stringState(values.fieldPreset),
		format: stringState(values.format, "csv"),
		reason: stringState(values.reason),
		filterRegion: stringState(values.filterRegion),
		filterModule: stringState(values.filterModule),
		filterYear: stringState(values.filterYear),
		filterVerificationStatus: stringState(values.filterVerificationStatus),
	};
}

function parseLocalRegionAdminForm(input: PluginAdminInteraction): LocalRegionAdminFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		officialVillageCode: stringState(values.officialVillageCode),
		parentId: stringState(values.parentId),
		level: stringState(values.level),
		codeLocal: stringState(values.codeLocal),
		name: stringState(values.name),
		description: stringState(values.description),
		latitude: stringState(values.latitude),
		longitude: stringState(values.longitude),
	};
}

function parseAccessPreviewForm(input: PluginAdminInteraction): AccessPreviewFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		resourceType: stringState(values.resourceType, "entity"),
		action: stringState(values.action, "read"),
		officialVillageCode: stringState(values.officialVillageCode),
		localRegionId: stringState(values.localRegionId),
		sensitivityLevel: stringState(values.sensitivityLevel, "internal"),
		statusData: stringState(values.statusData, "active"),
		statusVerification: stringState(values.statusVerification, "submitted_village"),
		documentClassification: stringState(values.documentClassification, "restricted"),
		requireReason: stringState(values.requireReason, "false"),
	};
}

function getReportFieldPresets(reportKey: string): ReportFieldPreset[] {
	return REPORT_FIELD_PRESETS[reportKey] ?? [];
}

function getReportFieldPreset(reportKey: string, presetKey: string): ReportFieldPreset | undefined {
	const presets = getReportFieldPresets(reportKey);
	if (!presets.length) return undefined;
	return presets.find((preset) => preset.key === presetKey) ?? presets[0];
}

function hasPermission(permissions: string[], permission: string): boolean {
	return permissions.includes(permission);
}

function describeReportPermission(permission: string): string {
	return permission.replace("awcms:sikesra:", "");
}

function describeReportAccess(permissions: string[], report: ReportMeta): string {
	return hasPermission(permissions, report.requiredPermission) ? "Tersedia" : "Butuh izin tambahan";
}

function summarizeExportRights(permissions: string[]): string {
	const granted = REPORT_CATALOG.filter((report) => hasPermission(permissions, report.requiredPermission)).map((report) => report.label);
	return granted.length ? granted.join(", ") : "Belum ada izin export aktif";
}

function describeRegionScopeLabel(ctx: ReturnType<typeof buildContextFromEmDash>): string {
	if (ctx.regionScope.localRegionIds?.length) return `${ctx.regionScope.localRegionIds.length} wilayah lokal`; 
	if (ctx.regionScope.villageCodes?.length) return `${ctx.regionScope.villageCodes.length} desa/kelurahan`;
	if (ctx.regionScope.districtCodes?.length) return `${ctx.regionScope.districtCodes.length} kecamatan`;
	if (ctx.regionScope.regencyCode) return `Kabupaten ${ctx.regionScope.regencyCode}`;
	if (ctx.regionScope.provinceCode) return `Provinsi ${ctx.regionScope.provinceCode}`;
	return "Semua scope backend";
}

function formatOfficialRegionLevel(level: string): string {
	return OFFICIAL_REGION_LEVEL_LABELS[level] ?? level;
}

function formatLocalRegionLevel(level: string): string {
	return LOCAL_REGION_LEVEL_LABELS[level] ?? level;
}

function humanizePermission(permission: string): string {
	return permission.replace("awcms:sikesra:", "").replaceAll(":", " / ");
}

function permissionResource(permission: string): string {
	return permission.split(":")[2] ?? "other";
}

function formatBooleanPreview(value: boolean): string {
	return value ? "Ya" : "Tidak";
}

function reportFilterSummary(form: ReportCreateFormState): string {
	const parts = [
		form.filterRegion ? `Region ${form.filterRegion}` : "Semua region",
		form.filterModule ? `Module ${form.filterModule}` : "Semua module",
		form.filterYear ? `Tahun ${form.filterYear}` : "Semua tahun",
		form.filterVerificationStatus ? `Status ${form.filterVerificationStatus}` : "Semua status verifikasi",
	];
	return parts.join(" | ");
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "string" || !value.trim()) return null;
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
	} catch {
		return null;
	}
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
	if (typeof value !== "string" || !value.trim()) return [];
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
	} catch {
		return [];
	}
}

function stringifyFilterValue(value: unknown): string {
	if (value == null || value === "") return "-";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
	return JSON.stringify(value);
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

async function loadReportOptions(db: D1Binding, tenantId: string, siteId: string) {
	const objectTypes = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_object_types WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY sort_order, name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();
	const districts = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'district' ORDER BY name",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();
	const years = await db.prepare(
		"SELECT DISTINCT substr(created_at, 1, 4) AS year FROM awcms_sikesra_entities WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL ORDER BY year DESC LIMIT 10",
	).bind(tenantId, siteId).all<{ year: string }>();
	return {
		objectTypes: objectTypes.results,
		districts: districts.results,
		years: years.results.map((row) => row.year).filter(Boolean),
	};
}

async function loadRegionAdminOptions(
	db: D1Binding,
	tenantId: string,
	siteId: string,
	state: LocalRegionAdminFormState,
) {
	const officialCounts = await db.prepare(
		`SELECT level, COUNT(*) as total
		 FROM awcms_sikesra_official_regions
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1
		 GROUP BY level`,
	).bind(tenantId, siteId).all<{ level: string; total: number }>();

	const localCounts = await db.prepare(
		`SELECT level, COUNT(*) as total
		 FROM awcms_sikesra_local_regions
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1
		 GROUP BY level`,
	).bind(tenantId, siteId).all<{ level: string; total: number }>();

	const districts = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'district' ORDER BY name LIMIT 200",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	const villages = await db.prepare(
		"SELECT code, name, parent_code FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'village' ORDER BY name LIMIT 300",
	).bind(tenantId, siteId).all<{ code: string; name: string; parent_code?: string | null }>();

	const officialPreview = await db.prepare(
		`SELECT code, name, level, parent_code, kemendagri_version
		 FROM awcms_sikesra_official_regions
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1
		 ORDER BY CASE level
			WHEN 'province' THEN 1
			WHEN 'regency' THEN 2
			WHEN 'district' THEN 3
			WHEN 'village' THEN 4
			ELSE 5 END, name
		 LIMIT 24`,
	).bind(tenantId, siteId).all<Record<string, unknown>>();

	const localPreview = await db.prepare(
		`SELECT id, official_village_code, parent_id, level, code_local, name, description, updated_at
		 FROM awcms_sikesra_local_regions
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1
		 ORDER BY updated_at DESC, name
		 LIMIT 30`,
	).bind(tenantId, siteId).all<Record<string, unknown>>();

	let localParents: Array<{ id: string; label: string }> = [];
	if (state.officialVillageCode) {
		const parents = await db.prepare(
			`SELECT id, level, code_local, name
			 FROM awcms_sikesra_local_regions
			 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND official_village_code = ?
			 ORDER BY name LIMIT 200`,
		).bind(tenantId, siteId, state.officialVillageCode).all<{ id: string; level: string; code_local?: string | null; name: string }>();
		localParents = parents.results.map((row) => ({
			id: row.id,
			label: `${formatLocalRegionLevel(row.level)}${row.code_local ? ` ${row.code_local}` : ""} / ${row.name}`,
		}));
	}

	return {
		officialCounts: officialCounts.results,
		localCounts: localCounts.results,
		districts: districts.results,
		villages: villages.results,
		officialPreview: officialPreview.results,
		localPreview: localPreview.results,
		localParents,
	};
}

async function loadAccessAdminOptions(
	db: D1Binding,
	tenantId: string,
	siteId: string,
	state: AccessPreviewFormState,
) {
	const attributes = await db.prepare(
		`SELECT id, code, name, category, value_type, applicable_entity_kinds, applicable_object_types, is_active
		 FROM awcms_sikesra_attribute_definitions
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY category, sort_order, name`,
	).bind(tenantId, siteId).all<Record<string, unknown>>();

	const attributeScopeRows = await db.prepare(
		`SELECT user_id, scope_type, scope_value, is_active
		 FROM awcms_sikesra_user_attribute_scopes
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY user_id, scope_type, scope_value
		 LIMIT 120`,
	).bind(tenantId, siteId).all<Record<string, unknown>>();

	const villages = await db.prepare(
		"SELECT code, name FROM awcms_sikesra_official_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND level = 'village' ORDER BY name LIMIT 200",
	).bind(tenantId, siteId).all<{ code: string; name: string }>();

	let localRegions: Array<{ id: string; level: string; code_local?: string | null; name: string }> = [];
	if (state.officialVillageCode) {
		const localResult = await db.prepare(
			"SELECT id, level, code_local, name FROM awcms_sikesra_local_regions WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND is_active = 1 AND official_village_code = ? ORDER BY name LIMIT 120",
		).bind(tenantId, siteId, state.officialVillageCode).all<{ id: string; level: string; code_local?: string | null; name: string }>();
		localRegions = localResult.results;
	}

	return {
		attributes: attributes.results,
		attributeScopes: attributeScopeRows.results,
		villages: villages.results,
		localRegions,
	};
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

async function reportsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const form = parseReportCreateForm(input);
	const options = await loadReportOptions(db, ctx.tenantId, ctx.siteId);
	const selectedReport = REPORT_CATALOG.find((item) => item.key === form.reportKey);
	const accessibleReports = REPORT_CATALOG.filter((item) => hasPermission(ctx.permissions, item.requiredPermission));
	const selectedPreset = selectedReport ? getReportFieldPreset(selectedReport.key, form.fieldPreset) : undefined;
	const allowedFormats = selectedReport?.formats ?? ["csv", "xlsx"];
	let notice = "";
	let error = "";

	if (input.type === "form_submit" && input.action_id === "reports_create_export") {
		const selected = selectedReport;
		if (!selected) {
			error = "Pilih jenis laporan yang valid sebelum membuat export job.";
		} else if (!hasPermission(ctx.permissions, selected.requiredPermission)) {
			error = `Permission ${selected.requiredPermission} belum aktif untuk akun ini.`;
		} else if (!selected.formats.includes(form.format || "csv")) {
			error = `Format ${String(form.format || "csv").toUpperCase()} tidak tersedia untuk ${selected.label}.`;
		} else if (requiresReasonForReport(selected) && !form.reason.trim()) {
			error = "Alasan wajib diisi untuk export restricted atau audit evidence.";
		} else {
			const preset = getReportFieldPreset(selected.key, form.fieldPreset);
			const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			await db.prepare(
				`INSERT INTO awcms_sikesra_export_jobs
				 (id, tenant_id, site_id, report_type, filters_json, fields_json, field_sensitivity_json, format, reason, status, created_by, updated_by)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
			).bind(
				id,
				ctx.tenantId,
				ctx.siteId,
				selected.key,
				JSON.stringify({
					region: form.filterRegion || null,
					module: form.filterModule || null,
					year: form.filterYear || null,
					verificationStatus: form.filterVerificationStatus || null,
				}),
				JSON.stringify((preset?.fields ?? []).map((field) => ({ key: field.key, label: field.label, sensitivity: field.sensitivity, behavior: field.behavior }))),
				JSON.stringify(Object.fromEntries((preset?.fields ?? []).map((field) => [field.key, field.sensitivity]))),
				form.format || "csv",
				form.reason || null,
				ctx.userId,
				ctx.userId,
			).run();
			notice = `Export job ${id} untuk ${selected.label} berhasil dibuat dengan status pending. Field preset ${preset?.label ?? "default"} dan filter backend telah tersimpan.`;
		}
	}

	const jobRows = await db.prepare(
		`SELECT id, report_type, status, total_rows, format, reason, created_at, updated_at, filters_json, fields_json, field_sensitivity_json
		 FROM awcms_sikesra_export_jobs
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY created_at DESC LIMIT 20`,
	).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

	const pendingCount = jobRows.results.filter((row) => String(row.status) === "pending").length;
	const readyCount = jobRows.results.filter((row) => String(row.status) === "ready").length;
	const failedCount = jobRows.results.filter((row) => String(row.status) === "failed").length;
	const restrictedCatalogCount = REPORT_CATALOG.filter((row) => requiresReasonForReport(row)).length;

	return [
		...pageIntro("reports"),
		{ type: "banner", variant: "default", title: "Report Center", description: "Pusat laporan untuk pimpinan, admin, dan auditor. Screen ini menekankan scope backend, sensitivitas field, alasan export restricted, dan histori job tanpa membocorkan raw R2 key atau nilai sangat sensitif." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Region Scope", value: describeRegionScopeLabel(ctx) },
			{ label: "Environment", value: routeCtx.request.url.includes("localhost") ? "Local" : "Cloudflare" },
			{ label: "Hak export aktif", value: summarizeExportRights(ctx.permissions) },
		] },
		...(accessibleReports.length === 0 ? [{ type: "banner", variant: "alert", title: "Belum ada akses export", description: "Halaman tetap dapat dibuka untuk membaca kebijakan, tetapi pembuatan export job memerlukan permission export yang sesuai dengan klasifikasi laporan." }] : []),
		...(notice ? [{ type: "banner", variant: "success", title: "Export job dibuat", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Export belum dibuat", description: error }] : []),
		{ type: "stats", items: [
			{ label: "Katalog tersedia", value: String(accessibleReports.length), description: "Jenis laporan yang bisa dijalankan akun saat ini" },
			{ label: "Pending jobs", value: String(pendingCount), description: "Menunggu proses export" },
			{ label: "Ready jobs", value: String(readyCount), description: "Siap diunduh via backend proxy" },
			{ label: "Restricted / audit", value: String(restrictedCatalogCount), description: "Laporan yang selalu memerlukan alasan dan audit" },
			{ label: "Failed jobs", value: String(failedCount), description: "Perlu investigasi operator" },
		] },
		{ type: "header", text: "Kontrol Keamanan Export" },
		{ type: "table", columns: [
			{ key: "rule", label: "Aturan" },
			{ key: "status", label: "Implementasi UI" },
		], rows: [
			{ rule: "Pemilihan jenis laporan, filter, dan cakupan field", status: "Aktif melalui form terstruktur" },
			{ rule: "Preview sensitivitas field sebelum submit", status: selectedReport ? "Aktif pada preview kontrak" : "Pilih laporan untuk melihat preview" },
			{ rule: "Restricted export memerlukan alasan", status: "Dipaksa oleh UI dan backend route" },
			{ rule: "Download tidak pernah menampilkan raw R2 key", status: "Hanya readiness/proxy state yang ditampilkan" },
			{ rule: "Akses laporan mengikuti permission backend", status: "Dipetakan per katalog dan diverifikasi saat submit" },
		] },
		{ type: "header", text: "Katalog Laporan" },
		{ type: "table", columns: [
			{ key: "label", label: "Laporan" },
			{ key: "audience", label: "Pengguna Utama" },
			{ key: "description", label: "Deskripsi" },
			{ key: "permission", label: "Permission" },
			{ key: "sensitivity", label: "Sensitivity" },
			{ key: "formats", label: "Format" },
			{ key: "access", label: "Akses" },
		], rows: REPORT_CATALOG.map((item) => ({
			label: item.label,
			audience: item.audience,
			description: item.description,
			permission: describeReportPermission(item.requiredPermission),
			sensitivity: SENSITIVITY_LABELS[item.fieldSensitivity] ?? item.fieldSensitivity,
			formats: item.formats.join(", "),
			access: describeReportAccess(ctx.permissions, item),
		})) },
		...(selectedReport ? [
			{ type: "header", text: "Preview Kontrak Laporan" },
			{ type: "fields", fields: [
				{ label: "Laporan terpilih", value: selectedReport.label },
				{ label: "Permission", value: selectedReport.requiredPermission },
				{ label: "Sensitivitas", value: SENSITIVITY_LABELS[selectedReport.fieldSensitivity] ?? selectedReport.fieldSensitivity },
				{ label: "Alasan", value: requiresReasonForReport(selectedReport) ? "Wajib diisi" : "Tidak wajib" },
				{ label: "Cakupan field", value: selectedPreset?.label ?? "Preset default akan dipilih" },
				{ label: "Ringkasan filter", value: reportFilterSummary(form) },
			] },
			{ type: "context", text: selectedPreset?.description ?? selectedReport.description },
			{ type: "table", columns: [
				{ key: "label", label: "Field" },
				{ key: "sensitivity", label: "Sensitivitas" },
				{ key: "behavior", label: "Perilaku Output" },
			], rows: (selectedPreset?.fields ?? []).map((field) => ({
				label: field.label,
				sensitivity: SENSITIVITY_LABELS[field.sensitivity] ?? field.sensitivity,
				behavior: field.behavior,
			})) },
		] : []),
		{ type: "header", text: "Buat Export Job" },
		{ type: "context", text: "Alur operator: pilih laporan, tentukan cakupan field, tetapkan filter, tinjau sensitivitas, lalu kirim export job. Semua hasil unduhan tetap harus melalui backend proxy/signed flow." },
		...(accessibleReports.length ? [{ type: "form", block_id: "reports_export_form", fields: [
			{ type: "select", action_id: "reportKey", label: "Jenis laporan", initial_value: form.reportKey, options: [option("Pilih laporan", ""), ...REPORT_CATALOG.map((item) => option(item.label, item.key))] },
			{ type: "select", action_id: "fieldPreset", label: "Cakupan field", initial_value: selectedPreset?.key ?? form.fieldPreset, options: [option(selectedReport ? "Pilih cakupan field" : "Pilih laporan terlebih dahulu", ""), ...getReportFieldPresets(form.reportKey).map((preset) => option(preset.label, preset.key))] },
			{ type: "select", action_id: "format", label: "Format export", initial_value: form.format || "csv", options: allowedFormats.map((format) => option(format.toUpperCase(), format)) },
			{ type: "select", action_id: "filterRegion", label: "Filter region (opsional)", initial_value: form.filterRegion, options: [option("Semua region", ""), ...options.districts.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "filterModule", label: "Filter module (opsional)", initial_value: form.filterModule, options: [option("Semua module", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "filterYear", label: "Tahun data (opsional)", initial_value: form.filterYear, options: [option("Semua tahun", ""), ...options.years.map((year) => option(year, year))] },
			{ type: "select", action_id: "filterVerificationStatus", label: "Status verifikasi (opsional)", initial_value: form.filterVerificationStatus, options: REPORT_VERIFICATION_FILTERS.map((item) => option(item.label, item.value)) },
			{ type: "text_input", action_id: "reason", label: "Alasan export", multiline: true, initial_value: form.reason, placeholder: selectedReport && requiresReasonForReport(selectedReport) ? "Wajib: jelaskan tujuan export dan dasar kewenangannya" : "Opsional: tambahkan konteks operasional export" },
		], submit: { label: "Buat Export Job", action_id: "reports_create_export" } }] : [{ type: "empty", title: "Tidak ada laporan yang bisa dijalankan", description: "Minta permission export:create, export:restricted, atau export:audit sesuai kebutuhan peran." }]),
		{ type: "header", text: "Histori Export Job" },
		...(jobRows.results.length ? jobRows.results.flatMap((row) => {
			const reportType = String(row.report_type ?? "");
			const reportMeta = REPORT_CATALOG.find((item) => item.key === reportType);
			const filters = parseJsonRecord(row.filters_json);
			const fields = parseJsonArray(row.fields_json);
			return [
				{ type: "section", text: `${reportMeta?.label ?? reportType} | ${String(row.format ?? "csv").toUpperCase()} | ${String(row.status ?? "pending")}`, accessory: { type: "button", label: "Lihat Job", action_id: `reports_open_${String(row.id)}`, style: "secondary" } },
				{ type: "context", text: `Rows ${String(row.total_rows ?? 0)} · dibuat ${String(row.created_at ?? "")} · filter ${Object.values(filters ?? {}).filter(Boolean).length ? reportFilterSummary({ ...form, filterRegion: String(filters?.region ?? ""), filterModule: String(filters?.module ?? ""), filterYear: String(filters?.year ?? ""), filterVerificationStatus: String(filters?.verificationStatus ?? "") }) : "Semua scope"} · field ${fields.length || 0} · reason ${String(row.reason ?? "-")}` },
			];
		}) : [{ type: "empty", title: "Belum ada export job", description: "Buat export job pertama untuk mulai menghasilkan laporan CSV/XLSX." }]),
	];
}

async function reportJobDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const jobId = parseReportJobId(page);
	if (!jobId) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Export job tidak valid", description: `page: ${page}` }];
	}
	const row = await db.prepare(
		`SELECT * FROM awcms_sikesra_export_jobs WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
	).bind(jobId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
	if (!row) {
		return [...pageIntro(page), { type: "banner", variant: "alert", title: "Export job tidak ditemukan", description: `ID ${jobId} tidak tersedia pada scope backend saat ini.` }];
	}
	const reportType = String(row.report_type ?? "");
	const reportMeta = REPORT_CATALOG.find((item) => item.key === reportType);
	const filters = parseJsonRecord(row.filters_json);
	const fieldSensitivity = parseJsonRecord(row.field_sensitivity_json);
	const fields = parseJsonArray(row.fields_json);
	return [
		...pageIntro(page),
		{ type: "banner", variant: "default", title: `Export Job ${jobId}`, description: "Status job, alasan export, sensitivitas, filter, dan download readiness ditampilkan dari metadata backend tanpa mengekspos raw R2 key." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Report Center", action_id: "reports_back_to_list", style: "secondary" }] },
		{ type: "fields", fields: [
			{ label: "Laporan", value: reportMeta?.label ?? reportType },
			{ label: "Audience", value: reportMeta?.audience ?? "-" },
			{ label: "Status", value: String(row.status ?? "pending") },
			{ label: "Format", value: String(row.format ?? "csv").toUpperCase() },
			{ label: "Rows", value: String(row.total_rows ?? 0) },
			{ label: "Reason", value: String(row.reason ?? "-") },
			{ label: "Field Sensitivity", value: reportMeta ? (SENSITIVITY_LABELS[reportMeta.fieldSensitivity] ?? reportMeta.fieldSensitivity) : String(row.field_sensitivity_json ?? "-") },
			{ label: "Filter ringkas", value: reportFilterSummary({ reportKey: reportType, fieldPreset: "", format: String(row.format ?? "csv"), reason: String(row.reason ?? ""), filterRegion: String(filters?.region ?? ""), filterModule: String(filters?.module ?? ""), filterYear: String(filters?.year ?? ""), filterVerificationStatus: String(filters?.verificationStatus ?? "") }) },
			{ label: "Download", value: row.status === "ready" ? "Siap via backend proxy/signed route" : "Belum siap diunduh" },
		] },
		{ type: "header", text: "Filter Tersimpan" },
		{ type: "table", columns: [
			{ key: "key", label: "Filter" },
			{ key: "value", label: "Nilai" },
		], rows: [
			{ key: "Region", value: stringifyFilterValue(filters?.region) },
			{ key: "Module", value: stringifyFilterValue(filters?.module) },
			{ key: "Tahun", value: stringifyFilterValue(filters?.year) },
			{ key: "Status verifikasi", value: stringifyFilterValue(filters?.verificationStatus) },
		] },
		{ type: "header", text: "Cakupan Field" },
		...(fields.length ? [{ type: "table", columns: [
			{ key: "label", label: "Field" },
			{ key: "sensitivity", label: "Sensitivitas" },
			{ key: "behavior", label: "Perilaku Output" },
		], rows: fields.map((field) => ({
			label: stringifyFilterValue(field.label ?? field.key),
			sensitivity: SENSITIVITY_LABELS[String(field.sensitivity ?? fieldSensitivity?.[String(field.key ?? "")]) as keyof typeof SENSITIVITY_LABELS] ?? stringifyFilterValue(field.sensitivity ?? fieldSensitivity?.[String(field.key ?? "")]),
			behavior: stringifyFilterValue(field.behavior),
		})) }] : [{ type: "empty", title: "Preset field tidak tersimpan", description: "Job lama mungkin dibuat sebelum UI menyimpan detail cakupan field." }]),
		{ type: "header", text: "Konsekuensi Keamanan" },
		{ type: "table", columns: [
			{ key: "rule", label: "Rule" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Reason required", status: reportMeta && requiresReasonForReport(reportMeta) ? "Ya" : "Tidak" },
			{ rule: "Permission required", status: reportMeta?.requiredPermission ?? "-" },
			{ rule: "Raw R2 key exposure", status: "Dilarang" },
			{ rule: "Download flow", status: row.status === "ready" ? "Lewat backend proxy/signed route" : "Menunggu backend menyiapkan file" },
		] },
	];
}

async function regionsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const form = parseLocalRegionAdminForm(input);
	let notice = "";
	let error = "";

	if (input.type === "form_submit" && input.action_id === "regions_create_local") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			error = "Permission awcms:sikesra:region:manage diperlukan untuk menambah wilayah lokal.";
		} else if (!form.officialVillageCode || !form.level || !form.name.trim()) {
			error = "Desa/kelurahan resmi, level wilayah lokal, dan nama wilayah wajib diisi.";
		} else {
			const created = await createLocalRegion(
				db,
				{
					officialVillageCode: form.officialVillageCode,
					parentId: form.parentId || undefined,
					level: form.level as LocalRegionCreateInput["level"],
					codeLocal: form.codeLocal || undefined,
					name: form.name,
					description: form.description || undefined,
					latitude: numberValue(form.latitude),
					longitude: numberValue(form.longitude),
				},
				ctx,
			);
			notice = `Wilayah lokal ${created.name} berhasil dibuat pada desa ${created.officialVillageCode}. Perubahan ini tidak mengubah format ID SIKESRA yang sudah ada.`;
		}
	}

	const options = await loadRegionAdminOptions(db, ctx.tenantId, ctx.siteId, form);
	const officialCountMap = Object.fromEntries(options.officialCounts.map((row) => [row.level, Number(row.total)]));
	const localCountMap = Object.fromEntries(options.localCounts.map((row) => [row.level, Number(row.total)]));
	const villageOptionLabel = options.villages.find((row) => row.code === form.officialVillageCode)?.name ?? (form.officialVillageCode || "Belum dipilih");

	return [
		...pageIntro("regions"),
		{ type: "banner", variant: "default", title: "Referensi Wilayah", description: "Halaman ini memisahkan wilayah resmi Kemendagri dan wilayah rinci lokal. Wilayah resmi dipakai untuk scope administratif dan pembentukan ID, sedangkan wilayah lokal mendukung operasi lapangan tanpa mengubah ID SIKESRA." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Region Scope", value: describeRegionScopeLabel(ctx) },
			{ label: "Permission baca", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_READ) ? "Aktif" : "Belum terdeteksi" },
			{ label: "Permission kelola lokal", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? "Aktif" : "Readonly" },
		] },
		...(notice ? [{ type: "banner", variant: "success", title: "Wilayah lokal tersimpan", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Wilayah lokal belum tersimpan", description: error }] : []),
		{ type: "stats", items: [
			{ label: "Provinsi", value: String(officialCountMap.province ?? 0), description: "Referensi resmi aktif" },
			{ label: "Kab/Kota", value: String(officialCountMap.regency ?? 0), description: "Turunan resmi tingkat 2" },
			{ label: "Kecamatan", value: String(officialCountMap.district ?? 0), description: "Pilihan filter operator" },
			{ label: "Desa/Kelurahan", value: String(officialCountMap.village ?? 0), description: "Sumber kode 10 digit ID" },
			{ label: "Wilayah lokal", value: String(Object.values(localCountMap).reduce((sum, value) => sum + value, 0)), description: "Dusun/RW/RT/blok/zona aktif" },
		] },
		{ type: "header", text: "Aturan UI dan Data" },
		{ type: "table", columns: [
			{ key: "rule", label: "Aturan" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Wilayah resmi dan wilayah lokal harus visually distinct", status: "Dipisah dalam section dan tabel berbeda" },
			{ rule: "Wilayah lokal tidak memengaruhi ID SIKESRA", status: "Ditegaskan dalam banner dan form" },
			{ rule: "Kelola wilayah lokal butuh permission backend", status: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? "Aktif" : "Dibaca saja" },
			{ rule: "Route/API tetap dilindungi auth, RBAC, dan scope", status: "Wajib backend" },
		] },
		{ type: "columns", columns: [[
			{ type: "header", text: "Wilayah Resmi" },
			{ type: "context", text: "Hierarki Kemendagri: provinsi -> kabupaten/kota -> kecamatan -> desa/kelurahan. Dipakai untuk filtering, scope administratif, dan pembentukan kode wilayah resmi." },
			{ type: "table", columns: [
				{ key: "level", label: "Level" },
				{ key: "total", label: "Total", format: "badge" },
			], rows: [
				{ level: "Provinsi", total: officialCountMap.province ?? 0 },
				{ level: "Kabupaten/Kota", total: officialCountMap.regency ?? 0 },
				{ level: "Kecamatan", total: officialCountMap.district ?? 0 },
				{ level: "Desa/Kelurahan", total: officialCountMap.village ?? 0 },
			] },
			{ type: "header", text: "Preview Wilayah Resmi" },
			...(options.officialPreview.length ? [{ type: "table", columns: [
				{ key: "level", label: "Level" },
				{ key: "code", label: "Kode" },
				{ key: "name", label: "Nama" },
				{ key: "parent", label: "Parent" },
			], rows: options.officialPreview.map((row) => ({
				level: formatOfficialRegionLevel(String(row.level ?? "")),
				code: String(row.code ?? "-"),
				name: String(row.name ?? "-"),
				parent: String(row.parent_code ?? "-"),
			})) }] : [{ type: "empty", title: "Belum ada wilayah resmi", description: "Seed atau sinkronisasi wilayah resmi belum tersedia pada tenant/site ini." }]),
		], [
			{ type: "header", text: "Wilayah Lokal" },
			{ type: "context", text: "Wilayah lokal mendukung operasi RT/RW/dusun/zona. Data ini boleh lebih rinci untuk kerja lapangan, tetapi tidak boleh mengubah kode ID SIKESRA yang berasal dari wilayah resmi." },
			{ type: "table", columns: [
				{ key: "level", label: "Level" },
				{ key: "total", label: "Total", format: "badge" },
			], rows: Object.entries(LOCAL_REGION_LEVEL_LABELS).map(([level, label]) => ({ level: label, total: localCountMap[level] ?? 0 })) },
			{ type: "header", text: "Preview Wilayah Lokal" },
			...(options.localPreview.length ? [{ type: "table", columns: [
				{ key: "level", label: "Level" },
				{ key: "codeLocal", label: "Kode Lokal" },
				{ key: "name", label: "Nama" },
				{ key: "village", label: "Desa Resmi" },
				{ key: "updatedAt", label: "Update" },
			], rows: options.localPreview.map((row) => ({
				level: formatLocalRegionLevel(String(row.level ?? "")),
				codeLocal: String(row.code_local ?? "-"),
				name: String(row.name ?? "-"),
				village: String(row.official_village_code ?? "-"),
				updatedAt: String(row.updated_at ?? "-"),
			})) }] : [{ type: "empty", title: "Belum ada wilayah lokal", description: "Tambahkan dusun/RW/RT/zona sesuai kebutuhan operasional setelah wilayah resmi tersedia." }]),
		]] },
		{ type: "header", text: "Tambah Wilayah Lokal" },
		{ type: "context", text: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? "Gunakan form ini untuk menambah wilayah lokal baru. Parent bersifat opsional untuk membentuk hierarki dusun/RW/RT. Koordinat juga opsional." : "Akun ini belum memiliki izin kelola wilayah lokal. Form ditampilkan sebagai referensi kontrak input." },
		{ type: "form", block_id: "regions_local_form", fields: [
			{ type: "select", action_id: "officialVillageCode", label: "Desa/Kelurahan Resmi (wajib)", initial_value: form.officialVillageCode, options: [option("Pilih desa/kelurahan resmi", ""), ...options.villages.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "parentId", label: "Parent wilayah lokal (opsional)", initial_value: form.parentId, options: [option(form.officialVillageCode ? "Pilih parent atau biarkan kosong" : "Pilih desa/kelurahan terlebih dahulu", ""), ...options.localParents.map((row) => option(row.label, row.id))] },
			{ type: "select", action_id: "level", label: "Level wilayah lokal (wajib)", initial_value: form.level, options: [option("Pilih level wilayah lokal", ""), ...Object.entries(LOCAL_REGION_LEVEL_LABELS).map(([value, label]) => option(label, value))] },
			{ type: "text_input", action_id: "codeLocal", label: "Kode lokal (opsional)", initial_value: form.codeLocal, placeholder: "Contoh: RW 03 / RT 07 / ZN-A" },
			{ type: "text_input", action_id: "name", label: "Nama wilayah lokal (wajib)", initial_value: form.name, placeholder: "Contoh: RW 03 Sidorejo Barat" },
			{ type: "text_input", action_id: "description", label: "Deskripsi operasional", multiline: true, initial_value: form.description, placeholder: "Catatan lapangan atau batas operasional bila diperlukan" },
			{ type: "number_input", action_id: "latitude", label: "Latitude (opsional)", initial_value: numberValue(form.latitude) },
			{ type: "number_input", action_id: "longitude", label: "Longitude (opsional)", initial_value: numberValue(form.longitude) },
		], submit: { label: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? "Tambah Wilayah Lokal" : "Butuh Permission Region Manage", action_id: "regions_create_local" } },
		{ type: "header", text: "Preview Input Saat Ini" },
		{ type: "fields", fields: [
			{ label: "Desa resmi", value: villageOptionLabel },
			{ label: "Parent", value: options.localParents.find((row) => row.id === form.parentId)?.label ?? (form.parentId || "-") },
			{ label: "Level lokal", value: form.level ? formatLocalRegionLevel(form.level) : "Belum dipilih" },
			{ label: "Nama", value: form.name || "Belum diisi" },
			{ label: "Catatan ID", value: "Wilayah lokal tidak mengubah [kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]" },
		] },
	];
}

async function accessBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const form = parseAccessPreviewForm(input);
	const [options, policies, policyRows] = await Promise.all([
		loadAccessAdminOptions(db, ctx.tenantId, ctx.siteId, form),
		loadAbacPolicies(db, ctx),
		db.prepare(
			`SELECT id, name, description, effect, priority, resource_type, actions_json, is_active
			 FROM awcms_sikesra_abac_policies
			 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
			 ORDER BY priority DESC, name`,
		).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>(),
	]);

	const groupedPermissions = Object.entries(
		SIKESRA_PERMISSION_LIST.reduce<Record<string, string[]>>((acc, permission) => {
			const key = permissionResource(permission);
			acc[key] ??= [];
			acc[key].push(permission);
			return acc;
		}, {}),
	);

	const attributeCategoryCounts = Object.entries(
		options.attributes.reduce<Record<string, number>>((acc, row) => {
			const key = String(row.category ?? "other");
			acc[key] = (acc[key] ?? 0) + 1;
			return acc;
		}, {}),
	);

	const scopeCounts = Object.entries(
		options.attributeScopes.reduce<Record<string, number>>((acc, row) => {
			const key = String(row.scope_type ?? "other");
			acc[key] = (acc[key] ?? 0) + 1;
			return acc;
		}, {}),
	);

	const resource: AbacResource = {
		resourceType: form.resourceType,
		officialVillageCode: form.officialVillageCode || undefined,
		localRegionId: form.localRegionId || undefined,
		sensitivityLevel: form.sensitivityLevel,
		statusData: form.statusData,
		statusVerification: form.statusVerification,
		documentClassification: form.documentClassification,
	};
	const previewInput: AbacInput = {
		subject: buildAbacSubject(ctx),
		resource,
		action: form.action,
		environment: {
			requestId: ctx.requestId,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent,
			requireReason: form.requireReason === "true",
		},
	};
	const previewResult = evaluateAbac(previewInput, policies, ctx);

	return [
		...pageIntro("access"),
		{ type: "banner", variant: "default", title: "Governance / Atribut & Akses", description: "Halaman ini memetakan permission catalog, atribut, scope pengguna, dan kebijakan ABAC. UI hanya membantu observasi dan preview; backend tetap menjadi sumber kebenaran untuk RBAC, ABAC, masking, dan audit." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Role aktif", value: ctx.roles.length ? ctx.roles.join(", ") : "Tanpa role eksplisit" },
			{ label: "Permission aktif", value: String(ctx.permissions.length) },
			{ label: "Region Scope", value: describeRegionScopeLabel(ctx) },
		] },
		{ type: "stats", items: [
			{ label: "Permission terdaftar", value: String(SIKESRA_PERMISSION_LIST.length), description: "Namespace awcms:sikesra:*" },
			{ label: "Atribut aktif", value: String(options.attributes.filter((row) => Number(row.is_active ?? 0) === 1).length), description: "Definition aktif di tenant/site" },
			{ label: "Scope assignment", value: String(options.attributeScopes.length), description: "Baris user_attribute_scopes terdeteksi" },
			{ label: "Policy ABAC", value: String(policyRows.results.length), description: "Policy allow/deny tersedia" },
		] },
		{ type: "header", text: "Role Governance" },
		{ type: "table", columns: [
			{ key: "role", label: "Role" },
			{ key: "scope", label: "Default Scope" },
			{ key: "notes", label: "Catatan" },
		], rows: ACCESS_ROLE_CATALOG.map((item) => ({ role: item.role, scope: item.scope, notes: item.notes })) },
		{ type: "header", text: "Katalog Permission" },
		...(groupedPermissions.map(([resourceName, permissions]) => ({
			type: "table",
			columns: [
				{ key: "permission", label: `Resource ${resourceName}` },
				{ key: "status", label: "Status akun saat ini" },
			],
			rows: permissions.map((permission) => ({
				permission: humanizePermission(permission),
				status: hasPermission(ctx.permissions, permission) ? "Aktif" : "Tidak aktif",
			})),
		}))),
		{ type: "header", text: "Ringkasan Atribut" },
		{ type: "table", columns: [
			{ key: "category", label: "Kategori" },
			{ key: "total", label: "Jumlah", format: "badge" },
		], rows: attributeCategoryCounts.map(([category, total]) => ({ category, total })) },
		{ type: "table", columns: [
			{ key: "code", label: "Kode" },
			{ key: "name", label: "Nama" },
			{ key: "category", label: "Kategori" },
			{ key: "valueType", label: "Tipe Nilai" },
		], rows: options.attributes.slice(0, 24).map((row) => ({
			code: String(row.code ?? "-"),
			name: String(row.name ?? "-"),
			category: String(row.category ?? "other"),
			valueType: String(row.value_type ?? "text"),
		})), empty_text: "Belum ada attribute definition aktif." },
		{ type: "header", text: "Scope Assignment Pengguna" },
		{ type: "table", columns: [
			{ key: "scopeType", label: "Scope Type" },
			{ key: "total", label: "Jumlah", format: "badge" },
		], rows: scopeCounts.map(([scopeType, total]) => ({ scopeType, total })), empty_text: "Belum ada assignment scope pengguna." },
		{ type: "table", columns: [
			{ key: "userId", label: "User" },
			{ key: "scopeType", label: "Scope Type" },
			{ key: "scopeValue", label: "Scope Value" },
		], rows: options.attributeScopes.slice(0, 24).map((row) => ({
			userId: String(row.user_id ?? "-"),
			scopeType: String(row.scope_type ?? "-"),
			scopeValue: String(row.scope_value ?? "-"),
		})), empty_text: "Belum ada contoh scope assignment untuk ditampilkan." },
		{ type: "header", text: "Policy Matrix ABAC" },
		{ type: "context", text: "Prinsip utama: explicit deny > explicit allow > inherited allow > default deny. Policy berikut dibaca dari tabel lokal ABAC dan dievaluasi bersama region scope backend." },
		{ type: "table", columns: [
			{ key: "name", label: "Policy" },
			{ key: "effect", label: "Effect" },
			{ key: "priority", label: "Priority" },
			{ key: "resourceType", label: "Resource" },
			{ key: "actions", label: "Actions" },
			{ key: "conditions", label: "Conditions" },
		], rows: policyRows.results.map((row) => {
			const policy = policies.find((item) => item.id === String(row.id));
			const actions = typeof row.actions_json === "string" ? JSON.parse(row.actions_json) as string[] : [];
			return {
				name: String(row.name ?? "-"),
				effect: String(row.effect ?? "deny").toUpperCase(),
				priority: Number(row.priority ?? 0),
				resourceType: String(row.resource_type ?? "-"),
				actions: Array.isArray(actions) && actions.length ? actions.join(", ") : "Semua aksi terkait",
				conditions: policy?.conditions.length ? policy.conditions.map((condition) => `${condition.attributeCategory}.${condition.attributeName} ${condition.operator}`).join(" | ") : "Tanpa kondisi",
			};
		}), empty_text: "Belum ada policy ABAC yang aktif." },
		{ type: "header", text: "Effective Access Preview" },
		{ type: "context", text: "Preview ini mensimulasikan evaluasi ABAC menggunakan trusted context akun saat ini. Tujuannya membantu governance role memahami kenapa aksi diizinkan atau ditolak, bukan menggantikan pengecekan backend sebenarnya." },
		{ type: "form", block_id: "access_preview_form", fields: [
			{ type: "select", action_id: "resourceType", label: "Resource type", initial_value: form.resourceType, options: [option("Entity", "entity"), option("Document", "document"), option("Export", "export")] },
			{ type: "select", action_id: "action", label: "Action", initial_value: form.action, options: ACCESS_PREVIEW_ACTIONS.map((item) => option(item.label, item.value)) },
			{ type: "select", action_id: "officialVillageCode", label: "Official village", initial_value: form.officialVillageCode, options: [option("Pilih desa/kelurahan atau kosongkan", ""), ...options.villages.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "localRegionId", label: "Local region", initial_value: form.localRegionId, options: [option(form.officialVillageCode ? "Pilih wilayah lokal atau kosongkan" : "Pilih desa resmi terlebih dahulu", ""), ...options.localRegions.map((row) => option(`${formatLocalRegionLevel(row.level)}${row.code_local ? ` ${row.code_local}` : ""} / ${row.name}`, row.id))] },
			{ type: "select", action_id: "sensitivityLevel", label: "Sensitivity", initial_value: form.sensitivityLevel, options: [option("Publik Aman", "public_safe"), option("Internal", "internal"), option("Terbatas", "restricted"), option("Sangat Terbatas", "highly_restricted")] },
			{ type: "select", action_id: "statusData", label: "Status data", initial_value: form.statusData, options: [option("Draft", "draft"), option("Submitted", "submitted"), option("Aktif", "active"), option("Archived", "archived")] },
			{ type: "select", action_id: "statusVerification", label: "Status verifikasi", initial_value: form.statusVerification, options: [option("Submitted desa", "submitted_village"), option("Need revision", "need_revision"), option("Verified", "verified"), option("Rejected", "rejected")] },
			{ type: "select", action_id: "documentClassification", label: "Klasifikasi dokumen", initial_value: form.documentClassification, options: [option("Internal", "internal"), option("Restricted", "restricted"), option("Highly restricted", "highly_restricted")] },
			{ type: "select", action_id: "requireReason", label: "Require reason", initial_value: form.requireReason, options: [option("Tidak", "false"), option("Ya", "true")] },
		], submit: { label: "Jalankan Preview", action_id: "access_preview_run" } },
		{ type: "fields", fields: [
			{ label: "Hasil", value: previewResult.allowed ? "ALLOW" : "DENY" },
			{ label: "Policy match", value: previewResult.matchedPolicyName ?? "Tidak ada policy spesifik" },
			{ label: "Reason code", value: previewResult.reasonCode ?? "allow_by_policy_or_fallback" },
			{ label: "Require reason", value: formatBooleanPreview(form.requireReason === "true") },
		] },
		{ type: "table", columns: [
			{ key: "check", label: "Check" },
			{ key: "passed", label: "Passed" },
		], rows: Object.entries(previewResult.checks).map(([check, passed]) => ({ check, passed: formatBooleanPreview(passed) })), empty_text: "Tidak ada check tambahan yang terekam." },
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

	if (page === "reports") {
		if (!routeCtx) throw new Error("reports page requires route context");
		return reportsBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page === "regions") {
		if (!routeCtx) throw new Error("regions page requires route context");
		return regionsBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page === "access") {
		if (!routeCtx) throw new Error("access page requires route context");
		return accessBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page.startsWith("reports/")) {
		if (!routeCtx) throw new Error("report job detail page requires route context");
		return reportJobDetailBlocks(routeCtx, page);
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

	if (page === "reports") {
		return {
			blocks: await reportsBlocks(routeCtx, input),
		};
	}

	if (page === "regions") {
		return {
			blocks: await regionsBlocks(routeCtx, input),
		};
	}

	if (page === "access") {
		return {
			blocks: await accessBlocks(routeCtx, input),
		};
	}

	if (page.startsWith("reports/")) {
		return {
			blocks: await reportJobDetailBlocks(routeCtx, page),
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
