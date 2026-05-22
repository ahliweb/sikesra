/**
 * Custom Worker Entrypoint for EmDash
 *
 * Exports:
 * - default: Astro handler
 * - PluginBridge: WorkerEntrypoint for sandboxed plugin RPC
 */

import handler from "@astrojs/cloudflare/entrypoints/server";

// Re-export PluginBridge from the cloudflare sandbox runtime
// This makes it available via ctx.exports.PluginBridge
export { PluginBridge } from "@emdash-cms/cloudflare/sandbox";

/**
 * Default export - just re-export the Astro handler
 */
export default handler;
