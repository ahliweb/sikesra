import { defineMiddleware, sequence } from "astro:middleware";

import { stripLocalePrefix } from "./utils/locale-path";

const PUBLIC_ADMIN_PREFIXES = [
	"/_emdash/admin/login",
	"/_emdash/admin/setup",
	"/_emdash/admin/signup",
	"/_emdash/admin/invite/accept",
	"/_emdash/admin/device",
];

const LOCALE_OPTIONS = {
	defaultLocale: "en",
	locales: ["en", "id"],
};

function detectLocale(pathname: string) {
	const firstSegment = pathname.split("/").find(Boolean);
	return firstSegment && LOCALE_OPTIONS.locales.includes(firstSegment) ? firstSegment : LOCALE_OPTIONS.defaultLocale;
}

function isPublicAdminPath(pathname: string) {
	return PUBLIC_ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function getSessionUserId(sessionUser: unknown) {
	if (!sessionUser || typeof sessionUser !== "object" || !("id" in sessionUser)) return null;
	return typeof sessionUser.id === "string" && sessionUser.id.length > 0 ? sessionUser.id : null;
}

function buildLoginRedirect(url: URL) {
	const loginUrl = new URL("/_emdash/admin/login", url);
	loginUrl.searchParams.set("redirect", `${url.pathname}${url.search}`);
	return loginUrl;
}

const localeRewrite = defineMiddleware(async (context, next) => {
	context.locals.awcmsLocale = detectLocale(context.url.pathname);

	const strippedPath = stripLocalePrefix(context.url.pathname, LOCALE_OPTIONS);
	if (strippedPath === context.url.pathname) {
		return next();
	}

	const rewrittenPath = strippedPath === "/" ? "/" : strippedPath;
	return next(`${rewrittenPath}${context.url.search}`);
});

const adminGuard = defineMiddleware(async (context, next) => {
	const { url, cookies } = context;

	if (!url.pathname.startsWith("/_emdash/admin") || isPublicAdminPath(url.pathname)) {
		return next();
	}

	if (cookies.get("astro-session") === undefined) {
		return context.redirect(buildLoginRedirect(url).toString());
	}

	const sessionUser = await context.session?.get("user");
	if (!getSessionUserId(sessionUser)) {
		return context.redirect(buildLoginRedirect(url).toString());
	}

	return next();
});

export const onRequest = sequence(
	localeRewrite,
	adminGuard,
);
