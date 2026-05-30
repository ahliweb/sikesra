import type { PluginDescriptor, ResolvedPlugin } from "emdash";

import { version } from "../package.json";
import {
	AWCMS_GALLERY_TRANSLATIONS,
	translateGallery,
	type GalleryTranslationKey,
} from "./i18n.js";
import {
	AWCMS_GALLERY_COLLECTION,
	DEFAULT_MAX_IMAGE_BYTES,
	DEFAULT_MAX_VIDEO_BYTES,
	AWCMS_GALLERY_STORAGE_COLLECTION,
	sanitizeGallerySettings,
	validateGalleryContent,
	validateGalleryItem,
} from "./validation.js";

export interface AwcmsMicroGalleryPluginOptions {
	maxImageBytes?: number;
	maxVideoBytes?: number;
	cloudflareImages?: boolean;
	cloudflareStream?: boolean;
}

interface AdminState {
	view: "list" | "create" | "edit";
	id?: string;
	search?: string;
	cursor?: string;
	mediaCursor?: string;
}

interface MediaListItem {
	id: string;
	name: string;
}

const NON_ALNUM_RE = /[^a-z0-9]+/g;
const EDGE_DASH_RE = /(^-|-$)/g;

export const AWCMS_GALLERY_PLUGIN_ID = "awcms-micro-gallery";

export const AWCMS_GALLERY_CAPABILITIES = [
	"content:read",
	"content:write",
	"media:read",
	"media:write",
	"network:request:unrestricted",
] as const;

export const AWCMS_GALLERY_NAVIGATION = {
	groups: [
		{
			id: "gallery-group",
			labelKey: "gallery.group",
			fallbackLabel: "Gallery",
			icon: "image",
			sortOrder: 10,
			sidebarPlacement: "after-dashboard",
			sidebarPriority: 10,
			items: [
				{
					id: "gallery-home",
					labelKey: "gallery.label",
					fallbackLabel: "Gallery",
					path: "/",
					icon: "image",
					sortOrder: 10,
				},
			],
		},
	],
} as const;

export const AWCMS_GALLERY_ADMIN_PAGES = [
	{ path: "/", label: "Gallery", labelKey: "gallery.label", icon: "image" },
];

export const AWCMS_GALLERY_SETTINGS_SCHEMA = {
	maxImageBytes: {
		type: "number" as const,
		label: "Maximum image bytes",
		labelKey: "gallery.max_img",
		description: "Images larger than this are rejected by gallery validation routes and hooks.",
		descriptionKey: "gallery.max_img_desc",
		default: DEFAULT_MAX_IMAGE_BYTES,
		min: 1,
	},
	maxVideoBytes: {
		type: "number" as const,
		label: "Maximum video bytes",
		labelKey: "gallery.max_vid",
		description: "Videos larger than this are rejected by gallery validation routes and hooks.",
		descriptionKey: "gallery.max_vid_desc",
		default: DEFAULT_MAX_VIDEO_BYTES,
		min: 1,
	},
	cloudflareImagesEnabled: {
		type: "boolean" as const,
		label: "Cloudflare Images enabled",
		labelKey: "gallery.cf_images_enable",
		description: "Enable Cloudflare Images support for gallery media workflows.",
		descriptionKey: "gallery.cf_images_enable_desc",
		default: false,
	},
	cloudflareStreamEnabled: {
		type: "boolean" as const,
		label: "Cloudflare Stream enabled",
		labelKey: "gallery.cf_stream_enable",
		description: "Enable Cloudflare Stream support for gallery media workflows.",
		descriptionKey: "gallery.cf_stream_enable_desc",
		default: false,
	},
};

export function awcmsMicroGalleryPlugin(
	options: AwcmsMicroGalleryPluginOptions = {},
): PluginDescriptor<AwcmsMicroGalleryPluginOptions> {
	return {
		id: AWCMS_GALLERY_PLUGIN_ID,
		version,
		entrypoint: "@awcms-micro/plugin-gallery/sandbox",
		options,
		format: "standard",
		capabilities: [...AWCMS_GALLERY_CAPABILITIES],
		allowedHosts: [],
		adminPages: AWCMS_GALLERY_ADMIN_PAGES,
		// @ts-expect-error Downstream navigation metadata is used by AWCMS-Micro admin integrations even though current EmDash descriptor types do not declare it.
		navigation: AWCMS_GALLERY_NAVIGATION,
		i18n: {
			defaultLocale: "en",
			supportedLocales: ["en", "id"],
			messages: AWCMS_GALLERY_TRANSLATIONS,
		},
	};
}

