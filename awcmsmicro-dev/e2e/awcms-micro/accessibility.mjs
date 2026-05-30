#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { chromium, expect } from "@playwright/test";

const execAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "../..");
const HOST = "127.0.0.1";
const LOCAL_PORT = 4564;
const CLOUDFARE_PORT = 4565;

const templates = [
	{
		name: "awcms-micro-default",
		port: LOCAL_PORT,
		dir: resolve(ROOT, "templates/awcms-micro-default"),
	},
	{
		name: "awcms-micro-default-cloudflare",
		port: CLOUDFARE_PORT,
		dir: resolve(ROOT, "templates/awcms-micro-default-cloudflare"),
	},
];

async function buildTemplate(dir) {
	await execAsync("pnpm", ["build"], { cwd: dir, timeout: 1_200_000 });
}

async function overlaySeed(dir) {
	const sourceSeed = resolve(dir, "seed", "seed.json");
	const overlayDir = resolve(dir, ".emdash");
	const overlaySeedPath = resolve(overlayDir, "seed.json");
	let previousSeed = null;

	try {
		await access(overlaySeedPath);
		previousSeed = await readFile(overlaySeedPath, "utf-8");
	} catch {
		// no overlay yet
	}

	await mkdir(overlayDir, { recursive: true });
	await copyFile(sourceSeed, overlaySeedPath);

	return async () => {
		if (previousSeed == null) {
			await rm(overlaySeedPath, { force: true });
			return;
		}

		await writeFile(overlaySeedPath, previousSeed);
	};
}

async function resetLocalSqliteDb(dir) {
	const dbPath = resolve(dir, "data.db");
	const backupName = dir.split("/").findLast((part) => part.length > 0) ?? "template";
	const backupPath = resolve("/tmp/opencode", `${backupName}.data.db`);

	try {
		await access(dbPath);
		await copyFile(dbPath, backupPath);
		await rm(dbPath, { force: true });
		return async () => {
			await copyFile(backupPath, dbPath);
			await rm(backupPath, { force: true });
		};
	} catch {
		return async () => {};
	}
}

function waitForServer(url, timeoutMs = 120_000) {
	const started = Date.now();
	return new Promise((resolveReady, rejectReady) => {
		const tick = async () => {
			try {
				const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
				if (res.ok || res.status === 404) {
					resolveReady();
					return;
				}
			} catch {
				// keep waiting
			}
			if (Date.now() - started > timeoutMs) {
				rejectReady(new Error(`Server at ${url} did not start within ${timeoutMs}ms`));
				return;
			}
			setTimeout(tick, 500);
		};
		void tick();
	});
}

function startPreview(dir, port) {
	const child = spawn(
		"pnpm",
		["exec", "astro", "preview", "--host", HOST, "--port", String(port)],
		{
			cwd: dir,
			env: { ...process.env, HOST, PORT: String(port) },
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	child.stdout.on("data", (data) => process.stdout.write(data));
	child.stderr.on("data", (data) => process.stderr.write(data));

	const exited = new Promise((resolveExit) => child.once("exit", resolveExit));

	return {
		ready: waitForServer(`http://${HOST}:${port}`),
		async stop() {
			child.kill("SIGTERM");
			await Promise.race([
				exited,
				new Promise((resolveTimer) => setTimeout(resolveTimer, 5000)).then(() =>
					child.kill("SIGKILL"),
				),
			]);
		},
	};
}

async function assertAccessibleNavigation(baseUrl, templateName) {
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();

	try {
		await page.goto(baseUrl, { waitUntil: "networkidle" });

		const home = page.getByRole("link", { name: "Home" });
		await expect(home).toHaveAttribute("aria-current", "page");

		const publicData = page.getByRole("link", { name: "Public Data" });
		await expect(publicData).toHaveAttribute("aria-haspopup", "true");

		await publicData.focus();
		await expect(page.locator(".awcms-public-nav__submenu").first()).toBeVisible();

		await page.keyboard.press("Tab");
		const activeText = await page.evaluate(() =>
			document.activeElement instanceof HTMLElement
				? (document.activeElement.textContent?.trim() ?? "")
				: "",
		);
		expect(activeText.length).toBeGreaterThan(0);

		await page.goto(`${baseUrl}/aggregate`, { waitUntil: "networkidle" });
		await expect(page.getByRole("link", { name: "Public Data" })).toHaveAttribute(
			"aria-current",
			"page",
		);
	} catch (error) {
		throw new Error(`${templateName}: ${error instanceof Error ? error.message : String(error)}`, {
			cause: error,
		});
	} finally {
		await page.close();
		await browser.close();
	}
}

async function validateTemplate(template) {
	const cleanupSeed = await overlaySeed(template.dir);
	const cleanupDb = await resetLocalSqliteDb(template.dir);
	await buildTemplate(template.dir);
	const preview = startPreview(template.dir, template.port);
	const baseUrl = `http://${HOST}:${template.port}`;

	try {
		await preview.ready;
		await assertAccessibleNavigation(baseUrl, template.name);
		process.stdout.write(`accessible ${template.name}\n`);
	} finally {
		await cleanupSeed();
		await cleanupDb();
		await preview.stop();
	}
}

async function main() {
	for (const template of templates) {
		await validateTemplate(template);
	}
	process.stdout.write("AWCMS-Micro accessibility validation complete\n");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
