export interface MediaReference {
	mediaId: string;
	alt?: string;
	url?: string;
}

export interface AwcmsMicroSiteIdentitySettings {
	title?: string;
	tagline?: string;
	logo?: MediaReference;
	favicon?: MediaReference;
}

const DEFAULT_SITE_TITLE = "AWCMS-Micro";
const DEFAULT_SITE_TAGLINE = "A compact EmDash implementation for single-tenant teams and Cloudflare-ready delivery.";

export function resolveAwcmsMicroSiteIdentity(settings?: AwcmsMicroSiteIdentitySettings) {
	return {
		siteTitle: settings?.title ?? DEFAULT_SITE_TITLE,
		siteTagline: settings?.tagline ?? DEFAULT_SITE_TAGLINE,
		siteLogo: settings?.logo?.url ? settings.logo : null,
	};
}
