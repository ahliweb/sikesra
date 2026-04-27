import { serve } from "@hono/node-server";
import { getEnv } from "./config/env.js";
import { closeDb } from "./config/database.js";
import { app } from "./app.js";

const env = getEnv();

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
    hostname: "0.0.0.0",
  },
  (info) => {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "SIKESRA API started",
        port: info.port,
        env: env.NODE_ENV,
        pid: process.pid,
      }),
    );
  },
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ level: "info", msg: `Received ${signal}, shutting down…` }));
  server.close(async () => {
    await closeDb();
    console.log(JSON.stringify({ level: "info", msg: "Server closed cleanly." }));
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
