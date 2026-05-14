#!/usr/bin/env node
// Symlink demos/cloudflare/dist -> dist at repo root for Cloudflare Pages deployment.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, "demos", "cloudflare", "dist");
const link = path.join(root, "dist");

if (!fs.existsSync(target)) {
	console.error(`Error: ${target} does not exist. Run the demo build first.`);
	process.exit(1);
}

try {
	fs.rmSync(link, { recursive: true, force: true });
	fs.symlinkSync(target, link, "junction");
	console.log(`Symlinked ${link} -> ${target}`);
} catch (error) {
	console.error("Failed to create dist symlink:", error.message);
	process.exit(1);
}
