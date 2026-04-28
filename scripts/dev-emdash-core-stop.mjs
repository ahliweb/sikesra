#!/usr/bin/env node

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sikesraRoot = resolve(__dirname, "..");
const stateFile = resolve(sikesraRoot, "temp/dev-emdash-core.state.json");

function stopCompose() {
  console.log("[local] Stopping SIKESRA API + DB compose stack...");

  const result = spawnSync(
    "docker",
    ["compose", "--env-file", ".env.local", "-f", "compose.local.yaml", "down"],
    {
      cwd: sikesraRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stopAstroFromState() {
  if (!existsSync(stateFile)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(stateFile, "utf8"));
    const astroPid = Number(parsed?.astroPid);

    if (Number.isFinite(astroPid) && astroPid > 0) {
      try {
        process.kill(astroPid, "SIGTERM");
        console.log(`[local] Sent SIGTERM to EmDash/Astro core pid ${astroPid}.`);
      } catch {
        console.log(`[local] EmDash/Astro core pid ${astroPid} is not running.`);
      }
    }
  } finally {
    unlinkSync(stateFile);
  }

  return true;
}

function stopAstroFallback() {
  const result = spawnSync("pkill", ["-f", "pnpm astro dev --host 0.0.0.0 --port"], {
    stdio: "ignore",
  });

  if ((result.status ?? 1) === 0) {
    console.log("[local] Sent SIGTERM to matching Astro dev process(es) via fallback.");
  }
}

const hadState = stopAstroFromState();
if (!hadState) {
  stopAstroFallback();
}
stopCompose();

console.log("[local] dev:emdash-core services stopped.");
