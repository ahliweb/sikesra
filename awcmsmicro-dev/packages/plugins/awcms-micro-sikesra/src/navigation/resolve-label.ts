export type TranslationMessages = Record<string, Record<string, string>>;

export function resolveLabel(
	labelKey: string,
	fallbackLabel: string,
	messages: TranslationMessages | undefined,
	requestedLocale: string,
	defaultLocale: string = "en",
): string {
	if (messages) {
		if (messages[requestedLocale]?.[labelKey]) {
			return messages[requestedLocale][labelKey];
		}
		if (messages[defaultLocale]?.[labelKey]) {
			return messages[defaultLocale][labelKey];
		}
	}
	if (fallbackLabel) {
		return fallbackLabel;
	}
	return labelKey;
}
