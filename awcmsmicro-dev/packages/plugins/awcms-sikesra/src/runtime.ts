import type {
	FieldWidgetConfig,
	PluginContext,
	PluginRoute as NativePluginRoute,
	PluginStorageConfig,
	PortableTextBlockConfig,
} from "emdash";
import type { SandboxedPlugin, SandboxedRequest, SandboxedRouteContext } from "emdash/plugin";

import {
	SIKESRA_REFERENCE_FIXTURES,
	type SikesraReferenceRegistryEntity,
	type SikesraReferenceSupportingDocument,
	type SikesraUserLevel,
	type SikesraReferenceVerificationEvent,
	type SikesraSensitivity,
} from "./fixtures.js";
import { adaptToEmdashPages, type AwcmsModuleManifest } from "./navigation.js";

export interface AdministrativeRegion {
	code: string;
	name: string;
}

export interface AdministrativeDistrict extends AdministrativeRegion {
	villages: AdministrativeRegion[];
}

export interface AdministrativeRegency extends AdministrativeRegion {
	districts: AdministrativeDistrict[];
}

export interface AdministrativeProvince extends AdministrativeRegion {
	regencies: AdministrativeRegency[];
}

export const DEFAULT_REGION_TREE: AdministrativeProvince[] = [
	{
		code: "62",
		name: "Kalimantan Tengah",
		regencies: [
			{
				code: "6201",
				name: "Kotawaringin Barat",
				districts: [
					{
						code: "620101",
						name: "Arut Selatan",
						villages: [
							{ code: "6201010001", name: "Kelurahan Baru" },
							{ code: "6201010002", name: "Kelurahan Madurejo" },
							{ code: "6201010003", name: "Kelurahan Mendawai" },
							{ code: "6201010004", name: "Kelurahan Mendawai Seberang" },
							{ code: "6201010005", name: "Kelurahan Raja" },
							{ code: "6201010006", name: "Kelurahan Raja Seberang" },
							{ code: "6201010007", name: "Kelurahan Sidorejo" },
							{ code: "6201010008", name: "Kenambui" },
							{ code: "6201010009", name: "Kumpai Batu Atas" },
							{ code: "6201010010", name: "Kumpai Batu Bawah" },
							{ code: "6201010011", name: "Medang Sari" },
							{ code: "6201010012", name: "Natai Baru" },
							{ code: "6201010013", name: "Natai Raya" },
							{ code: "6201010014", name: "Pasir Panjang" },
							{ code: "6201010015", name: "Rangda" },
							{ code: "6201010016", name: "Runtu" },
							{ code: "6201010017", name: "Sulung" },
							{ code: "6201010018", name: "Tanjung Putri" },
							{ code: "6201010019", name: "Tanjung Terantang" },
							{ code: "6201010020", name: "Umpang" }
						]
					},
					{
						code: "620102",
						name: "Arut Utara",
						villages: [
							{ code: "6201020001", name: "Kelurahan Pangkut" },
							{ code: "6201020002", name: "Gandis" },
							{ code: "6201020003", name: "Kerabu" },
							{ code: "6201020004", name: "Nanga Mua" },
							{ code: "6201020005", name: "Panahan" },
							{ code: "6201020006", name: "Pandan" },
							{ code: "6201020007", name: "Penyombaan" },
							{ code: "6201020008", name: "Riam" },
							{ code: "6201020009", name: "Sambi" },
							{ code: "6201020010", name: "Sukarami" },
							{ code: "6201020011", name: "Sungai Dau" }
						]
					},
					{
						code: "620103",
						name: "Kotawaringin Lama",
						villages: [
							{ code: "6201030001", name: "Kelurahan Kotawaringin Hilir" },
							{ code: "6201030002", name: "Kelurahan Kotawaringin Hulu" },
							{ code: "6201030003", name: "Babual Baboti" },
							{ code: "6201030004", name: "Dawak" },
							{ code: "6201030005", name: "Ipuh Bangun Jaya" },
							{ code: "6201030006", name: "Kinjil" },
							{ code: "6201030007", name: "Kondang" },
							{ code: "6201030008", name: "Lalang" },
							{ code: "6201030009", name: "Palih Baru" },
							{ code: "6201030010", name: "Riam Durian" },
							{ code: "6201030011", name: "Rungun" },
							{ code: "6201030012", name: "Suka Mulya" },
							{ code: "6201030013", name: "Sakabulin" },
							{ code: "6201030014", name: "Sukajaya" },
							{ code: "6201030015", name: "Suka Makmur" },
							{ code: "6201030016", name: "Sumber Mukti" },
							{ code: "6201030017", name: "Tempayung" }
						]
					},
					{
						code: "620104",
						name: "Kumai",
						villages: [
							{ code: "6201040001", name: "Kelurahan Candi" },
							{ code: "6201040002", name: "Kelurahan Kumai Hilir" },
							{ code: "6201040003", name: "Kelurahan Kumai Hulu" },
							{ code: "6201040004", name: "Batu Belaman" },
							{ code: "6201040005", name: "Bumi Harjo" },
							{ code: "6201040006", name: "Keraya" },
							{ code: "6201040007", name: "Kubu" },
							{ code: "6201040008", name: "Pangkalan Satu" },
							{ code: "6201040009", name: "Sabuai" },
							{ code: "6201040010", name: "Sebuai Timur" },
							{ code: "6201040011", name: "Sungai Bakau" },
							{ code: "6201040012", name: "Sungai Bedaun" },
							{ code: "6201040013", name: "Sungai Cabang" },
							{ code: "6201040014", name: "Sungai Kapitan" },
							{ code: "6201040015", name: "Sungai Sekonyer" },
							{ code: "6201040016", name: "Sungai Tendang" },
							{ code: "6201040017", name: "Teluk Bogam" },
							{ code: "6201040018", name: "Teluk Pulai" }
						]
					},
					{
						code: "620105",
						name: "Pangkalan Banteng",
						villages: [
							{ code: "6201050001", name: "Amin Jaya" },
							{ code: "6201050002", name: "Arga Mulya" },
							{ code: "6201050003", name: "Berambai Makmur" },
							{ code: "6201050004", name: "Karang Mulya" },
							{ code: "6201050005", name: "Karang Sari" },
							{ code: "6201050006", name: "Kebon Agung" },
							{ code: "6201050007", name: "Marga Mulya" },
							{ code: "6201050008", name: "Mulya Jadi" },
							{ code: "6201050009", name: "Natai Kerbau" },
							{ code: "6201050010", name: "Pangkalan Banteng" },
							{ code: "6201050011", name: "Sido Mulyo" },
							{ code: "6201050012", name: "Simpang Berambai" },
							{ code: "6201050013", name: "Sungai Bengkuang" },
							{ code: "6201050014", name: "Sungai Hijau" },
							{ code: "6201050015", name: "Sungai Kuning" },
							{ code: "6201050016", name: "Sungai Pakit" },
							{ code: "6201050017", name: "Sungai Pulau" }
						]
					},
					{
						code: "620106",
						name: "Pangkalan Lada",
						villages: [
							{ code: "6201060001", name: "Kadipi Atas" },
							{ code: "6201060002", name: "Lada Mandala Jaya" },
							{ code: "6201060003", name: "Makarti Jaya" },
							{ code: "6201060004", name: "Pandu Sanjaya" },
							{ code: "6201060005", name: "Pangkalan Dewa" },
							{ code: "6201060006", name: "Pangkalan Durin" },
							{ code: "6201060007", name: "Pangkalan Tiga" },
							{ code: "6201060008", name: "Purbasari" },
							{ code: "6201060009", name: "Sumber Agung" },
							{ code: "6201060010", name: "Sungai Rangit Jaya" },
							{ code: "6201060011", name: "Terantang" }
						]
					}
				]
			}
		]
	}
];

export interface SikesraSubType {
	code: string;
	label: string;
}

export interface SikesraParentType {
	id: string;
	code: string;
	label: string;
	subTypes: SikesraSubType[];
}

