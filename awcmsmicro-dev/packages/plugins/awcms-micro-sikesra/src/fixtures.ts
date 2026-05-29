export type SikesraSensitivity = "public_safe" | "internal" | "restricted" | "highly_restricted";
export type SikesraUserLevel = "desa_kelurahan" | "kecamatan" | "sopd" | "kabupaten" | "admin_sikesra";

export interface SikesraReferenceRegistryEntity {
	id: string;
	code: string;
	label: string;
	entityType: string;
	sensitivity: SikesraSensitivity;
	region: {
		provinceCode: string;
		regencyCode: string;
		districtCode: string;
		villageCode: string;
	};
	verificationStage:
		| "draft"
		| "submitted_village"
		| "verified_village"
		| "submitted_district"
		| "verified_district"
		| "submitted_sopd"
		| "verified_sopd"
		| "submitted_regency"
		| "active_verified";
	inputLevel: SikesraUserLevel;
	supportingDocumentIds: string[];
	publicSummary: string;
}

export interface SikesraReferenceSupportingDocument {
	id: string;
	registryEntityId: string;
	documentType: string;
	title: string;
	sensitivity: SikesraSensitivity;
	issuedAt: string;
	verifiedBy: string;
}

export interface SikesraReferenceVerificationEvent {
	id: string;
	registryEntityId: string;
	stage: SikesraReferenceRegistryEntity["verificationStage"];
	actor: string;
	inputLevel?: SikesraUserLevel;
	verifierLevel?: SikesraUserLevel;
	verifierRegionScope?: string;
	verifierOrgScope?: string;
	result: "approved" | "needs_review" | "rejected";
	notes: string;
	createdAt: string;
}

export interface SikesraReferenceAccessRole {
	slug: string;
	label: string;
	description: string;
}

export interface SikesraReferenceAccessPermission {
	slug: string;
	label: string;
	description: string;
}

export interface SikesraReferenceAbacSubject {
	id: string;
	attributes: Record<string, string>;
}

export interface SikesraReferenceAbacResource {
	id: string;
	attributes: Record<string, string>;
}

export interface SikesraReferenceAbacPolicy {
	id: string;
	label: string;
	effect: "allow" | "deny";
	actions: string[];
	requiredSubject: Record<string, string>;
	requiredResource: Record<string, string>;
	requiredContext: Record<string, string>;
}

export interface SikesraReferencePublicAggregateCategory {
	code: string;
	label: string;
	total: number;
	verified: number;
	suppressed: boolean;
}

export interface SikesraReferenceFixtures {
	registryEntities: SikesraReferenceRegistryEntity[];
	supportingDocuments: SikesraReferenceSupportingDocument[];
	verificationEvents: SikesraReferenceVerificationEvent[];
	publicAggregate: {
		categories: SikesraReferencePublicAggregateCategory[];
		caveat: string;
	};
	accessPermissions: SikesraReferenceAccessPermission[];
	accessRoles: SikesraReferenceAccessRole[];
	abacSubjects: SikesraReferenceAbacSubject[];
	abacResources: SikesraReferenceAbacResource[];
	abacPolicies: SikesraReferenceAbacPolicy[];
}

export function maskSensitive(value: string | null | undefined, allowed: boolean) {
	if (!value) return null;
	return allowed ? value : "••••••";
}