function settingsFromOptions(options: AwcmsMicroGalleryPluginOptions) {
	return sanitizeGallerySettings({
		maxImageBytes: options.maxImageBytes,
		maxVideoBytes: options.maxVideoBytes,
		cloudflareImagesEnabled: options.cloudflareImages === true,
		cloudflareStreamEnabled: options.cloudflareStream === true,
	});
}

async function readSettings(ctx: any, options: AwcmsMicroGalleryPluginOptions) {
	const defaults = settingsFromOptions(options);
	const saved = (await ctx.kv.get("settings")) as Record<string, unknown> | null;
	return sanitizeGallerySettings({ ...defaults, ...saved });
}

async function writeAudit(
	ctx: any,
	kind: string,
	summary: string,
	metadata: Record<string, unknown>,
) {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const db = (ctx as { db?: unknown }).db as any;
	if (!db) return;

	await ensureGalleryAuditTable(db);
	const timestamp = new Date().toISOString();
	await db
		.insertInto(AWCMS_GALLERY_STORAGE_COLLECTION)
		.values({
			id,
			timestamp,
			kind,
			summary,
			metadata: JSON.stringify(metadata),
			content_id: typeof metadata.contentId === "string" ? metadata.contentId : null,
			created_at: timestamp,
			updated_at: timestamp,
		})
		.execute();
}

async function ensureGalleryAuditTable(db: any) {
	await db.schema
		.createTable(AWCMS_GALLERY_STORAGE_COLLECTION)
		.ifNotExists()
		.addColumn("id", "text", (column: any) => column.primaryKey())
		.addColumn("timestamp", "text", (column: any) => column.notNull())
		.addColumn("kind", "text", (column: any) => column.notNull())
		.addColumn("summary", "text", (column: any) => column.notNull())
		.addColumn("metadata", "text", (column: any) => column.notNull())
		.addColumn("content_id", "text")
		.addColumn("created_at", "text", (column: any) => column.notNull())
		.addColumn("updated_at", "text", (column: any) => column.notNull())
		.execute();
}

interface PluginStorageRow {
	id: string;
	data: string;
	created_at?: string | null;
	updated_at?: string | null;
}

interface GalleryAuditTableRow {
	id: string;
	timestamp: string;
	kind: string;
	summary: string;
	metadata: string;
	created_at?: string | null;
	updated_at?: string | null;
}

const AWCMS_GALLERY_LEGACY_STORAGE_COLLECTIONS = [
	{ from: "auditEvents", to: AWCMS_GALLERY_STORAGE_COLLECTION },
	{ from: "gallery_audit_events", to: AWCMS_GALLERY_STORAGE_COLLECTION },
] as const;

function toTimestamp(value: string | null | undefined): number {
	if (!value) return -1;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? -1 : parsed;
}

function isLegacyRowNewer(
	legacy: PluginStorageRow,
	current: { created_at?: string | null; updated_at?: string | null } | undefined,
): boolean {
	if (!current) return true;
	const legacyUpdated = toTimestamp(legacy.updated_at ?? legacy.created_at ?? null);
	const currentUpdated = toTimestamp(current.updated_at ?? current.created_at ?? null);
	return legacyUpdated > currentUpdated;
}

