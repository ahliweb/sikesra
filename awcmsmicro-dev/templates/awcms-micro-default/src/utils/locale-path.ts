export interface LocalePathOptions {
	defaultLocale: string;
	locales: string[];
}

const NON_LOCALIZED_PREFIXES = ["/_emdash", "/_astro", "/favicon", "/robots.txt", "/sitemap"];
const URL_PARTS_REGEX = /^([^?#]*)(.*)$/;
const EXTERNAL_URL_REGEX = /^[a-z][a-z0-9+.-]*:/i;
const TRAILING_SLASH_REGEX = /\/$/;

function ensureLeadingSlash(path: string) {
	if (!path || path === "/") return "/";
	return path.startsWith("/") ? path : `/${path}`;
}

function splitUrlParts(path: string) {
	const match = path.match(URL_PARTS_REGEX);
	return {
		pathname: match?.[1] || "/",
		suffix: match?.[2] || "",
	};
}

function isExternalUrl(path: string) {
	return EXTERNAL_URL_REGEX.test(path) || path.startsWith("//") || path.startsWith("#");
}

export function isLocalizablePath(path: string) {
	if (!path) return true;
	if (isExternalUrl(path)) return false;
	const normalized = ensureLeadingSlash(splitUrlParts(path).pathname);
	return !NON_LOCALIZED_PREFIXES.some(
		(prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
	);
}

export function stripLocalePrefix(path: string, options: LocalePathOptions) {
	const { pathname, suffix } = splitUrlParts(path);
	const normalizedPath = ensureLeadingSlash(pathname);

	for (const locale of options.locales) {
		const localePrefix = `/${locale}`;
		if (normalizedPath === localePrefix)
			return `/${suffix}`.replace(TRAILING_SLASH_REGEX, "") || "/";
		if (normalizedPath.startsWith(`${localePrefix}/`)) {
			return `${normalizedPath.slice(localePrefix.length)}${suffix}` || "/";
		}
	}

	return `${normalizedPath}${suffix}`;
}

export function toLocalePath(path: string, targetLocale: string, options: LocalePathOptions) {
	if (!isLocalizablePath(path)) return path;

	const stripped = stripLocalePrefix(path, options);
	const { pathname, suffix } = splitUrlParts(stripped);
	const normalizedPath = ensureLeadingSlash(pathname);

	if (targetLocale === options.defaultLocale) {
		return `${normalizedPath}${suffix}`;
	}

	return normalizedPath === "/"
		? `/${targetLocale}${suffix}`
		: `/${targetLocale}${normalizedPath}${suffix}`;
}

export function resolveEntrySlug(entry: { id: string; data: { slug?: unknown } }) {
	const slug = entry.data.slug;
	return typeof slug === "string" && slug.length > 0 ? slug : entry.id;
}
