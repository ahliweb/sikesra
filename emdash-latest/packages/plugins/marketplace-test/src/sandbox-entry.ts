/**
 * Sandbox Entry Point
 *
 * Canonical plugin implementation using the standard format.
 * Runs in both trusted (in-process) and sandboxed (isolate) modes.
 */

import { definePlugin } from "emdash";
import type { PluginContext } from "emdash";

interface HookEvent {
	content?: Record<string, unknown>;
	collection?: string;
	isNew?: boolean;
}

export default definePlugin({
	hooks: {
		"content:beforeSave": {
			handler: async (event: HookEvent, ctx: PluginContext) => {
				ctx.log.info("[marketplace-test] beforeSave fired", {
					collection: event.collection,
					isNew: event.isNew,
				});

				// Record execution in storage
				await ctx.storage.events.put(`hook-${Date.now()}`, {
					timestamp: new Date().toISOString(),
					type: "content:beforeSave",
					collection: event.collection,
					isNew: event.isNew,
				});

				return event.content;
			},
		},
	},

	routes: {
		ping: {
			handler: async (_ctx: { input: unknown; request: unknown }, pluginCtx: PluginContext) => ({
				pong: true,
				pluginId: pluginCtx.plugin.id,
				timestamp: Date.now(),
			}),
		},

		events: {
			handler: async (_ctx: { input: unknown; request: unknown }, pluginCtx: PluginContext) => {
				const result = await pluginCtx.storage.events.query({ limit: 10 });
				return { count: result.items.length, items: result.items };
			},
		},
	},
});
