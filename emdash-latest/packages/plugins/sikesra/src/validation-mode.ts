export function parseEnabledPluginList(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export function isPluginEnabledForValidation(
	pluginId: string,
	rawEnabledPlugins: string | undefined,
): boolean {
	const enabled = parseEnabledPluginList(rawEnabledPlugins);
	if (enabled.length === 0) return true;
	return enabled.includes(pluginId);
}
