import type { PluginDescriptor } from "emdash";

import { version } from "../package.json";
import {
	SIKESRA_PLUGIN_ID,
	SIKESRA_ROUTE_NAMES,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_API_BASE,
	SIKESRA_ADMIN_BASE,
} from "./shared.js";

export {
	SIKESRA_PLUGIN_ID,
	SIKESRA_ROUTE_NAMES,
	SIKESRA_PUBLIC_ROUTE,
	SIKESRA_API_BASE,
	SIKESRA_ADMIN_BASE,
} from "./shared.js";
export type { SikesraPublicFilters, SikesraPublicMetadata, SikesraPublicSummary } from "./shared.js";

export function sikesraPlugin(): PluginDescriptor {
	return {
		id: SIKESRA_PLUGIN_ID,
		version,
		format: "standard",
		entrypoint: "@ahliweb/plugin-sikesra/sandbox",
		adminPages: [
			{ path: "/", label: "SIKESRA", icon: "shield" },
			{ path: "/operations", label: "Operations", icon: "gear" },
		],
		adminWidgets: [{ id: "overview", title: "SIKESRA", size: "third" }],
	};
}
