import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = [".env.example", ".dev.vars.example", "package.json", "wrangler.jsonc", "AGENTS.md", "docs", "scripts", "src", "tests"];
const ALLOWED_SECRET_NAME_CONTEXT = /`?[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ENCRYPTION_KEY)[A-Z0-9_]*`?/;
const ALLOWED_PLACEHOLDERS = /(<[^>]+>|replace-with|REPLACE_WITH|your_|example|placeholder|local-only|omitted|redacted|\$\{[A-Z0-9_]+\})/i;
const SENSITIVE_ASSIGNMENT = /^\s*(?:export\s+)?([A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ENCRYPTION_KEY)[A-Z0-9_]*)\s*=\s*(.+?)\s*$/;
const CREDENTIAL_URL = /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s<:]+:[^\s<@]+@/i;
const BEARER_LITERAL = /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/;
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const LOCAL_SECRET_FILE = /^\.env(\..*)?$|^\.dev\.vars(\..*)?$/;
const ALLOWED_EXAMPLES = new Set([".env.example", ".dev.vars.example"]);

function walk(path) {
  if (!existsSync(path)) return [];
  const entries = readdirSync(path, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === ".wrangler" || entry.name === "node_modules") continue;
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFile(file) {
  const relativePath = relative(ROOT, file);
  const findings = [];
  const content = readFileSync(file, "utf8");

  content.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const assignment = line.match(SENSITIVE_ASSIGNMENT);
    if (assignment) {
      const value = assignment[2].trim().replace(/^['"]|['"]$/g, "");
      if (value && !ALLOWED_PLACEHOLDERS.test(value) && !value.startsWith("process.env.")) {
        findings.push({ file: relativePath, line: lineNumber, type: "sensitive-assignment" });
      }
    }

    if (CREDENTIAL_URL.test(line) && !ALLOWED_PLACEHOLDERS.test(line)) {
      findings.push({ file: relativePath, line: lineNumber, type: "credential-url" });
    }

    if (BEARER_LITERAL.test(line) && !line.includes("process.env.") && !ALLOWED_PLACEHOLDERS.test(line)) {
      findings.push({ file: relativePath, line: lineNumber, type: "bearer-literal" });
    }

    if (PRIVATE_KEY.test(line) && !ALLOWED_PLACEHOLDERS.test(line)) {
      findings.push({ file: relativePath, line: lineNumber, type: "private-key" });
    }

    if (ALLOWED_SECRET_NAME_CONTEXT.test(line) && /['"][A-Za-z0-9+/=_-]{32,}['"]/.test(line) && !line.includes("process.env.")) {
      findings.push({ file: relativePath, line: lineNumber, type: "possible-inline-secret" });
    }
  });

  return findings;
}

const scanFiles = SCAN_ROOTS.flatMap((entry) => {
  const fullPath = join(ROOT, entry);
  if (!existsSync(fullPath)) return [];
  return readdirSync(ROOT, { withFileTypes: true }).some((rootEntry) => rootEntry.name === entry && rootEntry.isDirectory())
    ? walk(fullPath)
    : [fullPath];
}).filter((file) => /\.(mjs|md|jsonc|json|example)$/.test(file));

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

const trackedLocalSecretFiles = trackedFiles()
  .filter((name) => LOCAL_SECRET_FILE.test(name) && !ALLOWED_EXAMPLES.has(name))
  .map((name) => ({ file: name, line: 1, type: "local-secret-file-present" }));

const findings = [...trackedLocalSecretFiles, ...scanFiles.flatMap(scanFile)];
const ok = findings.length === 0;

console.log(
  JSON.stringify(
    {
      ok,
      scannedFiles: scanFiles.length,
      findings,
      redaction: "Secret values are never printed by this scanner; only file, line, and finding type are reported.",
    },
    null,
    2,
  ),
);

process.exit(ok ? 0 : 1);
