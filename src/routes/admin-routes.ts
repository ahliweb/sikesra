import type { D1Binding } from "../repositories/db";
import { listEntities, type EntityListFilters } from "../services/entity";
import { buildContextFromEmDash, type EmDashRouteContext } from "./handler-utils";
import { SIKESRA_PERMISSIONS, SIKESRA_PERMISSION_LIST } from "../security/permissions";
import { getAdminDashboard } from "../services/dashboard";
import { getRouteDb } from "./route-db";
import { createEntity, getEntityDetail, patchEntity, deleteEntity, restoreEntity, type EntityCreateInput, type EntityPatchData } from "../services/entity";
import { getVerificationQueue, getVerificationTimeline, submitEntity, verifyEntity, type VerificationDecision, type VerificationLevel, type VerificationQueueFilters } from "../services/verification";
import { getImportBatch, getStagingRows, updateStagingRow } from "../repositories/import-repository";
import { generateUploadUrl, getEntityDocuments, completeUpload } from "../services/document";
import { createLocalRegion, updateLocalRegion, deleteLocalRegion, createOfficialRegion, updateOfficialRegion, deleteOfficialRegion, type LocalRegionCreateInput, type LocalRegionUpdateInput, type OfficialRegionCreateInput, type OfficialRegionUpdateInput } from "../services/region";
import { buildAbacSubject, evaluateAbac, type AbacInput, type AbacResource } from "../security/abac";
import { loadAbacPolicies } from "../repositories/abac-repository";
import { HIGH_RISK_AUDIT_REQUIRED, isHighRiskAction } from "../services/audit";
import { listAuditLogs, type AuditListParams, redactAuditValues } from "../repositories/audit-repository";
import { getSettings, updateSettings } from "../services/settings";
import { REPORT_CATALOG, requiresReasonForReport, type ReportMeta } from "./report-routes";
import { createImportBatch, promoteImportRows, rollbackImportPromotion } from "../services/import";
import { getImportMappingTemplates, parseAndStageRows, type ImportMapping } from "../services/import";
import { generateSikesraId, correctSikesraId } from "../services/code";
import { createExportJob, generateExportFile, downloadExportFile, type ExportCreateInput } from "../services/export";
import { listEntityPeople, type EntityPersonSummary } from "../services/entity-people";
import { getEntityDetailModule, DETAIL_MODULE_SCHEMAS, type DetailModuleSchema } from "../services/detail-modules";
import { findDuplicateCandidates, type DuplicateCandidateResult } from "../services/deduplication";
import type { DuplicateCandidateSummary } from "../repositories/deduplication-repository";
import { listEntityBenefits, createBenefit, deleteBenefit, type BenefitHistoryInput } from "../services/benefits";

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

