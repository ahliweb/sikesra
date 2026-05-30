export const AWCMS_GALLERY_COLLECTION = "galleries";
export const AWCMS_GALLERY_STORAGE_COLLECTION = "gallery_audit_events";

export const GALLERY_TYPES = ["photo", "video", "mixed"] as const;
export const GALLERY_LAYOUTS = ["grid", "masonry", "carousel", "slider"] as const;
export const IMAGE_MIME_PREFIX = "image/";
export const VIDEO_MIME_PREFIX = "video/";
export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MAX_VIDEO_BYTES = 250 * 1024 * 1024;

export type GalleryType = (typeof GALLERY_TYPES)[number];
export type GalleryLayout = (typeof GALLERY_LAYOUTS)[number];
export type GalleryItemType = "image" | "video";

export interface GalleryItem {
	type: GalleryItemType;
	src: string;
	mimeType?: string;
	filename?: string;
	sizeBytes?: number;
	alt?: string;
	caption?: string;
	poster?: string;
	provider?: "emdash-media" | "cloudflare-images" | "cloudflare-stream" | "external";
}

export interface GalleryValidationOptions {
	maxImageBytes?: number;
	maxVideoBytes?: number;
}

export interface GalleryValidationCopy {
	itemObject: (index: number) => string;
	itemType: (index: number) => string;
	itemSrc: (index: number) => string;
	imageMime: (index: number) => string;
	videoMime: (index: number) => string;
	imageSize: (index: number, limit: number) => string;
	videoSize: (index: number, limit: number) => string;
	imageAlt: (index: number) => string;
	videoCaption: (index: number) => string;
	contentObject: string;
	titleRequired: string;
	typeInvalid: string;
	layoutInvalid: string;
	itemsArray: string;
	filenamePathSegments: (index: number) => string;
	filenameCharset: (index: number) => string;
}

export interface GalleryValidationResult {
	valid: boolean;
	errors: string[];
}

const SAFE_FILENAME_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const formatIndex = (index: number) => `${index + 1}`;
const formatLimit = (limit: number) => `${limit}`;

