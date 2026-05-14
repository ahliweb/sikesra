export const SIKESRA_PLUGIN_ID = "sikesra";
export const SIKESRA_PUBLIC_ROUTE = "/sikesra";
export const SIKESRA_API_BASE = "/_emdash/api/plugins/sikesra";
export const SIKESRA_ADMIN_BASE = "/_emdash/admin/plugins/sikesra";
export const SIKESRA_ROUTE_NAMES = [
	"admin",
	"public/metadata",
	"public/filters",
	"public/summary",
	"v1/status",
	"v1/security/manifest",
] as const;

export interface SikesraPublicMetadata {
	enabled: boolean;
	title: string;
	description: string;
	dataScopeNote: string;
	latestUpdateAt: string | null;
	officialContact: string;
}

export interface SikesraPublicFilters {
	districts: Array<{ code: string; name: string }>;
	villages: Array<{ code: string; districtCode: string; name: string }>;
	objectTypes: Array<{ code: string; name: string }>;
	years: number[];
	statuses: Array<{ code: string; label: string }>;
}

export interface SikesraPublicSummary {
	kpis: {
		totalEntities: number;
		verifiedEntities: number;
		activeVillages: number;
		latestUpdateAt: string | null;
	};
	suppression: {
		threshold: number;
		suppressedCells: number;
	};
	charts: {
		byObjectType: Array<{ label: string; total: number; suppressed?: boolean }>;
		byRegion: Array<{ label: string; total: number; suppressed?: boolean }>;
		byVerificationStatus: Array<{
			key: string;
			label: string;
			total: number;
			suppressed?: boolean;
		}>;
		bySafeAttribute: Array<{ label: string; total: number; suppressed?: boolean }>;
	};
	caveat: string;
}

export interface AdminInteraction {
	type?: string;
	page?: string;
	action_id?: string;
}

export function buildPublicMetadata(): SikesraPublicMetadata {
	return {
		enabled: true,
		title: "SIKESRA",
		description: "Aggregate-safe SIKESRA overlay shell on top of EmDash.",
		dataScopeNote:
			"The shell routes are restored. Data restoration, ABAC, and operational workflows remain isolated follow-up work.",
		latestUpdateAt: null,
		officialContact: "",
	};
}

export function buildPublicFilters(): SikesraPublicFilters {
	return {
		districts: [],
		villages: [],
		objectTypes: [],
		years: [],
		statuses: [],
	};
}

export function buildPublicSummary(): SikesraPublicSummary {
	return {
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
		charts: {
			byObjectType: [],
			byRegion: [],
			byVerificationStatus: [],
			bySafeAttribute: [],
		},
		caveat:
			"This public surface is aggregate-safe only. Sensitive person-level data remains unavailable until the restored overlay is fully rebuilt.",
	};
}

export function buildAdminBlocks(page = "/") {
	const title = page === "/operations" ? "SIKESRA Operations" : "SIKESRA";
	const description =
		page === "/operations"
			? "Operational workflows will be restored as isolated follow-up routes."
			: "Plugin shell restored through supported EmDash admin and plugin route boundaries.";

	return {
		blocks: [
			{ type: "header", text: title },
			{ type: "section", text: description },
			{
				type: "fields",
				fields: [
					{ label: "Public route", value: SIKESRA_PUBLIC_ROUTE },
					{ label: "Admin route", value: `${SIKESRA_ADMIN_BASE}${page}` },
					{ label: "API base", value: SIKESRA_API_BASE },
				],
			},
			{
				type: "banner",
				variant: "info",
				title: "Restoration in progress",
				description:
					"The shell, admin page mount, and public-safe namespaces are back. Domain data, policies, and workflow handlers are tracked in follow-up issues.",
			},
		],
	};
}

export function buildAdminWidget() {
	return {
		blocks: [
			{ type: "header", text: "SIKESRA" },
			{ type: "context", text: "Shell restored" },
			{ type: "context", text: `${SIKESRA_API_BASE}/public/*` },
		],
	};
}

export function getAdminPageTarget(interaction: AdminInteraction | undefined): string {
	if (interaction?.page === "widget:overview") return "widget:overview";
	if (interaction?.page === "/operations") return "/operations";
	return "/";
}
