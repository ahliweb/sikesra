#!/usr/bin/env node
// Copy demos/cloudflare/dist to dist at repo root for Cloudflare Pages deployment.
// Uses copy instead of symlink because Cloudflare Pages cannot follow symlinks
// in the build output directory.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "demos", "cloudflare", "dist");
const target = path.join(root, "dist");

if (!fs.existsSync(source)) {
	console.error(`Error: ${source} does not exist. Run the demo build first.`);
	process.exit(1);
}

try {
	fs.rmSync(target, { recursive: true, force: true });
	fs.cpSync(source, target, { recursive: true });
	console.log(`Copied ${source} -> ${target}`);
} catch (error) {
	console.error("Failed to copy dist directory:", error.message);
	process.exit(1);
}
