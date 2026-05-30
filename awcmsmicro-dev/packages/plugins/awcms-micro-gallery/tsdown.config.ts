import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/sandbox.ts"],
	format: "esm",
	dts: true,
	clean: true,
	target: "es2023",
});