export const DEFAULT_DATA_TYPES: SikesraParentType[] = [
	{
		id: "rumah_ibadah",
		code: "01",
		label: "Rumah Ibadah",
		subTypes: [
			{ code: "01", label: "Masjid" },
			{ code: "02", label: "Gereja Protestan" },
			{ code: "03", label: "Gereja Katolik" },
			{ code: "04", label: "Pura" },
			{ code: "05", label: "Wihara" },
			{ code: "06", label: "Klenteng" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "lembaga_keagamaan",
		code: "02",
		label: "Lembaga Keagamaan",
		subTypes: [
			{ code: "01", label: "MUI (Majelis Ulama Indonesia)" },
			{ code: "02", label: "DMI (Dewan Masjid Indonesia)" },
			{ code: "03", label: "LPTQ" },
			{ code: "04", label: "FKUB" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "pendidikan_keagamaan",
		code: "03",
		label: "Pendidikan Keagamaan",
		subTypes: [
			{ code: "01", label: "Pesantren" },
			{ code: "02", label: "Madrasah" },
			{ code: "03", label: "TPQ" },
			{ code: "04", label: "Sekolah Minggu" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "lks",
		code: "04",
		label: "Lembaga Kesejahteraan Sosial",
		subTypes: [
			{ code: "01", label: "Panti Asuhan" },
			{ code: "02", label: "Panti Jompo" },
			{ code: "03", label: "Rehabilitasi Sosial" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "guru_agama",
		code: "05",
		label: "Guru Agama",
		subTypes: [
			{ code: "01", label: "Guru Agama Islam" },
			{ code: "02", label: "Guru Agama Kristen" },
			{ code: "03", label: "Guru Agama Katolik" },
			{ code: "04", label: "Guru Agama Hindu" },
			{ code: "05", label: "Guru Agama Buddha" },
			{ code: "06", label: "Guru Agama Khonghucu" }
		]
	},
	{
		id: "anak_yatim",
		code: "06",
		label: "Anak Yatim",
		subTypes: [
			{ code: "01", label: "Yatim Piatu (Balita)" },
			{ code: "02", label: "Yatim Piatu (Anak Sekolah)" },
			{ code: "03", label: "Yatim Piatu (Remaja)" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "disabilitas",
		code: "07",
		label: "Disabilitas",
		subTypes: [
			{ code: "01", label: "Tuna Netra" },
			{ code: "02", label: "Tuna Rungu / Wicara" },
			{ code: "03", label: "Tuna Daksa" },
			{ code: "04", label: "Tuna Grahita" },
			{ code: "99", label: "Lainnya" }
		]
	},
	{
		id: "lansia_terlantar",
		code: "08",
		label: "Lansia Terlantar",
		subTypes: [
			{ code: "01", label: "Lansia Terlantar Mandiri" },
			{ code: "02", label: "Lansia Terlantar Bedridden" },
			{ code: "99", label: "Lainnya" }
		]
	}
];

export const AWCMS_SIKESRA_PLUGIN_ID = "awcms-sikesra";

export const AWCMS_SIKESRA_CAPABILITIES = ["content:read", "content:write", "media:read", "media:write"] as const;

export const AWCMS_SIKESRA_ALLOWED_HOSTS: string[] = [];

export const AWCMS_SIKESRA_STORAGE = {
	auditEvents: {
		indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]],
	},
	accessChangeEvents: {
		indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]],
	},
	abacChangeEvents: {
		indexes: ["timestamp", "kind", "scope", ["scope", "timestamp"]],
	},
	registryEntities: {
		indexes: ["code", "entityType", "sensitivity", ["entityType", "sensitivity"]],
	},
	abacAttributeCatalog: {
		indexes: ["key", "targetType", "updatedAt", ["targetType", "updatedAt"]],
	},
	abacPolicyRules: {
		indexes: ["id", "effect", "updatedAt", ["effect", "updatedAt"]],
	},
	supportingDocuments: {
		indexes: ["registryEntityId", "documentType", "sensitivity", ["registryEntityId", "sensitivity"]],
	},
	verificationStageState: {
		indexes: ["registryEntityId", "stage", "updatedAt", ["registryEntityId", "updatedAt"]],
	},
	abacResourceAssignments: {
		indexes: ["resourceId", "updatedAt"],
	},
	abacSubjectAssignments: {
		indexes: ["subjectId", "updatedAt"],
	},
	contentSnapshots: {
		indexes: ["collection", "contentId", "timestamp", ["collection", "timestamp"], ["contentId", "timestamp"]],
	},
	settingsState: {
		indexes: ["key", "updatedAt"],
	},
	pluginState: {
		indexes: ["key", "updatedAt"],
	},
	permissionCatalog: {
		indexes: ["slug", "scope", "updatedAt", ["scope", "updatedAt"]],
	},
	roleCatalog: {
		indexes: ["slug", "updatedAt"],
	},
	rolePermissionAssignments: {
		indexes: ["roleSlug", "updatedAt"],
	},
	userRoleAssignments: {
		indexes: ["userId", "updatedAt"],
	},
	verificationEvents: {
		indexes: ["registryEntityId", "stage", "createdAt", ["registryEntityId", "createdAt"]],
	},
} satisfies PluginStorageConfig;

export const AWCMS_SIKESRA_DESCRIPTOR_STORAGE = AWCMS_SIKESRA_STORAGE;

export const AWCMS_SIKESRA_MANIFEST: AwcmsModuleManifest = {
	id: "awcms-sikesra",
	name: "AWCMS SIKESRA Plugin",
	version: "0.0.1",
	description: "Access & audit demo plugin for AWCMS-Micro projects",
	navigation: {
		groups: [
			{
				id: "dashboard-group",
				labelKey: "awcms.nav.group.dashboard",
				fallbackLabel: "Dashboard",
				icon: "chart",
				sortOrder: 10,
				sidebarPlacement: "after-dashboard",
				sidebarPriority: 10,
				items: [
					{
						id: "overview",
						labelKey: "awcms.nav.overview",
						fallbackLabel: "Overview",
						path: "/overview",
						icon: "chart",
						sortOrder: 10,
						permission: "awcms:sikesra:dashboard:read",
					}
				]
			},
			{
				id: "content-group",
				labelKey: "awcms.nav.group.content",
				fallbackLabel: "Content",
				icon: "file",
				sortOrder: 20,
				sidebarPlacement: "before-emdash-default",
				sidebarPriority: 20,
				items: [
					{
						id: "pages",
						labelKey: "awcms.nav.pages",
						fallbackLabel: "Pages",
						path: "/registry",
						icon: "grid",
						sortOrder: 10,
						permission: "awcms:sikesra:dashboard:read",
					},
					{
						id: "documents",
						labelKey: "awcms.nav.documents",
						fallbackLabel: "Documents",
						path: "/documents",
						icon: "file",
						sortOrder: 20,
						permission: "awcms:sikesra:dashboard:read",
					},
					{
						id: "import",
						labelKey: "awcms.nav.import",
						fallbackLabel: "Import Excel",
						path: "/import",
						icon: "arrow-up-from-bracket",
						sortOrder: 30,
						permission: "awcms:sikesra:dashboard:read",
					}
				]
			},
			{
				id: "governance-group",
				labelKey: "awcms.nav.group.governance",
				fallbackLabel: "Governance",
				icon: "shield",
				sortOrder: 30,
				sidebarPlacement: "before-emdash-default",
				sidebarPriority: 30,
				items: [
					{
						id: "verification",
						labelKey: "awcms.nav.verification",
						fallbackLabel: "Verification",
						path: "/verification",
						icon: "check",
						sortOrder: 10,
						permission: "awcms:sikesra:audit:read",
					},
					{
						id: "audit-log",
						labelKey: "awcms.nav.audit",
						fallbackLabel: "Audit Log",
						path: "/audit",
						icon: "list",
						sortOrder: 20,
						permission: "awcms:sikesra:audit:read",
					},
					{
						id: "reports",
						labelKey: "awcms.nav.reports",
						fallbackLabel: "Reports",
						path: "/reports",
						icon: "chart",
						sortOrder: 30,
						permission: "awcms:sikesra:audit:read",
					}
				]
			},
			{
				id: "settings-group",
				labelKey: "awcms.nav.group.settings",
				fallbackLabel: "Settings",
				icon: "gear",
				sortOrder: 40,
				sidebarPlacement: "before-emdash-default",
				sidebarPriority: 40,
				items: [
					{
						id: "access-control",
						labelKey: "awcms.nav.access",
						fallbackLabel: "Access Control",
						path: "/access/permissions",
						icon: "lock",
						sortOrder: 10,
						permission: "awcms:sikesra:settings:read",
						children: [
							{
								id: "permissions",
								labelKey: "awcms.nav.permissions",
								fallbackLabel: "Permissions",
								path: "/access/permissions",
								sortOrder: 10,
								permission: "awcms:sikesra:permissions:read",
							},
							{
								id: "roles",
								labelKey: "awcms.nav.roles",
								fallbackLabel: "Roles",
								path: "/access/roles",
								sortOrder: 20,
								permission: "awcms:sikesra:roles:read",
							},
							{
								id: "matrix",
								labelKey: "awcms.nav.matrix",
								fallbackLabel: "Role Matrix",
								path: "/access/matrix",
								sortOrder: 30,
								permission: "awcms:sikesra:permissions:read",
							},
							{
								id: "access-preview",
								labelKey: "awcms.nav.accessPreview",
								fallbackLabel: "Access Preview",
								path: "/access/preview",
								sortOrder: 40,
								permission: "awcms:sikesra:preview:read",
							}
						]
					},
					{
						id: "abac",
						labelKey: "awcms.nav.abac",
						fallbackLabel: "ABAC",
						path: "/abac/attributes",
						icon: "sliders",
						sortOrder: 20,
						permission: "awcms:sikesra:settings:read",
						children: [
							{
								id: "abac-attributes",
								labelKey: "awcms.nav.abacAttributes",
								fallbackLabel: "Attributes",
								path: "/abac/attributes",
								sortOrder: 10,
								permission: "awcms:sikesra:abac:read",
							},
							{
								id: "abac-policies",
								labelKey: "awcms.nav.abacPolicies",
								fallbackLabel: "Policies",
								path: "/abac/policies",
								sortOrder: 20,
								permission: "awcms:sikesra:abac:read",
							},
							{
								id: "abac-preview",
								labelKey: "awcms.nav.abacPreview",
								fallbackLabel: "ABAC Preview",
								path: "/abac/preview",
								sortOrder: 30,
								permission: "awcms:sikesra:abac:read",
							}
						]
					},
					{
						id: "regions",
						labelKey: "awcms.nav.regions",
						fallbackLabel: "Official Regions",
						path: "/regions",
						icon: "globe",
						sortOrder: 30,
						permission: "awcms:sikesra:settings:read",
					},
					{
						id: "data-types",
						labelKey: "awcms.nav.dataTypes",
						fallbackLabel: "Sikesra Data Types",
						path: "/data-types",
						icon: "list",
						sortOrder: 40,
						permission: "awcms:sikesra:settings:read",
					}
				]
			}
		]
	},
	i18n: {
		defaultLocale: "en",
		supportedLocales: ["en", "id"],
		messages: {
				en: {
					"awcms.nav.group.dashboard": "Dashboard",
					"awcms.nav.group.content": "Content",
					"awcms.nav.group.governance": "Governance",
					"awcms.nav.group.settings": "Settings",
					"awcms.nav.overview": "Overview",
					"awcms.nav.pages": "Pages",
					"awcms.nav.documents": "Documents",
					"awcms.nav.import": "Import Excel",
					"awcms.nav.verification": "Verification",
					"awcms.nav.audit": "Audit Log",
					"awcms.nav.reports": "Reports",
					"awcms.nav.access": "Access Control",
					"awcms.nav.regions": "Official Regions",
					"awcms.nav.dataTypes": "Sikesra Data Types",
					"awcms.nav.permissions": "Permissions",
				"awcms.nav.roles": "Roles",
				"awcms.nav.matrix": "Role Matrix",
				"awcms.nav.accessPreview": "Access Preview",
				"awcms.nav.abac": "ABAC",
				"awcms.nav.abacAttributes": "Attributes",
				"awcms.nav.abacPolicies": "Policies",
				"awcms.nav.abacPreview": "ABAC Preview",
				"awcms.meta.widget.governanceStatus": "Governance Status",
				"awcms.meta.widget.accessRightsHealth": "Access Rights Health",
				"awcms.meta.widget.abacPolicyStatus": "ABAC Policy Status",
				"awcms.meta.settings.publicStatusLabel": "Public Status Label",
				"awcms.meta.settings.publicStatusLabelDesc": "Shown by the plugin's public-safe status route.",
				"awcms.meta.settings.auditRetentionDays": "Audit Retention Days",
				"awcms.meta.settings.auditRetentionDaysDesc": "Used by the demo cron cleanup summary.",
				"awcms.meta.settings.governanceMode": "Governance Mode",
				"awcms.meta.settings.observe": "Observe",
				"awcms.meta.settings.review": "Review",
				"awcms.meta.settings.enforceDemo": "Enforce Demo",
				"awcms.meta.settings.metadataCanonicalBase": "Metadata Canonical Base",
				"awcms.meta.settings.metadataCanonicalBaseDesc": "Optional override for page metadata contributions.",
				"awcms.meta.settings.smallCellThreshold": "Small Cell Suppression Threshold",
				"awcms.meta.settings.smallCellThresholdDesc": "Safety threshold below which counts are suppressed to protect privacy.",
				"awcms.meta.settings.sikesraPublicEnabled": "SIKESRA Public API Enabled",
				"awcms.meta.settings.sikesraPublicEnabledDesc": "Enable or disable public aggregate access to SIKESRA stats.",
				"awcms.meta.block.accessNote": "AWCMS Access Note",
				"awcms.meta.block.accessNoteDesc": "Portable Text note block for access and governance guidance.",
				"awcms.meta.block.category": "AWCMS Micro",
				"awcms.meta.field.statusBadge": "Status badge",
				"awcms.meta.permission.readPublicContent": "Read Public Content",
				"awcms.meta.permission.readPublicContentDesc": "Allows reading public-facing content surfaces.",
				"awcms.meta.permission.reviewAndPublish": "Review And Publish",
				"awcms.meta.permission.reviewAndPublishDesc": "Allows review workflows to approve and publish content.",
				"awcms.meta.permission.readAuditEvents": "Read Audit Events",
				"awcms.meta.permission.readAuditEventsDesc": "Allows operators to inspect governance and access audit events.",
				"awcms.meta.role.siteEditor": "Site Editor",
				"awcms.meta.role.siteEditorDesc": "Editor role for content operations.",
				"awcms.meta.role.governanceReviewer": "Governance Reviewer",
				"awcms.meta.role.governanceReviewerDesc": "Reviewer role for governance and publishing approval.",
				"awcms.meta.abac.tenantId": "Tenant ID",
				"awcms.meta.abac.tenantIdDesc": "Tenant identifier for the acting subject.",
				"awcms.meta.abac.siteId": "Site ID",
				"awcms.meta.abac.siteIdDesc": "Site identifier for the acting subject.",
				"awcms.meta.abac.moduleId": "Module ID",
				"awcms.meta.abac.moduleIdDesc": "Module identifier for the resource.",
				"awcms.meta.abac.resourceType": "Resource Type",
				"awcms.meta.abac.resourceTypeDesc": "Resource type used in ABAC evaluation.",
				"awcms.meta.abac.resourceStatus": "Resource Status",
				"awcms.meta.abac.resourceStatusDesc": "Workflow status of the resource.",
				"awcms.meta.abac.resourceSensitivity": "Resource Sensitivity",
				"awcms.meta.abac.resourceSensitivityDesc": "Sensitivity classification for the resource.",
				"awcms.meta.abac.ownerUserId": "Owner User ID",
				"awcms.meta.abac.ownerUserIdDesc": "Owning user of the resource.",
				"awcms.meta.abac.regionScope": "Region Scope",
				"awcms.meta.abac.regionScopeDesc": "Region scope for the decision context.",
				"awcms.meta.abac.action": "Action",
				"awcms.meta.abac.actionDesc": "Action under evaluation.",
				"awcms.meta.abac.policy.allowPublishedReads": "Allow published content reads for the same tenant",
				"awcms.meta.abac.policy.denyRestrictedGovernance": "Explicitly deny publishing restricted governance resources",
			},
			id: {
				"awcms.nav.group.dashboard": "Dasbor",
				"awcms.nav.group.content": "Konten",
				"awcms.nav.group.governance": "Tata Kelola",
				"awcms.nav.group.settings": "Pengaturan",
				"awcms.nav.overview": "Ikhtisar",
				"awcms.nav.pages": "Halaman",
				"awcms.nav.documents": "Dokumen",
				"awcms.nav.import": "Impor Excel",
				"awcms.nav.verification": "Verifikasi",
				"awcms.nav.audit": "Log Audit",
				"awcms.nav.reports": "Laporan",
				"awcms.nav.access": "Kontrol Akses",
				"awcms.nav.regions": "Wilayah Resmi",
				"awcms.nav.dataTypes": "Jenis Data Sikesra",
				"awcms.nav.permissions": "Izin",
				"awcms.nav.roles": "Peran",
				"awcms.nav.matrix": "Matriks Peran",
				"awcms.nav.accessPreview": "Pratinjau Akses",
				"awcms.nav.abac": "ABAC",
				"awcms.nav.abacAttributes": "Atribut",
				"awcms.nav.abacPolicies": "Kebijakan",
				"awcms.nav.abacPreview": "Pratinjau ABAC",
				"awcms.meta.widget.governanceStatus": "Status Tata Kelola",
				"awcms.meta.widget.accessRightsHealth": "Kesehatan Hak Akses",
				"awcms.meta.widget.abacPolicyStatus": "Status Kebijakan ABAC",
				"awcms.meta.settings.publicStatusLabel": "Label Status Publik",
				"awcms.meta.settings.publicStatusLabelDesc": "Ditampilkan oleh route status aman-publik plugin.",
				"awcms.meta.settings.auditRetentionDays": "Hari Retensi Audit",
				"awcms.meta.settings.auditRetentionDaysDesc": "Digunakan oleh ringkasan pembersihan cron demo.",
				"awcms.meta.settings.governanceMode": "Mode Tata Kelola",
				"awcms.meta.settings.observe": "Observasi",
				"awcms.meta.settings.review": "Tinjau",
				"awcms.meta.settings.enforceDemo": "Terapkan Demo",
				"awcms.meta.settings.metadataCanonicalBase": "Basis Canonical Metadata",
				"awcms.meta.settings.metadataCanonicalBaseDesc": "Override opsional untuk kontribusi metadata halaman.",
				"awcms.meta.settings.smallCellThreshold": "Batas Supresi Sel Kecil",
				"awcms.meta.settings.smallCellThresholdDesc": "Batas keamanan minimum agar jumlah tidak disembunyikan untuk melindungi privasi.",
				"awcms.meta.settings.sikesraPublicEnabled": "API Publik SIKESRA Aktif",
				"awcms.meta.settings.sikesraPublicEnabledDesc": "Aktifkan atau nonaktifkan akses agregat publik ke statistik SIKESRA.",
				"awcms.meta.block.accessNote": "Catatan Akses AWCMS",
				"awcms.meta.block.accessNoteDesc": "Blok catatan Portable Text untuk panduan akses dan tata kelola.",
				"awcms.meta.block.category": "AWCMS Micro",
				"awcms.meta.field.statusBadge": "Lencana status",
				"awcms.meta.permission.readPublicContent": "Baca Konten Publik",
				"awcms.meta.permission.readPublicContentDesc": "Memungkinkan membaca surface konten publik.",
				"awcms.meta.permission.reviewAndPublish": "Tinjau dan Publikasikan",
				"awcms.meta.permission.reviewAndPublishDesc": "Memungkinkan alur kerja review untuk menyetujui dan mempublikasikan konten.",
				"awcms.meta.permission.readAuditEvents": "Baca Event Audit",
				"awcms.meta.permission.readAuditEventsDesc": "Memungkinkan operator memeriksa event audit tata kelola dan akses.",
				"awcms.meta.role.siteEditor": "Editor Situs",
				"awcms.meta.role.siteEditorDesc": "Peran editor untuk operasi konten.",
				"awcms.meta.role.governanceReviewer": "Reviewer Tata Kelola",
				"awcms.meta.role.governanceReviewerDesc": "Peran reviewer untuk tata kelola dan persetujuan publikasi.",
				"awcms.meta.abac.tenantId": "ID Tenant",
				"awcms.meta.abac.tenantIdDesc": "Pengenal tenant untuk subjek yang bertindak.",
				"awcms.meta.abac.siteId": "ID Situs",
				"awcms.meta.abac.siteIdDesc": "Pengenal situs untuk subjek yang bertindak.",
				"awcms.meta.abac.moduleId": "ID Modul",
				"awcms.meta.abac.moduleIdDesc": "Pengenal modul untuk sumber daya.",
				"awcms.meta.abac.resourceType": "Tipe Sumber Daya",
				"awcms.meta.abac.resourceTypeDesc": "Tipe sumber daya yang digunakan dalam evaluasi ABAC.",
				"awcms.meta.abac.resourceStatus": "Status Sumber Daya",
				"awcms.meta.abac.resourceStatusDesc": "Status alur kerja dari sumber daya.",
				"awcms.meta.abac.resourceSensitivity": "Sensitivitas Sumber Daya",
				"awcms.meta.abac.resourceSensitivityDesc": "Klasifikasi sensitivitas untuk sumber daya.",
				"awcms.meta.abac.ownerUserId": "ID Pengguna Pemilik",
				"awcms.meta.abac.ownerUserIdDesc": "Pengguna pemilik dari sumber daya.",
				"awcms.meta.abac.regionScope": "Cakupan Wilayah",
				"awcms.meta.abac.regionScopeDesc": "Cakupan wilayah untuk konteks keputusan.",
				"awcms.meta.abac.action": "Aksi",
				"awcms.meta.abac.actionDesc": "Aksi yang sedang dievaluasi.",
				"awcms.meta.abac.policy.allowPublishedReads": "Izinkan pembacaan konten terpublikasi untuk tenant yang sama",
				"awcms.meta.abac.policy.denyRestrictedGovernance": "Tolak secara eksplisit publikasi sumber daya tata kelola yang dibatasi",
			}
		}
	}
};

export const AWCMS_SIKESRA_ADMIN_PAGES = adaptToEmdashPages(AWCMS_SIKESRA_MANIFEST);

export const AWCMS_SIKESRA_ADMIN_WIDGETS = [
	{ id: "governance-status", title: "Governance Status", titleKey: "awcms.meta.widget.governanceStatus", size: "half" as const },
	{ id: "access-rights-health", title: "Access Rights Health", titleKey: "awcms.meta.widget.accessRightsHealth", size: "half" as const },
	{ id: "abac-policy-status", title: "ABAC Policy Status", titleKey: "awcms.meta.widget.abacPolicyStatus", size: "half" as const },
];

export const AWCMS_SIKESRA_SETTINGS_SCHEMA = {
	publicStatusLabel: {
		type: "string" as const,
		label: "Public Status Label",
		labelKey: "awcms.meta.settings.publicStatusLabel",
		description: "Shown by the plugin's public-safe status route.",
		descriptionKey: "awcms.meta.settings.publicStatusLabelDesc",
		default: "healthy",
	},
	auditRetentionDays: {
		type: "number" as const,
		label: "Audit Retention Days",
		labelKey: "awcms.meta.settings.auditRetentionDays",
		description: "Used by the demo cron cleanup summary.",
		descriptionKey: "awcms.meta.settings.auditRetentionDaysDesc",
		default: 30,
		min: 1,
	},
	governanceMode: {
		type: "select" as const,
		label: "Governance Mode",
		labelKey: "awcms.meta.settings.governanceMode",
		options: [
			{ value: "observe", label: "Observe", labelKey: "awcms.meta.settings.observe" },
			{ value: "review", label: "Review", labelKey: "awcms.meta.settings.review" },
			{ value: "enforce-demo", label: "Enforce Demo", labelKey: "awcms.meta.settings.enforceDemo" },
		],
		default: "review",
	},
	metadataCanonicalBase: {
		type: "url" as const,
		label: "Metadata Canonical Base",
		labelKey: "awcms.meta.settings.metadataCanonicalBase",
		description: "Optional override for page metadata contributions.",
		descriptionKey: "awcms.meta.settings.metadataCanonicalBaseDesc",
		placeholder: "https://example.awcms-micro.local",
	},
	smallCellThreshold: {
		type: "number" as const,
		label: "Small Cell Suppression Threshold",
		labelKey: "awcms.meta.settings.smallCellThreshold",
		description: "Safety threshold below which counts are suppressed to protect privacy.",
		descriptionKey: "awcms.meta.settings.smallCellThresholdDesc",
		default: 3,
		min: 1,
	},
	sikesraPublicEnabled: {
		type: "boolean" as const,
		label: "SIKESRA Public API Enabled",
		labelKey: "awcms.meta.settings.sikesraPublicEnabled",
		description: "Enable or disable public aggregate access to SIKESRA stats.",
		descriptionKey: "awcms.meta.settings.sikesraPublicEnabledDesc",
		default: true,
	},
};

export const AWCMS_SIKESRA_PORTABLE_TEXT_BLOCKS: PortableTextBlockConfig[] = [
	{
		type: "awcms-access-note",
		label: "AWCMS Access Note",
		icon: "info",
		description: "Portable Text note block for access and governance guidance.",
		category: "AWCMS Micro",
	},
];

export const AWCMS_SIKESRA_FIELD_WIDGETS: FieldWidgetConfig[] = [
	{
		name: "status-badge",
		label: "Status badge",
		fieldTypes: ["string"],
	},
];

export interface ExampleAuditEvent {
	id: string;
	timestamp: string;
	kind: string;
	scope: string;
	actor: string;
	summary: string;
	metadata: Record<string, unknown>;
	userId?: string;
	userName?: string;
}

export interface ExampleSettings {
	publicStatusLabel: string;
	auditRetentionDays: number;
	governanceMode: string;
	metadataCanonicalBase: string;
	smallCellThreshold: number;
	sikesraPublicEnabled: boolean;
}

interface StoredSettingRecord {
	key: string;
	value: string | number | boolean;
	updatedAt: string;
}

interface StoredStateRecord {
	key: string;
	value: string | number | boolean | null;
	updatedAt: string;
}

interface StoredVerificationStageRecord {
	registryEntityId: string;
	stage: VerificationStage;
	updatedAt: string;
}

export interface AccessPermission {
	slug: string;
	label: string;
	labelKey?: string;
	description: string;
	descriptionKey?: string;
	scope: string;
	updatedAt: string;
}

export interface AccessRole {
	slug: string;
	label: string;
	labelKey?: string;
	description: string;
	descriptionKey?: string;
	updatedAt: string;
}

export interface RolePermissionAssignment {
	roleSlug: string;
	permissions: string[];
	updatedAt: string;
}

export interface UserRoleAssignment {
	userId: string;
	roles: string[];
	updatedAt: string;
}

export interface AbacAttributeDefinition {
	key: string;
	label: string;
	labelKey?: string;
	targetType: "subject" | "resource" | "context";
	description: string;
	descriptionKey?: string;
	updatedAt: string;
}

export interface AbacSubjectAssignment {
	subjectId: string;
	attributes: Record<string, string>;
	updatedAt: string;
}

export interface AbacResourceAssignment {
	resourceId: string;
	attributes: Record<string, string>;
	updatedAt: string;
}

export interface AbacPolicyRule {
	id: string;
	label: string;
	labelKey?: string;
	effect: "allow" | "deny";
	actions: string[];
	requiredSubject: Record<string, string>;
	requiredResource: Record<string, string>;
	requiredContext: Record<string, string>;
	updatedAt: string;
}

const DEFAULT_ACCESS_PERMISSIONS: AccessPermission[] = [
	{
		slug: "content.read.public",
		label: "Read Public Content",
		labelKey: "awcms.meta.permission.readPublicContent",
		description: "Allows reading public-facing content surfaces.",
		descriptionKey: "awcms.meta.permission.readPublicContentDesc",
		scope: "content",
		updatedAt: "",
	},
	{
		slug: "content.review.publish",
		label: "Review And Publish",
		labelKey: "awcms.meta.permission.reviewAndPublish",
		description: "Allows review workflows to approve and publish content.",
		descriptionKey: "awcms.meta.permission.reviewAndPublishDesc",
		scope: "workflow",
		updatedAt: "",
	},
	{
		slug: "audit.read.events",
		label: "Read Audit Events",
		labelKey: "awcms.meta.permission.readAuditEvents",
		description: "Allows operators to inspect governance and access audit events.",
		descriptionKey: "awcms.meta.permission.readAuditEventsDesc",
		scope: "audit",
		updatedAt: "",
	},
];

const DEFAULT_ACCESS_ROLES: AccessRole[] = [
	{
		slug: "site-editor",
		label: "Site Editor",
		labelKey: "awcms.meta.role.siteEditor",
		description: "Editor role for content operations.",
		descriptionKey: "awcms.meta.role.siteEditorDesc",
		updatedAt: "",
	},
	{
		slug: "governance-reviewer",
		label: "Governance Reviewer",
		labelKey: "awcms.meta.role.governanceReviewer",
		description: "Reviewer role for governance and publishing approval.",
		descriptionKey: "awcms.meta.role.governanceReviewerDesc",
		updatedAt: "",
	},
	{
		slug: "verifier-desa-kelurahan",
		label: "Verifier Desa/Kelurahan",
		description: "Initial verifier role for village and subdistrict submissions.",
		updatedAt: "",
	},
	{
		slug: "verifier-kecamatan",
		label: "Verifier Kecamatan",
		description: "District-level verifier role for SIKESRA escalation.",
		updatedAt: "",
	},
	{
		slug: "verifier-sopd",
		label: "Verifier SOPD",
		description: "Related SOPD verifier role for SIKESRA review.",
		updatedAt: "",
	},
	{
		slug: "verifier-kabupaten",
		label: "Verifier Kabupaten",
		description: "Regency-level verifier role for final regional approval.",
		updatedAt: "",
	},
	{
		slug: "admin-sikesra",
		label: "Admin SIKESRA",
		description: "Administrative override role for SIKESRA verification and publication.",
		updatedAt: "",
	},
];

const DEFAULT_ROLE_ASSIGNMENTS: RolePermissionAssignment[] = [
	{
		roleSlug: "site-editor",
		permissions: ["content.read.public", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "governance-reviewer",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "verifier-desa-kelurahan",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "verifier-kecamatan",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "verifier-sopd",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "verifier-kabupaten",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
	{
		roleSlug: "admin-sikesra",
		permissions: ["content.read.public", "content.review.publish", "audit.read.events"],
		updatedAt: "",
	},
];

const DEFAULT_USER_ROLE_ASSIGNMENTS: UserRoleAssignment[] = [
	{
		userId: "user-demo-editor",
		roles: ["site-editor"],
		updatedAt: "",
	},
	{
		userId: "user-demo-reviewer",
		roles: ["governance-reviewer"],
		updatedAt: "",
	},
	{
		userId: "user-demo-village",
		roles: ["verifier-desa-kelurahan"],
		updatedAt: "",
	},
	{
		userId: "user-demo-district",
		roles: ["verifier-kecamatan"],
		updatedAt: "",
	},
	{
		userId: "user-demo-sopd",
		roles: ["verifier-sopd"],
		updatedAt: "",
	},
	{
		userId: "user-demo-regency",
		roles: ["verifier-kabupaten"],
		updatedAt: "",
	},
	{
		userId: "user-demo-sikesra-admin",
		roles: ["admin-sikesra"],
		updatedAt: "",
	},
];

const DEFAULT_ABAC_ATTRIBUTES: AbacAttributeDefinition[] = [
	{ key: "tenant_id", label: "Tenant ID", labelKey: "awcms.meta.abac.tenantId", targetType: "subject", description: "Tenant identifier for the acting subject.", descriptionKey: "awcms.meta.abac.tenantIdDesc", updatedAt: "" },
	{ key: "site_id", label: "Site ID", labelKey: "awcms.meta.abac.siteId", targetType: "subject", description: "Site identifier for the acting subject.", descriptionKey: "awcms.meta.abac.siteIdDesc", updatedAt: "" },
	{ key: "module_id", label: "Module ID", labelKey: "awcms.meta.abac.moduleId", targetType: "resource", description: "Module identifier for the resource.", descriptionKey: "awcms.meta.abac.moduleIdDesc", updatedAt: "" },
	{ key: "resource_type", label: "Resource Type", labelKey: "awcms.meta.abac.resourceType", targetType: "resource", description: "Resource type used in ABAC evaluation.", descriptionKey: "awcms.meta.abac.resourceTypeDesc", updatedAt: "" },
	{ key: "resource_status", label: "Resource Status", labelKey: "awcms.meta.abac.resourceStatus", targetType: "resource", description: "Workflow status of the resource.", descriptionKey: "awcms.meta.abac.resourceStatusDesc", updatedAt: "" },
	{ key: "resource_sensitivity", label: "Resource Sensitivity", labelKey: "awcms.meta.abac.resourceSensitivity", targetType: "resource", description: "Sensitivity classification for the resource.", descriptionKey: "awcms.meta.abac.resourceSensitivityDesc", updatedAt: "" },
	{ key: "owner_user_id", label: "Owner User ID", labelKey: "awcms.meta.abac.ownerUserId", targetType: "resource", description: "Owning user of the resource.", descriptionKey: "awcms.meta.abac.ownerUserIdDesc", updatedAt: "" },
	{ key: "region_scope", label: "Region Scope", labelKey: "awcms.meta.abac.regionScope", targetType: "context", description: "Region scope for the decision context.", descriptionKey: "awcms.meta.abac.regionScopeDesc", updatedAt: "" },
	{ key: "action", label: "Action", labelKey: "awcms.meta.abac.action", targetType: "context", description: "Action under evaluation.", descriptionKey: "awcms.meta.abac.actionDesc", updatedAt: "" },
];

const DEFAULT_ABAC_SUBJECTS: AbacSubjectAssignment[] = [
	{ subjectId: "user-demo-editor", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "id-jakarta" }, updatedAt: "" },
	{ subjectId: "user-demo-reviewer", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "id-jakarta" }, updatedAt: "" },
	{ subjectId: "user-demo-village", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "3171010002" }, updatedAt: "" },
	{ subjectId: "user-demo-district", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "3171010" }, updatedAt: "" },
	{ subjectId: "user-demo-sopd", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "3171" }, updatedAt: "" },
	{ subjectId: "user-demo-regency", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "3171" }, updatedAt: "" },
	{ subjectId: "user-demo-sikesra-admin", attributes: { tenant_id: "tenant-a", site_id: "site-main", region_scope: "all" }, updatedAt: "" },
];

const DEFAULT_ABAC_RESOURCES: AbacResourceAssignment[] = [
	{ resourceId: "resource-public-post", attributes: { module_id: "content", resource_type: "post", resource_status: "published", resource_sensitivity: "public", owner_user_id: "user-demo-editor" }, updatedAt: "" },
	{ resourceId: "resource-sensitive-policy", attributes: { module_id: "governance", resource_type: "policy", resource_status: "review", resource_sensitivity: "restricted", owner_user_id: "user-demo-reviewer" }, updatedAt: "" },
];

const DEFAULT_ABAC_POLICIES: AbacPolicyRule[] = [
	{
		id: "allow-published-content-read",
		label: "Allow published content reads for the same tenant",
		labelKey: "awcms.meta.abac.policy.allowPublishedReads",
		effect: "allow",
		actions: ["content.read"],
		requiredSubject: { tenant_id: "tenant-a" },
		requiredResource: { resource_status: "published", resource_sensitivity: "public" },
		requiredContext: { region_scope: "id-jakarta" },
		updatedAt: "",
	},
	{
		id: "deny-sensitive-publish-outside-governance",
		label: "Explicitly deny publishing restricted governance resources",
		labelKey: "awcms.meta.abac.policy.denyRestrictedGovernance",
		effect: "deny",
		actions: ["content.publish_sensitive"],
		requiredSubject: { tenant_id: "tenant-a" },
		requiredResource: { resource_sensitivity: "restricted", module_id: "governance" },
		requiredContext: {},
		updatedAt: "",
	},
];

const DEFAULT_SETTINGS: ExampleSettings = {
	publicStatusLabel: "healthy",
	auditRetentionDays: 30,
	governanceMode: "review",
	metadataCanonicalBase: "",
	smallCellThreshold: 3,
	sikesraPublicEnabled: true,
};

type SharedRouteHandler = (routeCtx: SandboxedRouteContext, ctx: PluginContext) => Promise<unknown>;

type VerificationStage =
	| "draft"
	| "submitted_village"
	| "verified_village"
	| "submitted_district"
	| "verified_district"
	| "submitted_sopd"
	| "verified_sopd"
	| "submitted_regency"
	| "active_verified";

type VerificationLevel = "desa_kelurahan" | "kecamatan" | "sopd" | "kabupaten_admin" | "tampil";

type VerificationUserLevel = SikesraUserLevel;

interface VerificationListItem {
	id: string;
	registryEntityId: string;
	code: string;
	label: string;
	entityType: string;
	sensitivity: string;
	region: {
		provinceCode: string;
		regencyCode: string;
		districtCode: string;
		villageCode: string;
	};
	verificationStage: VerificationStage;
	inputLevel: VerificationUserLevel;
	currentLevel: VerificationLevel;
	nextStage: VerificationStage | null;
	nextLevel: VerificationLevel | null;
	canAdvance: boolean;
	supportingDocumentIds: string[];
	publicSummary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const candidate = value[key];
	return typeof candidate === "string" ? candidate : undefined;
}

function getNumber(value: unknown, key: string): number | undefined {
	if (!isRecord(value)) return undefined;
	const candidate = value[key];
	return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined;
}

function getBoolean(value: unknown, key: string): boolean | undefined {
	if (!isRecord(value)) return undefined;
	const candidate = value[key];
	return typeof candidate === "boolean" ? candidate : undefined;
}

function actorFromRoute(ctx: any): string {
	const ip = ctx.requestMeta?.ip;
	return typeof ip === "string" && ip ? `request:${ip}` : "request:unknown";
}

function actorFromContent(content: Record<string, unknown>): string {
	const actor = content.authorId ?? content.author_id ?? content.updatedBy ?? content.updated_by;
	return typeof actor === "string" && actor ? actor : "system";
}

const VERIFICATION_STAGE_FLOW: VerificationStage[] = [
	"draft",
	"submitted_village",
	"verified_village",
	"submitted_district",
	"verified_district",
	"submitted_sopd",
	"verified_sopd",
	"submitted_regency",
	"active_verified",
];

const VERIFICATION_STATE_KEY = "state:sikesraVerificationStages";

function getNextVerificationStage(stage: VerificationStage): VerificationStage | null {
	const index = VERIFICATION_STAGE_FLOW.indexOf(stage);
	return index >= 0 && index < VERIFICATION_STAGE_FLOW.length - 1 ? (VERIFICATION_STAGE_FLOW[index + 1] ?? null) : null;
}

function getVerificationLevel(stage: VerificationStage): VerificationLevel {
	if (stage === "draft" || stage === "submitted_village") return "desa_kelurahan";
	if (stage === "verified_village" || stage === "submitted_district") return "kecamatan";
	if (stage === "verified_district" || stage === "submitted_sopd") return "sopd";
	if (stage === "verified_sopd" || stage === "submitted_regency") return "kabupaten_admin";
	return "tampil";
}

function getAllowedVerifierLevels(level: VerificationLevel): VerificationUserLevel[] {
	if (level === "desa_kelurahan") return ["desa_kelurahan"];
	if (level === "kecamatan") return ["kecamatan"];
	if (level === "sopd") return ["sopd"];
	if (level === "kabupaten_admin") return ["kabupaten", "admin_sikesra"];
	return [];
}

function getRevisionTargetStage(stage: VerificationStage): VerificationStage {
	if (stage === "draft" || stage === "submitted_village" || stage === "verified_village") return "submitted_village";
	if (stage === "submitted_district" || stage === "verified_district") return "submitted_village";
	if (stage === "submitted_sopd" || stage === "verified_sopd") return "submitted_district";
	if (stage === "submitted_regency" || stage === "active_verified") return "submitted_sopd";
	return "submitted_village";
}

function inferVerifierLevel(actor: string): VerificationUserLevel | null {
	if (actor.includes("village")) return "desa_kelurahan";
	if (actor.includes("district")) return "kecamatan";
	if (actor.includes("sopd")) return "sopd";
	if (actor.includes("regency")) return "kabupaten";
	if (actor.includes("sikesra-admin") || actor.includes("sikesra_admin")) return "admin_sikesra";
	return null;
}

function mapRoleSlugToVerifierLevel(roleSlug: string): VerificationUserLevel | null {
	if (roleSlug === "verifier-desa-kelurahan") return "desa_kelurahan";
	if (roleSlug === "verifier-kecamatan") return "kecamatan";
	if (roleSlug === "verifier-sopd") return "sopd";
	if (roleSlug === "verifier-kabupaten") return "kabupaten";
	if (roleSlug === "admin-sikesra") return "admin_sikesra";
	return null;
}

function getRequestUserId(ctx: PluginContext) {
	const req = (ctx as any).request as Request | undefined;
	return req?.headers.get("X-Sikesra-User-Id") ?? null;
}

async function getCurrentVerifierLevels(ctx: PluginContext): Promise<VerificationUserLevel[]> {
	const userId = getRequestUserId(ctx);
	if (!userId) return [];
	const assignment = (await ctx.storage.userRoleAssignments!.get(userId)) as UserRoleAssignment | null;
	if (!assignment) return [];
	return assignment.roles
		.map((roleSlug) => mapRoleSlugToVerifierLevel(roleSlug))
		.filter((level): level is VerificationUserLevel => level !== null);
}

async function getCurrentVerifierRegionScope(ctx: PluginContext) {
	const userId = getRequestUserId(ctx);
	if (!userId) return null;
	const subject = (await ctx.storage.abacSubjectAssignments!.get(userId)) as AbacSubjectAssignment | null;
	return subject?.attributes.region_scope ?? null;
}

async function getCurrentVerifierScopeMetadata(ctx: PluginContext) {
	const userId = getRequestUserId(ctx);
	if (!userId) return { verifierRegionScope: undefined, verifierOrgScope: undefined };
	const subject = (await ctx.storage.abacSubjectAssignments!.get(userId)) as AbacSubjectAssignment | null;
	return {
		verifierRegionScope: subject?.attributes.region_scope,
		verifierOrgScope: subject?.attributes.site_id,
	};
}

function filterVerificationItemsForLevels(items: VerificationListItem[], levels: VerificationUserLevel[]) {
	if (levels.length === 0 || levels.includes("admin_sikesra")) return items;
	return items.filter((item) => getAllowedVerifierLevels(item.currentLevel).some((level) => levels.includes(level)));
}

function filterVerificationItemsForRegionScope(
	items: VerificationListItem[],
	levels: VerificationUserLevel[],
	regionScope: string | null,
) {
	if (!regionScope || regionScope === "all" || levels.includes("admin_sikesra")) return items;
	return items.filter((item) => {
		if (levels.includes("desa_kelurahan")) return item.region.villageCode === regionScope;
		if (levels.includes("kecamatan")) return item.region.districtCode === regionScope;
		if (levels.includes("sopd") || levels.includes("kabupaten")) return item.region.regencyCode === regionScope;
		return true;
	});
}

async function getRegistryEntities(ctx: PluginContext): Promise<SikesraReferenceRegistryEntity[]> {
	const legacy = (await ctx.kv.get<SikesraReferenceRegistryEntity[]>("custom:registryEntities")) ?? [];
	if (legacy.length > 0) {
		for (const entity of legacy) {
			await ctx.storage.registryEntities!.put(entity.id, entity);
		}
		await ctx.kv.delete("custom:registryEntities");
	}
	const stored = await listStorageValues<SikesraReferenceRegistryEntity>(ctx.storage.registryEntities!);
	return mergeById(SIKESRA_REFERENCE_FIXTURES.registryEntities, legacy, stored);
}

async function saveRegistryEntity(ctx: PluginContext, entity: SikesraReferenceRegistryEntity) {
	const custom = (await ctx.kv.get<SikesraReferenceRegistryEntity[]>("custom:registryEntities")) ?? [];
	const next = [...custom.filter((item) => item.id !== entity.id), entity];
	await ctx.kv.set("custom:registryEntities", next);
	await ctx.storage.registryEntities!.put(entity.id, entity);
}

async function getSupportingDocuments(ctx: PluginContext): Promise<SikesraReferenceSupportingDocument[]> {
	const legacy = (await ctx.kv.get<SikesraReferenceSupportingDocument[]>("custom:supportingDocuments")) ?? [];
	if (legacy.length > 0) {
		for (const doc of legacy) {
			await ctx.storage.supportingDocuments!.put(doc.id, doc);
		}
		await ctx.kv.delete("custom:supportingDocuments");
	}
	const stored = await listStorageValues<SikesraReferenceSupportingDocument>(ctx.storage.supportingDocuments!);
	return mergeById(SIKESRA_REFERENCE_FIXTURES.supportingDocuments, legacy, stored);
}

async function saveSupportingDocument(ctx: PluginContext, doc: SikesraReferenceSupportingDocument) {
	const custom = (await ctx.kv.get<SikesraReferenceSupportingDocument[]>("custom:supportingDocuments")) ?? [];
	const next = [...custom.filter((item) => item.id !== doc.id), doc];
	await ctx.kv.set("custom:supportingDocuments", next);
	await ctx.storage.supportingDocuments!.put(doc.id, doc);
}

async function listVerificationEvents(ctx: PluginContext): Promise<SikesraReferenceVerificationEvent[]> {
	return listStorageValues<SikesraReferenceVerificationEvent>(ctx.storage.verificationEvents!);
}

async function appendVerificationEvent(ctx: PluginContext, event: SikesraReferenceVerificationEvent) {
	await ctx.storage.verificationEvents!.put(event.id, event);
	await persistStateValue(ctx, "state:lastVerificationEventId", event.id);
	return event;
}

async function getVerificationStageState(ctx: PluginContext): Promise<Record<string, VerificationStage>> {
	const entities = await getRegistryEntities(ctx);
	const defaultState = Object.fromEntries(entities.map((entity) => [entity.id, entity.verificationStage])) as Record<string, VerificationStage>;
	const storedRecords = await listStorageValues<StoredVerificationStageRecord>(ctx.storage.verificationStageState!);
	if (storedRecords.length > 0) {
		return {
			...defaultState,
			...Object.fromEntries(storedRecords.map((record) => [record.registryEntityId, record.stage])),
		};
	}
	const stored = await ctx.kv.get<Record<string, VerificationStage>>(VERIFICATION_STATE_KEY);
	if (stored && typeof stored === "object") {
		for (const [registryEntityId, stage] of Object.entries(stored)) {
			await ctx.storage.verificationStageState!.put(registryEntityId, {
				registryEntityId,
				stage,
				updatedAt: toIsoNow(),
			});
		}
		await ctx.kv.delete(VERIFICATION_STATE_KEY);
		return { ...defaultState, ...stored };
	}
	return defaultState;
}

async function setVerificationStageState(ctx: PluginContext, state: Record<string, VerificationStage>) {
	for (const [registryEntityId, stage] of Object.entries(state)) {
		await ctx.storage.verificationStageState!.put(registryEntityId, {
			registryEntityId,
			stage,
			updatedAt: toIsoNow(),
		});
	}
	await ctx.kv.set(VERIFICATION_STATE_KEY, state);
}

async function listVerificationItems(ctx: PluginContext): Promise<VerificationListItem[]> {
	const state = await getVerificationStageState(ctx);
	const entities = await getRegistryEntities(ctx);
	return entities.map((entity) => {
		const verificationStage = state[entity.id] ?? entity.verificationStage;
		const nextStage = getNextVerificationStage(verificationStage);
		return {
			id: entity.id,
			registryEntityId: entity.id,
			code: entity.code,
			label: entity.label,
			entityType: entity.entityType,
			sensitivity: entity.sensitivity,
			region: entity.region,
			verificationStage,
			inputLevel: entity.inputLevel,
			currentLevel: getVerificationLevel(verificationStage),
			nextStage,
			nextLevel: nextStage ? getVerificationLevel(nextStage) : null,
			canAdvance: verificationStage !== "active_verified",
			supportingDocumentIds: entity.supportingDocumentIds,
			publicSummary: entity.publicSummary,
		};
	});
}

function toIsoNow() {
	return new Date().toISOString();
}

async function listStorageValues<T>(collection: { query: (options?: any) => Promise<{ items: Array<{ id: string; data: unknown }> }> }) {
	const result = await collection.query({ limit: 200 });
	return result.items.map((item) => item.data as T);
}

async function getStoredSettings(ctx: PluginContext) {
	const records = await listStorageValues<StoredSettingRecord>(ctx.storage.settingsState!);
	const map = new Map<string, StoredSettingRecord>();
	for (const record of records) map.set(record.key, record);
	return map;
}

async function getStoredState(ctx: PluginContext) {
	const records = await listStorageValues<StoredStateRecord>(ctx.storage.pluginState!);
	const map = new Map<string, StoredStateRecord>();
	for (const record of records) map.set(record.key, record);
	return map;
}

async function persistSettings(ctx: PluginContext, next: ExampleSettings) {
	const now = toIsoNow();
	const records: StoredSettingRecord[] = [
		{ key: "publicStatusLabel", value: next.publicStatusLabel, updatedAt: now },
		{ key: "auditRetentionDays", value: next.auditRetentionDays, updatedAt: now },
		{ key: "governanceMode", value: next.governanceMode, updatedAt: now },
		{ key: "metadataCanonicalBase", value: next.metadataCanonicalBase, updatedAt: now },
		{ key: "smallCellThreshold", value: next.smallCellThreshold, updatedAt: now },
		{ key: "sikesraPublicEnabled", value: next.sikesraPublicEnabled, updatedAt: now },
	];

	for (const record of records) {
		await ctx.storage.settingsState!.put(record.key, record);
	}
}

async function persistStateValue(ctx: PluginContext, key: string, value: StoredStateRecord["value"]) {
	const record: StoredStateRecord = { key, value, updatedAt: toIsoNow() };
	await ctx.storage.pluginState!.put(key, record);
}

async function readStateValue<T extends StoredStateRecord["value"]>(ctx: PluginContext, key: string, fallback: T): Promise<T> {
	const stored = await getStoredState(ctx);
	const record = stored.get(key);
	return (record?.value as T | undefined) ?? fallback;
}

function mergeById<T extends { id: string }>(...groups: T[][]): T[] {
	const merged = new Map<string, T>();
	for (const group of groups) {
		for (const item of group) merged.set(item.id, item);
	}
	return [...merged.values()];
}

async function getSettings(ctx: PluginContext): Promise<ExampleSettings> {
	const storedSettings = await getStoredSettings(ctx);

	return {
		publicStatusLabel:
			typeof storedSettings.get("publicStatusLabel")?.value === "string"
				? (storedSettings.get("publicStatusLabel")!.value as string)
				: DEFAULT_SETTINGS.publicStatusLabel,
		auditRetentionDays:
			typeof storedSettings.get("auditRetentionDays")?.value === "number"
				? (storedSettings.get("auditRetentionDays")!.value as number)
				: DEFAULT_SETTINGS.auditRetentionDays,
		governanceMode:
			typeof storedSettings.get("governanceMode")?.value === "string"
				? (storedSettings.get("governanceMode")!.value as string)
				: DEFAULT_SETTINGS.governanceMode,
		metadataCanonicalBase:
			typeof storedSettings.get("metadataCanonicalBase")?.value === "string"
				? (storedSettings.get("metadataCanonicalBase")!.value as string)
				: DEFAULT_SETTINGS.metadataCanonicalBase,
		smallCellThreshold:
			typeof storedSettings.get("smallCellThreshold")?.value === "number"
				? (storedSettings.get("smallCellThreshold")!.value as number)
				: DEFAULT_SETTINGS.smallCellThreshold,
		sikesraPublicEnabled:
			typeof storedSettings.get("sikesraPublicEnabled")?.value === "boolean"
				? (storedSettings.get("sikesraPublicEnabled")!.value as boolean)
				: DEFAULT_SETTINGS.sikesraPublicEnabled,
	};
}

async function setSettings(ctx: PluginContext, input: unknown) {
	const current = await getSettings(ctx);
	const next: ExampleSettings = {
		publicStatusLabel: getString(input, "publicStatusLabel") ?? current.publicStatusLabel,
		auditRetentionDays: getNumber(input, "auditRetentionDays") ?? current.auditRetentionDays,
		governanceMode: getString(input, "governanceMode") ?? current.governanceMode,
		metadataCanonicalBase: getString(input, "metadataCanonicalBase") ?? current.metadataCanonicalBase,
		smallCellThreshold: getNumber(input, "smallCellThreshold") ?? current.smallCellThreshold,
		sikesraPublicEnabled: getBoolean(input, "sikesraPublicEnabled") ?? current.sikesraPublicEnabled,
	};

	await persistSettings(ctx, next);

	return next;
}

async function incrementCounter(ctx: PluginContext, key: string) {
	const current = await readStateValue(ctx, key, 0);
	const next = current + 1;
	await persistStateValue(ctx, key, next);
	return next;
}

export function createAuditRecord(input: Omit<ExampleAuditEvent, "id" | "timestamp">): ExampleAuditEvent {
	const timestamp = toIsoNow();
	return {
		id: `${timestamp}:${input.kind}:${Math.random().toString(36).slice(2, 8)}`,
		timestamp,
		kind: input.kind,
		scope: input.scope,
		actor: input.actor,
		summary: input.summary,
		metadata: input.metadata,
	};
}

async function appendAuditEvent(ctx: PluginContext, record: ExampleAuditEvent) {
	const req = (ctx as any).request as Request | undefined;
	if (req) {
		const userId = req.headers.get("X-Sikesra-User-Id");
		const userName = req.headers.get("X-Sikesra-User-Name");
		if (userId) record.userId = userId;
		if (userName) record.userName = userName;
	}
	await ctx.storage.auditEvents!.put(record.id, record);
	await persistStateValue(ctx, "state:lastAuditEventId", record.id);
	await incrementCounter(ctx, "state:auditCount");
	ctx.log.info(`[${AWCMS_SIKESRA_PLUGIN_ID}] ${record.summary}`, record.metadata);
	return record;
}

async function listAuditEvents(ctx: PluginContext, limit = 20, cursor?: string) {
	const result = await ctx.storage.auditEvents!.query({
		orderBy: { timestamp: "desc" },
		limit,
		cursor,
	});

	return {
		items: result.items.map((item: { id: string; data: unknown }) => item.data as ExampleAuditEvent),
		cursor: result.cursor,
		hasMore: result.hasMore,
	};
}

async function summarizePluginState(ctx: PluginContext) {
	const settings = await getSettings(ctx);
	const auditCount = await readStateValue(ctx, "state:auditCount", 0);
	const lifecycleCount = await readStateValue(ctx, "state:lifecycleCount", 0);
	const publicHits = await readStateValue(ctx, "state:publicStatusHits", 0);
	const lastCronAt = await readStateValue(ctx, "state:lastCronAt", null);
	const lastLifecycle = await readStateValue(ctx, "state:lastLifecycle", null);
	const recent = await listAuditEvents(ctx, 5);

	return {
		plugin: { id: AWCMS_SIKESRA_PLUGIN_ID },
		settings,
		counters: {
			auditCount,
			lifecycleCount,
			publicHits,
		},
		lastCronAt,
		lastLifecycle,
		recentEvents: recent.items,
	};
}

async function writeSnapshot(ctx: PluginContext, collection: string, content: Record<string, unknown>) {
	const contentId = typeof content.id === "string" ? content.id : "unknown";
	const snapshotId = `${collection}:${contentId}:${Date.now()}`;
	await ctx.storage.contentSnapshots!.put(snapshotId, {
		collection,
		contentId,
		timestamp: toIsoNow(),
		slug: typeof content.slug === "string" ? content.slug : null,
		status: typeof content.status === "string" ? content.status : null,
	});
	return snapshotId;
}

async function appendAccessChangeEvent(ctx: PluginContext, record: ExampleAuditEvent) {
	await ctx.storage.accessChangeEvents!.put(record.id, record);
	await incrementCounter(ctx, "state:accessChangeCount");
	return record;
}

function touchUpdatedAt<T extends { updatedAt: string }>(value: T): T {
	return { ...value, updatedAt: toIsoNow() };
}

async function ensureAccessCatalogSeeded(ctx: PluginContext) {
	const existingPermissions = await ctx.storage.permissionCatalog!.count();
	if (existingPermissions === 0) {
		for (const item of DEFAULT_ACCESS_PERMISSIONS) {
			await ctx.storage.permissionCatalog!.put(item.slug, touchUpdatedAt(item));
		}
	}

	const existingRoles = await ctx.storage.roleCatalog!.count();
	if (existingRoles === 0) {
		for (const item of DEFAULT_ACCESS_ROLES) {
			await ctx.storage.roleCatalog!.put(item.slug, touchUpdatedAt(item));
		}
	}

	const existingRoleAssignments = await ctx.storage.rolePermissionAssignments!.count();
	if (existingRoleAssignments === 0) {
		for (const item of DEFAULT_ROLE_ASSIGNMENTS) {
			await ctx.storage.rolePermissionAssignments!.put(item.roleSlug, touchUpdatedAt(item));
		}
	}

	const existingUserAssignments = await ctx.storage.userRoleAssignments!.count();
	if (existingUserAssignments === 0) {
		for (const item of DEFAULT_USER_ROLE_ASSIGNMENTS) {
			await ctx.storage.userRoleAssignments!.put(item.userId, touchUpdatedAt(item));
		}
		await persistStateValue(ctx, "state:lastPreviewUserId", DEFAULT_USER_ROLE_ASSIGNMENTS[0]?.userId ?? "");
	}
}

async function ensureAbacCatalogSeeded(ctx: PluginContext) {
	const existingAttributes = await ctx.storage.abacAttributeCatalog!.count();
	if (existingAttributes === 0) {
		for (const item of DEFAULT_ABAC_ATTRIBUTES) {
			await ctx.storage.abacAttributeCatalog!.put(item.key, touchUpdatedAt(item));
		}
	}

	const existingSubjects = await ctx.storage.abacSubjectAssignments!.count();
	if (existingSubjects === 0) {
		for (const item of DEFAULT_ABAC_SUBJECTS) {
			await ctx.storage.abacSubjectAssignments!.put(item.subjectId, touchUpdatedAt(item));
		}
	}

	const existingResources = await ctx.storage.abacResourceAssignments!.count();
	if (existingResources === 0) {
		for (const item of DEFAULT_ABAC_RESOURCES) {
			await ctx.storage.abacResourceAssignments!.put(item.resourceId, touchUpdatedAt(item));
		}
	}

	const existingPolicies = await ctx.storage.abacPolicyRules!.count();
	if (existingPolicies === 0) {
		for (const item of DEFAULT_ABAC_POLICIES) {
			await ctx.storage.abacPolicyRules!.put(item.id, touchUpdatedAt(item));
		}
	}

	await persistStateValue(ctx, "state:lastAbacPreviewSubjectId", DEFAULT_ABAC_SUBJECTS[0]?.subjectId ?? "");
	await persistStateValue(ctx, "state:lastAbacPreviewResourceId", DEFAULT_ABAC_RESOURCES[0]?.resourceId ?? "");
}

async function listCollectionValues<T>(
	collection: { query: (options?: any) => Promise<{ items: Array<{ id: string; data: unknown }> }> },
	orderByField: string = "updatedAt"
): Promise<T[]> {
	const result = await collection.query({ orderBy: { [orderByField]: "desc" }, limit: 200 });
	return result.items.map((item) => item.data as T);
}

async function listPermissions(ctx: PluginContext) {
	return listCollectionValues<AccessPermission>(ctx.storage.permissionCatalog!);
}

async function listRoles(ctx: PluginContext) {
	return listCollectionValues<AccessRole>(ctx.storage.roleCatalog!);
}

async function listRoleAssignments(ctx: PluginContext) {
	return listCollectionValues<RolePermissionAssignment>(ctx.storage.rolePermissionAssignments!);
}

async function listUserRoleAssignments(ctx: PluginContext) {
	return listCollectionValues<UserRoleAssignment>(ctx.storage.userRoleAssignments!);
}

async function listAbacAttributes(ctx: PluginContext) {
	return listCollectionValues<AbacAttributeDefinition>(ctx.storage.abacAttributeCatalog!);
}

async function listAbacPolicies(ctx: PluginContext) {
	return listCollectionValues<AbacPolicyRule>(ctx.storage.abacPolicyRules!);
}

async function listAbacSubjects(ctx: PluginContext) {
	return listCollectionValues<AbacSubjectAssignment>(ctx.storage.abacSubjectAssignments!);
}

async function listAbacResources(ctx: PluginContext) {
	return listCollectionValues<AbacResourceAssignment>(ctx.storage.abacResourceAssignments!);
}

function getStringArray(value: unknown, key: string) {
	if (!isRecord(value)) return [];
	const candidate = value[key];
	if (!Array.isArray(candidate)) return [];
	return candidate.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function getStringRecord(value: unknown, key: string): Record<string, string> {
	if (!isRecord(value)) return {};
	const candidate = value[key];
	if (!isRecord(candidate)) return {};
	const result: Record<string, string> = {};
	for (const [entryKey, entryValue] of Object.entries(candidate)) {
		if (typeof entryValue === "string" && entryValue.length > 0) result[entryKey] = entryValue;
	}
	return result;
}

async function summarizeAccessRights(ctx: PluginContext) {
	await ensureAccessCatalogSeeded(ctx);
	const permissions = await listPermissions(ctx);
	const roles = await listRoles(ctx);
	const roleAssignments = await listRoleAssignments(ctx);
	const userAssignments = await listUserRoleAssignments(ctx);
	const changeEvents = await listCollectionValues<ExampleAuditEvent>(ctx.storage.accessChangeEvents!, "timestamp");

	const rolesWithoutPermissions = roles
		.filter((role) => !roleAssignments.some((assignment) => assignment.roleSlug === role.slug && assignment.permissions.length > 0))
		.map((role) => role.slug);

	const usersWithoutRoles = userAssignments.filter((assignment) => assignment.roles.length === 0).map((assignment) => assignment.userId);

	return {
		permissions,
		roles,
		roleAssignments,
		userAssignments,
		changeEvents,
		health: {
			permissionCount: permissions.length,
			roleCount: roles.length,
			assignmentCount: roleAssignments.length,
			userAssignmentCount: userAssignments.length,
			rolesWithoutPermissions,
			usersWithoutRoles,
		},
	};
}

function collectMissingAttributes(required: Record<string, string>, available: Record<string, string>) {
	return Object.entries(required).filter(([key]) => available[key] === undefined).map(([key]) => key);
}

function allAttributesMatch(required: Record<string, string>, available: Record<string, string>) {
	return Object.entries(required).every(([key, value]) => available[key] === value);
}

async function summarizeAbac(ctx: PluginContext) {
	await ensureAbacCatalogSeeded(ctx);
	const attributes = await listAbacAttributes(ctx);
	const policies = await listAbacPolicies(ctx);
	const subjects = await listAbacSubjects(ctx);
	const resources = await listAbacResources(ctx);
	const events = await listCollectionValues<ExampleAuditEvent>(ctx.storage.abacChangeEvents!, "timestamp");

	return {
		attributes,
		policies,
		subjects,
		resources,
		events,
		health: {
			attributeCount: attributes.length,
			policyCount: policies.length,
			subjectCount: subjects.length,
			resourceCount: resources.length,
			explicitDenyCount: policies.filter((policy) => policy.effect === "deny").length,
		},
	};
}

async function appendAbacChangeEvent(ctx: PluginContext, record: ExampleAuditEvent) {
	await ctx.storage.abacChangeEvents!.put(record.id, record);
	await incrementCounter(ctx, "state:abacChangeCount");
	return record;
}

async function evaluateAbacDecision(ctx: PluginContext, input: unknown) {
	await ensureAbacCatalogSeeded(ctx);
	const subjectId = getString(input, "subjectId") ?? "";
	const resourceId = getString(input, "resourceId") ?? "";
	const action = getString(input, "action") ?? "";
	const contextAttributes = getStringRecord(input, "contextAttributes");

	if (!subjectId || !resourceId || !action) {
		return {
			allowed: false,
			reason: "Missing required ABAC input",
			matchedPolicyIds: [],
			effect: "deny",
			missingAttributes: [
				...(subjectId ? [] : ["subjectId"]),
				...(resourceId ? [] : ["resourceId"]),
				...(action ? [] : ["action"]),
			],
		};
	}

	const subject = (await ctx.storage.abacSubjectAssignments!.get(subjectId)) as AbacSubjectAssignment | null;
	const resource = (await ctx.storage.abacResourceAssignments!.get(resourceId)) as AbacResourceAssignment | null;

	if (!subject || !resource) {
		return {
			allowed: false,
			reason: !subject ? `No subject assignment found for ${subjectId}` : `No resource assignment found for ${resourceId}`,
			matchedPolicyIds: [],
			effect: "deny",
			missingAttributes: [],
		};
	}

	const policies = await listAbacPolicies(ctx);
	const relevantPolicies = policies.filter((policy) => policy.actions.includes(action));
	let missingAttributes: string[] = [];
	const matchedAllowPolicies: string[] = [];
	const matchedDenyPolicies: string[] = [];

	for (const policy of relevantPolicies) {
		const missing = [
			...collectMissingAttributes(policy.requiredSubject, subject.attributes),
			...collectMissingAttributes(policy.requiredResource, resource.attributes),
			...collectMissingAttributes(policy.requiredContext, contextAttributes),
		];
		if (missing.length > 0) {
			missingAttributes = [...new Set([...missingAttributes, ...missing])];
			continue;
		}

		const subjectMatch = allAttributesMatch(policy.requiredSubject, subject.attributes);
		const resourceMatch = allAttributesMatch(policy.requiredResource, resource.attributes);
		const contextMatch = allAttributesMatch(policy.requiredContext, contextAttributes);

		if (!(subjectMatch && resourceMatch && contextMatch)) continue;

		if (policy.effect === "deny") matchedDenyPolicies.push(policy.id);
		else matchedAllowPolicies.push(policy.id);
	}

	if (matchedDenyPolicies.length > 0) {
		return {
			allowed: false,
			reason: `Explicit deny from policy ${matchedDenyPolicies.join(", ")}`,
			matchedPolicyIds: matchedDenyPolicies,
			effect: "deny",
			missingAttributes,
		};
	}

	if (matchedAllowPolicies.length > 0) {
		return {
			allowed: true,
			reason: `Allowed by policy ${matchedAllowPolicies.join(", ")}`,
			matchedPolicyIds: matchedAllowPolicies,
			effect: "allow",
			missingAttributes,
		};
	}

	return {
		allowed: false,
		reason: missingAttributes.length > 0 ? `Missing required attributes: ${missingAttributes.join(", ")}` : `No matching allow policy for action ${action}`,
		matchedPolicyIds: [],
		effect: "deny",
		missingAttributes,
	};
}

async function previewAccess(ctx: PluginContext, input: unknown) {
	await ensureAccessCatalogSeeded(ctx);
	const userId = getString(input, "userId") ?? "";
	const permissionSlug = getString(input, "permissionSlug") ?? "";
	const reasonPrefix = !userId || !permissionSlug ? "Missing required preview input" : null;

	if (reasonPrefix) {
		return {
			allowed: false,
			reason: reasonPrefix,
			matchedRoles: [],
			effectivePermissions: [],
		};
	}

	const userAssignment = (await ctx.storage.userRoleAssignments!.get(userId)) as UserRoleAssignment | null;
	if (!userAssignment || userAssignment.roles.length === 0) {
		return {
			allowed: false,
			reason: `No role assignment found for ${userId}`,
			matchedRoles: [],
			effectivePermissions: [],
		};
	}

	const assignments = await Promise.all(
		userAssignment.roles.map(async (roleSlug) =>
			((await ctx.storage.rolePermissionAssignments!.get(roleSlug)) as RolePermissionAssignment | null) ?? {
				roleSlug,
				permissions: [],
				updatedAt: "",
			},
		),
	);

	const effectivePermissions = [...new Set(assignments.flatMap((assignment) => assignment.permissions))].toSorted();
	const matchedRoles = assignments.filter((assignment) => assignment.permissions.includes(permissionSlug)).map((assignment) => assignment.roleSlug);
	const allowed = matchedRoles.length > 0;

	return {
		allowed,
		reason: allowed
			? `Permission ${permissionSlug} granted by role ${matchedRoles.join(", ")}`
			: `Permission ${permissionSlug} not granted to ${userId}`,
		matchedRoles,
		effectivePermissions,
	};
}

const publicStatusRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	await incrementCounter(ctx, "state:publicStatusHits");
	const settings = await getSettings(ctx);

	if (!settings.sikesraPublicEnabled) {
		return {
			plugin: { id: AWCMS_SIKESRA_PLUGIN_ID, visibility: "public-safe" },
			status: settings.publicStatusLabel,
			governanceMode: settings.governanceMode,
			publicAggregate: {
				categories: [],
				caveat: "SIKESRA Public API is disabled.",
			},
		};
	}

	const state = await getVerificationStageState(ctx);

	const dataTypes = (await ctx.kv.get<SikesraParentType[]>("custom:data-types")) ?? DEFAULT_DATA_TYPES;
	const moduleTypes = dataTypes.map((t) => ({ code: t.id, label: t.label }));

	const smallCellThreshold = settings.smallCellThreshold;

	const entitiesList = await getRegistryEntities(ctx);

	const categories = moduleTypes.map((mod) => {
		const entities = entitiesList.filter(
			(e) => e.entityType === mod.code
		);
		const eligibleEntities = entities.filter(
			(e) => e.sensitivity === "public_safe" || e.sensitivity === "internal"
		);
		const total = eligibleEntities.length;
		const verified = eligibleEntities.filter(
			(e) => (state[e.id] ?? e.verificationStage) === "active_verified"
		).length;
		const suppressed = total < smallCellThreshold;

		return {
			code: mod.code,
			label: mod.label,
			total: suppressed ? 0 : total,
			verified: suppressed ? 0 : verified,
			suppressed,
		};
	});

	return {
		plugin: { id: AWCMS_SIKESRA_PLUGIN_ID, visibility: "public-safe" },
		status: settings.publicStatusLabel,
		governanceMode: settings.governanceMode,
		publicAggregate: {
			categories,
			caveat: "Public aggregate only exposes coarse counts and suppresses sensitive details when counts are suppressed.",
		},
	};
};

const registryListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const entities = await getRegistryEntities(ctx);
	return { items: entities };
};

const registrySaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const input = routeCtx.input;
	if (!isRecord(input)) {
		throw new Error("Invalid input format");
	}
	const newEntity: SikesraReferenceRegistryEntity = {
		id: getString(input, "id") ?? `registry-entity-${Math.random().toString(36).slice(2, 10)}`,
		code: getString(input, "code") ?? "",
		label: getString(input, "label") ?? "Untitled Registry Entity",
		entityType: getString(input, "entityType") ?? "rumah_ibadah",
		sensitivity: (getString(input, "sensitivity") as SikesraSensitivity) ?? "public_safe",
		region: {
			provinceCode: getString(input, "provinceCode") ?? "",
			regencyCode: getString(input, "regencyCode") ?? "",
			districtCode: getString(input, "districtCode") ?? "",
			villageCode: getString(input, "villageCode") ?? "",
		},
		verificationStage: "submitted_village",
		inputLevel: (getString(input, "inputLevel") as VerificationUserLevel | undefined) ?? "desa_kelurahan",
		supportingDocumentIds: [],
		publicSummary: getString(input, "publicSummary") ?? "",
	};

	await saveRegistryEntity(ctx, newEntity);

	await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "registry.entity.create",
			scope: "registry",
			actor: actorFromRoute(ctx),
			summary: `Created SIKESRA registry entity ${newEntity.code} - ${newEntity.label}`,
			metadata: newEntity as unknown as Record<string, unknown>,
		})
	);

	return { success: true, item: newEntity };
};

const documentsListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const docs = await getSupportingDocuments(ctx);
	return { items: docs };
};

const documentsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const input = routeCtx.input;
	if (!isRecord(input)) {
		throw new Error("Invalid input format");
	}
	const newDoc: SikesraReferenceSupportingDocument = {
		id: getString(input, "id") ?? `doc-${Math.random().toString(36).slice(2, 10)}`,
		registryEntityId: getString(input, "registryEntityId") ?? "",
		documentType: getString(input, "documentType") ?? "surat_keterangan",
		title: getString(input, "title") ?? "Untitled Document",
		sensitivity: (getString(input, "sensitivity") as SikesraSensitivity) ?? "public_safe",
		issuedAt: toIsoNow(),
		verifiedBy: actorFromRoute(ctx),
	};

	await saveSupportingDocument(ctx, newDoc);

	await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "document.create",
			scope: "documents",
			actor: actorFromRoute(ctx),
			summary: `Uploaded document ${newDoc.title} classification ${newDoc.sensitivity}`,
			metadata: newDoc as unknown as Record<string, unknown>,
		})
	);

	return { success: true, item: newDoc };
};

const importPromoteRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const input = routeCtx.input;
	if (!isRecord(input)) {
		throw new Error("Invalid input format");
	}
	const rows = input.rows;
	if (!Array.isArray(rows)) {
		throw new Error("Invalid rows format");
	}
	
	let count = 0;
	for (const row of rows) {
		const newEntity: SikesraReferenceRegistryEntity = {
			id: row.id ?? `registry-entity-${Math.random().toString(36).slice(2, 10)}`,
			code: row.code ?? "",
			label: row.label ?? "Imported Entity",
			entityType: row.entityType ?? "rumah_ibadah",
			sensitivity: (row.sensitivity as SikesraSensitivity) ?? "public_safe",
			region: {
				provinceCode: row.provinceCode ?? "",
				regencyCode: row.regencyCode ?? "",
				districtCode: row.districtCode ?? "",
				villageCode: row.villageCode ?? "",
			},
			verificationStage: "submitted_village",
			inputLevel: (row.inputLevel as VerificationUserLevel | undefined) ?? "desa_kelurahan",
			supportingDocumentIds: [],
			publicSummary: row.publicSummary ?? "",
		};
		await saveRegistryEntity(ctx, newEntity);
		count++;
	}

	await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "registry.import.promote",
			scope: "registry",
			actor: actorFromRoute(ctx),
			summary: `Promoted ${count} staged rows from Excel import to SIKESRA Registry`,
			metadata: { count },
		})
	);

	return { success: true, count };
};

const settingsGetRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	return getSettings(ctx);
};

const settingsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const next = await setSettings(ctx, routeCtx.input);
	await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "settings.update",
			scope: "settings",
			actor: actorFromRoute(ctx),
			summary: "Updated example plugin settings",
			metadata: { ...next },
		}),
	);
	return { success: true, settings: next };
};

const auditListRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const limit = Math.min(getNumber(routeCtx.input, "limit") ?? 20, 50);
	const cursor = getString(routeCtx.input, "cursor");
	return listAuditEvents(ctx, limit, cursor);
};

const overviewSummaryRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const summary = await summarizePluginState(ctx);
	const access = await summarizeAccessRights(ctx);
	return {
		...summary,
		accessRights: access.health,
	};
};

const verificationListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	await ensureAbacCatalogSeeded(ctx);
	const currentVerifierLevels = await getCurrentVerifierLevels(ctx);
	const regionScope = await getCurrentVerifierRegionScope(ctx);
	const items = await listVerificationItems(ctx);
	return {
		items: filterVerificationItemsForRegionScope(filterVerificationItemsForLevels(items, currentVerifierLevels), currentVerifierLevels, regionScope),
		events: await listVerificationEvents(ctx),
		currentVerifierLevels,
	};
};

const verificationAdvanceRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const registryEntityId = getString(routeCtx.input, "registryEntityId") ?? "";
	const actor = getString(routeCtx.input, "actor") ?? actorFromRoute(ctx);
	const verifierLevel = (getString(routeCtx.input, "verifierLevel") as VerificationUserLevel | undefined) ?? inferVerifierLevel(actor);
	const notes = getString(routeCtx.input, "notes") ?? "Advanced verification stage from the admin reference UI";
	const items = await listVerificationItems(ctx);
	const item = items.find((entry) => entry.registryEntityId === registryEntityId);

	if (!item) {
		return { success: false, error: { code: "NOT_FOUND", message: `Unknown verification entity ${registryEntityId}` } };
	}

	if (!item.nextStage) {
		return { success: false, error: { code: "INVALID_STATE", message: `Registry entity ${registryEntityId} is already at the final verification stage` } };
	}
	if (!verifierLevel) {
		return { success: false, error: { code: "INVALID_LEVEL", message: `Verification level is required for ${registryEntityId}` } };
	}
	const allowedVerifierLevels = getAllowedVerifierLevels(item.currentLevel);
	if (!allowedVerifierLevels.includes(verifierLevel)) {
		return {
			success: false,
			error: {
				code: "INVALID_LEVEL",
				message: `Verification for ${registryEntityId} must be handled by ${allowedVerifierLevels.join(", ")}`,
			},
		};
	}
	const nextStage = item.nextStage;
	const { verifierRegionScope, verifierOrgScope } = await getCurrentVerifierScopeMetadata(ctx);

	const nextState = await getVerificationStageState(ctx);
	nextState[registryEntityId] = item.nextStage;
	await setVerificationStageState(ctx, nextState);

	const event = await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "verification.stage.advance",
			scope: "verification",
			actor,
			summary: `Advanced verification for ${item.code} to ${item.nextStage}`,
			metadata: {
				registryEntityId,
				code: item.code,
				from: item.verificationStage,
				to: item.nextStage,
				notes,
			},
		}),
	);
	const verificationEvent = await appendVerificationEvent(ctx, {
		id: `${toIsoNow()}:${registryEntityId}:${nextStage}`,
		registryEntityId,
		stage: nextStage,
		actor,
		inputLevel: item.inputLevel,
		verifierLevel,
		verifierRegionScope,
		verifierOrgScope,
		result: "approved",
		notes,
		createdAt: toIsoNow(),
	});

	return {
		success: true,
		item: {
			...item,
			verificationStage: nextStage,
			nextStage: getNextVerificationStage(nextStage),
			canAdvance: item.nextStage !== "active_verified",
		},
		items: await listVerificationItems(ctx),
		events: await listVerificationEvents(ctx),
		event,
		verificationEvent,
	};
};

const verificationRejectRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const registryEntityId = getString(routeCtx.input, "registryEntityId") ?? "";
	const actor = getString(routeCtx.input, "actor") ?? actorFromRoute(ctx);
	const verifierLevel = (getString(routeCtx.input, "verifierLevel") as VerificationUserLevel | undefined) ?? inferVerifierLevel(actor);
	const notes = getString(routeCtx.input, "notes") ?? "Returned to the previous verification level from the admin reference UI";
	const items = await listVerificationItems(ctx);
	const item = items.find((entry) => entry.registryEntityId === registryEntityId);

	if (!item) {
		return { success: false, error: { code: "NOT_FOUND", message: `Unknown verification entity ${registryEntityId}` } };
	}
	if (!verifierLevel) {
		return { success: false, error: { code: "INVALID_LEVEL", message: `Verification level is required for ${registryEntityId}` } };
	}
	const allowedVerifierLevels = getAllowedVerifierLevels(item.currentLevel);
	if (!allowedVerifierLevels.includes(verifierLevel)) {
		return {
			success: false,
			error: {
				code: "INVALID_LEVEL",
				message: `Verification for ${registryEntityId} must be handled by ${allowedVerifierLevels.join(", ")}`,
			},
		};
	}

	const targetStage = getRevisionTargetStage(item.verificationStage);
	const { verifierRegionScope, verifierOrgScope } = await getCurrentVerifierScopeMetadata(ctx);
	const nextState = await getVerificationStageState(ctx);
	nextState[registryEntityId] = targetStage;
	await setVerificationStageState(ctx, nextState);

	const event = await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "verification.stage.reject",
			scope: "verification",
			actor,
			summary: `Returned verification for ${item.code} to ${targetStage}`,
			metadata: {
				registryEntityId,
				code: item.code,
				from: item.verificationStage,
				to: targetStage,
				notes,
				verifierLevel,
			},
		}),
	);
	const verificationEvent = await appendVerificationEvent(ctx, {
		id: `${toIsoNow()}:${registryEntityId}:${targetStage}:needs-review`,
		registryEntityId,
		stage: targetStage,
		actor,
		inputLevel: item.inputLevel,
		verifierLevel,
		verifierRegionScope,
		verifierOrgScope,
		result: "needs_review",
		notes,
		createdAt: toIsoNow(),
	});

	const updatedItems = await listVerificationItems(ctx);
	const updatedItem = updatedItems.find((entry) => entry.registryEntityId === registryEntityId) ?? item;
	return {
		success: true,
		item: updatedItem,
		items: updatedItems,
		events: await listVerificationEvents(ctx),
		event,
		verificationEvent,
	};
};

const touchStateRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const note = getString(routeCtx.input, "note") ?? "manual-touch";
	const actor = actorFromRoute(ctx);
	await persistStateValue(ctx, "state:lastManualTouch", toIsoNow());
	const counter = await incrementCounter(ctx, "state:manualTouches");
	const event = await appendAuditEvent(
		ctx,
		createAuditRecord({
			kind: "state.touch",
			scope: "state",
			actor,
			summary: `Touched plugin state: ${note}`,
			metadata: { note, counter },
		}),
	);
	return { success: true, counter, event };
};

const accessPermissionsListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	return { items: await listPermissions(ctx) };
};

const accessPermissionsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	const slug = getString(routeCtx.input, "slug") ?? "";
	const label = getString(routeCtx.input, "label") ?? slug;
	const description = getString(routeCtx.input, "description") ?? "";
	const scope = getString(routeCtx.input, "scope") ?? "general";
	const permission = touchUpdatedAt<AccessPermission>({ slug, label, description, scope, updatedAt: "" });
	await ctx.storage.permissionCatalog!.put(slug, permission);
	const event = createAuditRecord({
		kind: "access.permission.save",
		scope: "access-rights",
		actor: actorFromRoute(ctx),
		summary: `Saved permission ${slug}`,
		metadata: { ...permission },
	});
	await appendAccessChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item: permission };
};

const accessRolesListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	return {
		roles: await listRoles(ctx),
		userAssignments: await listUserRoleAssignments(ctx),
	};
};

const accessRolesSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	const slug = getString(routeCtx.input, "slug") ?? "";
	const label = getString(routeCtx.input, "label") ?? slug;
	const description = getString(routeCtx.input, "description") ?? "";
	const role = touchUpdatedAt<AccessRole>({ slug, label, description, updatedAt: "" });
	await ctx.storage.roleCatalog!.put(slug, role);
	const event = createAuditRecord({
		kind: "access.role.save",
		scope: "access-rights",
		actor: actorFromRoute(ctx),
		summary: `Saved role ${slug}`,
		metadata: { ...role },
	});
	await appendAccessChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item: role };
};

const accessUserAssignmentsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	const userId = getString(routeCtx.input, "userId") ?? "";
	const roles = getStringArray(routeCtx.input, "roles");
	const assignment = touchUpdatedAt<UserRoleAssignment>({ userId, roles, updatedAt: "" });
	await ctx.storage.userRoleAssignments!.put(userId, assignment);
	await persistStateValue(ctx, "state:lastPreviewUserId", userId);
	const event = createAuditRecord({
		kind: "access.user-assignment.save",
		scope: "access-rights",
		actor: actorFromRoute(ctx),
		summary: `Saved user role assignment for ${userId}`,
		metadata: { ...assignment },
	});
	await appendAccessChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item: assignment };
};

const accessMatrixGetRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const access = await summarizeAccessRights(ctx);
	return {
		permissions: access.permissions,
		roles: access.roles,
		assignments: access.roleAssignments,
	};
};

const accessMatrixSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAccessCatalogSeeded(ctx);
	const roleSlug = getString(routeCtx.input, "roleSlug") ?? "";
	const permissions = getStringArray(routeCtx.input, "permissions");
	const assignment = touchUpdatedAt<RolePermissionAssignment>({ roleSlug, permissions, updatedAt: "" });
	await ctx.storage.rolePermissionAssignments!.put(roleSlug, assignment);
	const event = createAuditRecord({
		kind: "access.matrix.save",
		scope: "access-rights",
		actor: actorFromRoute(ctx),
		summary: `Saved role-permission matrix for ${roleSlug}`,
		metadata: { ...assignment },
	});
	await appendAccessChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item: assignment };
};

const accessPreviewRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const preview = await previewAccess(ctx, routeCtx.input);
	return preview;
};

const accessHealthRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const access = await summarizeAccessRights(ctx);
	return access.health;
};

const abacAttributesListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const abac = await summarizeAbac(ctx);
	return { items: abac.attributes };
};

const abacAttributesSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAbacCatalogSeeded(ctx);
	const key = getString(routeCtx.input, "key") ?? "";
	const label = getString(routeCtx.input, "label") ?? key;
	const targetType = (getString(routeCtx.input, "targetType") as AbacAttributeDefinition["targetType"] | undefined) ?? "context";
	const description = getString(routeCtx.input, "description") ?? "";
	const item = touchUpdatedAt<AbacAttributeDefinition>({ key, label, targetType, description, updatedAt: "" });
	await ctx.storage.abacAttributeCatalog!.put(key, item);
	const event = createAuditRecord({ kind: "abac.attribute.save", scope: "abac", actor: actorFromRoute(ctx), summary: `Saved ABAC attribute ${key}`, metadata: { ...item } });
	await appendAbacChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item };
};

const abacSubjectsListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const abac = await summarizeAbac(ctx);
	return { items: abac.subjects };
};

const abacSubjectsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAbacCatalogSeeded(ctx);
	const subjectId = getString(routeCtx.input, "subjectId") ?? "";
	const attributes = getStringRecord(routeCtx.input, "attributes");
	const item = touchUpdatedAt<AbacSubjectAssignment>({ subjectId, attributes, updatedAt: "" });
	await ctx.storage.abacSubjectAssignments!.put(subjectId, item);
	const event = createAuditRecord({ kind: "abac.subject.save", scope: "abac", actor: actorFromRoute(ctx), summary: `Saved ABAC subject assignment for ${subjectId}`, metadata: { ...item } });
	await appendAbacChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item };
};

const abacResourcesListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const abac = await summarizeAbac(ctx);
	return { items: abac.resources };
};

const abacResourcesSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAbacCatalogSeeded(ctx);
	const resourceId = getString(routeCtx.input, "resourceId") ?? "";
	const attributes = getStringRecord(routeCtx.input, "attributes");
	const item = touchUpdatedAt<AbacResourceAssignment>({ resourceId, attributes, updatedAt: "" });
	await ctx.storage.abacResourceAssignments!.put(resourceId, item);
	const event = createAuditRecord({ kind: "abac.resource.save", scope: "abac", actor: actorFromRoute(ctx), summary: `Saved ABAC resource assignment for ${resourceId}`, metadata: { ...item } });
	await appendAbacChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item };
};

const abacPoliciesListRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const abac = await summarizeAbac(ctx);
	return { items: abac.policies };
};

const abacPoliciesSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	await ensureAbacCatalogSeeded(ctx);
	const id = getString(routeCtx.input, "id") ?? "";
	const label = getString(routeCtx.input, "label") ?? id;
	const effect = (getString(routeCtx.input, "effect") as AbacPolicyRule["effect"] | undefined) ?? "allow";
	const actions = getStringArray(routeCtx.input, "actions");
	const requiredSubject = getStringRecord(routeCtx.input, "requiredSubject");
	const requiredResource = getStringRecord(routeCtx.input, "requiredResource");
	const requiredContext = getStringRecord(routeCtx.input, "requiredContext");
	const item = touchUpdatedAt<AbacPolicyRule>({ id, label, effect, actions, requiredSubject, requiredResource, requiredContext, updatedAt: "" });
	await ctx.storage.abacPolicyRules!.put(id, item);
	const event = createAuditRecord({ kind: "abac.policy.save", scope: "abac", actor: actorFromRoute(ctx), summary: `Saved ABAC policy ${id}`, metadata: { ...item } });
	await appendAbacChangeEvent(ctx, event);
	await appendAuditEvent(ctx, event);
	return { success: true, item };
};

const abacPreviewRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	return evaluateAbacDecision(ctx, routeCtx.input);
};

const abacEnforceDemoRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const decision = await evaluateAbacDecision(ctx, routeCtx.input);
	const contextAttributes = getStringRecord(routeCtx.input, "contextAttributes");
	const sensitive = (contextAttributes.action ?? getString(routeCtx.input, "action") ?? "").includes("sensitive");
	if (sensitive) {
		const event = createAuditRecord({ kind: "abac.decision.audit", scope: "abac", actor: actorFromRoute(ctx), summary: `Audited ABAC decision for sensitive action ${contextAttributes.action ?? getString(routeCtx.input, "action") ?? "unknown"}`, metadata: decision as unknown as Record<string, unknown> });
		await appendAbacChangeEvent(ctx, event);
		await appendAuditEvent(ctx, event);
	}
	return decision;
};

const abacHealthRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const abac = await summarizeAbac(ctx);
	return abac.health;
};

const regionsGetRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const regions = (await ctx.kv.get<unknown>("custom:regions")) ?? DEFAULT_REGION_TREE;
	return regions;
};

const regionsSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const input = routeCtx.input;
	await ctx.kv.set("custom:regions", input);
	const event = createAuditRecord({
		kind: "settings.regions.update",
		scope: "settings",
		actor: actorFromRoute(ctx),
		summary: "Updated official administrative regions list",
		metadata: { updatedCount: Array.isArray(input) ? input.length : 0 },
	});
	await appendAuditEvent(ctx, event);
	return { success: true, item: input };
};

const dataTypesGetRoute: SharedRouteHandler = async (_routeCtx, ctx) => {
	const dataTypes = (await ctx.kv.get<unknown>("custom:data-types")) ?? DEFAULT_DATA_TYPES;
	return dataTypes;
};

const dataTypesSaveRoute: SharedRouteHandler = async (routeCtx, ctx) => {
	const input = routeCtx.input;
	await ctx.kv.set("custom:data-types", input);
	const event = createAuditRecord({
		kind: "settings.data-types.update",
		scope: "settings",
		actor: actorFromRoute(ctx),
		summary: "Updated Sikesra data types and sub classifications",
		metadata: { updatedCount: Array.isArray(input) ? input.length : 0 },
	});
	await appendAuditEvent(ctx, event);
	return { success: true, item: input };
};

const sharedRouteEntries: Record<string, { public?: boolean; handler: SharedRouteHandler }> = {
	"public/status": { public: true, handler: publicStatusRoute },
	"registry/list": { handler: registryListRoute },
	"registry/save": { handler: registrySaveRoute },
	"documents/list": { handler: documentsListRoute },
	"documents/save": { handler: documentsSaveRoute },
	"import/promote": { handler: importPromoteRoute },
	"dashboard/summary": { handler: overviewSummaryRoute },
	"overview/summary": { handler: overviewSummaryRoute },
	"verification/list": { handler: verificationListRoute },
	"verification/advance": { handler: verificationAdvanceRoute },
	"verification/reject": { handler: verificationRejectRoute },
	"settings/get": { handler: settingsGetRoute },
	"settings/save": { handler: settingsSaveRoute },
	"regions/get": { handler: regionsGetRoute },
	"regions/save": { handler: regionsSaveRoute },
	"data-types/get": { handler: dataTypesGetRoute },
	"data-types/save": { handler: dataTypesSaveRoute },
	"audit/list": { handler: auditListRoute },
	"state/touch": { handler: touchStateRoute },
	"access/permissions/list": { handler: accessPermissionsListRoute },
	"access/permissions/save": { handler: accessPermissionsSaveRoute },
	"access/roles/list": { handler: accessRolesListRoute },
	"access/roles/save": { handler: accessRolesSaveRoute },
	"access/users/save": { handler: accessUserAssignmentsSaveRoute },
	"access/matrix/get": { handler: accessMatrixGetRoute },
	"access/matrix/save": { handler: accessMatrixSaveRoute },
	"access/preview": { handler: accessPreviewRoute },
	"access/health": { handler: accessHealthRoute },
	"abac/attributes/list": { handler: abacAttributesListRoute },
	"abac/attributes/save": { handler: abacAttributesSaveRoute },
	"abac/subjects/list": { handler: abacSubjectsListRoute },
	"abac/subjects/save": { handler: abacSubjectsSaveRoute },
	"abac/resources/list": { handler: abacResourcesListRoute },
	"abac/resources/save": { handler: abacResourcesSaveRoute },
	"abac/policies/list": { handler: abacPoliciesListRoute },
	"abac/policies/save": { handler: abacPoliciesSaveRoute },
	"abac/preview": { handler: abacPreviewRoute },
	"abac/enforce-demo": { handler: abacEnforceDemoRoute },
	"abac/health": { handler: abacHealthRoute },
};

export function createSandboxRoutes() {
	return sharedRouteEntries;
}

export function createNativeRoutes() {
	const routes: Record<string, NativePluginRoute> = {};
	for (const [path, entry] of Object.entries(sharedRouteEntries)) {
		routes[path] = {
			public: entry.public,
			handler: async (ctx) =>
				entry.handler({ input: ctx.input, request: toSandboxRequest(ctx.request), requestMeta: ctx.requestMeta }, ctx),
		};
	}
	return routes;
}

function toSandboxRequest(request: Request): SandboxedRequest {
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key] = value;
	});
	return {
		url: request.url,
		method: request.method,
		headers,
	};
}

const sharedHooks: SandboxedPlugin["hooks"] = {
	"plugin:install": async (_event, ctx) => {
		await ensureAccessCatalogSeeded(ctx);
		await ensureAbacCatalogSeeded(ctx);
		await persistStateValue(ctx, "state:lastLifecycle", "plugin:install");
		await incrementCounter(ctx, "state:lifecycleCount");
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "plugin.install",
				scope: "lifecycle",
				actor: "system",
				summary: "Installed the AWCMS-Micro example plugin",
				metadata: {},
			}),
		);
	},
	"plugin:activate": async (_event, ctx) => {
		await ensureAccessCatalogSeeded(ctx);
		await ensureAbacCatalogSeeded(ctx);
		await persistStateValue(ctx, "state:lastLifecycle", "plugin:activate");
		await incrementCounter(ctx, "state:lifecycleCount");
		if (ctx.cron) {
			await ctx.cron.schedule("governance-summary", { schedule: "0 * * * *" });
		}
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "plugin.activate",
				scope: "lifecycle",
				actor: "system",
				summary: "Activated the AWCMS-Micro example plugin",
				metadata: { cron: !!ctx.cron },
			}),
		);
	},
	"plugin:deactivate": async (_event, ctx) => {
		await persistStateValue(ctx, "state:lastLifecycle", "plugin:deactivate");
		await incrementCounter(ctx, "state:lifecycleCount");
		if (ctx.cron) {
			await ctx.cron.cancel("governance-summary").catch(() => {});
		}
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "plugin.deactivate",
				scope: "lifecycle",
				actor: "system",
				summary: "Deactivated the AWCMS-Micro example plugin",
				metadata: {},
			}),
		);
	},
	"plugin:uninstall": async (event, ctx) => {
		await persistStateValue(ctx, "state:lastLifecycle", "plugin:uninstall");
		await incrementCounter(ctx, "state:lifecycleCount");
		if (ctx.cron) {
			await ctx.cron.cancel("governance-summary").catch(() => {});
		}
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "plugin.uninstall",
				scope: "lifecycle",
				actor: "system",
				summary: "Uninstalled the AWCMS-Micro example plugin",
				metadata: { deleteData: event.deleteData },
			}),
		);
	},
	"content:beforeSave": async (event, ctx) => {
		await writeSnapshot(ctx, event.collection, event.content);
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: event.isNew ? "content.prepare-create" : "content.prepare-update",
				scope: "content",
				actor: actorFromContent(event.content),
				summary: `Prepared ${event.collection} content for save`,
				metadata: {
					collection: event.collection,
					isNew: event.isNew,
					slug: typeof event.content.slug === "string" ? event.content.slug : null,
				},
			}),
		);
		return event.content;
	},
	"content:afterSave": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: event.isNew ? "content.created" : "content.saved",
				scope: "content",
				actor: actorFromContent(event.content),
				summary: `Saved ${event.collection} content`,
				metadata: { collection: event.collection, isNew: event.isNew },
			}),
		);
	},
	"content:beforeDelete": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "content.prepare-delete",
				scope: "content",
				actor: "system",
				summary: `Prepared ${event.collection}/${event.id} for delete`,
				metadata: { collection: event.collection, id: event.id, permanent: event.permanent },
			}),
		);
		return true;
	},
	"content:afterDelete": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "content.deleted",
				scope: "content",
				actor: "system",
				summary: `Deleted ${event.collection}/${event.id}`,
				metadata: { collection: event.collection, id: event.id, permanent: event.permanent },
			}),
		);
	},
	"content:afterPublish": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "content.published",
				scope: "content",
				actor: actorFromContent(event.content),
				summary: `Published ${event.collection} content`,
				metadata: { collection: event.collection },
			}),
		);
	},
	"content:afterUnpublish": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "content.unpublished",
				scope: "content",
				actor: actorFromContent(event.content),
				summary: `Unpublished ${event.collection} content`,
				metadata: { collection: event.collection },
			}),
		);
	},
	"media:beforeUpload": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "media.prepare-upload",
				scope: "media",
				actor: "system",
				summary: `Prepared media upload for ${event.file.name}`,
				metadata: event.file,
			}),
		);
		return event.file;
	},
	"media:afterUpload": async (event, ctx) => {
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "media.uploaded",
				scope: "media",
				actor: "system",
				summary: `Uploaded media ${event.media.id}`,
				metadata: { id: event.media.id, mimeType: event.media.mimeType },
			}),
		);
	},
	cron: async (event, ctx) => {
		if (event.name !== "governance-summary") return;
		await persistStateValue(ctx, "state:lastCronAt", toIsoNow());
		const settings = await getSettings(ctx);
		await appendAuditEvent(
			ctx,
			createAuditRecord({
				kind: "cron.summary",
				scope: "cron",
				actor: "system",
				summary: "Ran governance summary cron",
				metadata: { retentionDays: settings.auditRetentionDays },
			}),
		);
	},
	"page:metadata": async (event, ctx) => {
		const settings = await getSettings(ctx);
		const href = settings.metadataCanonicalBase || event.page.canonical || event.page.url;
		return [
			{ kind: "meta" as const, name: "awcms-micro:governance-mode", content: settings.governanceMode },
			{ kind: "link" as const, rel: "canonical" as const, href, key: "awcms-micro-canonical" },
		];
	},
};

export function createSharedHooks() {
	return sharedHooks;
}
