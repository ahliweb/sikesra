export const AWCMS_SUPPORTED_LOCALES = ["en", "id"] as const;
export type AwcmsLocale = (typeof AWCMS_SUPPORTED_LOCALES)[number];

export const AWCMS_DEFAULT_LOCALE: AwcmsLocale = "en";

export function isSupportedLocale(locale: string): locale is AwcmsLocale {
	return (AWCMS_SUPPORTED_LOCALES as readonly string[]).includes(locale);
}
