import type { D1Binding } from "../repositories/db";
import { getDb } from "emdash/runtime";

type RawKyselyDb = {
  executeQuery(query: { sql: string; parameters: unknown[]; query: { kind: "RawNode"; sqlFragments: string[]; parameters: unknown[] } }): Promise<{ rows?: Record<string, unknown>[] }>;
};

class KyselyPreparedStatement {
  private params: unknown[] = [];

  constructor(
    private readonly db: RawKyselyDb,
    private readonly query: string,
  ) {}

  bind(...values: unknown[]) {
    if (values.length === 1 && typeof values[0] === "object" && values[0] !== null && !Array.isArray(values[0])) {
      this.params = Object.values(values[0] as Record<string, unknown>);
      return this;
    }
    this.params = values;
    return this;
  }

  private async execute(): Promise<Record<string, unknown>[]> {
    const result = await this.db.executeQuery({
      sql: this.query,
      parameters: this.params,
      query: { kind: "RawNode", sqlFragments: [this.query], parameters: this.params },
    });
    return result.rows ?? [];
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const rows = await this.execute();
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta?: { rows_read?: number; rows_written?: number } }> {
    const rows = await this.execute();
    return { results: rows as T[], success: true, meta: { rows_read: rows.length } };
  }

  async run(): Promise<{ results: never[]; success: boolean; meta?: { rows_read?: number; rows_written?: number } }> {
    await this.execute();
    return { results: [], success: true, meta: { rows_written: 1 } };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const rows = await this.execute();
    return rows as T[];
  }
}

class KyselyD1Adapter implements D1Binding {
  constructor(private readonly db: RawKyselyDb) {}

  prepare(query: string) {
    return new KyselyPreparedStatement(this.db, query);
  }

  async batch(statements: KyselyPreparedStatement[]) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }

  async exec(query: string) {
    return this.prepare(query).run();
  }
}

// Module-level cached adapter instance
let _cachedAdapter: D1Binding | null = null;

/**
 * Set a test D1 binding to use instead of the production adapter.
 * Call this in test setup to inject a mock or in-memory D1 binding.
 */
export function setTestDb(db: D1Binding | null): void {
  _cachedAdapter = db;
}

/**
 * Get the D1 binding adapter for route handlers.
 *
 * EmDash plugin routes receive the raw Request object without Astro locals,
 * so we use getDb() from emdash/runtime which initializes a Kysely instance
 * from virtual modules (configured at build time in astro.config.mjs).
 *
 * In tests, use setTestDb() to inject a mock or in-memory binding.
 */
export async function getRouteDb(_request?: Request): Promise<D1Binding> {
  if (_cachedAdapter) return _cachedAdapter;

  const kyselyDb = await getDb();
  _cachedAdapter = new KyselyD1Adapter(kyselyDb as unknown as RawKyselyDb);
  return _cachedAdapter;
}