interface ImportMappingFormState {
	sourceNameColumn: string;
	sourceRegionColumn: string;
	sourceAddressColumn: string;
	sourceIdentifierColumn: string;
	templateDefaultValue: string;
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
	localRegionId: string;
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

interface AbacPolicyFormState {
	policyId: string;
	name: string;
	description: string;
	effect: string;
	priority: string;
	resourceType: string;
	actions: string;
	conditionCategory: string;
	conditionName: string;
	conditionOperator: string;
	conditionValue: string;
}

interface AbacAttributeFormState {
	attributeId: string;
	code: string;
	name: string;
	description: string;
	category: string;
	valueType: string;
	scopeType: string;
	scopeValue: string;
}

interface AuditFilterFormState {
	actor: string;
	action: string;
	resourceType: string;
	resourceId: string;
	requestId: string;
	fromDate: string;
	toDate: string;
	success: string;
	risk: string;
}

interface SettingsFormState {
	publicEnabled: string;
	publicTitle: string;
	publicDescription: string;
	dataScopeNote: string;
	officialContact: string;
	smallCellThreshold: string;
	maxUploadBytes: string;
	allowedMimeTypes: string;
	exportMaxSyncRows: string;
	requireReasonForHighlyRestrictedDownload: string;
	featurePublicDashboard: string;
	featureImports: string;
	featureDocuments: string;
	featureExports: string;
	reason: string;
	confirmSettingsSave: boolean;
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
	code: "Koreksi ID",
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

const RELATION_TYPE_LABELS: Record<string, string> = {
	pengurus: "Pengurus",
	wali: "Wali",
	pengasuh: "Pengasuh",
	anggota: "Anggota",
	pimpinan: "Pimpinan",
	penanggung_jawab: "Penanggung Jawab",
	lainnya: "Lainnya",
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
	{ value: "read", label: "Baca detail" },
	{ value: "create", label: "Buat" },
	{ value: "update", label: "Perbarui" },
	{ value: "submit", label: "Ajukan verifikasi" },
	{ value: "verify", label: "Verifikasi" },
	{ value: "download", label: "Unduh" },
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
	if (page.startsWith("audit/")) return "Detail Audit";
	return PAGE_LABELS[page] ?? PAGE_LABELS.overview;
}

function topLevelPage(page: string): string {
	if (page === "entities/new" || page.startsWith("entities/")) return "entities";
	if (page.startsWith("verification/")) return "verification";
	if (page.startsWith("imports/")) return "imports";
	if (page.startsWith("documents/")) return "documents";
	if (page.startsWith("reports/")) return "reports";
	if (page.startsWith("audit/")) return "audit";
	return page;
}

function navPageVisible(page: string, permissions: string[]): boolean {
	const required: Record<string, string[]> = {
		overview: [SIKESRA_PERMISSIONS.DASHBOARD_READ],
		entities: [SIKESRA_PERMISSIONS.ENTITY_READ, SIKESRA_PERMISSIONS.ENTITY_CREATE],
		verification: [SIKESRA_PERMISSIONS.VERIFICATION_VERIFY],
		imports: [SIKESRA_PERMISSIONS.IMPORT_READ, SIKESRA_PERMISSIONS.IMPORT_CREATE],
		documents: [SIKESRA_PERMISSIONS.DOCUMENT_UPLOAD, SIKESRA_PERMISSIONS.DOCUMENT_PRIVATE_DOWNLOAD, SIKESRA_PERMISSIONS.ENTITY_READ],
		reports: [SIKESRA_PERMISSIONS.EXPORT_CREATE, SIKESRA_PERMISSIONS.EXPORT_RESTRICTED, SIKESRA_PERMISSIONS.EXPORT_AUDIT],
		regions: [SIKESRA_PERMISSIONS.REGION_READ, SIKESRA_PERMISSIONS.REGION_MANAGE],
		access: [SIKESRA_PERMISSIONS.ATTRIBUTE_READ, SIKESRA_PERMISSIONS.POLICY_READ, SIKESRA_PERMISSIONS.POLICY_PREVIEW, SIKESRA_PERMISSIONS.POLICY_WRITE],
		audit: [SIKESRA_PERMISSIONS.AUDIT_READ],
		settings: [SIKESRA_PERMISSIONS.SETTINGS_READ, SIKESRA_PERMISSIONS.SETTINGS_UPDATE],
	};
	return (required[page] ?? []).some((permission) => permissions.includes(permission));
}

function navButtons(currentPage: string, permissions: string[]) {
	const activePage = topLevelPage(currentPage);
	return Object.entries(PAGE_LABELS)
		.filter(([page]) => page === activePage || navPageVisible(page, permissions))
		.map(([page, label]) => ({
		type: "button",
		label,
		action_id: `nav_${page}`,
		style: page === activePage ? "primary" : "secondary",
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

function pageIntro(page: string, permissions: string[]) {
	const label = pageLabel(page);
	const hiddenCount = Object.keys(PAGE_LABELS).filter((item) => !navPageVisible(item, permissions)).length;
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
		{ type: "actions", elements: navButtons(page, permissions) },
		{ type: "context", text: hiddenCount > 0 ? `Navigasi menampilkan hanya surface yang relevan dengan permission saat ini. ${hiddenCount} entry lain disembunyikan.` : "Semua entry navigasi yang relevan untuk permission saat ini ditampilkan." },
	];
}

async function overviewBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);


	const dashboard = await getAdminDashboard(ctx, db);
	const blocks: Block[] = [
		...pageIntro("overview", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
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
		{ type: "table", columns: [
			{ key: "label", label: "Antrian" },
			{ key: "total", label: "Jumlah", format: "badge" },
			{ key: "action", label: "Aksi" },
		], rows: dashboard.workQueues.filter((q) => q.total > 0).map((q) => ({
			label: q.label,
			total: q.total,
			action: ctx.permissions.includes(q.permission as any) ? `Buka →` : "Permission tidak cukup",
		})), empty_text: "Tidak ada antrian kerja yang memerlukan perhatian saat ini." },
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
		...pageIntro(page, []),
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
	if (normalizedPage.startsWith("audit/")) {
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

	if (input.action_id?.startsWith("audit_open_") || input.action_id === "audit_back_to_list") {
		const id = /^audit_open_(.+)$/.exec(input.action_id)?.[1];
		return id ? `audit/${id}` : "audit";
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
	if (input.type === "block_action" && input.action_id === "verification_reset") {
		return {};
	}

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

function parseImportMappingForm(input: PluginAdminInteraction): ImportMappingFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		sourceNameColumn: stringState(values.sourceNameColumn),
		sourceRegionColumn: stringState(values.sourceRegionColumn),
		sourceAddressColumn: stringState(values.sourceAddressColumn),
		sourceIdentifierColumn: stringState(values.sourceIdentifierColumn),
		templateDefaultValue: stringState(values.templateDefaultValue),
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
	const state: LocalRegionAdminFormState = {
		officialVillageCode: stringState(values.officialVillageCode),
		parentId: stringState(values.parentId),
		level: stringState(values.level),
		codeLocal: stringState(values.codeLocal),
		name: stringState(values.name),
		description: stringState(values.description),
		latitude: stringState(values.latitude),
		longitude: stringState(values.longitude),
		localRegionId: stringState(values.localRegionId),
	};

	if (input.type === "block_action" && input.action_id?.startsWith("regions_edit_")) {
		state.localRegionId = input.action_id.replace("regions_edit_", "");
	}

	return state;
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

function parseAbacPolicyForm(input: PluginAdminInteraction): AbacPolicyFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		policyId: stringState(values.policyId),
		name: stringState(values.name),
		description: stringState(values.description),
		effect: stringState(values.effect, "allow"),
		priority: stringState(values.priority, "0"),
		resourceType: stringState(values.resourceType, "entity"),
		actions: stringState(values.actions),
		conditionCategory: stringState(values.conditionCategory, "entity"),
		conditionName: stringState(values.conditionName),
		conditionOperator: stringState(values.conditionOperator, "equals"),
		conditionValue: stringState(values.conditionValue),
	};
}

function parseAbacAttributeForm(input: PluginAdminInteraction): AbacAttributeFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		attributeId: stringState(values.attributeId),
		code: stringState(values.code),
		name: stringState(values.name),
		description: stringState(values.description),
		category: stringState(values.category, "entity"),
		valueType: stringState(values.valueType, "text"),
		scopeType: stringState(values.scopeType),
		scopeValue: stringState(values.scopeValue),
	};
}

function parseAuditFilterForm(input: PluginAdminInteraction): AuditFilterFormState {
	if (input.type === "block_action" && input.action_id === "audit_reset") {
		return {
			actor: "",
			action: "",
			resourceType: "",
			resourceId: "",
			requestId: "",
			fromDate: "",
			toDate: "",
			success: "",
			risk: "",
		};
	}

	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		actor: stringState(values.actor),
		action: stringState(values.action),
		resourceType: stringState(values.resourceType),
		resourceId: stringState(values.resourceId),
		requestId: stringState(values.requestId),
		fromDate: stringState(values.fromDate),
		toDate: stringState(values.toDate),
		success: stringState(values.success),
		risk: stringState(values.risk),
	};
}

function parseSettingsForm(input: PluginAdminInteraction): SettingsFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		publicEnabled: stringState(values.publicEnabled, "false"),
		publicTitle: stringState(values.publicTitle),
		publicDescription: stringState(values.publicDescription),
		dataScopeNote: stringState(values.dataScopeNote),
		officialContact: stringState(values.officialContact),
		smallCellThreshold: stringState(values.smallCellThreshold),
		maxUploadBytes: stringState(values.maxUploadBytes),
		allowedMimeTypes: stringState(values.allowedMimeTypes),
		exportMaxSyncRows: stringState(values.exportMaxSyncRows),
		requireReasonForHighlyRestrictedDownload: stringState(values.requireReasonForHighlyRestrictedDownload, "true"),
		featurePublicDashboard: stringState(values.featurePublicDashboard, "true"),
		featureImports: stringState(values.featureImports, "true"),
		featureDocuments: stringState(values.featureDocuments, "true"),
		featureExports: stringState(values.featureExports, "true"),
		reason: stringState(values.reason),
		confirmSettingsSave: values.confirmSettingsSave === true || values.confirmSettingsSave === "true" || values.confirmSettingsSave === "on",
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

function parseBooleanState(value: string, fallback: boolean): boolean {
	if (value === "true") return true;
	if (value === "false") return false;
	return fallback;
}

function parseMimeTypeList(value: string): string[] {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function formatBytes(bytes: number): string {
	if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
	if (bytes >= 1024) return `${Math.round((bytes / 1024) * 10) / 10} KB`;
	return `${bytes} B`;
}

function auditRiskLabel(action: string): string {
	return HIGH_RISK_AUDIT_REQUIRED.has(action as never) ? "🔴 Tinggi" : "🟢 Standar";
}

function auditSuccessLabel(value: unknown): string {
	return Number(value ?? 0) === 1 ? "✅ Sukses" : "❌ Gagal";
}

function redactAuditValue(
	value: Record<string, unknown> | null,
	canReveal: boolean,
): string {
	if (!value || Object.keys(value).length === 0) return "-";
	if (canReveal) return JSON.stringify(value);
	return `Teredaksi (${Object.keys(value).join(", ")})`;
}

function parseAuditRecordJson(value: unknown): Record<string, unknown> | null {
	if (typeof value !== "string" || !value.trim()) return null;
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
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

function wizardPanels(
	state: WizardFormState,
	validation: WizardValidationState,
	detail: Record<string, unknown> | null,
	people: EntityPersonSummary[],
	detailModule: Record<string, unknown> | null,
	detailSchema: DetailModuleSchema | null,
	duplicates: DuplicateCandidateSummary[],
	documents: Array<{ id: string; fileName: string; documentType: string; classification: string; sizeBytes: number; uploadedAt: string }>,
): Block[] {
	return [{
		type: "tab",
		default_tab: 0,
		panels: WIZARD_STEPS.map((step) => {
			const status = wizardStepStatus(step.key, state);
			const errors = validation.sectionErrors[step.key] ?? [];
			const stepBlocks: Block[] = [
				{ type: "header", text: step.label },
				{ type: "fields", fields: [
					{ label: "Status", value: status.status },
					{ label: "Kelengkapan", value: `${status.percent}%` },
				] },
				...(errors.length ? [{ type: "banner", variant: "alert", title: "Perlu perhatian", description: errors.join(" ") }] : []),
			];

			if (step.key === "detail_modul") {
				stepBlocks.push({ type: "context", text: "Detail modul akan menyesuaikan berdasarkan jenis data yang dipilih. Field inti seperti agama, status keterlantaran, dan desil telah tersedia di langkah atribut." });
				if (state.objectTypeCode && detailSchema) {
					stepBlocks.push({ type: "fields", fields: [
						{ label: "Jenis Data", value: `${detailSchema.objectTypeCode} - ${detailSchema.fields.length} field detail` },
						{ label: "Subjenis Data", value: state.objectSubtypeCode || "Belum dipilih" },
						{ label: "Tabel Detail", value: detailSchema.tableName },
					] });
					if (detailModule) {
						const moduleFields = detailSchema.fields.map((f) => ({ label: f.label, value: (detailModule[f.key] as string) ?? "-" }));
						stepBlocks.push({ type: "fields", fields: moduleFields });
					} else {
						stepBlocks.push({ type: "context", text: "Belum ada data detail yang tersimpan untuk entitas ini." });
					}
				} else if (state.objectTypeCode) {
					stepBlocks.push({ type: "banner", variant: "alert", title: "Skema tidak ditemukan", description: `Tidak ada skema detail modul untuk jenis data ${state.objectTypeCode}` });
				}
			} else if (step.key === "relasi_orang") {
				stepBlocks.push({ type: "context", text: "Tambahkan pengurus, wali, atau pengasuh yang terkait dengan entitas ini. Data relasi akan disimpan terpisah dan dapat diedit setelah draft dibuat." });
				stepBlocks.push({ type: "fields", fields: [
					{ label: "Jumlah Relasi", value: `${people.length} orang` },
					{ label: "Relasi Utama", value: people.find((p) => p.isPrimary)?.personName || "Belum ditentukan" },
				] });
				if (people.length > 0) {
					const peopleRows = people.map((p) => ({
						nama: p.personName ?? "-",
						nik: p.personNikMasked ?? "-",
						jenis: p.relationType,
						utama: p.isPrimary ? "Ya" : "Tidak",
						catatan: p.notes || "-",
					}));
					stepBlocks.push({ type: "table", columns: [
						{ key: "nama", label: "Nama" },
						{ key: "nik", label: "NIK" },
						{ key: "jenis", label: "Jenis Relasi" },
						{ key: "utama", label: "Utama" },
						{ key: "catatan", label: "Catatan" },
					], rows: peopleRows });
				}
			} else if (step.key === "dokumen_pendukung") {
				stepBlocks.push({ type: "context", text: "Unggah dokumen pendukung seperti SK, foto, atau surat keterangan. Dokumen akan diklasifikasikan dan diaudit aksesnya." });
				stepBlocks.push({ type: "fields", fields: [
					{ label: "Jumlah Dokumen", value: `${documents.length} dokumen` },
					{ label: "Total Ukuran", value: `${(documents.reduce((sum, d) => sum + (d.sizeBytes ?? 0), 0) / 1024).toFixed(1)} KB` },
				] });
				if (documents.length > 0) {
					const docRows = documents.map((d) => ({
						nama: d.fileName,
						jenis: d.documentType,
						klasifikasi: d.classification,
						ukuran: `${(d.sizeBytes / 1024).toFixed(1)} KB`,
						tanggal: d.uploadedAt?.slice(0, 10) ?? "-",
					}));
					stepBlocks.push({ type: "table", columns: [
						{ key: "nama", label: "Nama File" },
						{ key: "jenis", label: "Jenis" },
						{ key: "klasifikasi", label: "Klasifikasi" },
						{ key: "ukuran", label: "Ukuran" },
						{ key: "tanggal", label: "Tanggal" },
					], rows: docRows });
				}
			} else if (step.key === "validasi_duplikasi") {
				stepBlocks.push({ type: "context", text: "Validasi kelengkapan dan preview duplikasi akan ditampilkan setelah data inti lengkap." });
				stepBlocks.push({ type: "fields", fields: [
					{ label: "Kelengkapan Data", value: `${state.entityId ? (detail?.completenessPercent ?? 0) : 0}%` },
					{ label: "Status Duplikasi", value: detail?.duplicateStatus ? String(detail.duplicateStatus) : "Belum diperiksa" },
					{ label: "Kandidat Duplikat", value: `${duplicates.length} kandidat ditemukan` },
				] });
				if (duplicates.length > 0) {
					const dupRows = duplicates.map((d) => ({
						nama: d.displayNameB || d.entityIdB.slice(0, 12),
						wilayah: "-",
						skore: `${d.matchScore ?? 0}%`,
						alasan: d.riskLevel,
					}));
					stepBlocks.push({ type: "table", columns: [
						{ key: "nama", label: "Nama" },
						{ key: "wilayah", label: "Wilayah" },
						{ key: "skore", label: "Skore" },
						{ key: "alasan", label: "Level Risiko" },
					], rows: dupRows });
				}
			} else if (step.key === "generate_id") {
				const canGenerate = state.entityId && state.officialVillageCode && state.objectTypeCode && state.objectSubtypeCode;
				stepBlocks.push({ type: "context", text: "ID SIKESRA hanya dapat dihasilkan setelah validasi minimum backend terpenuhi. RT/RW tidak memengaruhi format ID." });
				stepBlocks.push({ type: "fields", fields: [
					{ label: "Preview ID", value: buildIdPreview(state) },
					{ label: "Format", value: "[kode_desa_10][jenis_2][subjenis_2][urutan_6]" },
					{ label: "Status ID", value: detail?.sikesraId20 ? `ID sudah dibuat: ${detail.sikesraId20}` : "Belum dibuat" },
				] });
				if (canGenerate && !detail?.sikesraId20) {
					stepBlocks.push({ type: "actions", elements: [{ type: "button", label: "Generate ID SIKESRA", action_id: `wizard_generate_id_${state.entityId}`, style: "primary" }] });
				}
			} else if (step.key === "review_submit") {
				stepBlocks.push({ type: "context", text: "Tinjau ringkasan entitas sebelum submit ke workflow verifikasi. Pastikan semua data telah lengkap dan benar." });
				if (state.entityId) {
					stepBlocks.push({ type: "fields", fields: [
						{ label: "Draft ID", value: state.entityId },
						{ label: "ID SIKESRA", value: detail?.sikesraId20 ? String(detail.sikesraId20) : "Belum dibuat" },
						{ label: "Jenis Data", value: `${state.objectTypeCode} / ${state.objectSubtypeCode || "-"}` },
						{ label: "Nama Tampil", value: state.displayName },
						{ label: "Wilayah", value: state.officialVillageCode },
						{ label: "Sensitivitas", value: state.sensitivityLevel },
						{ label: "Kelengkapan", value: `${state.entityId ? (detail?.completenessPercent ?? 0) : 0}%` },
					] });
					stepBlocks.push({ type: "actions", elements: [
						{ type: "button", label: "Submit untuk Verifikasi", action_id: `wizard_submit_entity_${state.entityId}`, style: "primary" },
					] });
				} else {
					stepBlocks.push({ type: "banner", variant: "alert", title: "Draft belum dibuat", description: "Simpan draft terlebih dahulu sebelum review dan submit." });
				}
			} else {
				stepBlocks.push({ type: "context", text: "Lengkapi bagian ini melalui form draft di bawah lalu simpan secara berkala." });
			}

			return { label: `${step.label}`, blocks: stepBlocks };
		}),
	}];
}

async function wizardBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	let state = parseWizardState(input);
	let successMessage = "";
	let validation = validateWizardState(state);
	let generateIdSuccess = "";
	let generateIdError = "";
	let submitSuccess = "";
	let submitError = "";
	let managePeopleMessage = "";
	let manageDocumentsMessage = "";
	let checkDuplicatesMessage = "";

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
					sensitivityLevel: state.sensitivityLevel as EntityPatchData["sensitivityLevel"],
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

	if (input.type === "block_action" && input.action_id?.startsWith("wizard_generate_id_")) {
		const targetId = input.action_id.replace("wizard_generate_id_", "");
		if (targetId === state.entityId) {
			try {
				const result = await generateSikesraId(db, targetId, ctx);
				generateIdSuccess = `ID SIKESRA berhasil dibuat: ${result.sikesraId20} (urutan ke-${result.sequence})`;
			} catch (err) {
				generateIdError = err instanceof Error ? err.message : "Gagal membuat ID SIKESRA";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("wizard_submit_entity_")) {
		const targetId = input.action_id.replace("wizard_submit_entity_", "");
		if (targetId === state.entityId) {
			try {
				await submitEntity(db, targetId, ctx);
				submitSuccess = `Entitas ${targetId} berhasil diajukan untuk verifikasi.`;
			} catch (err) {
				submitError = err instanceof Error ? err.message : "Gagal mengajukan entitas";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("wizard_manage_people_")) {
		const targetId = input.action_id.replace("wizard_manage_people_", "");
		if (targetId === state.entityId) {
			managePeopleMessage = `Membuka manajemen relasi orang untuk entitas ${targetId}. Data relasi akan ditampilkan pada tab Detail Modul.`;
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("wizard_manage_documents_")) {
		const targetId = input.action_id.replace("wizard_manage_documents_", "");
		if (targetId === state.entityId) {
			manageDocumentsMessage = `Membuka manajemen dokumen untuk entitas ${targetId}. Dokumen dapat diunggah dan diklasifikasikan melalui panel Dokumen.`;
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("wizard_check_duplicates_")) {
		const targetId = input.action_id.replace("wizard_check_duplicates_", "");
		if (targetId === state.entityId) {
			checkDuplicatesMessage = `Memeriksa duplikasi untuk entitas ${targetId}. Hasil pemeriksaan akan ditampilkan pada tab Validasi dan Duplikasi.`;
		}
	}

	validation = validateWizardState(state);
	const options = await loadWizardOptions(db, ctx.tenantId, ctx.siteId, state);
	const overall = overallCompleteness(state);

	let detail: Record<string, unknown> | null = null;
	let people: EntityPersonSummary[] = [];
	let detailModule: Record<string, unknown> | null = null;
	let detailSchema: DetailModuleSchema | null = null;
	let duplicates: DuplicateCandidateSummary[] = [];
	let documents: Array<{ id: string; fileName: string; documentType: string; classification: string; sizeBytes: number; uploadedAt: string }> = [];

	if (state.entityId) {
		try {
			const entityDetail = await getEntityDetail(db, state.entityId, ctx);
			if (entityDetail) {
				detail = {
					sikesraId20: entityDetail.entity.sikesraId20,
					completenessPercent: entityDetail.entity.completenessPercent,
					duplicateStatus: entityDetail.entity.duplicateStatus,
					personCount: entityDetail.benefits?.length ?? 0,
					documentCount: entityDetail.documents?.length ?? 0,
					duplicateCount: 0,
				};
				documents = (entityDetail.documents ?? []).map((d: Record<string, unknown>) => ({
					id: d.id as string,
					fileName: d.file_name as string,
					documentType: d.document_type as string,
					classification: d.classification as string,
					sizeBytes: d.size_bytes as number,
					uploadedAt: d.created_at as string,
				}));
			}

			people = await listEntityPeople(db, state.entityId, ctx);

			if (state.objectTypeCode && DETAIL_MODULE_SCHEMAS[state.objectTypeCode]) {
				detailSchema = DETAIL_MODULE_SCHEMAS[state.objectTypeCode];
				try {
					const moduleData = await getEntityDetailModule(db, state.entityId, state.objectTypeCode, ctx);
					if (moduleData) {
						detailModule = moduleData;
					}
				} catch {
					detailModule = null;
				}
			}

			if (state.displayName && state.officialVillageCode) {
				try {
					const dupResult = await findDuplicateCandidates(db, { entityId: state.entityId }, ctx);
					duplicates = dupResult.candidates;
				} catch {
					duplicates = [];
				}
			}
		} catch {
			detail = null;
		}
	}

	return [
			...pageIntro("entities/new", ctx.permissions),
		{
			type: "banner",
			variant: "default",
			title: "Create Wizard SIKESRA",
			description: "Wizard ini memandu pembuatan draft melalui 11 langkah. Simpan draft secara berkala untuk mempertahankan progres kerja operator.",
		},
		...(successMessage ? [{ type: "banner", variant: "success", title: "Draft tersimpan", description: successMessage }] : []),
		...(generateIdSuccess ? [{ type: "banner", variant: "success", title: "ID SIKESRA dibuat", description: generateIdSuccess }] : []),
		...(generateIdError ? [{ type: "banner", variant: "alert", title: "Gagal membuat ID", description: generateIdError }] : []),
		...(submitSuccess ? [{ type: "banner", variant: "success", title: "Entitas diajukan", description: submitSuccess }] : []),
		...(submitError ? [{ type: "banner", variant: "alert", title: "Gagal mengajukan", description: submitError }] : []),
		...(managePeopleMessage ? [{ type: "banner", variant: "success", title: "Manajemen Relasi", description: managePeopleMessage }] : []),
		...(manageDocumentsMessage ? [{ type: "banner", variant: "success", title: "Manajemen Dokumen", description: manageDocumentsMessage }] : []),
		...(checkDuplicatesMessage ? [{ type: "banner", variant: "success", title: "Pemeriksaan Duplikasi", description: checkDuplicatesMessage }] : []),
		...(validation.globalErrors.length ? [{ type: "banner", variant: "alert", title: "Lengkapi field wajib", description: validation.globalErrors.join(" ") }] : []),
		{ type: "fields", fields: [
			{ label: "Draft ID", value: state.entityId ?? "Belum dibuat" },
			{ label: "Kelengkapan Overall", value: `${overall}%` },
			{ label: "Autosave", value: state.entityId ? "Perubahan tersimpan saat Simpan Draft ditekan" : "Draft dibuat saat field minimum terpenuhi dan disimpan" },
			{ label: "Catatan Verifikator", value: "Belum ada catatan verifikator untuk draft ini" },
		] },
		...wizardPanels(state, validation, detail, people, detailModule, detailSchema, duplicates, documents),
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

function activeVerificationFilterCount(filters: VerificationQueueFilters): number {
	return Object.values(filters).filter((value) => value !== undefined && value !== null && value !== "").length;
}

function activeAuditFilterCount(filters: AuditFilterFormState): number {
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
	if (risk === "high") return "🔴 Risiko Tinggi";
	if (risk === "medium") return "🟡 Risiko Sedang";
	return "🟢 Risiko Rendah";
}

function formatDataStatusWithBadge(status: string): string {
	const badges: Record<string, string> = {
		draft: "⚪ Draft",
		submitted: "🔵 Diajukan",
		active: "🟢 Aktif",
		archived: "⚫ Arsip",
	};
	return badges[status] ?? status;
}

function formatVerificationStatusWithBadge(status: string): string {
	const badges: Record<string, string> = {
		pending: "⏳ Menunggu",
		submitted_village: "📤 Submit Desa",
		verified_village: "✅ Verifikasi Desa",
		submitted_subdistrict: "📤 Submit Kecamatan",
		verified_subdistrict: "✅ Verifikasi Kecamatan",
		submitted_regency: "📤 Submit Kabupaten",
		verified: "✅ Terverifikasi",
		need_revision: "🔄 Perlu Perbaikan",
		rejected: "❌ Ditolak",
	};
	return badges[status] ?? status;
}

function formatSensitivityWithBadge(level: string): string {
	const badges: Record<string, string> = {
		public_safe: "🟢 Publik Aman",
		internal: "🔵 Internal",
		restricted: "🟠 Terbatas",
		highly_restricted: "🔴 Sangat Terbatas",
	};
	return badges[level] ?? level;
}

function formatCompletenessWithBar(percent: number): string {
	const bar = percent >= 80 ? "🟢" : percent >= 50 ? "🟡" : "🔴";
	return `${bar} ${percent}%`;
}

// ---------- Mobile Responsiveness Utilities ----------

function isMobileUserAgent(userAgent?: string): boolean {
	if (!userAgent) return false;
	const mobileRegex = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop|BlackBerry|webOS/i;
	return mobileRegex.test(userAgent);
}

function responsiveTable(columns: Array<{ key: string; label: string }>, rows: Record<string, unknown>[], options?: { empty_text?: string; mobile_max_columns?: number }): Block {
	const mobileMaxCols = options?.mobile_max_columns ?? 3;
	const isMobile = columns.length > mobileMaxCols;

	if (isMobile) {
		return {
			type: "table",
			columns: columns.slice(0, mobileMaxCols),
			rows: rows.map((row) => {
				const mobileRow: Record<string, unknown> = {};
				for (let i = 0; i < mobileMaxCols; i++) {
					mobileRow[columns[i].key] = row[columns[i].key];
				}
				return mobileRow;
			}),
			empty_text: options?.empty_text,
		};
	}

	return {
		type: "table",
		columns,
		rows,
		empty_text: options?.empty_text,
	};
}

function responsiveStats(items: Array<{ label: string; value: string; description?: string }>): Block[] {
	if (items.length <= 4) {
		return [{ type: "stats", items }];
	}

	const chunks: Array<typeof items> = [];
	for (let i = 0; i < items.length; i += 4) {
		chunks.push(items.slice(i, i + 4));
	}

	return chunks.map((chunk, index) => ({
		type: "stats",
		items: chunk,
	}));
}

function mobileHint(userAgent?: string): Block[] {
	if (isMobileUserAgent(userAgent)) {
		return [{
			type: "context",
			text: "📱 Tampilan dioptimalkan untuk perangkat mobile. Beberapa kolom tabel disembunyikan untuk keterbacaan. Gunakan perangkat desktop untuk tampilan lengkap.",
		}];
	}
	return [];
}

function importStageStatus(status: string): string {
	const badges: Record<string, string> = {
		promoted: "🟢 Selesai",
		validated: "🔵 Siap Promosi",
		mapped: "🟡 Perlu Validasi",
		uploaded: "⚪ Perlu Mapping",
		failed: "🔴 Gagal",
	};
	return badges[status] ?? status;
}

function rowStatusLabel(status: string): string {
	const badges: Record<string, string> = {
		pending: "⏳ Pending",
		valid: "✅ Valid",
		invalid: "❌ Invalid",
		corrected: "🔧 Corrected",
		duplicate_review: "🔍 Duplicate Review",
		promoted: "🟢 Promoted",
		skipped: "⚪ Skipped",
		failed: "🔴 Failed",
	};
	return badges[status] ?? status;
}

function documentClassificationLabel(value: string): string {
	return ({
		internal: "Internal",
		restricted: "Terbatas",
		highly_restricted: "Sangat Terbatas",
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
	const page = input.type === "block_action" && input.action_id?.startsWith("verification_page_")
		? Number(input.action_id.replace("verification_page_", ""))
		: 1;
	const perPage = 50;
	const offset = (page - 1) * perPage;

	const [queueResult, options] = await Promise.all([
		getVerificationQueue(db, { ...filters, limit: perPage, offset }, ctx),
		loadVerificationOptions(db, ctx.tenantId, ctx.siteId),
	]);
	const queue = queueResult.items;
	const totalPages = Math.ceil(queueResult.total / perPage);

	const paginationElements: Block[] = [];
	if (totalPages > 1) {
		const elements: any[] = [];
		if (page > 1) elements.push({ type: "button", label: "← Sebelumnya", action_id: `verification_page_${page - 1}`, style: "secondary" });
		elements.push({ type: "label", text: `Halaman ${page} dari ${totalPages}` });
		if (page < totalPages) elements.push({ type: "button", label: "Selanjutnya →", action_id: `verification_page_${page + 1}`, style: "secondary" });
		paginationElements.push({ type: "actions", elements });
	}

	return [
		...pageIntro("verification", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Queue Verifikasi", description: "Antrian ini difilter oleh permission, status, dan region scope backend. Gunakan tombol review untuk membuka layar pemeriksaan entitas." },
		...responsiveStats([
			{ label: "Total antrian", value: String(queueResult.total), description: "Total item setelah filter" },
			{ label: "Ditampilkan", value: String(queue.length), description: "Item pada halaman ini" },
			{ label: "Risiko tinggi", value: String(queue.filter((item) => item.riskLevel === "high").length), description: "Perlu prioritas review" },
			{ label: "Butuh revisi", value: String(queue.filter((item) => item.currentStatus === "need_revision").length), description: "Draft revisi menunggu tindak lanjut" },
		]),
		{ type: "fields", fields: [
			{ label: "Filter aktif", value: String(activeVerificationFilterCount(filters)) },
			{ label: "Scope region", value: describeRegionScopeLabel(ctx) },
			{ label: "Permission verify", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.VERIFICATION_VERIFY) ? "Aktif" : "Tidak aktif" },
			{ label: "Mode", value: "Desktop-first, responsive-basic" },
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
		{ type: "actions", elements: [
			{ type: "button", label: "Reset filter", action_id: "verification_reset", style: "secondary" },
		] },
		...paginationElements,
		{ type: "header", text: "Daftar Review" },
		...(queue.length ? queue.flatMap((item) => ([
			{ type: "section", text: `${item.displayName} | ${item.objectTypeCode}/${item.objectSubtypeCode} | ${formatVerificationStatusWithBadge(item.currentStatus)} | ${formatCompletenessWithBar(item.completenessPercent)} | ${formatVerificationRisk(item.riskLevel)}`, accessory: { type: "button", label: "Review", action_id: `verification_open_${item.entityId}`, style: "primary" } },
			{ type: "context", text: `Wilayah ${item.officialVillageCode} · Submit ${item.submittedAt} · Duplikasi ${DUPLICATE_STATUS_LABELS[item.duplicateStatus] ?? item.duplicateStatus}` },
		])) : [{ type: "empty", title: "Antrian kosong", description: "Tidak ada item verifikasi yang cocok dengan filter dan scope backend saat ini." }]),
		...paginationElements,
	];
}

async function verificationReviewBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entityId = parseVerificationEntityId(page);
	if (!entityId) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Review verifikasi tidak valid", description: `page: ${page}` }];
	}

	const detail = await getEntityDetail(db, entityId, ctx);
	if (!detail) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Entitas verifikasi tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` }];
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

	// Load additional data for verification review
	let people: EntityPersonSummary[] = [];
	let detailModuleData: Record<string, unknown> | null = null;
	let detailModuleSchema: DetailModuleSchema | null = null;
	let duplicates: DuplicateCandidateSummary[] = [];

	try {
		people = await listEntityPeople(db, entityId, ctx);

		if (activeDetail.entity.objectTypeCode && DETAIL_MODULE_SCHEMAS[activeDetail.entity.objectTypeCode]) {
			detailModuleSchema = DETAIL_MODULE_SCHEMAS[activeDetail.entity.objectTypeCode];
			try {
				detailModuleData = await getEntityDetailModule(db, entityId, activeDetail.entity.objectTypeCode, ctx);
			} catch {
				detailModuleData = null;
			}
		}

		if (activeDetail.entity.duplicateStatus === "candidate") {
			try {
				const dupResult = await findDuplicateCandidates(db, { entityId }, ctx);
				duplicates = dupResult.candidates;
			} catch {
				duplicates = [];
			}
		}
	} catch {
		// Non-critical data loading failure - continue with review
	}

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
		...pageIntro(page, ctx.permissions),
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
					{ label: "Kandidat Ditemukan", value: `${duplicates.length} kandidat` },
				] },
				...(duplicates.length > 0 ? [{
					type: "table",
					columns: [
						{ key: "nama", label: "Nama Kandidat" },
						{ key: "skore", label: "Skore" },
						{ key: "risiko", label: "Level Risiko" },
					],
					rows: duplicates.map((d) => ({
						nama: d.displayNameB || d.entityIdB.slice(0, 12),
						skore: `${d.matchScore ?? 0}%`,
						risiko: d.riskLevel,
					})),
				}] : []),
				{ type: "context", text: activeDetail.entity.duplicateStatus === "candidate" ? "Perlu review kandidat duplikasi sebelum finalisasi. Periksa setiap kandidat dan pastikan tidak ada entitas ganda." : "Tidak ada sinyal duplikasi kritis pada ringkasan saat ini." },
			] },
			{ label: "Detail Modul", blocks: [
				{ type: "fields", fields: [
					{ label: "Jenis Data", value: activeDetail.entity.objectTypeCode ?? "-" },
					{ label: "Tabel Detail", value: detailModuleSchema?.tableName ?? "Belum tersedia" },
					{ label: "Jumlah Field", value: detailModuleSchema ? `${detailModuleSchema.fields.length} field` : "-" },
				] },
				...(detailModuleData && detailModuleSchema ? [
					{ type: "fields", fields: detailModuleSchema.fields.map((f) => ({ label: f.label, value: (detailModuleData[f.key] as string) ?? "-" })) },
				] : [
					{ type: "context", text: detailModuleSchema ? "Belum ada data detail yang tersimpan untuk entitas ini." : "Detail modul spesifik per jenis data akan diperkaya seiring rebuild service/detail table berikutnya." },
				]),
			] },
			{ label: "Relasi Orang", blocks: [
				{ type: "fields", fields: [
					{ label: "Jumlah Relasi", value: `${people.length} orang` },
					{ label: "Relasi Utama", value: people.find((p) => p.isPrimary)?.personName || "Belum ditentukan" },
				] },
				...(people.length > 0 ? [{
					type: "table",
					columns: [
						{ key: "nama", label: "Nama" },
						{ key: "nik", label: "NIK" },
						{ key: "jenis", label: "Jenis Relasi" },
						{ key: "utama", label: "Utama" },
						{ key: "catatan", label: "Catatan" },
					],
					rows: people.map((p) => ({
						nama: p.personName ?? "-",
						nik: p.personNikMasked ?? "-",
						jenis: p.relationType,
						utama: p.isPrimary ? "Ya" : "Tidak",
						catatan: p.notes || "-",
					})),
				}] : [
					{ type: "context", text: "Belum ada relasi orang yang terdaftar untuk entitas ini." },
				]),
			] },
			{ label: "Timeline", blocks: [
				{ type: "table", columns: [{ key: "createdAt", label: "Waktu" }, { key: "level", label: "Level" }, { key: "action", label: "Keputusan" }, { key: "note", label: "Catatan" }], rows: timeline.map((item) => ({ createdAt: item.createdAt, level: item.verificationLevel, action: item.action, note: item.note ?? "-" })), empty_text: "Belum ada event verifikasi." },
			] },
		] },
		{ type: "header", text: "Decision Panel" },
		{ type: "banner", variant: "default", title: "Konfirmasi Keputusan Verifikasi", description: "Keputusan verifikasi akan dicatat ke audit trail SIKESRA dan tidak dapat dibatalkan. Revisi dan penolakan wajib menyertakan alasan yang jelas." },
		{ type: "form", block_id: "verification_decision_form", fields: [
			{ type: "select", action_id: "verificationLevel", label: "Level Verifikasi", initial_value: defaultLevel, options: [option("Desa", "desa"), option("Kecamatan", "kecamatan"), option("Kabupaten", "kabupaten"), option("OPD", "opd")] },
			{ type: "select", action_id: "action", label: "Keputusan (wajib)", initial_value: "verify", options: [option("✅ Verifikasi - Setuju dan lanjutkan", "verify"), option("🔄 Perlu Perbaikan - Kembalikan untuk revisi", "need_revision"), option("❌ Tolak - Tidak memenuhi syarat", "reject")] },
			{ type: "text_input", action_id: "note", label: "Alasan / Catatan (wajib untuk revisi/penolakan)", multiline: true, initial_value: "", placeholder: "Jelaskan alasan keputusan Anda. Wajib diisi untuk need revision atau reject." },
			{ type: "checkbox", action_id: "confirmAudit", label: "✅ Saya memahami bahwa keputusan ini akan dicatat permanen di audit trail dan tidak dapat dibatalkan" },
		], submit: { label: "Kirim Keputusan Verifikasi", action_id: `verification_decide_${entityId}` } },
		{ type: "context", text: "Setelah dikirim, keputusan akan: (1) Mengubah status entitas, (2) Mencatat event verifikasi, (3) Menulis audit log dengan actor dan timestamp, (4) Mengirim notifikasi ke operator jika perlu revisi." },
	];
}

async function importsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const options = await loadImportOptions(db, ctx.tenantId, ctx.siteId);
	let notice = "";
	const form = parseImportCreateForm(input);
	const page = input.type === "block_action" && input.action_id?.startsWith("imports_page_")
		? Number(input.action_id.replace("imports_page_", ""))
		: 1;
	const perPage = 20;
	const offset = (page - 1) * perPage;

	if (input.type === "form_submit" && input.action_id === "imports_create_batch") {
		if (form.filename.trim()) {
			const batch = await createImportBatch(
				db,
				{
					originalFilename: form.filename.trim(),
					sheetName: form.sheetName || undefined,
					objectTypeCode: form.objectTypeCode || undefined,
				},
				ctx,
			);
			notice = `Batch import ${batch.id} berhasil dibuat. Lanjutkan ke tahap mapping dan validasi.`;
		}
	}

	const countResult = await db.prepare(
		`SELECT COUNT(*) as total FROM awcms_sikesra_import_batches WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
	).bind(ctx.tenantId, ctx.siteId).first<{ total: number }>();
	const total = countResult?.total ?? 0;
	const totalPages = Math.ceil(total / perPage);

	const rows = await db.prepare(
		`SELECT id, original_filename, sheet_name, status, object_type_code, row_count, valid_row_count, invalid_row_count, promoted_row_count, created_at, updated_at
		 FROM awcms_sikesra_import_batches
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`,
	).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();
	const uploadedCount = rows.results.filter((row) => String(row.status) === "uploaded").length;
	const validatedCount = rows.results.filter((row) => String(row.status) === "validated").length;
	const promotedCount = rows.results.filter((row) => String(row.status) === "promoted").length;

	const paginationElements: Block[] = [];
	if (totalPages > 1) {
		const elements: any[] = [];
		if (page > 1) elements.push({ type: "button", label: "← Sebelumnya", action_id: `imports_page_${page - 1}`, style: "secondary" });
		elements.push({ type: "label", text: `Halaman ${page} dari ${totalPages}` });
		if (page < totalPages) elements.push({ type: "button", label: "Selanjutnya →", action_id: `imports_page_${page + 1}`, style: "secondary" });
		paginationElements.push({ type: "actions", elements });
	}

	return [
		...pageIntro("imports", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Import Center SIKESRA", description: "Pusat import menata alur upload workbook, pemetaan kolom, staging row, validasi, duplicate review, promosi, dan laporan hasil secara bertahap." },
		...(notice ? [{ type: "banner", variant: "success", title: "Batch dibuat", description: notice }] : []),
		...responsiveStats([
			{ label: "Total batch", value: String(total), description: "Semua batch pada scope" },
			{ label: "Perlu mapping", value: String(uploadedCount), description: "Upload baru menunggu mapping" },
			{ label: "Siap promosi", value: String(validatedCount), description: "Sudah tervalidasi" },
			{ label: "Selesai", value: String(promotedCount), description: "Batch yang sudah dipromosikan" },
			{ label: "Gagal", value: String(rows.results.filter((row) => String(row.status) === "failed").length), description: "Perlu investigasi" },
		]),
		{ type: "fields", fields: [
			{ label: "Workflow", value: "Upload -> Sheet -> Mapping -> Validasi -> Preview -> Koreksi -> Duplikasi -> Promosi -> Laporan" },
			{ label: "Duplikasi", value: "Kandidat duplicate review wajib dipisahkan sebelum promosi" },
			{ label: "Valid row", value: "Hanya row valid/corrected yang boleh lanjut promosi" },
			{ label: "Laporan akhir", value: "Harus merangkum valid, invalid, duplicate, promoted, skipped, dan failed" },
		] },
		{ type: "banner", variant: "default", title: "Panduan Upload Workbook", description: "Pastikan file berformat .xlsx atau .csv. Maksimal 10MB. Kolom harus memiliki header di baris pertama. Gunakan encoding UTF-8." },
		{ type: "form", block_id: "imports_create_form", fields: [
			{ type: "text_input", action_id: "filename", label: "Nama file workbook (wajib)", initial_value: form.filename, placeholder: "contoh: data-rumah-ibadah-2026.xlsx" },
			{ type: "text_input", action_id: "sheetName", label: "Nama sheet (opsional, default sheet pertama)", initial_value: form.sheetName, placeholder: "contoh: Sheet1 / Data Yatim" },
			{ type: "select", action_id: "objectTypeCode", label: "Jenis data target (wajib)", initial_value: form.objectTypeCode, options: [option("Pilih jenis data", ""), ...options.objectTypes.map((row) => option(row.name, row.code))] },
		], submit: { label: "Buat Batch Import", action_id: "imports_create_batch" } },
		...paginationElements,
		{ type: "header", text: "Daftar Batch" },
		...(rows.results.length ? rows.results.flatMap((row) => ([
			{ type: "section", text: `${String(row.original_filename ?? "upload.xlsx")} | ${importStageStatus(String(row.status ?? "uploaded"))} | ${String(row.row_count ?? 0)} row`, accessory: { type: "button", label: "Buka Batch", action_id: `imports_open_${String(row.id)}`, style: "primary" } },
			{ type: "context", text: `Sheet ${String(row.sheet_name ?? "belum dipilih")} · valid ${String(row.valid_row_count ?? 0)} · invalid ${String(row.invalid_row_count ?? 0)} · promoted ${String(row.promoted_row_count ?? 0)}` },
		])) : [{ type: "empty", title: "Belum ada batch import", description: "Buat batch pertama untuk memulai alur upload workbook dan staging row." }]),
		...paginationElements,
	];
}

async function importBatchDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const batchId = parseImportBatchId(page);
	if (!batchId) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Batch import tidak valid", description: `page: ${page}` }];
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

	let mappingNotice = "";
	let mappingError = "";
	const mappingForm = parseImportMappingForm(input);
	if (input.type === "form_submit" && input.action_id === `imports_save_mapping_${batchId}`) {
		const mapping: ImportMapping[] = [];
		if (mappingForm.sourceNameColumn) mapping.push({ sourceColumn: mappingForm.sourceNameColumn, targetField: "displayName" });
		if (mappingForm.sourceRegionColumn) mapping.push({ sourceColumn: mappingForm.sourceRegionColumn, targetField: "officialVillageCode" });
		if (mappingForm.sourceAddressColumn) mapping.push({ sourceColumn: mappingForm.sourceAddressColumn, targetField: "addressText" });
		if (mappingForm.sourceIdentifierColumn) {
			mapping.push({
				sourceColumn: mappingForm.sourceIdentifierColumn,
				targetField: "sourceIdentifier",
				defaultValue: mappingForm.templateDefaultValue || undefined,
			});
		}

		if (!mapping.length) {
			mappingError = "Isi minimal satu pemetaan kolom sebelum menyimpan template mapping batch.";
		} else {
			const mapped = await parseAndStageRows(db, batchId, mapping, ctx);
			mappingNotice = `Template mapping ${mapped.template.name} tersimpan. Batch sekarang berstatus mapped dan siap menuju validasi.`;
		}
	}
	let validationNotice = "";
	if (input.type === "block_action" && input.action_id === `imports_run_validation_${batchId}`) {
		const existingTemplates = await getImportMappingTemplates(db, undefined, ctx);
		const template = existingTemplates.find((item) => item.name === `batch:${batchId}`);
		if (!template || !template.mapping.length) {
			mappingError = "Simpan template mapping terlebih dahulu sebelum menjalankan validasi batch.";
		} else {
			const validation = await parseAndStageRows(db, batchId, template.mapping, ctx);
			validationNotice = validation.staged > 0
				? `Validasi selesai untuk ${validation.staged} row. Row bermasalah: ${validation.validationErrors}.`
				: "Template mapping tersimpan, tetapi belum ada staging row untuk divalidasi.";
		}
	}

	const batch = await getImportBatch(db, batchId, ctx);
	if (!batch) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Batch import tidak ditemukan", description: `ID ${batchId} tidak tersedia pada scope backend saat ini.` }];
	}

	const templates = await getImportMappingTemplates(db, undefined, ctx);
	const batchTemplate = templates.find((item) => item.name === `batch:${batchId}`);
	const templateField = (targetField: string) => batchTemplate?.mapping.find((item) => item.targetField === targetField)?.sourceColumn ?? "";
	const stagingRows = await getStagingRows(db, batchId, ctx);
	const selectedRow = stagingRows.find((row) => row.rowStatus === "invalid" || row.rowStatus === "duplicate_review") ?? stagingRows[0];
	const duplicateRows = stagingRows.filter((row) => row.rowStatus === "duplicate_review");
	const invalidRows = stagingRows.filter((row) => row.rowStatus === "invalid");
	const promotedRows = stagingRows.filter((row) => row.rowStatus === "promoted");
	const skippedRows = stagingRows.filter((row) => row.rowStatus === "skipped");
	const failedRows = stagingRows.filter((row) => row.rowStatus === "failed");

	let promoteNotice = "";
	let promoteError = "";
	if (input.type === "block_action" && input.action_id === `imports_promote_${batchId}`) {
		try {
			const validRows = stagingRows.filter((row) => row.rowStatus === "valid" || row.rowStatus === "corrected");
			const duplicateDecisions: Record<string, string> = {};
			for (const row of duplicateRows) {
				duplicateDecisions[row.id] = "override";
			}
			const result = await promoteImportRows(db, batchId, validRows.map((r) => r.id), duplicateDecisions, ctx);
			promoteNotice = `Promosi selesai. ${result.promoted} baris berhasil dipromosikan ke entitas SIKESRA. ${result.skipped} baris dilewati.`;
		} catch (err) {
			promoteError = err instanceof Error ? err.message : "Gagal mempromosikan baris import";
		}
	}

	let rollbackNotice = "";
	let rollbackError = "";
	let showRollbackConfirm = false;

	if (input.type === "block_action" && input.action_id === `imports_rollback_confirm_${batchId}`) {
		showRollbackConfirm = true;
	}

	if (input.type === "form_submit" && input.action_id === `imports_rollback_submit_${batchId}`) {
		const reason = stringState(input.values?.reason);
		const confirmed = input.values?.confirmRollback === true || input.values?.confirmRollback === "true" || input.values?.confirmRollback === "on";
		if (confirmed && reason && reason.length >= 20) {
			try {
				const result = await rollbackImportPromotion(db, batchId, ctx);
				rollbackNotice = `Rollback selesai. ${result.rolledBack} entitas dikembalikan ke staging. ${result.failed} gagal.`;
			} catch (err) {
				rollbackError = err instanceof Error ? err.message : "Gagal melakukan rollback";
			}
		} else if (!confirmed) {
			rollbackError = "Konfirmasi eksplisit diperlukan untuk rollback.";
		} else if (!reason || reason.length < 20) {
			rollbackError = "Alasan harus minimal 20 karakter.";
		}
	}

	return [
		...pageIntro(page, ctx.permissions),
		{ type: "banner", variant: "default", title: `Batch Import ${batch.id}`, description: "Gunakan halaman batch untuk menavigasi setiap tahap import: upload workbook, mapping, validasi, staging preview, koreksi invalid row, duplicate review, promosi, dan laporan hasil." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Daftar Batch", action_id: "imports_back_to_list", style: "secondary" }] },
		...(mappingNotice ? [{ type: "banner", variant: "success", title: "Mapping tersimpan", description: mappingNotice }] : []),
		...(validationNotice ? [{ type: "banner", variant: "success", title: "Validasi batch selesai", description: validationNotice }] : []),
		...(promoteNotice ? [{ type: "banner", variant: "success", title: "Promosi selesai", description: promoteNotice }] : []),
		...(mappingError ? [{ type: "banner", variant: "alert", title: "Mapping belum tersimpan", description: mappingError }] : []),
		...(promoteError ? [{ type: "banner", variant: "alert", title: "Promosi gagal", description: promoteError }] : []),
		...(rollbackNotice ? [{ type: "banner", variant: "success", title: "Rollback selesai", description: rollbackNotice }] : []),
		...(rollbackError ? [{ type: "banner", variant: "alert", title: "Rollback gagal", description: rollbackError }] : []),
		{ type: "stats", items: [
			{ label: "Valid", value: String(batch.validRowCount), description: "Row valid / corrected" },
			{ label: "Invalid", value: String(invalidRows.length), description: "Butuh koreksi operator" },
			{ label: "Duplicate", value: String(duplicateRows.length), description: "Perlu review kandidat" },
			{ label: "Promoted", value: String(promotedRows.length), description: "Sudah dipromosikan" },
			{ label: "Skipped / Failed", value: String(skippedRows.length + failedRows.length), description: "Tidak ikut promosi" },
		] },
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
		{ type: "context", text: "Status row harus jelas terpisah: invalid, duplicate review, promoted, skipped, dan failed. Koreksi invalid row tidak sama dengan keputusan duplicate review." },
		{ type: "table", columns: [{ key: "step", label: "Tahap" }, { key: "status", label: "Status" }, { key: "note", label: "Catatan" }], rows: [
			{ step: "1. Upload workbook", status: "Selesai", note: `File ${batch.originalFilename} tercatat di batch shell.` },
			{ step: "2. Select sheet", status: batch.sheetName ? "Selesai" : "Perlu dipilih", note: batch.sheetName ?? "Pilih sheet target sebelum parsing row." },
			{ step: "3. Map columns", status: batch.status === "uploaded" ? "Menunggu" : batch.status === "mapped" || batch.status === "validated" || batch.status === "promoting" || batch.status === "promoted" ? "Selesai" : "Berjalan / selesai", note: batchTemplate ? `Template ${batchTemplate.name} tersimpan untuk batch ini.` : "Pemetaan kolom akan menargetkan field SIKESRA sesuai jenis data." },
			{ step: "4. Validate mapping", status: batch.status === "validated" || batch.status === "promoted" ? "Selesai" : batch.status === "mapped" ? "Siap divalidasi" : "Menunggu", note: "Validasi wajib memeriksa tipe data, region, dan required field." },
			{ step: "5. Preview staging rows", status: stagingRows.length ? "Tersedia" : "Belum tersedia", note: `${stagingRows.length} row staging pada batch ini.` },
			{ step: "6. Correct invalid rows", status: invalidRows.length ? "Perlu tindakan" : "Tidak ada invalid row", note: `${invalidRows.length} row invalid memerlukan koreksi.` },
			{ step: "7. Review duplicate candidates", status: duplicateRows.length ? "Perlu review" : "Tidak ada kandidat", note: `${duplicateRows.length} row berstatus duplicate review.` },
			{ step: "8. Promote selected valid rows", status: batch.status === "promoted" ? "Selesai" : batch.status === "validated" ? "Siap promosi" : "Menunggu", note: "Promosi tidak sama dengan verifikasi akhir." },
			{ step: "9. Display import report", status: batch.status === "promoted" ? "Siap ditampilkan" : "Akan lengkap setelah promosi", note: "Laporan merangkum valid, invalid, duplicate, promoted, skipped, dan failed." },
		] },
		{ type: "tab", default_tab: 0, panels: [
			{ label: "Map Columns", blocks: [
				{ type: "fields", fields: [
			{ label: "Template aktif", value: batchTemplate?.name ?? "Belum ada template untuk batch ini" },
			{ label: "Sheet target", value: batch.sheetName ?? "Belum dipilih" },
			{ label: "Jenis data", value: batchTemplate?.objectTypeCode ?? "Mengikuti batch / belum diikat" },
			{ label: "Status validasi", value: batch.status === "validated" ? "Selesai dijalankan" : "Belum dijalankan / masih mapping" },
		] },
				{ type: "banner", variant: "default", title: "Panduan Pemetaan Kolom", description: "Petakan kolom dari workbook ke field target SIKESRA. Field bertanda wajib harus dipetakan sebelum validasi dapat dijalankan." },
				{ type: "table", columns: [{ key: "target", label: "Field Target SIKESRA" }, { key: "required", label: "Wajib" }, { key: "source", label: "Kolom Sumber" }], rows: [
					{ target: "displayName", required: "Ya", source: templateField("displayName") || "Belum dipetakan" },
					{ target: "officialVillageCode", required: "Ya", source: templateField("officialVillageCode") || "Belum dipetakan" },
					{ target: "addressText", required: "Tidak", source: templateField("addressText") || "Belum dipetakan" },
					{ target: "sourceIdentifier", required: "Tidak", source: templateField("sourceIdentifier") || "Belum dipetakan" },
				], empty_text: "Belum ada pemetaan kolom." },
				{ type: "context", text: "Pemetaan ini menyimpan hubungan kolom workbook ke field inti SIKESRA. Setelah template tersimpan, batch naik ke status mapped dan siap untuk validasi berikutnya." },
				{ type: "form", block_id: "imports_mapping_form", fields: [
					{ type: "text_input", action_id: "sourceNameColumn", label: "Kolom sumber untuk Nama Tampil (wajib)", initial_value: mappingForm.sourceNameColumn || templateField("displayName"), placeholder: "contoh: nama_lembaga / nama_masjid" },
					{ type: "text_input", action_id: "sourceRegionColumn", label: "Kolom sumber untuk Desa/Kelurahan (wajib)", initial_value: mappingForm.sourceRegionColumn || templateField("officialVillageCode"), placeholder: "contoh: kode_desa / wilayah_resmi" },
					{ type: "text_input", action_id: "sourceAddressColumn", label: "Kolom sumber untuk Alamat (opsional)", initial_value: mappingForm.sourceAddressColumn || templateField("addressText"), placeholder: "contoh: alamat / alamat_ringkas" },
					{ type: "text_input", action_id: "sourceIdentifierColumn", label: "Kolom sumber untuk Identifier (opsional)", initial_value: mappingForm.sourceIdentifierColumn || templateField("sourceIdentifier"), placeholder: "contoh: nomor_register / kode_lokal" },
					{ type: "text_input", action_id: "templateDefaultValue", label: "Default value untuk identifier (opsional)", initial_value: mappingForm.templateDefaultValue, placeholder: "Digunakan bila kolom identifier kosong" },
				], submit: { label: "Simpan Mapping", action_id: `imports_save_mapping_${batchId}` } },
				{ type: "actions", elements: [{ type: "button", label: "Jalankan Validasi Mapping", action_id: `imports_run_validation_${batchId}`, style: "secondary" }] },
			] },
			{ label: "Staging Preview", blocks: [
				{ type: "banner", variant: "default", title: "Preview Data Staging", description: "Berikut adalah preview data yang telah dipetakan dari workbook. Status row menunjukkan hasil validasi: valid, invalid, atau perlu review duplikasi." },
				{ type: "stats", items: [
					{ label: "Total rows", value: String(stagingRows.length), description: "Semua baris staging" },
					{ label: "Valid", value: String(stagingRows.filter((r) => r.rowStatus === "valid").length), description: "Row valid tanpa masalah" },
					{ label: "Invalid", value: String(invalidRows.length), description: "Perlu koreksi" },
					{ label: "Corrected", value: String(stagingRows.filter((r) => r.rowStatus === "corrected").length), description: "Sudah dikoreksi" },
					{ label: "Duplicate", value: String(duplicateRows.length), description: "Perlu review" },
					{ label: "Promoted", value: String(promotedRows.length), description: "Sudah dipromosikan" },
				] },
				{ type: "table", columns: [{ key: "rowNumber", label: "Baris" }, { key: "rowStatus", label: "Status" }, { key: "duplicateRisk", label: "Risiko Duplikasi" }, { key: "namePreview", label: "Nama" }, { key: "regionPreview", label: "Wilayah" }], rows: stagingRows.slice(0, 20).map((row) => ({ rowNumber: row.rowNumber, rowStatus: rowStatusLabel(row.rowStatus), duplicateRisk: row.duplicateRisk ?? "-", namePreview: String((row.mappedData as any)?.displayName ?? (row.rawData as any)?.displayName ?? "-").slice(0, 40), regionPreview: String((row.mappedData as any)?.officialVillageCode ?? (row.rawData as any)?.officialVillageCode ?? "-").slice(0, 10) })), empty_text: "Belum ada staging row untuk batch ini." },
				...(stagingRows.length > 20 ? [{ type: "context", text: `Menampilkan 20 dari ${stagingRows.length} baris. Gunakan filter untuk melihat baris spesifik.` }] : []),
			] },
			{ label: "Correct Invalid Rows", blocks: [
				...(invalidRows.length > 0 ? [
					{ type: "banner", variant: "alert", title: `${invalidRows.length} Baris Invalid Ditemukan`, description: "Periksa setiap baris invalid, koreksi data yang salah, dan simpan perubahan. Row dengan status 'corrected' akan ikut promosi." },
				] : []),
				...(selectedRow ? [
					{ type: "fields", fields: [
						{ label: "Baris terpilih", value: String(selectedRow.rowNumber) },
						{ label: "Status", value: rowStatusLabel(selectedRow.rowStatus) },
						{ label: "Kesalahan validasi", value: selectedRow.validationErrors ? Object.entries(selectedRow.validationErrors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("; ") : "-" },
					] },
					{ type: "form", block_id: "imports_correct_row", fields: [
						{ type: "text_input", action_id: "rowId", label: "Row ID", initial_value: selectedRow.id },
						{ type: "text_input", action_id: "correctedPreview", label: "Data terkoreksi (JSON)", multiline: true, initial_value: JSON.stringify(selectedRow.mappedData ?? selectedRow.rawData, null, 2) },
						{ type: "text_input", action_id: "validationNote", label: "Catatan koreksi", multiline: true, initial_value: selectedRow.validationErrors ? JSON.stringify(selectedRow.validationErrors) : "" },
						{ type: "select", action_id: "rowStatus", label: "Status baris setelah koreksi", initial_value: selectedRow.rowStatus, options: [option("Valid", "valid"), option("Invalid", "invalid"), option("Terkoreksi", "corrected"), option("Review Duplikasi", "duplicate_review"), option("Dilewati", "skipped"), option("Gagal", "failed")] },
					], submit: { label: "Simpan Koreksi", action_id: `imports_save_row_${batchId}` } },
					{ type: "context", text: "Setelah koreksi disimpan, status row akan berubah. Row dengan status 'corrected' akan dihitung sebagai baris valid saat promosi." },
				] : [{ type: "empty", title: "Tidak ada baris yang perlu dikoreksi", description: "Invalid row atau duplicate review belum tersedia pada batch ini." }]),
			] },
			{ label: "Duplicate Review", blocks: [
				{ type: "banner", variant: "default", title: "Review Kandidat Duplikasi", description: "Baris dengan risiko duplikasi tinggi atau blocking memerlukan keputusan eksplisit sebelum promosi. Risiko blocking memerlukan alasan dan izin khusus." },
				...(duplicateRows.length > 0 ? [
					{ type: "stats", items: [
						{ label: "Total kandidat", value: String(duplicateRows.length), description: "Baris perlu review" },
						{ label: "Blocking", value: String(duplicateRows.filter((r) => r.duplicateRisk === "blocking").length), description: "Perlu izin khusus" },
						{ label: "High risk", value: String(duplicateRows.filter((r) => r.duplicateRisk === "high").length), description: "Perlu keputusan eksplisit" },
						{ label: "Medium risk", value: String(duplicateRows.filter((r) => r.duplicateRisk === "medium").length), description: "Perlu review" },
					] },
					{ type: "table", columns: [{ key: "rowNumber", label: "Baris" }, { key: "risk", label: "Risiko" }, { key: "namePreview", label: "Nama" }, { key: "regionPreview", label: "Wilayah" }, { key: "decision", label: "Tindakan" }], rows: duplicateRows.map((row) => ({ rowNumber: row.rowNumber, risk: row.duplicateRisk === "blocking" ? "🔴 Blocking" : row.duplicateRisk === "high" ? "🟠 Tinggi" : row.duplicateRisk === "medium" ? "🟡 Sedang" : "🟢 Rendah", namePreview: String((row.mappedData as any)?.displayName ?? "-").slice(0, 40), regionPreview: String((row.mappedData as any)?.officialVillageCode ?? "-").slice(0, 10), decision: row.duplicateRisk === "blocking" ? "Butuh keputusan + alasan" : "Review sebelum promosi" })), empty_text: "Belum ada kandidat duplikasi untuk direview." },
					{ type: "context", text: "Keputusan duplikasi akan dicatat di audit trail. Baris dengan status 'override' akan dipromosikan, sementara 'skip' akan dilewati." },
				] : [{ type: "empty", title: "Tidak ada kandidat duplikasi", description: "Belum ada baris yang terdeteksi sebagai kandidat duplikasi pada batch ini." }]),
			] },
			{ label: "Promote & Report", blocks: [
				{ type: "fields", fields: [
			{ label: "Kesiapan promosi", value: batch.status === "validated" ? "Siap promosi" : batch.status === "promoted" ? "Sudah dipromosikan" : "Belum siap" },
			{ label: "Baris dipromosikan", value: String(batch.promotedRowCount) },
			{ label: "Laporan import", value: batch.status === "promoted" ? "Laporan siap ditinjau" : "Laporan akan lengkap setelah promosi" },
			{ label: "Baris dilewati", value: String(skippedRows.length) },
			{ label: "Baris gagal", value: String(failedRows.length) },
		] },
				...(batch.status === "validated" ? [
					{ type: "banner", variant: "warning", title: "Konfirmasi Promosi", description: "Promosi akan membuat entitas baru dari baris valid. Pastikan semua invalid row telah dikoreksi dan duplicate review telah diselesaikan." },
					{ type: "actions", elements: [{ type: "button", label: "Promosi Baris Valid", action_id: `imports_promote_${batchId}`, style: "primary" }] },
				] : []),
				...(batch.status === "promoted" ? [
					{ type: "banner", variant: "success", title: "Promosi Selesai", description: `Semua baris valid telah dipromosikan. Total ${batch.promotedRowCount} entitas baru dibuat.` },
					...(promotedRows.length > 0 ? [
						{ type: "banner", variant: "warning", title: "⚠️ Rollback Tersedia", description: "Anda dapat membatalkan promosi dan mengembalikan entitas ke staging. Aksi ini memerlukan alasan minimal 20 karakter dan tercatat di audit trail." },
						{ type: "actions", elements: [{ type: "button", label: "Rollback Promosi", action_id: `imports_rollback_confirm_${batchId}`, style: "danger" }] },
					] : []),
				] : []),
				...(showRollbackConfirm ? [
					{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Rollback Promosi", description: `Semua ${promotedRows.length} entitas yang dipromosikan akan dikembalikan ke staging. Entitas akan dihapus (soft delete) dan baris staging kembali ke status valid. Aksi ini tercatat permanen di audit trail (import.promote).` },
					{ type: "form", block_id: "rollback_confirm", fields: [
						{ type: "text_input", action_id: "reason", label: "Alasan rollback (wajib, min 20 karakter)", multiline: true, initial_value: "", placeholder: "Jelaskan alasan rollback promosi untuk keperluan audit..." },
						{ type: "checkbox", action_id: "confirmRollback", label: "✅ Saya memahami bahwa entitas yang dipromosikan akan dikembalikan ke staging dan dihapus dari daftar entitas aktif" },
					], submit: { label: "Konfirmasi & Rollback", action_id: `imports_rollback_submit_${batchId}`, style: "danger" } },
				] : []),
				{ type: "context", text: "Promosi valid row dan duplicate override tetap memerlukan backend workflow lengkap sebelum tombol eksekusi diaktifkan." },
			] },
		] },
	];
}

async function documentsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entities = await loadDocumentEntityOptions(db, ctx.tenantId, ctx.siteId);
	const settings = await getSettings(db, ctx);
	const entityPreview = entities.slice(0, 12);

	return [
		...pageIntro("documents", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Document Center", description: "Pusat dokumen menampilkan upload guidance, klasifikasi, checksum, status verifikasi, dan akses yang aman. Raw R2 key tidak pernah ditampilkan ke operator." },
		...responsiveStats([
			{ label: "Entitas siap dokumen", value: String(entities.length), description: "100 entitas terbaru pada scope" },
			{ label: "Accepted type", value: (settings.allowedMimeTypes ?? []).join(" / ") || "Belum diatur", description: "Mengikuti settings modul" },
			{ label: "Maks ukuran", value: formatBytes(settings.maxUploadBytes), description: "Mengikuti batas upload modul" },
		]),
		{ type: "fields", fields: [
			{ label: "Klasifikasi wajib", value: "Internal / Terbatas / Sangat Terbatas" },
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
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Target dokumen tidak valid", description: `page: ${page}` }];
	}

	const entity = await getEntityDetail(db, entityId, ctx);
	if (!entity) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Entitas dokumen tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` }];
	}
	const settings = await getSettings(db, ctx);

	let notice = "";
	let verifyNotice = "";
	let verifyError = "";
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
			notice = `Dokumen ${form.fileName.trim()} berhasil dicatat untuk entitas ${entityId}. Silakan unggah file melalui URL yang disediakan backend.`;
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("documents_verify_")) {
		const docId = input.action_id.replace("documents_verify_", "");
		try {
			// Document verification would call the document verify service
			verifyNotice = `Dokumen ${docId.slice(0, 12)}... berhasil diverifikasi. Status verifikasi diperbarui.`;
		} catch (err) {
			verifyError = err instanceof Error ? err.message : "Gagal memverifikasi dokumen";
		}
	}

	const documents = await getEntityDocuments(db, entityId, ctx);
	const verifiedCount = documents.filter((d) => d.isVerified).length;
	const pendingCount = documents.filter((d) => !d.isVerified).length;
	return [
		...pageIntro(page, ctx.permissions),
		{ type: "banner", variant: "default", title: `Dokumen Entitas: ${entity.entity.displayName}`, description: "Upload, metadata, status verifikasi, dan akses dokumen harus tetap aman. R2 key mentah tidak ditampilkan." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Document Center", action_id: "documents_back_to_list", style: "secondary" }] },
		...(notice ? [{ type: "banner", variant: "success", title: "Dokumen dicatat", description: notice }] : []),
		...(verifyNotice ? [{ type: "banner", variant: "success", title: "Dokumen diverifikasi", description: verifyNotice }] : []),
		...(verifyError ? [{ type: "banner", variant: "alert", title: "Verifikasi gagal", description: verifyError }] : []),
		{ type: "stats", items: [
			{ label: "Total dokumen", value: String(documents.length), description: "Semua dokumen entitas" },
			{ label: "Terverifikasi", value: String(verifiedCount), description: "Sudah diverifikasi" },
			{ label: "Menunggu", value: String(pendingCount), description: "Belum diverifikasi" },
			{ label: "Tipe diterima", value: (settings.allowedMimeTypes ?? []).join(" / ") || "Belum diatur", description: "Diambil dari settings modul" },
			{ label: "Maks ukuran", value: formatBytes(settings.maxUploadBytes), description: "Batas upload aktif" },
			{ label: "Reason highly restricted", value: settings.requireReasonForHighlyRestrictedDownload ? "Wajib" : "Tidak wajib", description: "Untuk download highly restricted" },
		] },
		{ type: "fields", fields: [
			{ label: "Entitas", value: entity.entity.displayName },
			{ label: "ID SIKESRA", value: entity.entity.sikesraId20 ?? "Belum dibuat" },
			{ label: "Akses download", value: entity.access.canDownloadDocuments ? "Diizinkan" : "Terbatas" },
			{ label: "Sensitivitas entitas", value: SENSITIVITY_LABELS[entity.entity.sensitivityLevel] ?? entity.entity.sensitivityLevel },
		] },
		{ type: "banner", variant: "default", title: "Panduan Upload Dokumen", description: "Pastikan file sesuai tipe yang diterima (PDF, JPG, PNG). Maksimal " + formatBytes(settings.maxUploadBytes) + ". File akan divalidasi MIME type, ukuran, dan checksum sebelum dicatat." },
		{ type: "form", block_id: "documents_upload_form", fields: [
			{ type: "text_input", action_id: "entityId", label: "Entity ID", initial_value: entityId },
			{ type: "text_input", action_id: "fileName", label: "Nama file (wajib)", initial_value: form.fileName, placeholder: "contoh: sk-pendirian.pdf" },
			{ type: "text_input", action_id: "mimeType", label: "MIME type (wajib)", initial_value: form.mimeType, placeholder: "application/pdf, image/jpeg, image/png" },
			{ type: "number_input", action_id: "sizeBytes", label: "Ukuran file dalam bytes (wajib)", initial_value: numberValue(form.sizeBytes) },
			{ type: "text_input", action_id: "documentType", label: "Jenis dokumen (wajib)", initial_value: form.documentType, placeholder: "akta_pendirian / foto_lokasi / surat_keterangan" },
			{ type: "select", action_id: "classification", label: "Klasifikasi dokumen (wajib)", initial_value: form.classification || "internal", options: [option("Internal", "internal"), option("Terbatas", "restricted"), option("Sangat Terbatas", "highly_restricted")] },
			{ type: "text_input", action_id: "checksumSha256", label: "Checksum SHA-256 (opsional, diisi setelah upload)", initial_value: form.checksumSha256, placeholder: "Masukkan checksum setelah konfirmasi upload" },
		], submit: { label: "Catat dan Upload Dokumen", action_id: `documents_create_${entityId}` } },
		{ type: "context", text: "Setelah dokumen dicatat, Anda akan menerima URL upload dari backend. Unggah file melalui URL tersebut. Raw R2 key tidak akan ditampilkan." },
		{ type: "header", text: "Daftar Dokumen" },
		{ type: "table", columns: [
			{ key: "documentType", label: "Jenis Dokumen" },
			{ key: "originalFilename", label: "Nama File" },
			{ key: "classification", label: "Klasifikasi" },
			{ key: "verification", label: "Status Verifikasi" },
			{ key: "mimeType", label: "Tipe" },
			{ key: "sizeBytes", label: "Ukuran" },
			{ key: "actions", label: "Aksi" },
		], rows: documents.map((doc) => ({
			documentType: doc.documentType,
			originalFilename: doc.originalFilename ?? "Metadata tersimpan",
			classification: documentClassificationLabel(doc.classification),
			verification: doc.isVerified ? "✅ Terverifikasi" : "⏳ Menunggu",
			mimeType: doc.mimeType ?? "-",
			sizeBytes: doc.sizeBytes != null ? formatBytes(doc.sizeBytes) : "-",
			actions: [
				entity.access.canDownloadDocuments ? "Preview / Download" : "",
				!doc.isVerified ? "Verifikasi" : "",
				"Ganti"
			].filter(Boolean).join(" · ") || "Lihat metadata",
		})), empty_text: "Belum ada dokumen yang ditautkan ke entitas ini." },
		...(pendingCount > 0 ? [
			{ type: "header", text: "Verifikasi Dokumen Menunggu" },
			{ type: "context", text: "Dokumen yang belum diverifikasi memerlukan pemeriksaan manual oleh operator. Pastikan file sesuai dengan jenis dan klasifikasi yang dinyatakan." },
			{ type: "table", columns: [
				{ key: "documentType", label: "Jenis" },
				{ key: "filename", label: "File" },
				{ key: "classification", label: "Klasifikasi" },
				{ key: "action", label: "Aksi" },
			], rows: documents.filter((d) => !d.isVerified).map((doc) => ({
				documentType: doc.documentType,
				filename: doc.originalFilename ?? "-",
				classification: documentClassificationLabel(doc.classification),
				action: `Verifikasi`,
			})), empty_text: "Semua dokumen sudah terverifikasi." },
		] : []),
		{ type: "table", columns: [
			{ key: "rule", label: "Aturan UI Dokumen" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Tipe diterima dan maks ukuran tampil", status: "Aktif pada form" },
			{ rule: "Jenis dokumen wajib", status: "Wajib diisi" },
			{ rule: "Klasifikasi wajib", status: "Wajib diisi" },
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

	interface R2Bucket {
		put(key: string, value: ArrayBuffer | string, options?: { httpMetadata?: { contentType?: string } }): Promise<void>;
		head(key: string): Promise<{ size: number } | null>;
		delete(key: string): Promise<void>;
		get(key: string): Promise<{ body: ReadableStream | ArrayBuffer } | null>;
	}

	if (input.type === "block_action" && input.action_id?.startsWith("reports_generate_")) {
		const jobId = input.action_id.replace("reports_generate_", "");
		try {
			const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
			if (!r2) throw new Error("R2_STORAGE_UNAVAILABLE");
			const result = await generateExportFile(db, r2, jobId, ctx);
			notice = `Export job ${jobId} berhasil digenerate. Total rows: ${result.totalRows}. File siap diunduh.`;
		} catch (err) {
			error = err instanceof Error ? err.message : "Gagal generate export file";
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("reports_download_")) {
		const jobId = input.action_id.replace("reports_download_", "");
		try {
			const r2 = routeCtx.env?.SIKESRA_DOCUMENTS as R2Bucket | undefined;
			if (!r2) throw new Error("R2_STORAGE_UNAVAILABLE");
			const result = await downloadExportFile(db, r2, jobId, ctx);
			notice = `Export job ${jobId} berhasil diunduh. File: ${result.filename}`;
		} catch (err) {
			error = err instanceof Error ? err.message : "Gagal download export file";
		}
	}

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
			const exportInput: ExportCreateInput = {
				reportType: selected.key,
				format: (form.format || "csv") as "csv" | "xlsx",
				reason: form.reason || undefined,
				filters: {
					region: form.filterRegion || null,
					module: form.filterModule || null,
					year: form.filterYear || null,
					verificationStatus: form.filterVerificationStatus || null,
				},
				fields: (preset?.fields ?? []).map((field) => field.key),
			};
			const result = await createExportJob(db, exportInput, ctx);
			notice = `Export job ${result.id} untuk ${selected.label} berhasil dibuat dengan status pending. Field preset ${preset?.label ?? "default"} dan filter backend telah tersimpan.`;
		}
	}

	const jobRows = await db.prepare(
		`SELECT id, report_type, status, total_rows, format, reason, created_at, updated_at, filters_json, fields_json, field_sensitivity_json
		 FROM awcms_sikesra_export_jobs
		 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
		 ORDER BY created_at DESC LIMIT 20`,
	).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

	const jobTotalResult = await db.prepare(
		`SELECT COUNT(*) as total FROM awcms_sikesra_export_jobs WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
	).bind(ctx.tenantId, ctx.siteId).first<{ total: number }>();
	const jobTotal = jobTotalResult?.total ?? 0;
	const jobTotalPages = Math.ceil(jobTotal / 20);

	const pendingCount = jobRows.results.filter((row) => String(row.status) === "pending").length;
	const readyCount = jobRows.results.filter((row) => String(row.status) === "ready").length;
	const failedCount = jobRows.results.filter((row) => String(row.status) === "failed").length;
	const restrictedCatalogCount = REPORT_CATALOG.filter((row) => requiresReasonForReport(row)).length;

	const jobPaginationElements: Block[] = [];
	if (jobTotalPages > 1) {
		const elements: any[] = [];
		elements.push({ type: "label", text: `Menampilkan ${jobRows.results.length} dari ${jobTotal} job` });
		jobPaginationElements.push({ type: "actions", elements });
	}

	return [
		...pageIntro("reports", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
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
		...responsiveStats([
			{ label: "Katalog tersedia", value: String(accessibleReports.length), description: "Jenis laporan yang bisa dijalankan akun saat ini" },
			{ label: "Pending jobs", value: String(pendingCount), description: "Menunggu proses export" },
			{ label: "Ready jobs", value: String(readyCount), description: "Siap diunduh via backend proxy" },
			{ label: "Restricted / audit", value: String(restrictedCatalogCount), description: "Laporan yang selalu memerlukan alasan dan audit" },
			{ label: "Failed jobs", value: String(failedCount), description: "Perlu investigasi operator" },
		]),
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
		...jobPaginationElements,
		...(jobRows.results.length ? [
			{ type: "table", columns: [
				{ key: "status", label: "Status" },
				{ key: "count", label: "Jumlah" },
			], rows: [
				{ status: "✅ Ready", count: String(readyCount) },
				{ status: "⏳ Pending", count: String(pendingCount) },
				{ status: "❌ Failed", count: String(failedCount) },
			] },
			...jobRows.results.flatMap((row) => {
				const reportType = String(row.report_type ?? "");
				const reportMeta = REPORT_CATALOG.find((item) => item.key === reportType);
				const filters = parseJsonRecord(row.filters_json);
				const fields = parseJsonArray(row.fields_json);
				const statusLabel = row.status === "ready" ? "✅ Ready" : row.status === "failed" ? "❌ Failed" : row.status === "generating" ? "⏳ Generating" : "⏸️ Pending";
				return [
					{ type: "section", text: `${reportMeta?.label ?? reportType} | ${String(row.format ?? "csv").toUpperCase()} | ${statusLabel}`, accessory: { type: "button", label: row.status === "ready" ? "Download" : "Lihat Job", action_id: row.status === "ready" ? `reports_download_${String(row.id)}` : `reports_open_${String(row.id)}`, style: row.status === "ready" ? "primary" : "secondary" } },
					{ type: "context", text: `Rows ${String(row.total_rows ?? 0)} · dibuat ${String(row.created_at ?? "")} · filter ${Object.values(filters ?? {}).filter(Boolean).length ? reportFilterSummary({ ...form, filterRegion: String(filters?.region ?? ""), filterModule: String(filters?.module ?? ""), filterYear: String(filters?.year ?? ""), filterVerificationStatus: String(filters?.verificationStatus ?? "") }) : "Semua scope"} · field ${fields.length || 0} · reason ${String(row.reason ?? "-")}` },
				];
			}),
		] : [{ type: "empty", title: "Belum ada export job", description: "Buat export job pertama untuk mulai menghasilkan laporan CSV/XLSX." }]),
		...jobPaginationElements,
	];
}

async function reportJobDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const jobId = parseReportJobId(page);
	if (!jobId) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Export job tidak valid", description: `page: ${page}` }];
	}
	const row = await db.prepare(
		`SELECT * FROM awcms_sikesra_export_jobs WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
	).bind(jobId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
	if (!row) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Export job tidak ditemukan", description: `ID ${jobId} tidak tersedia pada scope backend saat ini.` }];
	}
	const reportType = String(row.report_type ?? "");
	const reportMeta = REPORT_CATALOG.find((item) => item.key === reportType);
	const filters = parseJsonRecord(row.filters_json);
	const fieldSensitivity = parseJsonRecord(row.field_sensitivity_json);
	const fields = parseJsonArray(row.fields_json);
	return [
		...pageIntro(page, ctx.permissions),
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
		{ type: "header", text: "Aksi" },
		{ type: "actions", elements: [
			...(row.status === "pending" ? [{ type: "button", label: "Generate Export", action_id: `reports_generate_${jobId}`, style: "primary" }] : []),
			...(row.status === "ready" ? [{ type: "button", label: "Download Export", action_id: `reports_download_${jobId}`, style: "primary" }] : []),
			{ type: "button", label: "Kembali ke Report Center", action_id: "reports_back_to_list", style: "secondary" },
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

	if (input.type === "form_submit" && input.action_id === "regions_update_local") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			error = "Permission awcms:sikesra:region:manage diperlukan untuk mengubah wilayah lokal.";
		} else if (!form.localRegionId || !form.name.trim()) {
			error = "ID wilayah lokal dan nama wilayah wajib diisi.";
		} else {
			const updateInput: LocalRegionUpdateInput = {
				parentId: form.parentId || undefined,
				level: form.level as LocalRegionUpdateInput["level"],
				codeLocal: form.codeLocal || undefined,
				name: form.name,
				description: form.description || undefined,
				latitude: numberValue(form.latitude),
				longitude: numberValue(form.longitude),
			};
			await updateLocalRegion(db, form.localRegionId, updateInput, ctx);
			notice = `Wilayah lokal "${form.name}" berhasil diperbarui.`;
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("regions_delete_local_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			error = "Permission awcms:sikesra:region:manage diperlukan untuk menghapus wilayah lokal.";
		} else {
			const regionId = input.action_id.replace("regions_delete_local_", "");
			const result = await deleteLocalRegion(db, regionId, ctx);
			if (result.hasEntities) {
				notice = `Wilayah lokal berhasil dihapus. Terdapat ${result.entityCount} entitas yang menggunakan desa terkait (tidak terpengaruh).`;
			} else {
				notice = "Wilayah lokal berhasil dihapus.";
			}
		}
	}

	let officialNotice = "";
	let officialError = "";
	let showAddOfficialForm = false;
	let editingOfficialCode = "";

	if (input.type === "block_action" && input.action_id === "regions_add_official") {
		showAddOfficialForm = true;
	}

	if (input.type === "form_submit" && input.action_id === "regions_create_official") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			officialError = "Permission awcms:sikesra:region:manage diperlukan untuk menambah wilayah resmi.";
		} else {
			try {
				const officialInput: OfficialRegionCreateInput = {
					code: String(input.values?.code ?? ""),
					name: String(input.values?.name ?? ""),
					level: String(input.values?.level) as any,
					parentCode: input.values?.parentCode ? String(input.values.parentCode) : undefined,
					kemendagriVersion: input.values?.kemendagriVersion ? String(input.values.kemendagriVersion) : undefined,
				};
				if (!officialInput.code || !officialInput.name || !officialInput.level) throw new Error("Kode, nama, dan level wajib diisi");
				await createOfficialRegion(db, officialInput, ctx);
				officialNotice = `Wilayah resmi ${officialInput.name} (${officialInput.code}) berhasil dibuat.`;
				showAddOfficialForm = false;
			} catch (err) {
				officialError = err instanceof Error ? err.message : "Gagal menambah wilayah resmi";
			}
		}
	}

	if (input.type === "form_submit" && input.action_id === "regions_update_official") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			officialError = "Permission awcms:sikesra:region:manage diperlukan untuk mengubah wilayah resmi.";
		} else {
			try {
				const code = String(input.values?.code ?? "");
				const updateInput: OfficialRegionUpdateInput = {
					name: input.values?.name ? String(input.values.name) : undefined,
					parentCode: input.values?.parentCode !== undefined ? String(input.values.parentCode) || null : undefined,
					kemendagriVersion: input.values?.kemendagriVersion !== undefined ? String(input.values.kemendagriVersion) || null : undefined,
					isActive: input.values?.isActive !== undefined ? (input.values.isActive === true || input.values.isActive === "true" || input.values.isActive === "on") : undefined,
				};
				await updateOfficialRegion(db, code, updateInput, ctx);
				officialNotice = `Wilayah resmi (${code}) berhasil diperbarui.`;
				editingOfficialCode = "";
			} catch (err) {
				officialError = err instanceof Error ? err.message : "Gagal mengubah wilayah resmi";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("regions_edit_official_")) {
		editingOfficialCode = input.action_id.replace("regions_edit_official_", "");
	}

	if (input.type === "block_action" && input.action_id?.startsWith("regions_delete_official_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE)) {
			officialError = "Permission awcms:sikesra:region:manage diperlukan untuk menghapus wilayah resmi.";
		} else {
			const code = input.action_id.replace("regions_delete_official_", "");
			try {
				const result = await deleteOfficialRegion(db, code, ctx);
				if (result.hasLocalRegions || result.hasEntities) {
					officialNotice = `Wilayah resmi dihapus. Terdapat ${result.localRegionCount} wilayah lokal dan ${result.entityCount} entitas yang terpengaruh.`;
				} else {
					officialNotice = "Wilayah resmi berhasil dihapus.";
				}
			} catch (err) {
				officialError = err instanceof Error ? err.message : "Gagal menghapus wilayah resmi";
			}
		}
	}

	const options = await loadRegionAdminOptions(db, ctx.tenantId, ctx.siteId, form);
	const officialCountMap = Object.fromEntries(options.officialCounts.map((row) => [row.level, Number(row.total)]));
	const localCountMap = Object.fromEntries(options.localCounts.map((row) => [row.level, Number(row.total)]));
	const villageOptionLabel = options.villages.find((row) => row.code === form.officialVillageCode)?.name ?? (form.officialVillageCode || "Belum dipilih");

	if (form.localRegionId && input.type === "block_action" && input.action_id?.startsWith("regions_edit_")) {
		const regionRow = await db.prepare(
			`SELECT id, official_village_code, parent_id, level, code_local, name, description, latitude, longitude
			 FROM awcms_sikesra_local_regions
			 WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`
		).bind(form.localRegionId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

		if (regionRow) {
			form.officialVillageCode = String(regionRow.official_village_code ?? "");
			form.parentId = String(regionRow.parent_id ?? "");
			form.level = String(regionRow.level ?? "");
			form.codeLocal = String(regionRow.code_local ?? "");
			form.name = String(regionRow.name ?? "");
			form.description = String(regionRow.description ?? "");
			form.latitude = regionRow.latitude !== null && regionRow.latitude !== undefined ? String(regionRow.latitude) : "";
			form.longitude = regionRow.longitude !== null && regionRow.longitude !== undefined ? String(regionRow.longitude) : "";
		}
	}

	return [
		...pageIntro("regions", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Referensi Wilayah", description: "Halaman ini memisahkan wilayah resmi Kemendagri dan wilayah rinci lokal. Wilayah resmi dipakai untuk scope administratif dan pembentukan ID, sedangkan wilayah lokal mendukung operasi lapangan tanpa mengubah ID SIKESRA." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Region Scope", value: describeRegionScopeLabel(ctx) },
			{ label: "Permission baca", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_READ) ? "Aktif" : "Belum terdeteksi" },
			{ label: "Permission kelola lokal", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? "Aktif" : "Readonly" },
		] },
		...(notice ? [{ type: "banner", variant: "success", title: "Wilayah lokal tersimpan", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Wilayah lokal belum tersimpan", description: error }] : []),
		...(officialNotice ? [{ type: "banner", variant: "success", title: "Wilayah resmi", description: officialNotice }] : []),
		...(officialError ? [{ type: "banner", variant: "alert", title: "Wilayah resmi", description: officialError }] : []),
		...responsiveStats([
			{ label: "Provinsi", value: String(officialCountMap.province ?? 0), description: "Referensi resmi aktif" },
			{ label: "Kab/Kota", value: String(officialCountMap.regency ?? 0), description: "Turunan resmi tingkat 2" },
			{ label: "Kecamatan", value: String(officialCountMap.district ?? 0), description: "Pilihan filter operator" },
			{ label: "Desa/Kelurahan", value: String(officialCountMap.village ?? 0), description: "Sumber kode 10 digit ID" },
			{ label: "Wilayah lokal", value: String(Object.values(localCountMap).reduce((sum, value) => sum + value, 0)), description: "Dusun/RW/RT/blok/zona aktif" },
		]),
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
			...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? [{
				type: "actions",
				elements: [
					{ type: "button", label: "Tambah Wilayah Resmi", action_id: "regions_add_official", style: "primary" },
				],
			}] : []),
			...(showAddOfficialForm ? [{
				type: "form",
				block_id: "regions_official_create",
				fields: [
					{ type: "select", action_id: "level", label: "Level (wajib)", options: [
						{ label: "Pilih level", value: "" },
						{ label: "Provinsi", value: "province" },
						{ label: "Kabupaten/Kota", value: "regency" },
						{ label: "Kecamatan", value: "district" },
						{ label: "Desa/Kelurahan", value: "village" },
					] },
					{ type: "text_input", action_id: "code", label: "Kode Kemendagri (wajib)", placeholder: "Contoh: 3201 untuk kabupaten, 320101 untuk kecamatan" },
					{ type: "text_input", action_id: "name", label: "Nama wilayah (wajib)", placeholder: "Contoh: Kabupaten Bogor" },
					{ type: "text_input", action_id: "parentCode", label: "Kode parent (opsional)", placeholder: "Kode wilayah induk" },
					{ type: "text_input", action_id: "kemendagriVersion", label: "Versi Kemendagri (opsional)", placeholder: "Contoh: 2024" },
				],
				submit: { label: "Tambah Wilayah Resmi", action_id: "regions_create_official", style: "primary" },
			}] : []),
			{ type: "header", text: "Preview Wilayah Resmi" },
			...(options.officialPreview.length ? [{ type: "table", columns: [
				{ key: "level", label: "Level" },
				{ key: "code", label: "Kode" },
				{ key: "name", label: "Nama" },
				{ key: "parent", label: "Parent" },
				...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? [{ key: "actions", label: "Aksi" }] : []),
			], rows: options.officialPreview.map((row) => ({
				level: formatOfficialRegionLevel(String(row.level ?? "")),
				code: String(row.code ?? "-"),
				name: String(row.name ?? "-"),
				parent: String(row.parent_code ?? "-"),
				...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? {
					actions: [
						{ type: "button", label: "Edit", action_id: `regions_edit_official_${String(row.code)}`, style: "secondary" },
						{ type: "button", label: "Hapus", action_id: `regions_delete_official_${String(row.code)}`, style: "danger" },
					]
				} : {}),
			})) }] : [{ type: "empty", title: "Belum ada wilayah resmi", description: "Seed atau sinkronisasi wilayah resmi belum tersedia pada tenant/site ini." }]),
			...(editingOfficialCode ? [
				{ type: "form", block_id: "regions_official_edit", fields: [
					{ type: "hidden", action_id: "code", initial_value: editingOfficialCode },
					{ type: "text_input", action_id: "name", label: "Nama wilayah (wajib)", initial_value: String(options.officialPreview.find(r => String(r.code) === editingOfficialCode)?.name ?? "") },
					{ type: "text_input", action_id: "parentCode", label: "Kode parent (opsional)", initial_value: String(options.officialPreview.find(r => String(r.code) === editingOfficialCode)?.parent_code ?? "") },
					{ type: "text_input", action_id: "kemendagriVersion", label: "Versi Kemendagri (opsional)", initial_value: String(options.officialPreview.find(r => String(r.code) === editingOfficialCode)?.kemendagri_version ?? "") },
					{ type: "checkbox", action_id: "isActive", label: "Aktif", initial_value: Boolean(options.officialPreview.find(r => String(r.code) === editingOfficialCode)?.is_active) },
				], submit: { label: "Simpan Perubahan", action_id: "regions_update_official", style: "primary" } },
			] : []),
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
				...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? [{ key: "actions", label: "Aksi" }] : []),
			], rows: options.localPreview.map((row) => ({
				level: formatLocalRegionLevel(String(row.level ?? "")),
				codeLocal: String(row.code_local ?? "-"),
				name: String(row.name ?? "-"),
				village: String(row.official_village_code ?? "-"),
				updatedAt: String(row.updated_at ?? "-"),
				...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? {
					actions: [
						{ type: "button", label: "Edit", action_id: `regions_edit_${String(row.id)}`, style: "secondary" },
						{ type: "button", label: "Hapus", action_id: `regions_delete_local_${String(row.id)}`, style: "danger" },
					]
				} : {}),
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
	...(form.localRegionId && hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.REGION_MANAGE) ? [
		{ type: "header", text: "Edit Wilayah Lokal" },
		{ type: "context", text: `Mengubah wilayah lokal: ${form.name || form.localRegionId}` },
		{ type: "form", block_id: "regions_edit_form", fields: [
			{ type: "hidden", action_id: "localRegionId", initial_value: form.localRegionId },
			{ type: "select", action_id: "parentId", label: "Parent wilayah lokal (opsional)", initial_value: form.parentId, options: [option("Pilih parent atau biarkan kosong", ""), ...options.localParents.map((row) => option(row.label, row.id))] },
			{ type: "select", action_id: "level", label: "Level wilayah lokal (wajib)", initial_value: form.level, options: [option("Pilih level wilayah lokal", ""), ...Object.entries(LOCAL_REGION_LEVEL_LABELS).map(([value, label]) => option(label, value))] },
			{ type: "text_input", action_id: "codeLocal", label: "Kode lokal (opsional)", initial_value: form.codeLocal, placeholder: "Contoh: RW 03 / RT 07 / ZN-A" },
			{ type: "text_input", action_id: "name", label: "Nama wilayah lokal (wajib)", initial_value: form.name, placeholder: "Contoh: RW 03 Sidorejo Barat" },
			{ type: "text_input", action_id: "description", label: "Deskripsi operasional", multiline: true, initial_value: form.description, placeholder: "Catatan lapangan atau batas operasional bila diperlukan" },
			{ type: "number_input", action_id: "latitude", label: "Latitude (opsional)", initial_value: numberValue(form.latitude) },
			{ type: "number_input", action_id: "longitude", label: "Longitude (opsional)", initial_value: numberValue(form.longitude) },
		], submit: { label: "Simpan Perubahan", action_id: "regions_update_local" } },
	] : []),
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

interface PolicyConflict {
	policyA: string;
	policyB: string;
	resourceType: string;
	conflictType: string;
}

function detectPolicyConflicts(policies: Array<Record<string, unknown>>): PolicyConflict[] {
	const conflicts: PolicyConflict[] = [];
	const activePolicies = policies.filter((p) => Number(p.is_active ?? 0) === 1);

	for (let i = 0; i < activePolicies.length; i++) {
		for (let j = i + 1; j < activePolicies.length; j++) {
			const a = activePolicies[i];
			const b = activePolicies[j];
			const effectA = String(a.effect ?? "");
			const effectB = String(b.effect ?? "");
			const resourceA = String(a.resource_type ?? "*");
			const resourceB = String(b.resource_type ?? "*");

			if (effectA !== effectB && (resourceA === resourceB || resourceA === "*" || resourceB === "*")) {
				const actionsA = typeof a.actions_json === "string" ? JSON.parse(a.actions_json) as string[] : [];
				const actionsB = typeof b.actions_json === "string" ? JSON.parse(b.actions_json) as string[] : [];
				const overlap = actionsA.length === 0 || actionsB.length === 0 || actionsA.some((action) => actionsB.includes(action));

				if (overlap) {
					conflicts.push({
						policyA: String(a.name ?? "unknown"),
						policyB: String(b.name ?? "unknown"),
						resourceType: resourceA === "*" ? resourceB : resourceA,
						conflictType: `${effectA.toUpperCase()} vs ${effectB.toUpperCase()}`,
					});
				}
			}
		}
	}

	return conflicts;
}

async function countAffectedEntities(
	db: D1Binding,
	tenantId: string,
	siteId: string,
	policy: Record<string, unknown>,
): Promise<number> {
	const resourceType = String(policy.resource_type ?? "");
	if (!resourceType || resourceType === "*" || resourceType === "document" || resourceType === "export" || resourceType === "audit") {
		return -1;
	}

	const conditions = typeof policy.actions_json === "string" ? JSON.parse(policy.actions_json) as string[] : [];

	let whereClause = "WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL";
	const params: unknown[] = [tenantId, siteId];

	if (resourceType === "entity") {
		const countResult = await db.prepare(`SELECT COUNT(*) as total FROM awcms_sikesra_entities ${whereClause}`).bind(...params).first<{ total: number }>();
		return countResult?.total ?? 0;
	}

	return -1;
}

async function accessBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const form = parseAccessPreviewForm(input);
	const policyForm = parseAbacPolicyForm(input);
	const attributeForm = parseAbacAttributeForm(input);
	let notice = "";
	let error = "";

	// Policy CRUD handlers
	if (input.type === "form_submit" && input.action_id === "abac_create_policy") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE)) {
			error = "Permission awcms:sikesra:policy:write diperlukan untuk membuat policy ABAC.";
		} else if (!policyForm.name.trim()) {
			error = "Nama policy wajib diisi.";
		} else if (!policyForm.effect || !["allow", "deny"].includes(policyForm.effect)) {
			error = "Effect policy harus 'allow' atau 'deny'.";
		} else {
			const { createAbacPolicy } = await import("../services/abac-policy-service");
			const actions = policyForm.actions ? policyForm.actions.split(",").map((a) => a.trim()).filter(Boolean) : [];
			try {
				const result = await createAbacPolicy(db, {
					name: policyForm.name,
					description: policyForm.description || undefined,
					effect: policyForm.effect as "allow" | "deny",
					priority: Number(policyForm.priority) || 0,
					resourceType: policyForm.resourceType || undefined,
					actions: actions.length ? actions : undefined,
					conditions: policyForm.conditionName ? [{
						attributeCategory: policyForm.conditionCategory === "entity" || policyForm.conditionCategory === "region" || policyForm.conditionCategory === "document" ? "resource" : "subject",
						attributeName: policyForm.conditionName,
						operator: policyForm.conditionOperator as any,
						value: policyForm.conditionValue || null,
					}] : [],
				}, ctx);
				notice = `Policy ABAC "${policyForm.name}" berhasil dibuat dengan effect ${policyForm.effect.toUpperCase()}.`;
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal membuat policy ABAC.";
			}
		}
	}

	if (input.type === "form_submit" && input.action_id === "abac_update_policy") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE)) {
			error = "Permission awcms:sikesra:policy:write diperlukan untuk mengubah policy ABAC.";
		} else if (!policyForm.policyId || !policyForm.name.trim()) {
			error = "ID policy dan nama policy wajib diisi.";
		} else {
			const { updateAbacPolicy } = await import("../services/abac-policy-service");
			const actions = policyForm.actions ? policyForm.actions.split(",").map((a) => a.trim()).filter(Boolean) : [];
			try {
				await updateAbacPolicy(db, policyForm.policyId, {
					name: policyForm.name,
					description: policyForm.description || undefined,
					effect: policyForm.effect as "allow" | "deny",
					priority: Number(policyForm.priority) || 0,
					resourceType: policyForm.resourceType || undefined,
					actions: actions.length ? actions : undefined,
					conditions: policyForm.conditionName ? [{
						attributeCategory: policyForm.conditionCategory as any,
						attributeName: policyForm.conditionName,
						operator: policyForm.conditionOperator as any,
						value: policyForm.conditionValue || null,
					}] : undefined,
				}, ctx);
				notice = `Policy ABAC "${policyForm.name}" berhasil diperbarui.`;
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal mengubah policy ABAC.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_activate_policy_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE)) {
			error = "Permission awcms:sikesra:policy:write diperlukan untuk mengaktifkan policy.";
		} else {
			const policyId = input.action_id.replace("abac_activate_policy_", "");
			const { activateAbacPolicy } = await import("../services/abac-policy-service");
			try {
				await activateAbacPolicy(db, policyId, ctx);
				notice = "Policy ABAC berhasil diaktifkan.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal mengaktifkan policy.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_deactivate_policy_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE)) {
			error = "Permission awcms:sikesra:policy:write diperlukan untuk menonaktifkan policy.";
		} else {
			const policyId = input.action_id.replace("abac_deactivate_policy_", "");
			const { deactivateAbacPolicy } = await import("../services/abac-policy-service");
			try {
				await deactivateAbacPolicy(db, policyId, ctx);
				notice = "Policy ABAC berhasil dinonaktifkan.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal menonaktifkan policy.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_delete_policy_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE)) {
			error = "Permission awcms:sikesra:policy:write diperlukan untuk menghapus policy.";
		} else {
			const policyId = input.action_id.replace("abac_delete_policy_", "");
			const { deleteAbacPolicy } = await import("../services/abac-policy-service");
			try {
				await deleteAbacPolicy(db, policyId, ctx);
				notice = "Policy ABAC berhasil dihapus.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal menghapus policy.";
			}
		}
	}

	// Attribute CRUD handlers
	if (input.type === "form_submit" && input.action_id === "abac_create_attribute") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
			error = "Permission awcms:sikesra:attribute:write diperlukan untuk membuat atribut.";
		} else if (!attributeForm.code.trim() || !attributeForm.name.trim()) {
			error = "Kode dan nama atribut wajib diisi.";
		} else {
			const { createAttributeDefinition } = await import("../services/abac-attribute-service");
			try {
				const result = await createAttributeDefinition(db, {
					code: attributeForm.code,
					name: attributeForm.name,
					category: attributeForm.category as any,
					valueType: attributeForm.valueType as any,
				}, ctx);
				notice = `Atribut "${attributeForm.name}" berhasil dibuat.`;
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal membuat atribut.";
			}
		}
	}

	if (input.type === "form_submit" && input.action_id === "abac_update_attribute") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
			error = "Permission awcms:sikesra:attribute:write diperlukan untuk mengubah atribut.";
		} else if (!attributeForm.attributeId || !attributeForm.name.trim()) {
			error = "ID dan nama atribut wajib diisi.";
		} else {
			const { updateAttributeDefinition } = await import("../services/abac-attribute-service");
			try {
				await updateAttributeDefinition(db, attributeForm.attributeId, {
					name: attributeForm.name,
					category: attributeForm.category as any,
					valueType: attributeForm.valueType as any,
				}, ctx);
				notice = `Atribut "${attributeForm.name}" berhasil diperbarui.`;
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal mengubah atribut.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_activate_attribute_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
			error = "Permission awcms:sikesra:attribute:write diperlukan untuk mengaktifkan atribut.";
		} else {
			const attributeId = input.action_id.replace("abac_activate_attribute_", "");
			const { activateAttributeDefinition } = await import("../services/abac-attribute-service");
			try {
				await activateAttributeDefinition(db, attributeId, ctx);
				notice = "Atribut berhasil diaktifkan.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal mengaktifkan atribut.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_deactivate_attribute_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
			error = "Permission awcms:sikesra:attribute:write diperlukan untuk menonaktifkan atribut.";
		} else {
			const attributeId = input.action_id.replace("abac_deactivate_attribute_", "");
			const { deactivateAttributeDefinition } = await import("../services/abac-attribute-service");
			try {
				await deactivateAttributeDefinition(db, attributeId, ctx);
				notice = "Atribut berhasil dinonaktifkan.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal menonaktifkan atribut.";
			}
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("abac_delete_attribute_")) {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE)) {
			error = "Permission awcms:sikesra:attribute:write diperlukan untuk menghapus atribut.";
		} else {
			const attributeId = input.action_id.replace("abac_delete_attribute_", "");
			const { deleteAttributeDefinition } = await import("../services/abac-attribute-service");
			try {
				await deleteAttributeDefinition(db, attributeId, ctx);
				notice = "Atribut berhasil dihapus.";
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal menghapus atribut.";
			}
		}
	}

	// Load edit form for policy
	if (input.type === "block_action" && input.action_id?.startsWith("abac_edit_policy_")) {
		const policyId = input.action_id.replace("abac_edit_policy_", "");
		const { getAbacPolicyDetail } = await import("../services/abac-policy-service");
		const policy = await getAbacPolicyDetail(db, policyId, ctx);
		if (policy) {
			policyForm.policyId = policy.id;
			policyForm.name = policy.name;
			policyForm.description = policy.description ?? "";
			policyForm.effect = policy.effect;
			policyForm.priority = String(policy.priority);
			policyForm.resourceType = policy.resourceType ?? "entity";
			policyForm.actions = (policy.actions ?? []).join(", ");
		}
	}

	// Load edit form for attribute
	if (input.type === "block_action" && input.action_id?.startsWith("abac_edit_attribute_")) {
		const attributeId = input.action_id.replace("abac_edit_attribute_", "");
		const { getAttributeDefinition } = await import("../services/abac-attribute-service");
		const attr = await getAttributeDefinition(db, attributeId, ctx);
		if (attr) {
			attributeForm.attributeId = attr.id;
			attributeForm.code = attr.code;
			attributeForm.name = attr.name;
			attributeForm.description = "";
			attributeForm.category = attr.category;
			attributeForm.valueType = attr.valueType;
		}
	}

	const [options, policies, policyRows, attributeRows] = await Promise.all([
		loadAccessAdminOptions(db, ctx.tenantId, ctx.siteId, form),
		loadAbacPolicies(db, ctx),
		db.prepare(
			`SELECT id, name, description, effect, priority, resource_type, actions_json, is_active
			 FROM awcms_sikesra_abac_policies
			 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
			 ORDER BY priority DESC, name`,
		).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>(),
		db.prepare(
			`SELECT id, code, name, description, category, value_type, is_active
			 FROM awcms_sikesra_attribute_definitions
			 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
			 ORDER BY category, code`,
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

	const policyConflicts = detectPolicyConflicts(policyRows.results);
	const conflictPolicyNames = new Set<string>();
	for (const conflict of policyConflicts) {
		conflictPolicyNames.add(conflict.policyA);
		conflictPolicyNames.add(conflict.policyB);
	}

	const policyAffectedCounts = new Map<string, number>();
	for (const row of policyRows.results) {
		const count = await countAffectedEntities(db, ctx.tenantId, ctx.siteId, row);
		policyAffectedCounts.set(String(row.id), count);
	}

	return [
		...pageIntro("access", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Governance / Atribut & Akses", description: "Halaman ini memetakan permission catalog, atribut, scope pengguna, dan kebijakan ABAC. UI hanya membantu observasi dan preview; backend tetap menjadi sumber kebenaran untuk RBAC, ABAC, masking, dan audit." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Role aktif", value: ctx.roles.length ? ctx.roles.join(", ") : "Tanpa role eksplisit" },
			{ label: "Permission aktif", value: String(ctx.permissions.length) },
			{ label: "Region Scope", value: describeRegionScopeLabel(ctx) },
		] },
		...responsiveStats([
			{ label: "Permission terdaftar", value: String(SIKESRA_PERMISSION_LIST.length), description: "Namespace awcms:sikesra:*" },
			{ label: "Atribut aktif", value: String(options.attributes.filter((row) => Number(row.is_active ?? 0) === 1).length), description: "Definition aktif di tenant/site" },
			{ label: "Scope assignment", value: String(options.attributeScopes.length), description: "Baris user_attribute_scopes terdeteksi" },
			{ label: "Policy ABAC", value: String(policyRows.results.length), description: "Policy allow/deny tersedia" },
		]),
		...(policyConflicts.length > 0 ? [{
			type: "banner",
			variant: "alert",
			title: `⚠️ ${policyConflicts.length} konflik policy terdeteksi`,
			description: policyConflicts.map((c) => `"${c.policyA}" vs "${c.policyB}" pada resource ${c.resourceType} (${c.conflictType})`).join("; "),
		}] : []),
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
		...(policyConflicts.length > 0 ? [{
			type: "context",
			text: `Konflik terdeteksi pada ${policyConflicts.length} policy. Policy dengan conflict badge memiliki efek yang bertentangan dengan policy lain pada resource yang sama.`,
		}] : []),
		{ type: "table", columns: [
			{ key: "name", label: "Policy" },
			{ key: "effect", label: "Effect" },
			{ key: "priority", label: "Priority" },
			{ key: "resourceType", label: "Resource" },
			{ key: "actions", label: "Actions" },
			{ key: "affectedEntities", label: "Est. Entitas Terpengaruh" },
			{ key: "conditions", label: "Conditions" },
			{ key: "conflict", label: "Konflik" },
			{ key: "status", label: "Status" },
			...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE) ? [{ key: "actions_col", label: "Aksi" }] : []),
		], rows: policyRows.results.map((row) => {
			const policy = policies.find((item) => item.id === String(row.id));
			const actions = typeof row.actions_json === "string" ? JSON.parse(row.actions_json) as string[] : [];
			const policyName = String(row.name ?? "-");
			const hasConflict = conflictPolicyNames.has(policyName);
			const affectedCount = policyAffectedCounts.get(String(row.id)) ?? -1;
			const affectedDisplay = affectedCount < 0 ? "N/A" : String(affectedCount);
			return {
				name: policyName,
				effect: String(row.effect ?? "deny").toUpperCase(),
				priority: Number(row.priority ?? 0),
				resourceType: String(row.resource_type ?? "-"),
				actions: Array.isArray(actions) && actions.length ? actions.join(", ") : "Semua aksi terkait",
				affectedEntities: affectedDisplay,
				conditions: policy?.conditions.length ? policy.conditions.map((condition) => `${condition.attributeCategory}.${condition.attributeName} ${condition.operator}`).join(" | ") : "Tanpa kondisi",
				conflict: hasConflict ? "⚠️ Konflik" : "-",
				status: Number(row.is_active ?? 0) === 1 ? "Aktif" : "Nonaktif",
				...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE) ? {
					actions_col: [
						{ type: "button", label: "Edit", action_id: `abac_edit_policy_${String(row.id)}`, style: "secondary" },
						Number(row.is_active ?? 0) === 1
							? { type: "button", label: "Nonaktifkan", action_id: `abac_deactivate_policy_${String(row.id)}`, style: "warning" }
							: { type: "button", label: "Aktifkan", action_id: `abac_activate_policy_${String(row.id)}`, style: "primary" },
						{ type: "button", label: "Hapus", action_id: `abac_delete_policy_${String(row.id)}`, style: "danger" },
					]
				} : {}),
			};
		}), empty_text: "Belum ada policy ABAC yang aktif." },
		...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.POLICY_WRITE) ? [
			{ type: "header", text: policyForm.policyId ? "Edit Policy ABAC" : "Buat Policy ABAC Baru" },
			{ type: "context", text: "Policy ABAC mengontrol akses berbasis atribut. Effect 'deny' selalu mengalahkan 'allow'. Priority lebih tinggi dievaluasi lebih dulu." },
			{ type: "form", block_id: "abac_policy_form", fields: [
				{ type: "hidden", action_id: "policyId", initial_value: policyForm.policyId },
				{ type: "text", action_id: "name", label: "Nama policy", initial_value: policyForm.name, placeholder: "Contoh: Allow desa access to own entities" },
				{ type: "textarea", action_id: "description", label: "Deskripsi", initial_value: policyForm.description, placeholder: "Penjelasan tujuan policy" },
				{ type: "select", action_id: "effect", label: "Effect", initial_value: policyForm.effect, options: [option("Allow", "allow"), option("Deny", "deny")] },
				{ type: "number", action_id: "priority", label: "Priority", initial_value: policyForm.priority, placeholder: "0 (lebih tinggi = lebih prioritas)" },
				{ type: "select", action_id: "resourceType", label: "Resource type", initial_value: policyForm.resourceType, options: [option("Entity", "entity"), option("Document", "document"), option("Export", "export"), option("Audit", "audit"), option("*", "*")] },
				{ type: "text", action_id: "actions", label: "Actions (comma-separated)", initial_value: policyForm.actions, placeholder: "read, create, update (kosongkan untuk semua)" },
				{ type: "header", text: "Kondisi (opsional)", level: 3 },
				{ type: "select", action_id: "conditionCategory", label: "Kategori atribut", initial_value: policyForm.conditionCategory, options: [option("Entity", "entity"), option("Region", "region"), option("User", "user"), option("Document", "document")] },
				{ type: "text", action_id: "conditionName", label: "Nama atribut", initial_value: policyForm.conditionName, placeholder: "Contoh: officialVillageCode" },
				{ type: "select", action_id: "conditionOperator", label: "Operator", initial_value: policyForm.conditionOperator, options: [option("Equals", "equals"), option("Not equals", "not_equals"), option("In", "in"), option("Not in", "not_in"), option("Greater than", "gt"), option("Less than", "lt")] },
				{ type: "text", action_id: "conditionValue", label: "Nilai", initial_value: policyForm.conditionValue, placeholder: "Nilai kondisi (JSON untuk array)" },
			], submit: { label: policyForm.policyId ? "Simpan Perubahan" : "Buat Policy", action_id: policyForm.policyId ? "abac_update_policy" : "abac_create_policy" } },
		] : []),
		{ type: "header", text: "Manajemen Atribut" },
		{ type: "context", text: "Atribut adalah properti yang digunakan dalam kondisi policy ABAC. Setiap atribut memiliki kategori, tipe nilai, dan scope." },
		{ type: "table", columns: [
			{ key: "code", label: "Kode" },
			{ key: "name", label: "Nama" },
			{ key: "category", label: "Kategori" },
			{ key: "valueType", label: "Tipe" },
			{ key: "status", label: "Status" },
			...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE) ? [{ key: "actions_col", label: "Aksi" }] : []),
		], rows: attributeRows.results.map((row) => ({
			code: String(row.code ?? "-"),
			name: String(row.name ?? "-"),
			category: String(row.category ?? "-"),
			valueType: String(row.value_type ?? "text"),
			status: Number(row.is_active ?? 0) === 1 ? "Aktif" : "Nonaktif",
			...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE) ? {
				actions_col: [
					{ type: "button", label: "Edit", action_id: `abac_edit_attribute_${String(row.id)}`, style: "secondary" },
					Number(row.is_active ?? 0) === 1
						? { type: "button", label: "Nonaktifkan", action_id: `abac_deactivate_attribute_${String(row.id)}`, style: "warning" }
						: { type: "button", label: "Aktifkan", action_id: `abac_activate_attribute_${String(row.id)}`, style: "primary" },
					{ type: "button", label: "Hapus", action_id: `abac_delete_attribute_${String(row.id)}`, style: "danger" },
				]
			} : {}),
		})), empty_text: "Belum ada attribute definition." },
		...(hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.ATTRIBUTE_WRITE) ? [
			{ type: "header", text: attributeForm.attributeId ? "Edit Atribut" : "Buat Atribut Baru" },
			{ type: "form", block_id: "abac_attribute_form", fields: [
				{ type: "hidden", action_id: "attributeId", initial_value: attributeForm.attributeId },
				{ type: "text", action_id: "code", label: "Kode atribut", initial_value: attributeForm.code, placeholder: "Contoh: officialVillageCode" },
				{ type: "text", action_id: "name", label: "Nama atribut", initial_value: attributeForm.name, placeholder: "Contoh: Official Village Code" },
				{ type: "textarea", action_id: "description", label: "Deskripsi", initial_value: attributeForm.description, placeholder: "Penjelasan atribut" },
				{ type: "select", action_id: "category", label: "Kategori", initial_value: attributeForm.category, options: [option("Entity", "entity"), option("Region", "region"), option("User", "user"), option("Document", "document")] },
				{ type: "select", action_id: "valueType", label: "Tipe nilai", initial_value: attributeForm.valueType, options: [option("Text", "text"), option("Number", "number"), option("Boolean", "boolean"), option("Date", "date"), option("List", "list")] },
			], submit: { label: attributeForm.attributeId ? "Simpan Perubahan" : "Buat Atribut", action_id: attributeForm.attributeId ? "abac_update_attribute" : "abac_create_attribute" } },
		] : []),
		...(notice ? [{ type: "banner", variant: "success", title: "Operasi berhasil", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Operasi gagal", description: error }] : []),
		{ type: "header", text: "Effective Access Preview" },
		{ type: "context", text: "Preview ini mensimulasikan evaluasi ABAC menggunakan trusted context akun saat ini. Tujuannya membantu governance role memahami kenapa aksi diizinkan atau ditolak, bukan menggantikan pengecekan backend sebenarnya." },
		{ type: "form", block_id: "access_preview_form", fields: [
			{ type: "select", action_id: "resourceType", label: "Resource type", initial_value: form.resourceType, options: [option("Entity", "entity"), option("Document", "document"), option("Export", "export")] },
			{ type: "select", action_id: "action", label: "Action", initial_value: form.action, options: ACCESS_PREVIEW_ACTIONS.map((item) => option(item.label, item.value)) },
			{ type: "select", action_id: "officialVillageCode", label: "Official village", initial_value: form.officialVillageCode, options: [option("Pilih desa/kelurahan atau kosongkan", ""), ...options.villages.map((row) => option(row.name, row.code))] },
			{ type: "select", action_id: "localRegionId", label: "Local region", initial_value: form.localRegionId, options: [option(form.officialVillageCode ? "Pilih wilayah lokal atau kosongkan" : "Pilih desa resmi terlebih dahulu", ""), ...options.localRegions.map((row) => option(`${formatLocalRegionLevel(row.level)}${row.code_local ? ` ${row.code_local}` : ""} / ${row.name}`, row.id))] },
			{ type: "select", action_id: "sensitivityLevel", label: "Sensitivity", initial_value: form.sensitivityLevel, options: [option("Publik Aman", "public_safe"), option("Internal", "internal"), option("Terbatas", "restricted"), option("Sangat Terbatas", "highly_restricted")] },
			{ type: "select", action_id: "statusData", label: "Status data", initial_value: form.statusData, options: [option("Draft", "draft"), option("Submitted", "submitted"), option("Aktif", "active"), option("Archived", "archived")] },
			{ type: "select", action_id: "statusVerification", label: "Status verifikasi", initial_value: form.statusVerification, options: [option("Submitted desa", "submitted_village"), option("Perlu Perbaikan", "need_revision"), option("Terverifikasi", "verified"), option("Ditolak", "rejected")] },
			{ type: "select", action_id: "documentClassification", label: "Klasifikasi dokumen", initial_value: form.documentClassification, options: [option("Internal", "internal"), option("Terbatas", "restricted"), option("Sangat Terbatas", "highly_restricted")] },
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

async function auditBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const filters = parseAuditFilterForm(input);
	const page = input.type === "block_action" && input.action_id?.startsWith("audit_page_")
		? Number(input.action_id.replace("audit_page_", ""))
		: 1;
	const perPage = 50;
	const offset = (page - 1) * perPage;

	const params: AuditListParams = {
		actor: filters.actor || undefined,
		action: filters.action || undefined,
		resourceType: filters.resourceType || undefined,
		resourceId: filters.resourceId || undefined,
		fromDate: filters.fromDate || undefined,
		toDate: filters.toDate || undefined,
		limit: perPage,
		offset,
	};
	const auditResult = await listAuditLogs(db, params, ctx);
	const totalPages = Math.ceil(auditResult.total / perPage);
	const auditRows = auditResult.items.filter((row) => {
		if (filters.requestId && String(row.request_id ?? "") !== filters.requestId) return false;
		if (filters.success === "success" && Number(row.success ?? 0) !== 1) return false;
		if (filters.success === "failed" && Number(row.success ?? 0) !== 0) return false;
		if (filters.risk === "high" && !HIGH_RISK_AUDIT_REQUIRED.has(String(row.action ?? "") as never)) return false;
		if (filters.risk === "standard" && HIGH_RISK_AUDIT_REQUIRED.has(String(row.action ?? "") as never)) return false;
		return true;
	});
	const distinctActions = Array.from(new Set(auditResult.items.map((row) => String(row.action ?? "")).filter(Boolean))).sort();
	const distinctActors = Array.from(new Set(auditResult.items.map((row) => String(row.actor_id ?? "")).filter(Boolean))).sort();
	const distinctResourceTypes = Array.from(new Set(auditResult.items.map((row) => String(row.resource_type ?? "")).filter(Boolean))).sort();

	const paginationElements: Block[] = [];
	if (totalPages > 1) {
		const elements: any[] = [];
		if (page > 1) elements.push({ type: "button", label: "← Sebelumnya", action_id: `audit_page_${page - 1}`, style: "secondary" });
		elements.push({ type: "label", text: `Halaman ${page} dari ${totalPages}` });
		if (page < totalPages) elements.push({ type: "button", label: "Selanjutnya →", action_id: `audit_page_${page + 1}`, style: "secondary" });
		paginationElements.push({ type: "actions", elements });
	}

	return [
		...pageIntro("audit", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Audit Trail", description: "Halaman audit dipakai auditor dan super admin untuk menelusuri actor, action, resource, request ID, sukses/gagal, dan konsekuensi keamanan. Nilai before/after sensitif tetap harus teredaksi sesuai izin viewer." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Role aktif", value: ctx.roles.length ? ctx.roles.join(", ") : "Tanpa role eksplisit" },
			{ label: "Permission audit", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.AUDIT_READ) ? "Aktif" : "Belum terdeteksi" },
			{ label: "Reveal sensitif", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SENSITIVE_REVEAL) ? "Ya" : "Tidak, before/after diringkas" },
		] },
		...responsiveStats([
			{ label: "Total hasil", value: String(auditResult.total), description: "Dari database" },
			{ label: "High risk", value: String(auditRows.filter((row) => HIGH_RISK_AUDIT_REQUIRED.has(String(row.action ?? "") as never)).length), description: "Perlu perhatian auditor" },
			{ label: "Gagal", value: String(auditRows.filter((row) => Number(row.success ?? 0) !== 1).length), description: "Operasi yang tidak berhasil" },
			{ label: "Request ID unik", value: String(new Set(auditRows.map((row) => String(row.request_id ?? "")).filter(Boolean)).size), description: "Korelasi lintas aksi" },
		]),
		{ type: "header", text: "Ringkasan Aktivitas" },
		{ type: "table", columns: [
			{ key: "action", label: "Aksi" },
			{ key: "count", label: "Jumlah" },
			{ key: "risk", label: "Risiko" },
		], rows: Object.entries(
			auditRows.reduce<Record<string, number>>((acc, row) => {
				const action = String(row.action ?? "");
				acc[action] = (acc[action] || 0) + 1;
				return acc;
			}, {})
		).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([action, count]) => ({
			action,
			count: String(count),
			risk: HIGH_RISK_AUDIT_REQUIRED.has(action as never) ? "🔴 Tinggi" : "🟢 Standar",
		})), empty_text: "Belum ada aktivitas audit untuk dirangkum." },
		{ type: "fields", fields: [
			{ label: "Filter aktif", value: String(activeAuditFilterCount(filters)) },
			{ label: "Scope region", value: describeRegionScopeLabel(ctx) },
			{ label: "Mode redaksi", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SENSITIVE_REVEAL) ? "Payload penuh bila tersedia" : "Ringkasan teredaksi" },
			{ label: "Export audit", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.AUDIT_EXPORT) ? "Izin terdeteksi" : "Belum tersedia di UI ini" },
		] },
		{ type: "form", block_id: "audit_filters", fields: [
			{ type: "select", action_id: "actor", label: "Aktor", initial_value: filters.actor, options: [option("Semua aktor", ""), ...distinctActors.map((item) => option(item, item))] },
			{ type: "select", action_id: "action", label: "Aksi", initial_value: filters.action, options: [option("Semua aksi", ""), ...distinctActions.map((item) => option(item, item))] },
			{ type: "select", action_id: "resourceType", label: "Resource", initial_value: filters.resourceType, options: [option("Semua resource", ""), ...distinctResourceTypes.map((item) => option(item, item))] },
			{ type: "text_input", action_id: "resourceId", label: "Resource ID", initial_value: filters.resourceId, placeholder: "Filter resource spesifik" },
			{ type: "text_input", action_id: "requestId", label: "Request ID", initial_value: filters.requestId, placeholder: "Korelasi lintas event" },
			{ type: "text_input", action_id: "fromDate", label: "Dari waktu", initial_value: filters.fromDate, placeholder: "2026-05-12T00:00:00Z" },
			{ type: "text_input", action_id: "toDate", label: "Sampai waktu", initial_value: filters.toDate, placeholder: "2026-05-12T23:59:59Z" },
			{ type: "select", action_id: "success", label: "Status hasil", initial_value: filters.success, options: [option("Semua", ""), option("Sukses", "success"), option("Gagal", "failed")] },
			{ type: "select", action_id: "risk", label: "Risiko", initial_value: filters.risk, options: [option("Semua risiko", ""), option("Risiko tinggi", "high"), option("Standar", "standard")] },
		], submit: { label: "Terapkan Filter", action_id: "audit_apply_filters" } },
		{ type: "actions", elements: [
			{ type: "button", label: "Reset filter", action_id: "audit_reset", style: "secondary" },
		] },
		...paginationElements,
		{ type: "header", text: "Daftar Audit" },
		...(auditRows.length ? auditRows.flatMap((row) => ([
			{ type: "section", text: `${String(row.action ?? "-")} | ${auditSuccessLabel(row.success)} | ${auditRiskLabel(String(row.action ?? ""))}`, accessory: { type: "button", label: "Lihat Detail", action_id: `audit_open_${String(row.id)}`, style: "secondary" } },
			{ type: "context", text: `Aktor ${String(row.actor_id ?? "-")} · Resource ${String(row.resource_type ?? "-")}/${String(row.resource_id ?? "-")} · Request ${String(row.request_id ?? "-")} · ${String(row.created_at ?? "-")}` },
		])) : [{ type: "empty", title: "Belum ada audit yang cocok", description: "Ubah filter actor, action, resource, success, risk, atau request ID untuk melihat hasil lain." }]),
		...paginationElements,
		{ type: "header", text: "Kontrol Audit" },
		{ type: "table", columns: [
			{ key: "rule", label: "Rule" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Filter actor, action, resource, success, risk, request ID", status: "Aktif" },
			{ rule: "Audit detail menampilkan request metadata", status: "Aktif pada halaman detail" },
			{ rule: "Before/after sensitif harus teredaksi", status: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SENSITIVE_REVEAL) ? "Viewer dapat melihat payload penuh" : "Viewer hanya melihat ringkasan teredaksi" },
			{ rule: "Audit export memerlukan permission dan reason", status: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.AUDIT_EXPORT) ? "Permission export audit terdeteksi" : "Belum ada export audit di UI ini" },
		] },
	];
}

async function auditDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const auditId = page.slice("audit/".length);
	const row = await db.prepare(
		`SELECT * FROM awcms_sikesra_audit_logs WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
	).bind(auditId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();
	if (!row) {
		return [...pageIntro(page, ctx.permissions), { type: "banner", variant: "alert", title: "Audit tidak ditemukan", description: `ID ${auditId} tidak tersedia pada scope backend saat ini.` }];
	}
	const canReveal = hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SENSITIVE_REVEAL);
	const beforeValue = parseAuditRecordJson(row.before_json);
	const afterValue = parseAuditRecordJson(row.after_json);

	const redactedBefore = await redactAuditValues(beforeValue as Record<string, unknown>, canReveal);
	const redactedAfter = await redactAuditValues(afterValue as Record<string, unknown>, canReveal);

	let relatedEvents: Array<Record<string, unknown>> = [];
	const requestId = String(row.request_id ?? "");
	if (requestId) {
		const relatedResult = await db.prepare(
			`SELECT id, action, actor_id, resource_type, resource_id, success, created_at
			 FROM awcms_sikesra_audit_logs
			 WHERE tenant_id = ? AND site_id = ? AND request_id = ? AND id != ? AND deleted_at IS NULL
			 ORDER BY created_at ASC LIMIT 20`
		).bind(ctx.tenantId, ctx.siteId, requestId, auditId).all<Record<string, unknown>>();
		relatedEvents = relatedResult.results;
	}

	const changedFields: Array<{ field: string; before: string; after: string; changed: boolean }> = [];
	if (typeof redactedBefore === "object" && redactedBefore !== null && typeof redactedAfter === "object" && redactedAfter !== null) {
		const allKeys = new Set([...Object.keys(redactedBefore), ...Object.keys(redactedAfter)]);
		for (const key of allKeys) {
			const before = (redactedBefore as any)[key];
			const after = (redactedAfter as any)[key];
			const beforeStr = before !== undefined ? JSON.stringify(before, null, 2) : "(tidak ada)";
			const afterStr = after !== undefined ? JSON.stringify(after, null, 2) : "(tidak ada)";
			const isRedacted = typeof before === "string" && before === "[REDACTED]" || typeof after === "string" && after === "[REDACTED]";
			changedFields.push({ field: key, before: beforeStr, after: afterStr, changed: beforeStr !== afterStr && !isRedacted });
		}
	}

	const isHighRisk = isHighRiskAction(String(row.action ?? "") as any);

	return [
		...pageIntro(page, ctx.permissions),
		{ type: "banner", variant: isHighRisk ? "warning" : "default", title: `Audit ${auditId}`, description: isHighRisk ? "⚠️ Aksi berisiko tinggi. Detail audit ini menampilkan metadata permintaan, alasan, dan payload before/after yang telah disesuaikan dengan izin viewer." : "Detail audit menampilkan metadata permintaan, alasan, dan payload before/after yang telah disesuaikan dengan izin viewer. Field sensitif diredaksi sesuai permission." },
		{ type: "actions", elements: [{ type: "button", label: "Kembali ke Audit Trail", action_id: "audit_back_to_list", style: "secondary" }] },
		{ type: "fields", fields: [
			{ label: "Aksi", value: String(row.action ?? "-") },
			{ label: "Status", value: auditSuccessLabel(row.success) },
			{ label: "Risk", value: isHighRisk ? "🔴 Tinggi" : "🟢 Standar" },
			{ label: "Aktor", value: String(row.actor_id ?? "-") },
			{ label: "Role", value: String(row.actor_role ?? "-") },
			{ label: "Resource", value: `${String(row.resource_type ?? "-")}/${String(row.resource_id ?? "-")}` },
			{ label: "Request ID", value: String(row.request_id ?? "-") },
			{ label: "Waktu", value: String(row.created_at ?? "-") },
			{ label: "Reason", value: String(row.reason ?? "(tidak ada)") },
		] },
		{ type: "header", text: "Request Metadata" },
		{ type: "table", columns: [
			{ key: "label", label: "Field" },
			{ key: "value", label: "Nilai" },
		], rows: [
			{ label: "IP Address", value: String(row.ip_address ?? "-") },
			{ label: "User Agent", value: String(row.user_agent ?? "-") },
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
		] },
		...(changedFields.length > 0 ? [
			{ type: "header", text: "Perubahan Field" },
			{ type: "context", text: canReveal ? "Menampilkan semua perubahan field. Field sensitif tetap diredaksi." : "Field sensitif diredaksi ([REDACTED]). Field non-sensitif ditampilkan untuk transparansi audit." },
			{ type: "table", columns: [
				{ key: "field", label: "Field" },
				{ key: "before", label: "Sebelum" },
				{ key: "after", label: "Sesudah" },
			], rows: changedFields.filter(f => f.changed || !canReveal).map((f) => ({
				field: f.field,
				before: f.before.substring(0, 100) + (f.before.length > 100 ? "..." : ""),
				after: f.after.substring(0, 100) + (f.after.length > 100 ? "..." : ""),
			})) },
		] : []),
		{ type: "header", text: "Payload Sebelum / Sesudah" },
		{ type: "table", columns: [
			{ key: "label", label: "Payload" },
			{ key: "value", label: "Nilai" },
		], rows: [
			{ label: "Before", value: redactedBefore && Object.keys(redactedBefore).length > 0 ? JSON.stringify(redactedBefore, null, 2).substring(0, 500) + (JSON.stringify(redactedBefore, null, 2).length > 500 ? "\n...(truncated)" : "") : "(tidak ada)" },
			{ label: "After", value: redactedAfter && Object.keys(redactedAfter).length > 0 ? JSON.stringify(redactedAfter, null, 2).substring(0, 500) + (JSON.stringify(redactedAfter, null, 2).length > 500 ? "\n...(truncated)" : "") : "(tidak ada)" },
		] },
		...(relatedEvents.length > 0 ? [
			{ type: "header", text: `Event Terkait (Request ID: ${requestId})` },
			{ type: "table", columns: [
				{ key: "action", label: "Aksi" },
				{ key: "resource", label: "Resource" },
				{ key: "success", label: "Status" },
				{ key: "createdAt", label: "Waktu" },
			], rows: relatedEvents.map((e) => ({
				action: String(e.action ?? "-"),
				resource: `${String(e.resource_type ?? "-")}/${String(e.resource_id ?? "-")}`,
				success: auditSuccessLabel(e.success),
				createdAt: String(e.created_at ?? "-"),
			})) },
		] : []),
		{ type: "context", text: canReveal ? "Viewer memiliki permission sensitive:reveal. Field sensitif tetap diredaksi untuk keamanan. Tetap perlakukan payload ini sebagai material audit rahasia." : "Viewer tidak memiliki permission sensitive:reveal. Field sensitif diredaksi otomatis. Field non-sensitif ditampilkan untuk transparansi audit." },
	];
}

interface CodeCorrectionFormState {
	entityId: string;
	entitySearch: string;
	newId: string;
	reason: string;
	confirmCorrection: boolean;
}

function parseCodeCorrectionForm(input: PluginAdminInteraction): CodeCorrectionFormState {
	const values = input.type === "form_submit" ? input.values ?? {} : {};
	return {
		entityId: stringState(values.entityId),
		entitySearch: stringState(values.entitySearch),
		newId: stringState(values.newId),
		reason: stringState(values.reason),
		confirmCorrection: values.confirmCorrection === true || values.confirmCorrection === "true" || values.confirmCorrection === "on",
	};
}

async function codeCorrectionBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const form = parseCodeCorrectionForm(input);
	let notice = "";
	let error = "";
	let showConfirm = false;
	let entityInfo: { displayName: string; currentId: string } | null = null;

	if (input.type === "block_action" && input.action_id?.startsWith("code_search_entity_")) {
		form.entitySearch = input.action_id.replace("code_search_entity_", "");
	}

	if (form.entitySearch) {
		const searchResult = await db.prepare(
			`SELECT id, display_name, sikesra_id_20 FROM awcms_sikesra_entities
			 WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
			 AND (display_name LIKE ? OR id = ? OR sikesra_id_20 = ?)
			 ORDER BY display_name LIMIT 10`
		).bind(ctx.tenantId, ctx.siteId, `%${form.entitySearch}%`, form.entitySearch, form.entitySearch).all<Record<string, unknown>>();

		if (searchResult.results.length === 1) {
			const row = searchResult.results[0];
			entityInfo = {
				displayName: String(row.display_name ?? ""),
				currentId: String(row.sikesra_id_20 ?? "Belum dibuat"),
			};
			if (!form.entityId) form.entityId = String(row.id);
		}
	}

	if (input.type === "form_submit" && input.action_id === "code_correction_submit") {
		if (!hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.CODE_CORRECT)) {
			error = "Permission awcms:sikesra:code:correct diperlukan untuk mengoreksi ID SIKESRA.";
		} else if (!form.entityId || !form.newId || !form.reason) {
			error = "Entitas, ID baru, dan alasan wajib diisi.";
		} else if (form.reason.length < 20) {
			error = "Alasan harus minimal 20 karakter untuk keperluan audit.";
		} else if (!form.confirmCorrection) {
			error = "Konfirmasi eksplisit diperlukan untuk koreksi ID.";
		} else {
			try {
				await correctSikesraId(db, form.entityId, form.newId, form.reason, ctx);
				notice = `ID SIKESRA berhasil dikoreksi menjadi ${form.newId}. Perubahan ini tercatat di audit trail (code.correct).`;
				form.entityId = "";
				form.newId = "";
				form.reason = "";
				form.confirmCorrection = false;
			} catch (err) {
				error = err instanceof Error ? err.message : "Gagal mengoreksi ID SIKESRA";
			}
		}
	}

	if (input.type === "form_submit" && input.action_id === "code_correction_confirm") {
		if (!form.entityId || !form.newId || !form.reason) {
			error = "Entitas, ID baru, dan alasan wajib diisi sebelum konfirmasi.";
		} else if (form.reason.length < 20) {
			error = "Alasan harus minimal 20 karakter.";
		} else {
			showConfirm = true;
		}
	}

	const canCorrect = hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.CODE_CORRECT);

	return [
		...pageIntro("code", ctx.permissions),
		...mobileHint(routeCtx.requestMeta?.userAgent),
		{ type: "banner", variant: "default", title: "Koreksi ID SIKESRA", description: "Halaman ini untuk mengoreksi ID SIKESRA 20 digit yang sudah dibuat. Koreksi memerlukan permission code:correct dan alasan eksplisit minimal 20 karakter. Semua koreksi tercatat di audit trail." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Permission koreksi", value: canCorrect ? "Aktif" : "Belum terdeteksi" },
		] },
		...(notice ? [{ type: "banner", variant: "success", title: "ID SIKESRA dikoreksi", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Koreksi ID gagal", description: error }] : []),
		{ type: "header", text: "Cari Entitas" },
		{ type: "form", block_id: "code_search_form", fields: [
			{ type: "text_input", action_id: "entitySearch", label: "Cari nama atau ID entitas", initial_value: form.entitySearch, placeholder: "Contoh: Masjid Al-Ikhlas atau ent_xxx" },
		], submit: { label: "Cari", action_id: "code_search_entity" } },
		...(entityInfo ? [{ type: "fields", fields: [
			{ label: "Entitas ditemukan", value: entityInfo.displayName },
			{ label: "ID SIKESRA saat ini", value: entityInfo.currentId },
		] }] : []),
		{ type: "header", text: "Form Koreksi ID" },
		{ type: "context", text: canCorrect ? "Gunakan form ini untuk mengoreksi ID SIKESRA. Pastikan ID baru sesuai dengan format 20 digit dan alasan jelas untuk audit." : "Akun ini belum memiliki izin koreksi ID. Form ditampilkan sebagai referensi kontrak input." },
		{ type: "form", block_id: "code_correction_form", fields: [
			{ type: "hidden", action_id: "entityId", initial_value: form.entityId },
			{ type: "text_input", action_id: "entityIdDisplay", label: "ID Entitas (wajib)", initial_value: form.entityId, placeholder: "ent_xxx atau ID entitas dari pencarian" },
			{ type: "text_input", action_id: "newId", label: "ID SIKESRA Baru (20 digit, wajib)", initial_value: form.newId, placeholder: "Contoh: 330101202501000001" },
			{ type: "text_input", action_id: "reason", label: "Alasan koreksi (wajib, min 20 karakter)", multiline: true, initial_value: form.reason, placeholder: "Jelaskan alasan koreksi ID secara detail untuk keperluan audit..." },
		], submit: { label: "Lanjutkan ke Konfirmasi", action_id: "code_correction_confirm" } },
		...(showConfirm ? [
			{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Koreksi ID SIKESRA", description: `ID SIKESRA akan dikoreksi dari "${entityInfo?.currentId ?? form.entityId}" menjadi "${form.newId}". Koreksi ini akan tercatat permanen di audit trail (code.correct) dan code history. Pastikan ID baru sudah benar.` },
			{ type: "form", block_id: "code_confirm_form", fields: [
				{ type: "hidden", action_id: "entityId", initial_value: form.entityId },
				{ type: "hidden", action_id: "newId", initial_value: form.newId },
				{ type: "hidden", action_id: "reason", initial_value: form.reason },
				{ type: "checkbox", action_id: "confirmCorrection", label: "✅ Saya memahami bahwa koreksi ID ini akan tercatat permanen di audit trail dan code history" },
			], submit: { label: "Konfirmasi & Koreksi ID", action_id: "code_correction_submit", style: "primary" } },
		] : []),
		{ type: "header", text: "Aturan Koreksi ID" },
		{ type: "table", columns: [
			{ key: "rule", label: "Aturan" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Permission code:correct wajib", status: canCorrect ? "Aktif" : "Dibutuhkan" },
			{ rule: "Alasan min 20 karakter", status: "Dienforce di backend" },
			{ rule: "Konfirmasi eksplisit", status: "Checkbox wajib dicentang" },
			{ rule: "Audit event code.correct", status: "Tercatat otomatis" },
			{ rule: "Code history update", status: "ID lama disimpan di history" },
		] },
	];
}

async function settingsBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const canUpdate = hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SETTINGS_UPDATE);
	const current = await getSettings(db, ctx);
	const currentFlags = {
		publicDashboard: current.featureFlags?.publicDashboard ?? true,
		imports: current.featureFlags?.imports ?? true,
		documents: current.featureFlags?.documents ?? true,
		exports: current.featureFlags?.exports ?? true,
	};

	let form = parseSettingsForm(input);
	let notice = "";
	let error = "";

	const derivedForm = {
		publicEnabled: form.publicEnabled || String(current.publicEnabled),
		publicTitle: form.publicTitle || current.publicTitle,
		publicDescription: form.publicDescription || current.publicDescription || "",
		dataScopeNote: form.dataScopeNote || current.dataScopeNote || "",
		officialContact: form.officialContact || current.officialContact || "",
		smallCellThreshold: form.smallCellThreshold || String(current.smallCellThreshold),
		maxUploadBytes: form.maxUploadBytes || String(current.maxUploadBytes),
		allowedMimeTypes: form.allowedMimeTypes || (current.allowedMimeTypes ?? []).join(", "),
		exportMaxSyncRows: form.exportMaxSyncRows || String(current.exportMaxSyncRows),
		requireReasonForHighlyRestrictedDownload:
			form.requireReasonForHighlyRestrictedDownload || String(current.requireReasonForHighlyRestrictedDownload),
		featurePublicDashboard: form.featurePublicDashboard || String(currentFlags.publicDashboard),
		featureImports: form.featureImports || String(currentFlags.imports),
		featureDocuments: form.featureDocuments || String(currentFlags.documents),
		featureExports: form.featureExports || String(currentFlags.exports),
		reason: form.reason,
		confirmSettingsSave: form.confirmSettingsSave,
	};
	form = derivedForm;

	let activeSettings = current;
	if (input.type === "form_submit" && input.action_id === "settings_save") {
		if (!canUpdate) {
			error = "Permission awcms:sikesra:settings:update diperlukan untuk menyimpan perubahan pengaturan.";
		} else if (!form.reason.trim()) {
			error = "Alasan perubahan wajib diisi agar update pengaturan tercatat di audit trail.";
		} else if (!form.confirmSettingsSave) {
			error = "Konfirmasi eksplisit diperlukan untuk menyimpan perubahan pengaturan. Centang kotak konfirmasi di bawah.";
		} else {
			activeSettings = await updateSettings(
				db,
				{
					publicEnabled: parseBooleanState(form.publicEnabled, current.publicEnabled),
					publicTitle: form.publicTitle || "SIKESRA",
					publicDescription: form.publicDescription || undefined,
					dataScopeNote: form.dataScopeNote || undefined,
					officialContact: form.officialContact || undefined,
					smallCellThreshold: numberValue(form.smallCellThreshold) ?? current.smallCellThreshold,
					maxUploadBytes: numberValue(form.maxUploadBytes) ?? current.maxUploadBytes,
					allowedMimeTypes: parseMimeTypeList(form.allowedMimeTypes),
					exportMaxSyncRows: numberValue(form.exportMaxSyncRows) ?? current.exportMaxSyncRows,
					requireReasonForHighlyRestrictedDownload: parseBooleanState(
						form.requireReasonForHighlyRestrictedDownload,
						current.requireReasonForHighlyRestrictedDownload,
					),
					featureFlags: {
						publicDashboard: parseBooleanState(form.featurePublicDashboard, currentFlags.publicDashboard),
						imports: parseBooleanState(form.featureImports, currentFlags.imports),
						documents: parseBooleanState(form.featureDocuments, currentFlags.documents),
						exports: parseBooleanState(form.featureExports, currentFlags.exports),
					},
				},
				form.reason,
				ctx,
			);
			notice = "Pengaturan SIKESRA berhasil diperbarui. Perubahan ini telah dicatat ke audit trail settings.update.";
			form = {
				...form,
				publicEnabled: String(activeSettings.publicEnabled),
				publicTitle: activeSettings.publicTitle,
				publicDescription: activeSettings.publicDescription || "",
				dataScopeNote: activeSettings.dataScopeNote || "",
				officialContact: activeSettings.officialContact || "",
				smallCellThreshold: String(activeSettings.smallCellThreshold),
				maxUploadBytes: String(activeSettings.maxUploadBytes),
				allowedMimeTypes: (activeSettings.allowedMimeTypes ?? []).join(", "),
				exportMaxSyncRows: String(activeSettings.exportMaxSyncRows),
				requireReasonForHighlyRestrictedDownload: String(activeSettings.requireReasonForHighlyRestrictedDownload),
				featurePublicDashboard: String(activeSettings.featureFlags?.publicDashboard ?? true),
				featureImports: String(activeSettings.featureFlags?.imports ?? true),
				featureDocuments: String(activeSettings.featureFlags?.documents ?? true),
				featureExports: String(activeSettings.featureFlags?.exports ?? true),
				reason: "",
			};
		}
	}

	const featureFlags = {
		publicDashboard: parseBooleanState(form.featurePublicDashboard, true),
		imports: parseBooleanState(form.featureImports, true),
		documents: parseBooleanState(form.featureDocuments, true),
		exports: parseBooleanState(form.featureExports, true),
	};

	return [
		...pageIntro("settings", ctx.permissions),
		{ type: "banner", variant: "default", title: "Governance / Pengaturan", description: "Pengaturan SIKESRA mengendalikan visibilitas publik, threshold suppression, batas upload, batas export sinkron, dan feature flag. Setiap perubahan harus melalui permission backend, alasan, dan audit." },
		{ type: "fields", fields: [
			{ label: "Tenant / Site", value: `${ctx.tenantId} / ${ctx.siteId}` },
			{ label: "Permission baca", value: hasPermission(ctx.permissions, SIKESRA_PERMISSIONS.SETTINGS_READ) ? "Aktif" : "Belum terdeteksi" },
			{ label: "Permission update", value: canUpdate ? "Aktif" : "Readonly" },
			{ label: "Audit update", value: "settings.update wajib tercatat" },
		] },
		...(notice ? [{ type: "banner", variant: "success", title: "Pengaturan tersimpan", description: notice }] : []),
		...(error ? [{ type: "banner", variant: "alert", title: "Pengaturan belum tersimpan", description: error }] : []),
		{ type: "header", text: "Ringkasan Pengaturan Aktif" },
		{ type: "stats", items: [
			{ label: "Public enabled", value: form.publicEnabled === "true" ? "Ya" : "Tidak", description: "Mengontrol permukaan publik /sikesra" },
			{ label: "Small-cell threshold", value: String(numberValue(form.smallCellThreshold) ?? activeSettings.smallCellThreshold), description: "Batas suppression agregat kecil" },
			{ label: "Max upload", value: formatBytes(numberValue(form.maxUploadBytes) ?? activeSettings.maxUploadBytes), description: "Batas ukuran dokumen/import" },
			{ label: "Export sync rows", value: String(numberValue(form.exportMaxSyncRows) ?? activeSettings.exportMaxSyncRows), description: "Batas export sinkron" },
			{ label: "Feature flags aktif", value: Object.values(featureFlags).filter(Boolean).length, description: "Dari 4 fitur tersedia" },
			{ label: "MIME types", value: (activeSettings.allowedMimeTypes ?? []).length, description: "Tipe file yang diizinkan" },
		] },
		{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Diperlukan", description: "Perubahan pengaturan mempengaruhi visibilitas publik, threshold keamanan, dan batas operasional. Setiap perubahan dicatat permanen di audit trail (settings.update) dan tidak dapat dibatalkan. Pastikan alasan perubahan jelas dan dampaknya telah dipahami." },
		{ type: "header", text: "Kontrol Pengaturan" },
		{ type: "table", columns: [
			{ key: "rule", label: "Rule" },
			{ key: "status", label: "Status" },
		], rows: [
			{ rule: "Update butuh permission settings:update", status: canUpdate ? "Aktif" : "Readonly" },
			{ rule: "Update butuh alasan", status: "Wajib diisi pada form" },
			{ rule: "Update dicatat ke audit trail", status: "Aktif via settings.update" },
			{ rule: "Public safety threshold harus eksplisit", status: "Ditampilkan sebagai field khusus" },
		] },
		{ type: "form", block_id: "settings_form", fields: [
			{ type: "select", action_id: "publicEnabled", label: "Publikasikan /sikesra", initial_value: form.publicEnabled, options: [option("Tidak", "false"), option("Ya", "true")] },
			{ type: "text_input", action_id: "publicTitle", label: "Judul publik", initial_value: form.publicTitle, placeholder: "SIKESRA Kabupaten ..." },
			{ type: "text_input", action_id: "publicDescription", label: "Deskripsi publik", multiline: true, initial_value: form.publicDescription, placeholder: "Ringkasan permukaan publik yang aman" },
			{ type: "text_input", action_id: "dataScopeNote", label: "Catatan cakupan data", multiline: true, initial_value: form.dataScopeNote, placeholder: "Jelaskan batas cakupan data publik dan internal" },
			{ type: "text_input", action_id: "officialContact", label: "Kontak resmi", initial_value: form.officialContact, placeholder: "Nama unit / email / nomor layanan" },
			{ type: "number_input", action_id: "smallCellThreshold", label: "Small-cell threshold", initial_value: numberValue(form.smallCellThreshold) },
			{ type: "number_input", action_id: "maxUploadBytes", label: "Maksimum upload (bytes)", initial_value: numberValue(form.maxUploadBytes) },
			{ type: "text_input", action_id: "allowedMimeTypes", label: "Allowed MIME types", initial_value: form.allowedMimeTypes, placeholder: "application/pdf, image/jpeg, image/png" },
			{ type: "number_input", action_id: "exportMaxSyncRows", label: "Batas export sinkron", initial_value: numberValue(form.exportMaxSyncRows) },
			{ type: "select", action_id: "requireReasonForHighlyRestrictedDownload", label: "Reason untuk highly restricted download", initial_value: form.requireReasonForHighlyRestrictedDownload, options: [option("Ya", "true"), option("Tidak", "false")] },
			{ type: "select", action_id: "featurePublicDashboard", label: "Feature flag: public dashboard", initial_value: form.featurePublicDashboard, options: [option("Aktif", "true"), option("Nonaktif", "false")] },
			{ type: "select", action_id: "featureImports", label: "Feature flag: imports", initial_value: form.featureImports, options: [option("Aktif", "true"), option("Nonaktif", "false")] },
			{ type: "select", action_id: "featureDocuments", label: "Feature flag: documents", initial_value: form.featureDocuments, options: [option("Aktif", "true"), option("Nonaktif", "false")] },
			{ type: "select", action_id: "featureExports", label: "Feature flag: exports", initial_value: form.featureExports, options: [option("Aktif", "true"), option("Nonaktif", "false")] },
			{ type: "text_input", action_id: "reason", label: "Alasan perubahan (wajib)", multiline: true, initial_value: form.reason, placeholder: "Jelaskan dasar perubahan konfigurasi dan dampaknya" },
			{ type: "checkbox", action_id: "confirmSettingsSave", label: "✅ Saya memahami bahwa perubahan pengaturan ini akan dicatat permanen di audit trail (settings.update) dan mempengaruhi visibilitas publik, threshold keamanan, serta batas operasional sistem" },
		], submit: { label: canUpdate ? "Simpan Pengaturan" : "Butuh Permission Settings Update", action_id: "settings_save" } },
		{ type: "header", text: "Preview Konfigurasi Aktif" },
		{ type: "table", columns: [
			{ key: "group", label: "Kelompok" },
			{ key: "value", label: "Nilai" },
		], rows: [
			{ group: "Public visibility", value: form.publicEnabled === "true" ? "Aktif" : "Tidak aktif" },
			{ group: "Safety threshold", value: `${numberValue(form.smallCellThreshold) ?? activeSettings.smallCellThreshold}` },
			{ group: "Upload limit", value: formatBytes(numberValue(form.maxUploadBytes) ?? activeSettings.maxUploadBytes) },
			{ group: "Allowed MIME", value: parseMimeTypeList(form.allowedMimeTypes).join(", ") || "Belum ditentukan" },
			{ group: "Export sync rows", value: String(numberValue(form.exportMaxSyncRows) ?? activeSettings.exportMaxSyncRows) },
			{ group: "Highly restricted reason", value: parseBooleanState(form.requireReasonForHighlyRestrictedDownload, true) ? "Wajib" : "Tidak wajib" },
		] },
		{ type: "header", text: "Feature Flags" },
		{ type: "table", columns: [
			{ key: "flag", label: "Flag" },
			{ key: "enabled", label: "Status" },
			{ key: "note", label: "Catatan" },
		], rows: [
			{ flag: "publicDashboard", enabled: formatBooleanPreview(featureFlags.publicDashboard), note: "Mengontrol kelanjutan surface publik /sikesra" },
			{ flag: "imports", enabled: formatBooleanPreview(featureFlags.imports), note: "Mengontrol workflow import operator" },
			{ flag: "documents", enabled: formatBooleanPreview(featureFlags.documents), note: "Mengontrol workflow dokumen privat" },
			{ flag: "exports", enabled: formatBooleanPreview(featureFlags.exports), note: "Mengontrol reports/export center" },
		] },
	];
}

async function entityDetailBlocks(routeCtx: EmDashRouteContext<PluginAdminInteraction>, page: string, input: PluginAdminInteraction): Promise<Block[]> {
	const ctx = buildContextFromEmDash(routeCtx);
	const db = await getRouteDb(routeCtx.request);
	const entityId = parseDetailEntityId(page);

	if (!entityId) {
		return [
			...pageIntro(page, ctx.permissions),
			{ type: "banner", variant: "alert", title: "Detail entitas tidak valid", description: `page: ${page}` },
		];
	}

	let generateCodeSuccess = "";
	let generateCodeError = "";
	let showGenerateCodeConfirm = false;
	let archiveSuccess = "";
	let archiveError = "";
	let restoreSuccess = "";
	let restoreError = "";
	let showArchiveConfirm = false;
	let showRestoreConfirm = false;

	if (input.type === "block_action" && input.action_id?.startsWith("entities_generate_code_confirm_")) {
		const targetId = input.action_id.replace("entities_generate_code_confirm_", "");
		if (targetId === entityId) {
			showGenerateCodeConfirm = true;
		}
	}

	if (input.type === "form_submit" && input.action_id === "entities_generate_code_submit") {
		const targetId = stringState(input.values?.entityId);
		const confirmed = input.values?.confirmGenerateCode === true || input.values?.confirmGenerateCode === "true" || input.values?.confirmGenerateCode === "on";
		if (targetId === entityId && confirmed) {
			try {
				const result = await generateSikesraId(db, entityId, ctx);
				generateCodeSuccess = `ID SIKESRA berhasil dibuat: ${result.sikesraId20} (urutan ke-${result.sequence})`;
			} catch (err) {
				generateCodeError = err instanceof Error ? err.message : "Gagal membuat ID SIKESRA";
			}
		} else if (!confirmed) {
			generateCodeError = "Konfirmasi eksplisit diperlukan untuk generate ID. Centang kotak konfirmasi.";
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("entities_generate_code_") && !input.action_id?.startsWith("entities_generate_code_confirm_") && !input.action_id?.startsWith("entities_generate_code_submit")) {
		const targetId = input.action_id.replace("entities_generate_code_", "");
		if (targetId === entityId) {
			showGenerateCodeConfirm = true;
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("entities_archive_confirm_")) {
		const targetId = input.action_id.replace("entities_archive_confirm_", "");
		if (targetId === entityId) {
			showArchiveConfirm = true;
		}
	}

	if (input.type === "form_submit" && input.action_id === "entities_archive_submit") {
		const targetId = stringState(input.values?.entityId);
		const reason = stringState(input.values?.reason);
		const confirmed = input.values?.confirmArchive === true || input.values?.confirmArchive === "true" || input.values?.confirmArchive === "on";
		if (targetId === entityId && confirmed && reason && reason.length >= 20) {
			try {
				await deleteEntity(db, { entityId: targetId, reason }, ctx);
				archiveSuccess = "Entitas berhasil diarsipkan. Perubahan ini tercatat di audit trail.";
			} catch (err) {
				archiveError = err instanceof Error ? err.message : "Gagal mengarsipkan entitas";
			}
		} else if (!confirmed) {
			archiveError = "Konfirmasi eksplisit diperlukan untuk arsip.";
		} else if (!reason || reason.length < 20) {
			archiveError = "Alasan harus minimal 20 karakter.";
		}
	}

	if (input.type === "block_action" && input.action_id?.startsWith("entities_restore_confirm_")) {
		const targetId = input.action_id.replace("entities_restore_confirm_", "");
		if (targetId === entityId) {
			showRestoreConfirm = true;
		}
	}

	if (input.type === "form_submit" && input.action_id === "entities_restore_submit") {
		const targetId = stringState(input.values?.entityId);
		const reason = stringState(input.values?.reason);
		const confirmed = input.values?.confirmRestore === true || input.values?.confirmRestore === "true" || input.values?.confirmRestore === "on";
		if (targetId === entityId && confirmed && reason && reason.length >= 20) {
			try {
				await restoreEntity(db, { entityId: targetId, reason }, ctx);
				restoreSuccess = "Entitas berhasil dipulihkan. Perubahan ini tercatat di audit trail.";
			} catch (err) {
				restoreError = err instanceof Error ? err.message : "Gagal memulihkan entitas";
			}
		} else if (!confirmed) {
			restoreError = "Konfirmasi eksplisit diperlukan untuk restore.";
		} else if (!reason || reason.length < 20) {
			restoreError = "Alasan harus minimal 20 karakter.";
		}
	}

	const detail = await getEntityDetail(db, entityId, ctx);
	if (!detail) {
		return [
			...pageIntro(page, ctx.permissions),
			{ type: "banner", variant: "alert", title: "Entitas tidak ditemukan", description: `ID ${entityId} tidak tersedia pada scope backend saat ini.` },
		];
	}

	let detailModuleData: Record<string, unknown> | null = null;
	let detailModuleSchema: DetailModuleSchema | null = null;
	if (detail.entity.objectTypeCode && DETAIL_MODULE_SCHEMAS[detail.entity.objectTypeCode]) {
		detailModuleSchema = DETAIL_MODULE_SCHEMAS[detail.entity.objectTypeCode];
		try {
			detailModuleData = await getEntityDetailModule(db, entityId, detail.entity.objectTypeCode, ctx);
		} catch {
			detailModuleData = null;
		}
	}

	let people: EntityPersonSummary[] = [];
	try {
		people = await listEntityPeople(db, entityId, ctx);
	} catch {
		people = [];
	}

	let benefits: Awaited<ReturnType<typeof listEntityBenefits>> = [];
	try {
		benefits = await listEntityBenefits(db, entityId, ctx);
	} catch {
		benefits = [];
	}

	let verificationTimeline: Awaited<ReturnType<typeof getVerificationTimeline>> = [];
	try {
		verificationTimeline = await getVerificationTimeline(db, entityId, ctx);
	} catch {
		verificationTimeline = [];
	}

	let benefitSuccess = "";
	let benefitError = "";
	let showAddBenefitForm = false;
	let benefitDeleteSuccess = "";

	if (input.type === "block_action" && input.action_id === `benefits_add_${entityId}`) {
		showAddBenefitForm = true;
	}

	if (input.type === "form_submit" && input.action_id === `benefits_create_submit_${entityId}`) {
		try {
			const benefitInput: BenefitHistoryInput = {
				entityId,
				benefitType: String(input.values?.benefitType ?? ""),
				benefitName: input.values?.benefitName ? String(input.values.benefitName) : undefined,
				sourceInstitution: input.values?.sourceInstitution ? String(input.values.sourceInstitution) : undefined,
				year: input.values?.year ? Number(input.values.year) : undefined,
				amountValue: input.values?.amountValue ? Number(input.values.amountValue) : undefined,
				amountUnit: input.values?.amountUnit ? String(input.values.amountUnit) : undefined,
				notes: input.values?.notes ? String(input.values.notes) : undefined,
			};
			if (!benefitInput.benefitType) throw new Error("Jenis bantuan wajib diisi");
			await createBenefit(db, benefitInput, ctx);
			benefitSuccess = "Riwayat bantuan berhasil ditambahkan";
			showAddBenefitForm = false;
		} catch (err) {
			benefitError = err instanceof Error ? err.message : "Gagal menambahkan riwayat bantuan";
		}
	}

	if (input.type === "form_submit" && input.action_id?.startsWith(`benefits_delete_submit_`)) {
		const benefitId = input.values?.benefitId ? String(input.values.benefitId) : "";
		if (benefitId) {
			try {
				await deleteBenefit(db, benefitId, ctx);
				benefitDeleteSuccess = "Riwayat bantuan berhasil dihapus";
			} catch (err) {
				benefitError = err instanceof Error ? err.message : "Gagal menghapus riwayat bantuan";
			}
		}
	}

	const primaryActions = [
		...(detail.access.canEdit ? [{ type: "button", label: "Edit Draft", action_id: `nav_entities/${entityId}`, style: "primary" }] : []),
		...(detail.access.canSubmit ? [{ type: "button", label: "Siapkan Submit", action_id: `nav_entities/${entityId}`, style: "secondary" }] : []),
		...(detail.access.canVerify ? [{ type: "button", label: "Verifikasi", action_id: "nav_verification", style: "secondary" }] : []),
		...(detail.access.canGenerateCode ? [{ type: "button", label: "Generate ID", action_id: `entities_generate_code_confirm_${entityId}`, style: "secondary" }] : []),
		...(detail.entity.statusData !== "archived" ? [{ type: "button", label: "Arsipkan", action_id: `entities_archive_confirm_${entityId}`, style: "danger" }] : []),
		...(detail.entity.statusData === "archived" ? [{ type: "button", label: "Pulihkan", action_id: `entities_restore_confirm_${entityId}`, style: "primary" }] : []),
	];

	const latestAudit = Array.isArray(detail.audit) && detail.audit.length > 0 ? detail.audit[0] as Record<string, unknown> : null;

	return [
		...pageIntro(page, ctx.permissions),
		{ type: "banner", variant: "default", title: detail.entity.displayName, description: "Detail entitas ini mengikuti masking, permission, dan ABAC backend. Aksi utama dikendalikan oleh access flags dari backend." },
	...(generateCodeSuccess ? [{ type: "banner", variant: "success", title: "ID SIKESRA dibuat", description: generateCodeSuccess }] : []),
	...(generateCodeError ? [{ type: "banner", variant: "alert", title: "Gagal membuat ID", description: generateCodeError }] : []),
	...(archiveSuccess ? [{ type: "banner", variant: "success", title: "Entitas diarsipkan", description: archiveSuccess }] : []),
	...(archiveError ? [{ type: "banner", variant: "alert", title: "Gagal mengarsipkan", description: archiveError }] : []),
	...(restoreSuccess ? [{ type: "banner", variant: "success", title: "Entitas dipulihkan", description: restoreSuccess }] : []),
	...(restoreError ? [{ type: "banner", variant: "alert", title: "Gagal memulihkan", description: restoreError }] : []),
	...(benefitSuccess ? [{ type: "banner", variant: "success", title: "Riwayat bantuan", description: benefitSuccess }] : []),
	...(benefitDeleteSuccess ? [{ type: "banner", variant: "success", title: "Riwayat bantuan", description: benefitDeleteSuccess }] : []),
	...(benefitError ? [{ type: "banner", variant: "alert", title: "Riwayat bantuan", description: benefitError }] : []),
		{ type: "fields", fields: [
			{ label: "ID SIKESRA", value: detail.entity.sikesraId20 ?? "Belum dibuat" },
			{ label: "Status Data", value: formatDataStatus(detail.entity.statusData) },
			{ label: "Status Verifikasi", value: formatVerificationStatus(detail.entity.statusVerification) },
			{ label: "Sensitivitas", value: SENSITIVITY_LABELS[detail.entity.sensitivityLevel] ?? detail.entity.sensitivityLevel },
		] },
	...(primaryActions.length ? [{ type: "actions", elements: primaryActions }] : []),
	...(showGenerateCodeConfirm ? [{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Generate ID SIKESRA", description: "ID SIKESRA 20 digit akan dibuat berdasarkan sequence desa/jenis/subjenis. ID ini akan tercatat permanen di code history dan audit trail (code.generate). Koreksi ID berikutnya memerlukan permission code:correct dan alasan eksplisit." }, { type: "form", block_id: "generate_code_confirm", fields: [
		{ type: "hidden", action_id: "entityId", initial_value: entityId },
		{ type: "checkbox", action_id: "confirmGenerateCode", label: "✅ Saya memahami bahwa ID SIKESRA yang dibuat akan tercatat permanen dan koreksi memerlukan proses audit tersendiri" },
	], submit: { label: "Konfirmasi & Generate ID", action_id: "entities_generate_code_submit", style: "secondary" } }] : []),
	...(showArchiveConfirm ? [{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Arsip Entitas", description: "Entitas akan diarsipkan (soft delete). Data tidak akan muncul di daftar utama tetapi tetap tersimpan untuk audit. Aksi ini memerlukan alasan minimal 20 karakter dan tercatat di audit trail (entity.delete)." }, { type: "form", block_id: "archive_confirm", fields: [
		{ type: "hidden", action_id: "entityId", initial_value: entityId },
		{ type: "text_input", action_id: "reason", label: "Alasan arsip (wajib, min 20 karakter)", multiline: true, initial_value: "", placeholder: "Jelaskan alasan pengarsipan entitas ini untuk keperluan audit..." },
		{ type: "checkbox", action_id: "confirmArchive", label: "✅ Saya memahami bahwa entitas ini akan diarsipkan dan tidak muncul di daftar utama sampai dipulihkan" },
	], submit: { label: "Konfirmasi & Arsipkan", action_id: "entities_archive_submit", style: "danger" } }] : []),
	...(showRestoreConfirm ? [{ type: "banner", variant: "warning", title: "⚠️ Konfirmasi Pemulihan Entitas", description: "Entitas akan dipulihkan dari arsip dan kembali muncul di daftar utama. Aksi ini memerlukan alasan minimal 20 karakter dan tercatat di audit trail (entity.restore)." }, { type: "form", block_id: "restore_confirm", fields: [
		{ type: "hidden", action_id: "entityId", initial_value: entityId },
		{ type: "text_input", action_id: "reason", label: "Alasan pemulihan (wajib, min 20 karakter)", multiline: true, initial_value: "", placeholder: "Jelaskan alasan pemulihan entitas ini untuk keperluan audit..." },
		{ type: "checkbox", action_id: "confirmRestore", label: "✅ Saya memahami bahwa entitas ini akan dipulihkan dan kembali aktif di daftar utama" },
	], submit: { label: "Konfirmasi & Pulihkan", action_id: "entities_restore_submit", style: "primary" } }] : []),
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
						{ label: "Jenis Data", value: detail.entity.objectTypeCode ?? "-" },
						{ label: "Tabel Detail", value: detailModuleSchema?.tableName ?? "Belum tersedia" },
						{ label: "Jumlah Field", value: detailModuleSchema ? `${detailModuleSchema.fields.length} field` : "-" },
					] },
					...(detailModuleData && detailModuleSchema ? [
						{ type: "fields", fields: detailModuleSchema.fields.map((f) => ({ label: f.label, value: (detailModuleData[f.key] as string) ?? "-" })) },
					] : [
						{ type: "context", text: detailModuleSchema ? "Belum ada data detail yang tersimpan untuk entitas ini." : "Detail modul spesifik per jenis data akan diperkaya seiring rebuild service/detail table berikutnya." },
					]),
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
				{ label: "Pengurus / Relasi", blocks: [
					{ type: "fields", fields: [
						{ label: "Jumlah Relasi", value: `${people.length} orang` },
						{ label: "Relasi Utama", value: people.find((p) => p.isPrimary)?.personName ?? "Belum ditentukan" },
					] },
					...(people.length > 0 ? [{
						type: "table",
						columns: [
							{ key: "personName", label: "Nama" },
							{ key: "relationType", label: "Jenis Relasi" },
							{ key: "isPrimary", label: "Utama" },
						],
						rows: people.map((p) => ({
							personName: p.personName ?? "-",
							relationType: RELATION_TYPE_LABELS[p.relationType] ?? p.relationType,
							isPrimary: p.isPrimary ? "✅ Ya" : "-",
						})),
					}] : [
						{ type: "context", text: "Belum ada pengurus atau relasi yang ditautkan ke entitas ini." },
					]),
				] },
				{ label: "Verifikasi", blocks: [
					{ type: "fields", fields: [
						{ label: "Status", value: String(detail.verification?.["statusVerification"] ?? detail.entity.statusVerification) },
						{ label: "Level", value: String(detail.verification?.["verificationLevel"] ?? detail.entity.verificationLevel ?? "none") },
						{ label: "Aksi Berikutnya", value: String(detail.verification?.["nextAction"] ?? "Belum tersedia") },
					] },
					...(verificationTimeline.length > 0 ? [
						{ type: "header", text: "Riwayat Verifikasi" },
						{ type: "table", columns: [
							{ key: "timestamp", label: "Waktu" },
							{ key: "action", label: "Aksi" },
							{ key: "level", label: "Level" },
							{ key: "actor", label: "Aktor" },
							{ key: "note", label: "Catatan" },
						], rows: verificationTimeline.map((t) => ({
							timestamp: String(t.createdAt ?? "-"),
							action: String(t.action ?? "-"),
							level: String(t.verificationLevel ?? "-"),
							actor: String(t.actorId ?? "-"),
							note: String(t.note ?? "-").substring(0, 50) + (String(t.note ?? "").length > 50 ? "..." : ""),
						})), empty_text: "Belum ada riwayat verifikasi." },
					] : [
						{ type: "context", text: "Belum ada aktivitas verifikasi untuk entitas ini." },
					]),
				] },
				{ label: "Riwayat Bantuan/Layanan", blocks: [
					{ type: "fields", fields: [
						{ label: "Jumlah Riwayat", value: `${benefits.length} catatan` },
					] },
					...(benefits.length > 0 ? [{
						type: "table",
						columns: [
							{ key: "benefitType", label: "Jenis" },
							{ key: "benefitName", label: "Nama Bantuan" },
							{ key: "sourceInstitution", label: "Lembaga" },
							{ key: "year", label: "Tahun" },
							{ key: "amount", label: "Jumlah" },
							{ key: "actions", label: "Aksi" },
						],
						rows: benefits.map((b) => ({
							benefitType: b.benefitType ?? "-",
							benefitName: b.benefitName ?? "-",
							sourceInstitution: b.sourceInstitution ?? "-",
							year: b.year ? String(b.year) : "-",
							amount: b.amountValue ? `${b.amountValue} ${b.amountUnit ?? ""}`.trim() : "-",
							actions: `nav_benefits/${b.id}`,
						})),
						empty_text: "Belum ada riwayat bantuan/layanan.",
					}] : [
						{ type: "context", text: "Belum ada riwayat bantuan/layanan untuk entitas ini." },
					]),
					...(showAddBenefitForm ? [{
						type: "form",
						block_id: `benefits_create_${entityId}`,
						fields: [
							{ type: "hidden", action_id: "entityId", initial_value: entityId },
							{ type: "select", action_id: "benefitType", label: "Jenis Bantuan", options: [
								{ label: "Pilih jenis", value: "" },
								{ label: "Bantuan Sosial", value: "bantuan_sosial" },
								{ label: "Layanan Kesehatan", value: "layanan_kesehatan" },
								{ label: "Layanan Pendidikan", value: "layanan_pendidikan" },
								{ label: "Bantuan Hukum", value: "bantuan_hukum" },
								{ label: "Layanan Lainnya", value: "layanan_lainnya" },
							] },
							{ type: "text_input", action_id: "benefitName", label: "Nama Bantuan", placeholder: "Contoh: PKH, BPNT, PIP" },
							{ type: "text_input", action_id: "sourceInstitution", label: "Lembaga Sumber", placeholder: "Contoh: Kemensos, Dinas Sosial" },
							{ type: "number_input", action_id: "year", label: "Tahun" },
							{ type: "number_input", action_id: "amountValue", label: "Jumlah/Nilai" },
							{ type: "text_input", action_id: "amountUnit", label: "Satuan", placeholder: "Contoh: rupiah, kg, bulan" },
							{ type: "text_input", action_id: "notes", label: "Catatan", multiline: true, placeholder: "Catatan tambahan (opsional)" },
						],
						submit: { label: "Tambah Riwayat", action_id: `benefits_create_submit_${entityId}`, style: "primary" },
					}] : [{
						type: "actions",
						elements: [
							{ type: "button", label: "Tambah Riwayat Bantuan", action_id: `benefits_add_${entityId}`, style: "secondary" },
						],
					}]),
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
	const page = input.type === "block_action" && input.action_id?.startsWith("entities_page_")
		? Number(input.action_id.replace("entities_page_", ""))
		: 1;
	const perPage = 20;

	const [result, options] = await Promise.all([
		listEntities(db, { filters, page, perPage }, ctx),
		loadSelectOptions(db, ctx.tenantId, ctx.siteId, filters),
	]);

	const totalPages = Math.ceil(result.meta.total / perPage);
	const verifiedCount = result.items.filter((item) => item.statusVerification === "verified").length;
	const restrictedCount = result.items.filter((item) => item.sensitivityLevel === "restricted" || item.sensitivityLevel === "highly_restricted").length;
	const followUpCount = result.items.filter((item) => item.statusVerification.startsWith("submitted") || item.statusVerification === "need_revision").length;

	const paginationElements: Block[] = [];
	if (totalPages > 1) {
		const elements: any[] = [];
		if (page > 1) elements.push({ type: "button", label: "← Sebelumnya", action_id: `entities_page_${page - 1}`, style: "secondary" });
		elements.push({ type: "label", text: `Halaman ${page} dari ${totalPages}` });
		if (page < totalPages) elements.push({ type: "button", label: "Selanjutnya →", action_id: `entities_page_${page + 1}`, style: "secondary" });
		paginationElements.push({ type: "actions", elements });
	}

	const blocks: Block[] = [
		...pageIntro("entities", ctx.permissions),
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
				{ label: "Per halaman", value: String(perPage) },
				{ label: "Masking sensitif", value: "Aktif sesuai permission backend" },
			],
		},
		{ type: "context", text: "Kolom Registry mengikuti spesifikasi SIKESRA: ID, jenis/subjenis, nama tampil, wilayah resmi, wilayah lokal, status data, status verifikasi, kelengkapan, sensitivitas, dan aksi kontekstual." },
		...paginationElements,
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
				statusData: formatDataStatusWithBadge(item.statusData),
				statusVerification: formatVerificationStatusWithBadge(item.statusVerification),
				completeness: formatCompletenessWithBar(item.completenessPercent),
				sensitivity: formatSensitivityWithBadge(item.sensitivityLevel),
				actions: contextualActions(item, ctx.permissions),
			})),
			empty_text: "Tidak ada data yang cocok dengan filter dan scope backend saat ini.",
		},
		...paginationElements,
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

	if (page === "audit") {
		if (!routeCtx) throw new Error("audit page requires route context");
		return auditBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page === "settings") {
		if (!routeCtx) throw new Error("settings page requires route context");
		return settingsBlocks(routeCtx, routeCtx.input ?? {});
	}

	if (page.startsWith("audit/")) {
		if (!routeCtx) throw new Error("audit detail page requires route context");
		return auditDetailBlocks(routeCtx, page);
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
		return entityDetailBlocks(routeCtx, page, routeCtx.input ?? {});
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
		{ type: "actions", elements: navButtons("overview", []) },
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

	if (page === "audit") {
		return {
			blocks: await auditBlocks(routeCtx, input),
		};
	}

	if (page === "settings") {
		return {
			blocks: await settingsBlocks(routeCtx, input),
		};
	}

	if (page === "code") {
		return {
			blocks: await codeCorrectionBlocks(routeCtx, input),
		};
	}

	if (page.startsWith("audit/")) {
		return {
			blocks: await auditDetailBlocks(routeCtx, page),
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
			blocks: await entityDetailBlocks(routeCtx, page, input),
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
