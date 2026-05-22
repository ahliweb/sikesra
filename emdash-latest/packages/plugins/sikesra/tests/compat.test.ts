import { describe, expect, it } from "vitest";

import {
	SIKESRA_SANDBOX_ENTRYPOINT,
	awcmsMicroSikesraPlugin,
	bundlePluginDescriptor,
	sikesraPlugin,
} from "../src/index.js";
import defaultPlugin from "../src/sandbox-entry.js";

describe("legacy plugin shim", () => {
	it("preserves the legacy sandbox entrypoint for older import sites", () => {
		const descriptor = sikesraPlugin();

		expect(descriptor.entrypoint).toBe(SIKESRA_SANDBOX_ENTRYPOINT);
		expect(bundlePluginDescriptor()).toEqual(descriptor);
		expect(awcmsMicroSikesraPlugin().entrypoint).toBe(
			"@ahliweb/awcms-micro-sikesra/sandbox",
		);
	});

	it("re-exports the canonical sandbox runtime", () => {
		expect(defaultPlugin.routes).toEqual(
			expect.objectContaining({
				admin: expect.any(Object),
				"v1/entities": expect.any(Object),
			}),
		);
	});
});
