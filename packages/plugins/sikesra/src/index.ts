import type { PluginDescriptor } from "emdash";

export * from "../../awcms-micro-sikesra/src/index.js";

export const SIKESRA_SANDBOX_ENTRYPOINT = "@ahliweb/plugin-sikesra/sandbox";

export function sikesraPlugin(): PluginDescriptor {
	return {
		...canonicalSikesraPlugin(),
		entrypoint: SIKESRA_SANDBOX_ENTRYPOINT,
	};
}

export function bundlePluginDescriptor(): PluginDescriptor {
	return sikesraPlugin();
}

export function awcmsMicroSikesraPlugin(): PluginDescriptor {
	return canonicalSikesraPlugin();
}

import {
	sikesraPlugin as canonicalSikesraPlugin,
} from "../../awcms-micro-sikesra/src/index.js";
