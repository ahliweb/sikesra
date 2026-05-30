import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/admin.tsx"],
	format: ["esm"],
	outExtensions: () => ({ js: ".js" }),
	dts: true,
	clean: true,
	platform: "neutral",
	target: "es2023",
	external: [/^emdash($|\/)/, /^react($|\/)/, /^@cloudflare\/kumo($|\/)/],
});