async function migrateLegacyStorageCollections(ctx: any) {
	const db = (ctx as { db?: unknown }).db as any;
	if (!db) return;

	await ensureGalleryAuditTable(db);

	let migratedRows = 0;
	for (const { from, to } of AWCMS_GALLERY_LEGACY_STORAGE_COLLECTIONS) {
		const legacyRows = (await db
			.selectFrom("_plugin_storage")
			.select(["id", "data", "created_at", "updated_at"])
			.where("plugin_id", "=", AWCMS_GALLERY_PLUGIN_ID)
			.where("collection", "=", from)
			.execute()) as PluginStorageRow[];

		if (legacyRows.length === 0) continue;

		const currentRows = (await db
			.selectFrom(to)
			.select(["id", "timestamp", "kind", "summary", "metadata", "created_at", "updated_at"])
			.execute()) as GalleryAuditTableRow[];
		const currentById = new Map(currentRows.map((row) => [row.id, row]));

		for (const row of legacyRows) {
			if (!isLegacyRowNewer(row, currentById.get(row.id))) continue;
			const parsed = JSON.parse(row.data) as {
				timestamp?: string;
				kind?: string;
				summary?: string;
				metadata?: Record<string, unknown>;
			};
			await db
				.insertInto(to)
				.values({
					id: row.id,
					timestamp:
						parsed.timestamp ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
					kind: parsed.kind ?? "gallery.legacy",
					summary: parsed.summary ?? "Migrated gallery audit row",
					metadata: JSON.stringify(parsed.metadata ?? {}),
					created_at: row.created_at ?? row.updated_at ?? new Date().toISOString(),
					updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
				})
				.onConflict((oc: any) =>
					oc.columns(["id"]).doUpdateSet({
						timestamp:
							parsed.timestamp ?? row.updated_at ?? row.created_at ?? new Date().toISOString(),
						kind: parsed.kind ?? "gallery.legacy",
						summary: parsed.summary ?? "Migrated gallery audit row",
						metadata: JSON.stringify(parsed.metadata ?? {}),
						updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
					}),
				)
				.execute();
			migratedRows += 1;
		}

		await db
			.deleteFrom("_plugin_storage")
			.where("plugin_id", "=", AWCMS_GALLERY_PLUGIN_ID)
			.where("collection", "=", from)
			.execute();
	}

	if (migratedRows > 0) {
		ctx.log.info(`[${AWCMS_GALLERY_PLUGIN_ID}] migrated legacy storage collections`, {
			migratedRows,
		});
	}
}

function asString(value: unknown, fallback = "") {
	return typeof value === "string" ? value : fallback;
}

function asMediaListItem(item: any): MediaListItem {
	return {
		id: item.url,
		name: `${asString(item.filename, item.id)}${item.mimeType ? ` · ${item.mimeType}` : ""}`,
	};
}

function getGalleryItemsCount(entry: any): number {
	return Array.isArray(entry?.gallery_items) ? entry.gallery_items.length : 0;
}

async function loadMediaItems(ctx: any, cursor?: string) {
	if (!ctx.media?.list)
		return { items: [] as any[], cursor: undefined as string | undefined, hasMore: false };
	try {
		return await ctx.media.list({ limit: 10, cursor });
	} catch {
		return { items: [] as any[], cursor: undefined as string | undefined, hasMore: false };
	}
}

async function loadGalleryItems(ctx: any, cursor?: string) {
	if (!ctx.content?.list)
		return { items: [] as any[], cursor: undefined as string | undefined, hasMore: false };
	try {
		return await ctx.content.list(AWCMS_GALLERY_COLLECTION, { limit: 10, cursor });
	} catch {
		return { items: [] as any[], cursor: undefined as string | undefined, hasMore: false };
	}
}

function buildAdminErrorBlocks(
	locale: string,
	messageKey: GalleryTranslationKey = "gallery.no_entries",
) {
	const t = (key: GalleryTranslationKey) => translateGallery(key, locale);
	return {
		blocks: [
			{ type: "header", text: t("gallery.title") },
			{ type: "context", text: t(messageKey) },
			{ type: "divider" },
			{ type: "empty", title: t("gallery.title"), description: t("gallery.desc") },
		],
	};
}

