#!/usr/bin/env node

import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sikesraRoot = resolve(__dirname, "..");
const upstreamCoreRoot = resolve(sikesraRoot, "../awcms-mini");
const stateFile = resolve(sikesraRoot, "temp/dev-emdash-core.state.json");

if (!existsSync(upstreamCoreRoot)) {
  console.error(`Upstream core not found: ${upstreamCoreRoot}`);
  process.exit(1);
}

const localPostgresUser = process.env.LOCAL_POSTGRES_USER ?? "sikesra";
const localPostgresPassword = process.env.LOCAL_POSTGRES_PASSWORD ?? "sikesra_local_dev_only";
const localPostgresDb = process.env.LOCAL_POSTGRES_DB ?? "sikesrakobar";
const localPostgresPort = process.env.LOCAL_POSTGRES_PORT ?? "15432";
const astroPort = process.env.SIKESRA_EMDASH_PORT ?? "4321";

const databaseUrl =
  process.env.SIKESRA_EMDASH_DATABASE_URL ??
  `postgresql://${localPostgresUser}:${localPostgresPassword}@127.0.0.1:${localPostgresPort}/${localPostgresDb}`;

console.log("[local] Starting SIKESRA API + DB via Docker Compose...");

const composeUp = spawnSync(
  "docker",
  ["compose", "--env-file", ".env.local", "-f", "compose.local.yaml", "up", "-d", "--build"],
  {
    cwd: sikesraRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      LOCAL_POSTGRES_PORT: localPostgresPort,
      LOCAL_POSTGRES_USER: localPostgresUser,
      LOCAL_POSTGRES_PASSWORD: localPostgresPassword,
      LOCAL_POSTGRES_DB: localPostgresDb,
    },
  },
);

if (composeUp.status !== 0) {
  process.exit(composeUp.status ?? 1);
}

console.log("[local] Starting EmDash/Astro core...");
console.log(`[local] API:   http://localhost:3000`);
console.log(`[local] Core:  http://localhost:${astroPort}`);
console.log(`[local] Setup: http://localhost:${astroPort}/_emdash/admin/setup`);

const astro = spawn("pnpm", ["astro", "dev", "--host", "0.0.0.0", "--port", astroPort], {
  cwd: upstreamCoreRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_TRANSPORT: process.env.DATABASE_TRANSPORT ?? "direct",
    MINI_RUNTIME_TARGET: process.env.MINI_RUNTIME_TARGET ?? "node",
    APP_SECRET: process.env.APP_SECRET ?? "dev-app-secret-min-32-characters-value",
    MINI_TOTP_ENCRYPTION_KEY:
      process.env.MINI_TOTP_ENCRYPTION_KEY ?? "dev-minitotp-key-at-least-32-bytes",
    TURNSTILE_SECRET_KEY:
      process.env.TURNSTILE_SECRET_KEY ?? "dev-turnstile-secret-placeholder",
    EDGE_API_JWT_SECRET:
      process.env.EDGE_API_JWT_SECRET ?? "dev-edge-jwt-secret-min-32-characters",
  },
});

writeFileSync(
  stateFile,
  JSON.stringify(
    {
      astroPid: astro.pid,
      astroPort,
      startedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

const forwardSignal = (signal) => {
  if (!astro.killed) {
    astro.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

astro.on("exit", (code, signal) => {
  if (existsSync(stateFile)) {
    unlinkSync(stateFile);
  }
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
