import postgres from "postgres";
import { getEnv } from "./env.js";

let _sql: ReturnType<typeof postgres> | undefined;

export function getDb(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const env = getEnv();
  const url = process.env["DATABASE_INTERNAL_URL"] ?? env.DATABASE_URL;
  const isInternalDockerUrl = Boolean(process.env["DATABASE_INTERNAL_URL"]);
  _sql = postgres(url, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 15,
    ssl:
      env.NODE_ENV === "production" && !isInternalDockerUrl
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return _sql;
}

export function resolveRuntimeDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env["DATABASE_INTERNAL_URL"] ?? env["DATABASE_URL"];
}

export function getDatabaseRuntimePosture(env: NodeJS.ProcessEnv = process.env) {
  const raw = resolveRuntimeDatabaseUrl(env);

  if (!raw) {
    return { ok: false, posture: null };
  }

  try {
    const url = new URL(raw);

    return {
      ok: true,
      posture: {
        transport: "direct",
        hostname: url.hostname,
        sslmode: normalizeOptionalString(url.searchParams.get("sslmode")),
        source: env.DATABASE_INTERNAL_URL ? "DATABASE_INTERNAL_URL" : "DATABASE_URL",
      },
    };
  } catch {
    return { ok: false, posture: null };
  }
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end();
    _sql = undefined;
  }
}

export async function checkDbConnectivity(): Promise<"ok" | "error"> {
  try {
    const sql = getDb();
    await sql`SELECT 1`;
    return "ok";
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Database connectivity failed",
          error: {
            name: error.name,
            message: error.message,
          },
        }),
      );
    }
    return "error";
  }
}

function normalizeOptionalString(value: string | null): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}