async function importMediaFromUrl(ctx: any, sourceUrl: string, filename: string) {
	if (!ctx.http?.fetch || !ctx.media?.upload) {
		throw new Error("Media import is not available");
	}
	if (!sourceUrl.startsWith("https://")) {
		throw new Error("Source URL must use HTTPS");
	}
	const safeFilename = filename.split("/").pop() ?? filename;
	const response = await ctx.http.fetch(sourceUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch source media (${response.status})`);
	}
	const contentType = response.headers.get("content-type") || "application/octet-stream";
	if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
		throw new Error("Imported media must be an image or video");
	}
	const bytes = await response.arrayBuffer();
	return ctx.media.upload(safeFilename, contentType, bytes);
}

function slugify(text: string): string {
	return text.toLowerCase().replace(NON_ALNUM_RE, "-").replace(EDGE_DASH_RE, "");
}

async function buildAdminBlocks(
	ctx: any,
	settings: ReturnType<typeof sanitizeGallerySettings>,
	locale: string,
	state: AdminState,
	toastMessage?: string,
) {
	const t = (key: GalleryTranslationKey) => translateGallery(key, locale);

	if (state.view === "create" || state.view === "edit") {
		let entry: any = null;
		if (state.view === "edit" && state.id && ctx.content) {
			try {
				const result = await ctx.content.get(AWCMS_GALLERY_COLLECTION, state.id);
				if (result) {
					entry = result.data;
				}
			} catch {
				// Handle gracefully
			}
		}

		return {
			blocks: [
				{ type: "header", text: state.view === "create" ? t("gallery.create") : t("gallery.edit") },
				{
					type: "actions",
					elements: [
						{ type: "button", label: t("gallery.back"), action_id: "nav_list", style: "secondary" },
					],
				},
				{ type: "divider" },
				{
					type: "form",
					block_id: "gallery-entry-form",
					fields: [
						{
							type: "text_input",
							action_id: "title",
							label: t("gallery.title_label"),
							initial_value: entry?.title || "",
						},
						{
							type: "text_input",
							action_id: "description",
							label: t("gallery.description_label"),
							initial_value: entry?.description || "",
							multiline: true,
						},
						{
							type: "select",
							action_id: "gallery_type",
							label: t("gallery.type_label"),
							options: [
								{ label: "Photo", value: "photo" },
								{ label: "Video", value: "video" },
								{ label: "Mixed", value: "mixed" },
							],
							initial_value: entry?.gallery_type || "photo",
						},
						{
							type: "select",
							action_id: "layout_variant",
							label: t("gallery.layout_label"),
							options: [
								{ label: "Grid", value: "grid" },
								{ label: "Masonry", value: "masonry" },
								{ label: "Carousel", value: "carousel" },
								{ label: "Slider", value: "slider" },
							],
							initial_value: entry?.layout_variant || "grid",
						},
						{
							type: "date_input",
							action_id: "event_date",
							label: t("gallery.event_date_label"),
							initial_value: entry?.event_date
								? new Date(entry.event_date).toISOString().split("T")[0]
								: "",
						},
						{
							type: "text_input",
							action_id: "location",
							label: t("gallery.location_label"),
							initial_value: entry?.location || "",
						},
						{
							type: "select",
							action_id: "cover_image_src",
							label: t("gallery.cover_image_label"),
							options: [],
							optionsRoute: "media/list",
							initial_value:
								typeof entry?.cover_image === "string"
									? entry.cover_image
									: entry?.cover_image?.src || "",
						},
						{
							type: "toggle",
							action_id: "featured",
							label: t("gallery.featured_label"),
							initial_value: entry?.featured === true,
						},
						{
							type: "repeater",
							action_id: "gallery_items",
							label: t("gallery.items_label"),
							item_label: "Item",
							initial_value: entry?.gallery_items || [],
							fields: [
								{
									type: "select",
									action_id: "type",
									label: t("gallery.item_type"),
									options: [
										{ label: "Image", value: "image" },
										{ label: "Video", value: "video" },
									],
								},
								{
									type: "select",
									action_id: "src",
									label: t("gallery.item_src"),
									options: [],
									optionsRoute: "media/list",
								},
								{
									type: "text_input",
									action_id: "alt",
									label: t("gallery.item_alt"),
								},
								{
									type: "text_input",
									action_id: "caption",
									label: t("gallery.item_caption"),
								},
							],
						},
					],
					submit: { label: t("gallery.save_gallery"), action_id: "save_gallery" },
				},
			],
		};
	}

	// Default Tab: List & Settings
	const [galleryResult, mediaResult] = await Promise.all([
		loadGalleryItems(ctx, state.cursor),
		loadMediaItems(ctx, state.mediaCursor),
	]);

	const galleriesList = state.search
		? galleryResult.items.filter((g: any) => {
				const title = asString(g.data?.title).toLowerCase();
				const desc = asString(g.data?.description).toLowerCase();
				const loc = asString(g.data?.location).toLowerCase();
				const query = state.search!.toLowerCase();
				return title.includes(query) || desc.includes(query) || loc.includes(query);
			})
		: galleryResult.items;

	const galleryRows = galleriesList.map((g: any) => ({
		title: asString(g.data?.title, g.id),
		description: asString(g.data?.description),
		location: asString(g.data?.location, "-"),
		date: g.data?.event_date
			? new Date(g.data.event_date).toLocaleDateString(locale, { dateStyle: "medium" })
			: "-",
		type: asString(g.data?.gallery_type, "mixed"),
		items: getGalleryItemsCount(g),
		id: g.id,
	}));

	const mediaRows = mediaResult.items.map((item: any) => ({
		name: asString(item.filename, item.id),
		type: asString(item.mimeType, "-"),
		url: asString(item.url, "-"),
		created: asString(item.createdAt, "-"),
	}));

	// Build Tab 1: Galleries list
	const listBlocks: any[] = [
		{
			type: "form",
			block_id: "search-form",
			fields: [
				{
					type: "text_input",
					action_id: "search_query",
					label: t("gallery.search_label"),
					initial_value: state.search || "",
					placeholder: t("gallery.search_placeholder"),
				},
			],
			submit: { label: t("gallery.search"), action_id: "search_galleries" },
		},
		{
			type: "actions",
			elements: [
				{ type: "button", label: t("gallery.create"), action_id: "nav_create", style: "primary" },
			],
		},
		{ type: "divider" },
	];

	if (galleryRows.length === 0) {
		listBlocks.push({ type: "context", text: t("gallery.no_entries") });
	} else {
		listBlocks.push({
			type: "table",
			block_id: "gallery-table",
			columns: [
				{ key: "title", label: t("gallery.title_label"), format: "text" },
				{ key: "location", label: t("gallery.location_label"), format: "text" },
				{ key: "date", label: t("gallery.event_date_label"), format: "text" },
				{ key: "type", label: t("gallery.type_label"), format: "badge" },
				{ key: "items", label: t("gallery.items_label"), format: "number" },
			],
			rows: galleryRows.map(
				(row: {
					title: string;
					location: string;
					date: string;
					type: string;
					items: number;
					id: string;
				}) => ({
					title: row.title,
					location: row.location,
					date: row.date,
					type: row.type,
					items: row.items,
					actions: row.id,
				}),
			),
			page_action_id: "load-galleries-page",
			next_cursor: galleryResult.cursor,
			empty_text: t("gallery.no_entries"),
		});
	}

	// Build Tab 2: Settings
	const settingsBlocks: any[] = [
		{
			type: "stats",
			items: [
				{
					label: t("gallery.images"),
					value: `${Math.round(settings.maxImageBytes / 1024 / 1024)} MB`,
				},
				{
					label: t("gallery.videos"),
					value: `${Math.round(settings.maxVideoBytes / 1024 / 1024)} MB`,
				},
				{
					label: t("gallery.cf_images"),
					value: settings.cloudflareImagesEnabled
						? t("gallery.value.enabled")
						: t("gallery.value.optional"),
				},
				{
					label: t("gallery.cf_stream"),
					value: settings.cloudflareStreamEnabled
						? t("gallery.value.enabled")
						: t("gallery.value.optional"),
				},
			],
		},
		{
			type: "form",
			block_id: "gallery-settings",
			fields: [
				{
					type: "number_input",
					action_id: "maxImageBytes",
					label: t("gallery.max_img"),
					initial_value: settings.maxImageBytes,
					min: 1,
				},
				{
					type: "number_input",
					action_id: "maxVideoBytes",
					label: t("gallery.max_vid"),
					initial_value: settings.maxVideoBytes,
					min: 1,
				},
				{
					type: "toggle",
					action_id: "cloudflareImagesEnabled",
					label: t("gallery.cf_images_enable"),
					initial_value: settings.cloudflareImagesEnabled,
				},
				{
					type: "toggle",
					action_id: "cloudflareStreamEnabled",
					label: t("gallery.cf_stream_enable"),
					initial_value: settings.cloudflareStreamEnabled,
				},
			],
			submit: { label: t("gallery.save"), action_id: "save_settings" },
		},
	];

	const res: any = {
		blocks: [
			{ type: "header", text: t("gallery.title") },
			{ type: "section", text: t("gallery.desc") },
			{
				type: "tab",
				panels: [
					{ label: t("gallery.label"), blocks: listBlocks },
					{ label: t("gallery.settings"), blocks: settingsBlocks },
					{
						label: t("gallery.media"),
						blocks: [
							{ type: "header", text: t("gallery.media_title") },
							{ type: "context", text: t("gallery.media_desc") },
							{
								type: "form",
								block_id: "gallery-media-import",
								fields: [
									{
										type: "text_input",
										action_id: "source_url",
										label: t("gallery.media_source"),
										placeholder: "https://...",
									},
									{
										type: "text_input",
										action_id: "filename",
										label: t("gallery.media_filename"),
										placeholder: "photo.jpg",
									},
								],
								submit: { label: t("gallery.media_import"), action_id: "import_media" },
							},
							{ type: "divider" },
							{
								type: "table",
								block_id: "gallery-media-table",
								columns: [
									{ key: "name", label: t("gallery.item_caption"), format: "text" },
									{ key: "type", label: t("gallery.item_type"), format: "code" },
									{ key: "url", label: t("gallery.media_url"), format: "code" },
									{ key: "created", label: "Created", format: "relative_time" },
								],
								rows: mediaRows,
								page_action_id: "load-media-page",
								next_cursor: mediaResult.cursor,
								empty_text: t("gallery.no_entries"),
							},
						],
					},
				],
			},
		],
	};

	if (toastMessage) {
		res.toast = { message: toastMessage, type: "success" };
	}

	return res;
}

export function createPlugin(options: AwcmsMicroGalleryPluginOptions = {}): ResolvedPlugin {
	return {
		id: AWCMS_GALLERY_PLUGIN_ID,
		version,
		capabilities: [...AWCMS_GALLERY_CAPABILITIES],
		allowedHosts: [],
		hooks: {
			"plugin:activate": {
				handler: async (_event: any, ctx: any) => {
					if ((ctx as { db?: unknown }).db) {
						await ensureGalleryAuditTable((ctx as { db?: unknown }).db as any);
					}
					await migrateLegacyStorageCollections(ctx);
				},
			},
			"content:beforeSave": {
				handler: async (event: any, ctx: any) => {
					if (event.collection !== AWCMS_GALLERY_COLLECTION) return event.content;
					const settings = await readSettings(ctx, options);
					const result = validateGalleryContent(event.content, settings);
					await writeAudit(
						ctx,
						result.valid ? "gallery.validation.ok" : "gallery.validation.reject",
						"Validated gallery content before save",
						{
							contentId: event.content?.id,
							errors: result.errors,
						},
					);
					if (!result.valid) {
						throw new Error(`Invalid gallery content: ${result.errors.join("; ")}`);
					}
					return event.content;
				},
			},
		},
		routes: {
			admin: {
				handler: async (ctx: any) => {
					const interaction = ctx.input as {
						type?: string;
						page?: string;
						action_id?: string;
						value?: string;
						values?: Record<string, unknown>;
					};
					const locale = ctx.request?.headers?.["accept-language"] || "en";
					try {
						const settings = await readSettings(ctx, options);

						let state = (await ctx.kv.get("admin:state")) as AdminState | null;
						if (!state || (interaction.type === "page_load" && interaction.page === "/")) {
							state = { view: "list", search: "", cursor: undefined, mediaCursor: undefined };
							await ctx.kv.set("admin:state", state);
						}

						let toastMessage: string | undefined;

						if (interaction.type === "block_action") {
							if (interaction.action_id === "nav_create") {
								state = {
									view: "create",
									search: state.search,
									cursor: state.cursor,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							} else if (interaction.action_id === "nav_edit") {
								state = {
									view: "edit",
									id: interaction.value,
									search: state.search,
									cursor: state.cursor,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							} else if (interaction.action_id === "nav_list") {
								state = {
									view: "list",
									search: state.search,
									cursor: state.cursor,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							} else if (interaction.action_id === "load-galleries-page") {
								state = {
									view: state.view,
									id: state.id,
									search: state.search,
									cursor: interaction.value,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							} else if (interaction.action_id === "load-media-page") {
								state = {
									view: state.view,
									id: state.id,
									search: state.search,
									cursor: state.cursor,
									mediaCursor: interaction.value,
								};
								await ctx.kv.set("admin:state", state);
							} else if (
								interaction.action_id === "delete_gallery" &&
								interaction.value &&
								ctx.content
							) {
								try {
									await ctx.content.delete(AWCMS_GALLERY_COLLECTION, interaction.value);
									await writeAudit(
										ctx,
										"gallery.entry.delete",
										`Deleted gallery ${interaction.value}`,
										{ id: interaction.value },
									);
									toastMessage = translateGallery("gallery.deleted_entry", locale);
								} catch (error: any) {
									ctx.log.error(`Delete gallery error: ${error.message}`);
								}
								state = {
									view: "list",
									search: state.search,
									cursor: state.cursor,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							}
						} else if (interaction.type === "form_submit") {
							if (interaction.action_id === "save_settings") {
								const newSettings = sanitizeGallerySettings(interaction.values ?? {});
								await ctx.kv.set("settings", newSettings);
								await writeAudit(ctx, "gallery.settings.update", "Updated gallery settings", {
									settings: newSettings,
								});
								toastMessage = translateGallery("gallery.saved", locale);
								return buildAdminBlocks(ctx, newSettings, locale, state, toastMessage);
							} else if (interaction.action_id === "search_galleries") {
								const searchVal =
									typeof interaction.values?.search_query === "string"
										? interaction.values.search_query.trim()
										: "";
								state = {
									view: "list",
									search: searchVal,
									cursor: undefined,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							} else if (interaction.action_id === "import_media") {
								const values = interaction.values || {};
								const sourceUrl =
									typeof values.source_url === "string" ? values.source_url.trim() : "";
								const filename = typeof values.filename === "string" ? values.filename.trim() : "";
								if (sourceUrl && filename) {
									try {
										const uploaded = await importMediaFromUrl(ctx, sourceUrl, filename);
										await writeAudit(ctx, "gallery.media.import", `Imported media ${filename}`, {
											sourceUrl,
											filename,
											mediaId: uploaded.mediaId,
										});
										toastMessage = translateGallery("gallery.saved_entry", locale);
									} catch (error: any) {
										ctx.log.error(`Import media error: ${error.message}`);
									}
								}
							} else if (interaction.action_id === "save_gallery" && ctx.content) {
								const values = interaction.values || {};
								const title = typeof values.title === "string" ? values.title : "Untitled Gallery";
								const description =
									typeof values.description === "string" ? values.description : "";
								const gallery_type =
									typeof values.gallery_type === "string" ? values.gallery_type : "photo";
								const layout_variant =
									typeof values.layout_variant === "string" ? values.layout_variant : "grid";
								const event_date =
									typeof values.event_date === "string" && values.event_date
										? new Date(values.event_date).toISOString()
										: null;
								const location = typeof values.location === "string" ? values.location : "";
								const featured = values.featured === true;
								const cover_image_src = asString(values.cover_image_src);
								const gallery_items = Array.isArray(values.gallery_items)
									? values.gallery_items
									: [];

								const galleryData = {
									title,
									description,
									gallery_type,
									layout_variant,
									event_date,
									location,
									featured,
									cover_image: cover_image_src ? { src: cover_image_src, alt: title } : null,
									gallery_items,
								};

								try {
									if (state.view === "create") {
										const slug = slugify(title);
										await ctx.content.create(AWCMS_GALLERY_COLLECTION, {
											slug,
											status: "published",
											data: galleryData,
										});
										await writeAudit(ctx, "gallery.entry.create", `Created gallery ${title}`, {
											title,
											slug,
										});
									} else if (state.view === "edit" && state.id) {
										const slug = slugify(title);
										await ctx.content.update(AWCMS_GALLERY_COLLECTION, state.id, {
											slug,
											status: "published",
											data: galleryData,
										});
										await writeAudit(ctx, "gallery.entry.update", `Updated gallery ${title}`, {
											id: state.id,
											title,
											slug,
										});
									}
									toastMessage = translateGallery("gallery.saved_entry", locale);
								} catch (error: any) {
									ctx.log.error(`Save gallery error: ${error.message}`);
								}

								state = {
									view: "list",
									search: state.search,
									cursor: state.cursor,
									mediaCursor: state.mediaCursor,
								};
								await ctx.kv.set("admin:state", state);
							}
						}

						return buildAdminBlocks(ctx, settings, locale, state, toastMessage);
					} catch (error: any) {
						ctx.log.error(`Gallery admin route error: ${error.message}`);
						return buildAdminErrorBlocks(locale);
					}
				},
			},
			settings: {
				handler: async (ctx: any) => {
					if (ctx.request.method === "POST") {
						const body = (await ctx.request.json()) as Record<string, unknown>;
						const settings = sanitizeGallerySettings(body);
						await ctx.kv.set("settings", settings);
						await writeAudit(ctx, "gallery.settings.update", "Updated gallery settings route", {
							settings,
						});
						return { success: true, settings };
					}
					return { settings: await readSettings(ctx, options) };
				},
			},
			"public/list": {
				public: true,
				handler: async (ctx: any) => {
					if (!ctx.content) return { items: [], source: "content-api-unavailable" };
					const result = await ctx.content.list(AWCMS_GALLERY_COLLECTION, { limit: 50 });
					return {
						items: result.items,
						cursor: result.cursor,
						hasMore: result.hasMore,
					};
				},
			},
			"media/list": {
				handler: async (ctx: any) => {
					const result = await loadMediaItems(ctx);
					return {
						items: result.items.map(asMediaListItem),
						cursor: result.cursor,
						hasMore: result.hasMore,
					};
				},
			},
			"media/import": {
				handler: async (ctx: any) => {
					const body = ctx.input ?? {};
					const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
					const filename = typeof body.filename === "string" ? body.filename.trim() : "";
					if (!sourceUrl || !filename)
						return { success: false, error: "Missing sourceUrl or filename" };
					const uploaded = await importMediaFromUrl(ctx, sourceUrl, filename);
					await writeAudit(ctx, "gallery.media.import", `Imported media ${filename}`, {
						sourceUrl,
						filename,
						mediaId: uploaded.mediaId,
					});
					return { success: true, mediaId: uploaded.mediaId, url: uploaded.url };
				},
			},
			"media/validate": {
				handler: async (ctx: any) => {
					const locale = ctx.request?.headers?.["accept-language"] || "en";
					const item = (await ctx.request.json()) as unknown;
					const settings = await readSettings(ctx, options);
					const result = validateGalleryItem(item, 0, settings, locale);
					if (!result.valid) {
						await writeAudit(ctx, "gallery.media.reject", "Rejected gallery media item", {
							errors: result.errors,
						});
						return { success: false, errors: result.errors };
					}
					await writeAudit(ctx, "gallery.media.accept", "Accepted gallery media item", {});
					return { success: true };
				},
			},
		},
		admin: {
			settingsSchema: AWCMS_GALLERY_SETTINGS_SCHEMA,
			pages: AWCMS_GALLERY_ADMIN_PAGES,
			i18n: {
				defaultLocale: "en",
				supportedLocales: ["en", "id"],
				messages: AWCMS_GALLERY_TRANSLATIONS,
			},
		},
	} as unknown as ResolvedPlugin;
}

export default createPlugin;
export { validateGalleryContent, validateGalleryItem } from "./validation.js";
export type { GalleryItem, GalleryLayout, GalleryType } from "./validation.js";