export const SIKESRA_REFERENCE_FIXTURES: SikesraReferenceFixtures = {
	registryEntities: [
		{
			id: "registry-entity-rumah-ibadah-01",
			code: "RI-001",
			label: "Rumah Ibadah Al-Ikhlas",
			entityType: "rumah_ibadah",
			sensitivity: "public_safe",
			region: {
				provinceCode: "31",
				regencyCode: "3171",
				districtCode: "3171010",
				villageCode: "3171010001",
			},
			verificationStage: "active_verified",
			inputLevel: "desa_kelurahan",
			supportingDocumentIds: ["doc-rumah-ibadah-01"],
			publicSummary: "Rumah ibadah aktif dan sudah terverifikasi di wilayah administrasi referensi.",
		},
		{
			id: "registry-entity-guru-agama-01",
			code: "GA-014",
			label: "Guru Agama Referensi",
			entityType: "guru_agama",
			sensitivity: "restricted",
			region: {
				provinceCode: "31",
				regencyCode: "3171",
				districtCode: "3171010",
				villageCode: "3171010002",
			},
			verificationStage: "submitted_sopd",
			inputLevel: "kecamatan",
			supportingDocumentIds: ["doc-guru-agama-01", "doc-guru-agama-02"],
			publicSummary: "Data tenaga pengajar disajikan dalam bentuk agregat aman tanpa identitas pribadi.",
		},
		{
			id: "registry-entity-disabilitas-01",
			code: "DS-021",
			label: "Penerima Layanan Disabilitas",
			entityType: "disabilitas",
			sensitivity: "highly_restricted",
			region: {
				provinceCode: "31",
				regencyCode: "3171",
				districtCode: "3171010",
				villageCode: "3171010003",
			},
			verificationStage: "verified_sopd",
			inputLevel: "sopd",
			supportingDocumentIds: ["doc-disabilitas-01"],
			publicSummary: "Kasus berisiko tinggi hanya disajikan sebagai hitungan agregat aman.",
		},
	],
	supportingDocuments: [
		{
			id: "doc-rumah-ibadah-01",
			registryEntityId: "registry-entity-rumah-ibadah-01",
			documentType: "surat_keterangan",
			title: "Surat Keterangan Rumah Ibadah",
			sensitivity: "internal",
			issuedAt: "2026-01-08T00:00:00.000Z",
			verifiedBy: "district-verifier",
		},
		{
			id: "doc-guru-agama-01",
			registryEntityId: "registry-entity-guru-agama-01",
			documentType: "identitas",
			title: "Identitas Tenaga Pengajar",
			sensitivity: "restricted",
			issuedAt: "2026-01-09T00:00:00.000Z",
			verifiedBy: "district-verifier",
		},
		{
			id: "doc-guru-agama-02",
			registryEntityId: "registry-entity-guru-agama-01",
			documentType: "sertifikat",
			title: "Sertifikat Kompetensi",
			sensitivity: "restricted",
			issuedAt: "2026-01-10T00:00:00.000Z",
			verifiedBy: "regency-verifier",
		},
		{
			id: "doc-disabilitas-01",
			registryEntityId: "registry-entity-disabilitas-01",
			documentType: "rekomendasi_layanan",
			title: "Rekomendasi Layanan Khusus",
			sensitivity: "highly_restricted",
			issuedAt: "2026-01-11T00:00:00.000Z",
			verifiedBy: "regency-verifier",
		},
	],
	verificationEvents: [
		{
			id: "verify-rumah-ibadah-village",
			registryEntityId: "registry-entity-rumah-ibadah-01",
			stage: "verified_village",
			actor: "village-officer",
			inputLevel: "desa_kelurahan",
			verifierLevel: "desa_kelurahan",
			verifierRegionScope: "3171010001",
			verifierOrgScope: "site-main",
			result: "approved",
			notes: "Dokumen lengkap dan lokasi sesuai.",
			createdAt: "2026-01-12T08:00:00.000Z",
		},
		{
			id: "verify-guru-district",
			registryEntityId: "registry-entity-guru-agama-01",
			stage: "submitted_sopd",
			actor: "district-officer",
			inputLevel: "kecamatan",
			verifierLevel: "kecamatan",
			verifierRegionScope: "3171010",
			verifierOrgScope: "site-main",
			result: "approved",
			notes: "Kelengkapan data diverifikasi pada tingkat kecamatan dan diteruskan ke SOPD terkait.",
			createdAt: "2026-01-13T08:00:00.000Z",
		},
		{
			id: "verify-disabilitas-regency",
			registryEntityId: "registry-entity-disabilitas-01",
			stage: "verified_sopd",
			actor: "sopd-officer",
			inputLevel: "sopd",
			verifierLevel: "sopd",
			verifierRegionScope: "3171",
			verifierOrgScope: "site-main",
			result: "needs_review",
			notes: "SOPD terkait menyelesaikan review substansi dan meneruskan ke kabupaten/admin SIKESRA.",
			createdAt: "2026-01-14T08:00:00.000Z",
		},
	],
	publicAggregate: {
		categories: [
			{ code: "rumah_ibadah", label: "Rumah Ibadah", total: 1, verified: 1, suppressed: false },
			{ code: "guru_agama", label: "Guru Agama", total: 1, verified: 1, suppressed: true },
			{ code: "disabilitas", label: "Disabilitas", total: 1, verified: 0, suppressed: true },
		],
		caveat: "Public aggregate only exposes coarse counts and suppresses sensitive details.",
	},
	accessPermissions: [
		{ slug: "registry.read.public", label: "Read Public Registry", description: "Read public-safe registry summaries." },
		{ slug: "registry.review.submit", label: "Submit Reviews", description: "Submit records for verification review." },
		{ slug: "audit.read.events", label: "Read Audit Events", description: "Inspect audit trails for governance activity." },
	],
	accessRoles: [
		{ slug: "operator", label: "Operator", description: "Operates the reference workflow." },
		{ slug: "verifier", label: "Verifier", description: "Reviews and approves registry submissions." },
	],
	abacSubjects: [
		{ id: "subject-village-officer", attributes: { tenant_id: "tenant-a", region_scope: "id-jakarta", role: "village_officer" } },
		{ id: "subject-regency-officer", attributes: { tenant_id: "tenant-a", region_scope: "id-jakarta", role: "regency_officer" } },
	],
	abacResources: [
		{ id: "resource-public-aggregate", attributes: { resource_type: "aggregate", resource_sensitivity: "public_safe", module_id: "registry" } },
		{ id: "resource-sensitive-record", attributes: { resource_type: "registry_entity", resource_sensitivity: "highly_restricted", module_id: "registry" } },
	],
	abacPolicies: [
		{
			id: "deny-highly-restricted-public",
			label: "Deny Highly Restricted Public Access",
			effect: "deny",
			actions: ["public.read"],
			requiredSubject: {},
			requiredResource: { resource_sensitivity: "highly_restricted" },
			requiredContext: {},
		},
		{
			id: "allow-public-aggregate-view",
			label: "Allow Public Aggregate View",
			effect: "allow",
			actions: ["public.read"],
			requiredSubject: {},
			requiredResource: { resource_type: "aggregate", resource_sensitivity: "public_safe" },
			requiredContext: { region_scope: "id-jakarta" },
		},
	],
};
