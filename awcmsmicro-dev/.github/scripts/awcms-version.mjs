import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const mode = process.argv[2] ?? "status";
const rootDir = process.cwd();
const changesetDir = path.join(rootDir, ".awcms-changesets");
const packageRoots = [path.join(rootDir, "packages", "plugins"), path.join(rootDir, "templates")];

const changesetFrontmatterRe = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const changesetLineRe = /^"?(@awcms-micro\/[^"]+)"?:\s*(patch|minor|major)$/;
const semverRe = /^(\d+)\.(\d+)\.(\d+)$/;
const newlineRe = /\r?\n/;

const bumpOrder = { patch: 0, minor: 1, major: 2 };

function runPnpm(args) {
	execFileSync("pnpm", args, { stdio: "inherit" });
}

function discoverAwcmsPackages() {
	const packages = new Map();
	for (const baseDir of packageRoots) {
		if (!existsSync(baseDir)) continue;
		for (const entry of readdirSync(baseDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			const packageJsonPath = path.join(baseDir, entry.name, "package.json");
			if (!existsSync(packageJsonPath)) continue;
			const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
			if (typeof pkg.name !== "string" || !pkg.name.startsWith("@awcms-micro/")) continue;
			packages.set(pkg.name, {
				name: pkg.name,
				version: pkg.version,
				packageJsonPath,
				dir: path.dirname(packageJsonPath),
				manifest: pkg,
			});
		}
	}
	return packages;
}

function parseChangesetFile(filePath, knownPackages) {
	const raw = readFileSync(filePath, "utf8");
	const match = raw.match(changesetFrontmatterRe);
	if (!match) {
		throw new Error(`Invalid AWCMS changeset frontmatter in ${path.basename(filePath)}`);
	}
	const [, header, bodyRaw] = match;
	const body = bodyRaw.trim();
	if (!body) {
		throw new Error(`Missing changeset body in ${path.basename(filePath)}`);
	}
	const releases = [];
	for (const line of header
		.split(newlineRe)
		.map((item) => item.trim())
		.filter(Boolean)) {
		const releaseMatch = line.match(changesetLineRe);
		if (!releaseMatch) {
			throw new Error(
				`Invalid changeset line ${JSON.stringify(line)} in ${path.basename(filePath)}`,
			);
		}
		const [, packageName, bump] = releaseMatch;
		if (!knownPackages.has(packageName)) {
			throw new Error(
				`Changeset ${path.basename(filePath)} references unknown AWCMS package ${packageName}`,
			);
		}
		releases.push({ packageName, bump });
	}
	if (releases.length === 0) {
		throw new Error(`No AWCMS package entries found in ${path.basename(filePath)}`);
	}
	return { filePath, body, releases };
}

function readPendingChangesets(knownPackages) {
	if (!existsSync(changesetDir)) return [];
	return readdirSync(changesetDir)
		.filter((file) => file.endsWith(".md") && file !== "README.md")
		.toSorted()
		.map((file) => parseChangesetFile(path.join(changesetDir, file), knownPackages));
}

function bumpVersion(version, bump) {
	const match = version.match(semverRe);
	if (!match) throw new Error(`Unsupported semver version: ${version}`);
	const [, major, minor, patch] = match;
	let nextMajor = Number(major);
	let nextMinor = Number(minor);
	let nextPatch = Number(patch);
	if (bump === "major") {
		nextMajor += 1;
		nextMinor = 0;
		nextPatch = 0;
	} else if (bump === "minor") {
		nextMinor += 1;
		nextPatch = 0;
	} else {
		nextPatch += 1;
	}
	return `${nextMajor}.${nextMinor}.${nextPatch}`;
}

function normalizeBody(body) {
	return body
		.split(newlineRe)
		.map((line) => line.trim())
		.filter(Boolean)
		.join(" ");
}

function updateChangelog(packageDir, version, entries) {
	const changelogPath = path.join(packageDir, "CHANGELOG.md");
	const date = new Date().toISOString().slice(0, 10);
	const sectionLines = [
		`## ${version} - ${date}`,
		"",
		...entries.map((entry) => `- ${normalizeBody(entry)}`),
		"",
	];
	const section = sectionLines.join("\n");
	if (!existsSync(changelogPath)) {
		writeFileSync(changelogPath, `# Changelog\n\n${section}`, "utf8");
		return;
	}
	const current = readFileSync(changelogPath, "utf8");
	if (current.startsWith("# Changelog\n\n")) {
		writeFileSync(
			changelogPath,
			`# Changelog\n\n${section}${current.slice("# Changelog\n\n".length)}`,
			"utf8",
		);
		return;
	}
	writeFileSync(changelogPath, `${section}${current}`, "utf8");
}

function summarizePending(changesets) {
	if (changesets.length === 0) {
		console.log("No pending AWCMS changesets.");
		return;
	}
	console.log(`Pending AWCMS changesets: ${changesets.length}`);
	for (const changeset of changesets) {
		const file = path.basename(changeset.filePath);
		const targets = changeset.releases
			.map((release) => `${release.packageName} (${release.bump})`)
			.join(", ");
		console.log(`- ${file}: ${targets}`);
	}
}

function applyVersioning(packages, changesets) {
	if (changesets.length === 0) {
		console.log("No pending AWCMS changesets. Nothing to version.");
		return;
	}
	const releasePlan = new Map();
	for (const changeset of changesets) {
		for (const release of changeset.releases) {
			const existing = releasePlan.get(release.packageName) ?? { bump: "patch", entries: [] };
			if (bumpOrder[release.bump] > bumpOrder[existing.bump]) {
				existing.bump = release.bump;
			}
			existing.entries.push(changeset.body);
			releasePlan.set(release.packageName, existing);
		}
	}

	for (const [packageName, plan] of releasePlan) {
		const pkg = packages.get(packageName);
		const nextVersion = bumpVersion(pkg.version, plan.bump);
		pkg.manifest.version = nextVersion;
		writeFileSync(pkg.packageJsonPath, `${JSON.stringify(pkg.manifest, null, "\t")}\n`, "utf8");
		updateChangelog(pkg.dir, nextVersion, plan.entries);
		console.log(`${packageName}: ${pkg.version} -> ${nextVersion} (${plan.bump})`);
	}

	for (const changeset of changesets) {
		rmSync(changeset.filePath);
	}

	runPnpm(["install", "--no-frozen-lockfile"]);
}

const packages = discoverAwcmsPackages();
const changesets = readPendingChangesets(packages);

if (mode === "status") {
	summarizePending(changesets);
} else if (mode === "version") {
	applyVersioning(packages, changesets);
} else {
	throw new Error(
		`Unknown AWCMS release mode: ${JSON.stringify(mode)} (expected "status" or "version")`,
	);
}
