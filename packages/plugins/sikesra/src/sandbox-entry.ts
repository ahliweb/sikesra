import { definePlugin } from "emdash";

import {
	buildAdminBlocks,
	buildAdminWidget,
	buildPublicFilters,
	buildPublicMetadata,
	buildPublicSummary,
	getAdminPageTarget,
	type AdminInteraction,
} from "./shared.js";

export default definePlugin({
	routes: {
		admin: {
			handler: async (routeCtx: { input: AdminInteraction }) => {
				const target = getAdminPageTarget(routeCtx.input);
				return target === "widget:overview" ? buildAdminWidget() : buildAdminBlocks(target);
			},
		},
		"public/metadata": {
			public: true,
			handler: async () => buildPublicMetadata(),
		},
		"public/filters": {
			public: true,
			handler: async () => buildPublicFilters(),
		},
		"public/summary": {
			public: true,
			handler: async () => buildPublicSummary(),
		},
		"v1/status": {
			handler: async () => ({
				status: "rebuild-pending",
				message:
					"The SIKESRA shell is mounted. Data, policy, and operational endpoints will be restored in follow-up issues.",
			}),
		},
	},
});