function createDefaultValidationCopy(locale: string | undefined): GalleryValidationCopy {
	const isId = locale?.startsWith("id") ?? false;
	return {
		itemObject: (index) =>
			isId
				? `Item ${formatIndex(index)} harus berupa objek`
				: `Item ${formatIndex(index)} must be an object`,
		itemType: (index) =>
			isId
				? `Tipe item ${formatIndex(index)} harus image atau video`
				: `Item ${formatIndex(index)} type must be image or video`,
		itemSrc: (index) =>
			isId
				? `Item ${formatIndex(index)} harus menggunakan URL media EmDash publik atau URL HTTPS`
				: `Item ${formatIndex(index)} must use a public EmDash media URL or HTTPS URL`,
		imageMime: (index) =>
			isId
				? `MIME type gambar item ${formatIndex(index)} harus diawali image/`
				: `Item ${formatIndex(index)} image MIME type must start with image/`,
		videoMime: (index) =>
			isId
				? `MIME type video item ${formatIndex(index)} harus diawali video/`
				: `Item ${formatIndex(index)} video MIME type must start with video/`,
		imageSize: (index, limit) =>
			isId
				? `Gambar item ${formatIndex(index)} melebihi batas ${formatLimit(limit)} byte`
				: `Item ${formatIndex(index)} image exceeds the ${formatLimit(limit)} byte limit`,
		videoSize: (index, limit) =>
			isId
				? `Video item ${formatIndex(index)} melebihi batas ${formatLimit(limit)} byte`
				: `Item ${formatIndex(index)} video exceeds the ${formatLimit(limit)} byte limit`,
		imageAlt: (index) =>
			isId
				? `Gambar item ${formatIndex(index)} memerlukan teks alt`
				: `Item ${formatIndex(index)} image requires alt text`,
		videoCaption: (index) =>
			isId
				? `Video item ${formatIndex(index)} memerlukan caption`
				: `Item ${formatIndex(index)} video requires a caption`,
		contentObject: isId ? "Konten galeri harus berupa objek" : "Gallery content must be an object",
		titleRequired: isId ? "Judul galeri wajib diisi" : "Gallery title is required",
		typeInvalid: isId
			? "Tipe galeri harus photo, video, atau mixed"
			: "Gallery type must be photo, video, or mixed",
		layoutInvalid: isId
			? "Variant layout harus grid, masonry, carousel, atau slider"
			: "Layout variant must be grid, masonry, carousel, or slider",
		itemsArray: isId ? "Item galeri harus berupa array" : "Gallery items must be an array",
		filenamePathSegments: (index) =>
			isId
				? `Nama file item ${formatIndex(index)} tidak boleh mengandung segmen path`
				: `Item ${formatIndex(index)} filename must not include path segments`,
		filenameCharset: (index) =>
			isId
				? `Nama file item ${formatIndex(index)} hanya boleh berisi huruf, angka, titik, strip, dan underscore`
				: `Item ${formatIndex(index)} filename must use only letters, numbers, dots, dashes, and underscores`,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAllowedType(value: unknown, allowed: readonly string[]): value is string {
	return typeof value === "string" && allowed.includes(value);
}

function isSafePublicUrl(value: string): boolean {
	if (value.startsWith("/_emdash/api/media/file/")) return true;
	if (value.startsWith("/media/")) return true;
	if (value.startsWith("/uploads/")) return true;
	if (value.startsWith("https://")) return true;
	return false;
}

function validateFilename(
	filename: string | undefined,
	index: number,
	errors: string[],
	copy: GalleryValidationCopy,
): void {
	if (!filename) return;
	if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
		errors.push(copy.filenamePathSegments(index));
		return;
	}
	if (!SAFE_FILENAME_RE.test(filename)) {
		errors.push(copy.filenameCharset(index));
	}
}

export function validateGalleryItem(
	value: unknown,
	index = 0,
	options: GalleryValidationOptions = {},
	locale?: string,
): GalleryValidationResult {
	const errors: string[] = [];
	const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
	const maxVideoBytes = options.maxVideoBytes ?? DEFAULT_MAX_VIDEO_BYTES;
	const copy = createDefaultValidationCopy(locale);

	if (!isRecord(value)) {
		return { valid: false, errors: [copy.itemObject(index)] };
	}

	const type = value.type;
	const src = value.src;
	const mimeType = value.mimeType;
	const sizeBytes = value.sizeBytes;
	const filename = value.filename;

	if (type !== "image" && type !== "video") {
		errors.push(copy.itemType(index));
	}
	if (typeof src !== "string" || src.length === 0 || !isSafePublicUrl(src)) {
		errors.push(copy.itemSrc(index));
	}
	if (typeof mimeType === "string") {
		if (type === "image" && !mimeType.startsWith(IMAGE_MIME_PREFIX)) {
			errors.push(copy.imageMime(index));
		}
		if (type === "video" && !mimeType.startsWith(VIDEO_MIME_PREFIX)) {
			errors.push(copy.videoMime(index));
		}
	}
	if (typeof sizeBytes === "number") {
		if (type === "image" && sizeBytes > maxImageBytes) {
			errors.push(copy.imageSize(index, maxImageBytes));
		}
		if (type === "video" && sizeBytes > maxVideoBytes) {
			errors.push(copy.videoSize(index, maxVideoBytes));
		}
	}
	if (typeof filename === "string") validateFilename(filename, index, errors, copy);
	if (type === "image" && typeof value.alt !== "string") {
		errors.push(copy.imageAlt(index));
	}
	if (type === "video" && typeof value.caption !== "string") {
		errors.push(copy.videoCaption(index));
	}

	return { valid: errors.length === 0, errors };
}

export function validateGalleryContent(
	content: unknown,
	options: GalleryValidationOptions = {},
	locale?: string,
): GalleryValidationResult {
	const errors: string[] = [];
	const copy = createDefaultValidationCopy(locale);
	if (!isRecord(content)) return { valid: false, errors: [copy.contentObject] };

	if (typeof content.title !== "string" || content.title.trim().length === 0) {
		errors.push(copy.titleRequired);
	}
	if (!isAllowedType(content.gallery_type, GALLERY_TYPES)) {
		errors.push(copy.typeInvalid);
	}
	if (!isAllowedType(content.layout_variant, GALLERY_LAYOUTS)) {
		errors.push(copy.layoutInvalid);
	}
	if (!Array.isArray(content.gallery_items)) {
		errors.push(copy.itemsArray);
	} else {
		content.gallery_items.forEach((item, index) => {
			errors.push(...validateGalleryItem(item, index, options, locale).errors);
		});
	}

	return { valid: errors.length === 0, errors };
}

export function sanitizeGallerySettings(value: Record<string, unknown>) {
	return {
		maxImageBytes:
			typeof value.maxImageBytes === "number" && value.maxImageBytes > 0
				? Math.floor(value.maxImageBytes)
				: DEFAULT_MAX_IMAGE_BYTES,
		maxVideoBytes:
			typeof value.maxVideoBytes === "number" && value.maxVideoBytes > 0
				? Math.floor(value.maxVideoBytes)
				: DEFAULT_MAX_VIDEO_BYTES,
		cloudflareImagesEnabled: value.cloudflareImagesEnabled === true,
		cloudflareStreamEnabled: value.cloudflareStreamEnabled === true,
	};
}
