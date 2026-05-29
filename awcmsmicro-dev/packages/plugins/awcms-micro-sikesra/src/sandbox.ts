import type { SandboxedPlugin } from "emdash/plugin";

import { createSandboxRoutes, createSharedHooks } from "./runtime.js";

export default {
	hooks: createSharedHooks(),
	routes: createSandboxRoutes(),
} satisfies SandboxedPlugin;
