import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			emdash: new URL("./tests/emdash-mock.ts", import.meta.url).pathname,
		},
	},
	test: {
		globals: true,
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
