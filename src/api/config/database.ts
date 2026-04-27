import postgres from "postgres";
import { getEnv } from "./env.js";

let _sql: ReturnType<typeof postgres> | undefined;

export function getDb(): ReturnType<typeof postgres> {
  if (_sql) return _sql;

  const env = getEnv();
  _sql = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 15,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  return _sql;
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
  } catch {
    return "error";
  }
}
