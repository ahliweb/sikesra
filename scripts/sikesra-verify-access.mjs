#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
const workerName = process.env.CLOUDFLARE_WORKER_NAME || "sikesra";
const hostname = process.env.SIKESRA_HOSTNAME || "sikesrakobar.ahlikoding.com";
const baseUrl = process.env.SIKESRA_BASE_URL || `https://${hostname}`;
const workerBaseUrl = process.env.SIKESRA_WORKER_BASE_URL || process.env.CLOUDFLARE_WORKER_URL || "";
const requiredSecret = process.env.SIKESRA_REQUIRED_SECRET || "CF_ACCESS_AUDIENCE";
const failures = [];

function fail(message) {
	failures.push(message);
}

function warn(message) {
	console.warn(`[sikesra-verify-access] ${message}`);
}

function ok(message) {
	process.stdout.write(`[sikesra-verify-access] ${message}\n`);
}

function requireEnv(name, value) {
	if (!value) fail(`missing required environment variable ${name}`);
}

async function cfJson(path) {
	const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		headers: { Authorization: `Bearer ${apiToken}` },
	});
	const data = await response.json();
	if (!response.ok || !data?.success) {
		throw new Error(`Cloudflare API request failed for ${path}`);
	}
	return data.result;
}

function listWorkerSecrets() {
	const wranglerBin = resolve(process.cwd(), "node_modules", ".bin", "wrangler");
	const output = execFileSync(
		wranglerBin,
		["secret", "list", "--config", "infra/sikesra/wrangler.jsonc"],
		{
			cwd: process.cwd(),
			env: process.env,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	const parsed = JSON.parse(output);
	if (!Array.isArray(parsed)) throw new Error("wrangler secret list returned an unexpected payload");
	return parsed.map((entry) => entry.name).filter((name) => typeof name === "string");
}

function appCoversHostname(app, hostnameToMatch) {
	const domain = typeof app?.domain === "string" ? app.domain : "";
	if (!domain) return false;
	if (domain === hostnameToMatch) return true;
	if (domain === `https://${hostnameToMatch}`) return true;
	if (domain.includes(hostnameToMatch)) return true;
	return false;
}

async function checkAccessApp() {
	const apps = await cfJson(`/accounts/${accountId}/access/apps?page=1&per_page=200`);
	if (!Array.isArray(apps) || apps.length === 0) {
		fail(`no Cloudflare Access applications found in account ${accountId}`);
		return [];
	}

	const matchingApps = apps.filter((app) => appCoversHostname(app, hostname));
	if (matchingApps.length === 0) {
		fail(`no Cloudflare Access application appears to cover ${hostname}`);
		return [];
	}

	ok(`found ${matchingApps.length} Access application(s) covering ${hostname}`);
	return matchingApps;
}

async function checkAuthMode() {
	if (!workerBaseUrl) {
		warn("skipping auth mode check because SIKESRA_WORKER_BASE_URL and CLOUDFLARE_WORKER_URL are unset");
		return null;
	}

	const response = await fetch(`${workerBaseUrl}/_emdash/api/auth/mode`, { redirect: "manual" });
	if (!response.ok) {
		fail(`worker auth mode endpoint returned HTTP ${response.status}`);
		return null;
	}
	const payload = await response.json();
	const authMode = payload?.data?.authMode;
	if (authMode !== "cloudflare-access") {
		warn(`auth mode is ${String(authMode)} instead of cloudflare-access`);
	} else {
		ok("auth mode reports cloudflare-access");
	}
	return authMode;
}

async function checkAdminChallenge() {
	const response = await fetch(`${baseUrl}/_emdash/admin/`, { redirect: "manual" });
	const location = response.headers.get("location") || "";

	if (location.startsWith("/_emdash/admin/login")) {
		fail(
			`anonymous admin requests are reaching EmDash login instead of a Cloudflare Access challenge at ${hostname}`,
		);
		return;
	}

	ok(`anonymous admin request returned HTTP ${response.status}${location ? ` location=${location}` : ""}`);
}

async function main() {
	requireEnv("CLOUDFLARE_ACCOUNT_ID", accountId);
	requireEnv("CLOUDFLARE_API_TOKEN", apiToken);
	if (failures.length > 0) {
		for (const message of failures) {
			console.error(`[sikesra-verify-access] ${message}`);
		}
		process.exit(1);
	}

	try {
		const secrets = listWorkerSecrets();
		if (!secrets.includes(requiredSecret)) {
			fail(`worker ${workerName} is missing required secret ${requiredSecret}`);
		} else {
			ok(`worker ${workerName} has required secret ${requiredSecret}`);
		}
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
	}

	try {
		await checkAccessApp();
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
	}
	try {
		await checkAuthMode();
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
	}
	try {
		await checkAdminChallenge();
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
	}

	if (failures.length > 0) {
		for (const message of failures) {
			console.error(`[sikesra-verify-access] ${message}`);
		}
		process.exit(1);
	}

	ok("Cloudflare Access deployment checks passed");
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});
