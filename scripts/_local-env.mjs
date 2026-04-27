import { existsSync, readFileSync } from "node:fs";

export function getEnvScope(env = process.env) {
  const scope = env.SIKESRA_ENV || env.NODE_ENV;
  return hasValue(scope) ? scope.trim() : null;
}

export function buildDefaultEnvFiles(env = process.env) {
  const scope = getEnvScope(env);
  return [
    ...(scope ? [`.env.${scope}.local`] : []),
    ".env.local",
    ...(scope ? [`.env.${scope}`] : []),
    ".env",
  ];
}

export const DEFAULT_ENV_FILES = buildDefaultEnvFiles();

export function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseEnvValue(raw) {
  let value = raw.trim();
  if (!value) return "";

  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
  }

  return value;
}

export function loadEnvFile(path, env = process.env) {
  if (!existsSync(path)) return false;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    if (!key || key.startsWith("export ")) continue;

    const value = parseEnvValue(line.slice(index + 1));
    if (!hasValue(env[key])) env[key] = value;
  }

  return true;
}

export function loadLocalEnv(files = DEFAULT_ENV_FILES, env = process.env) {
  const resolvedFiles = Array.isArray(files) ? files : buildDefaultEnvFiles(env);
  return resolvedFiles.map((file) => ({ file, loaded: loadEnvFile(file, env) }));
}

export function requireValue(value, name) {
  if (!hasValue(value)) throw new Error(`Missing ${name}.`);
  return value;
}
