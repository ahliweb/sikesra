// SIKESRA Dashboard Route Handler
// Source: docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import { getDb } from "emdash/runtime";
import { getAdminDashboard } from "../services/dashboard";
import { getPublicMetadata, getPublicFilters, getPublicSummary } from "../services/public";
import { buildContextFromEmDash, withHandlerSequence, type EmDashRouteContext, type RouteHandlerInput } from "./handler-utils";
import type { SikesraRequestContext } from "../security/request-context";

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

async function getCloudflareDbFromRequest(request: Request): Promise<D1Binding> {
  const locals = (request as Request & { [key: symbol]: { runtime?: { env?: { SIKESRA_DB?: D1Binding; DB?: D1Binding } } } })[Symbol.for("astro.locals")];
  const db = locals?.runtime?.env?.SIKESRA_DB ?? locals?.runtime?.env?.DB;
  if (db) {
    return db;
  }

  return new KyselyD1Adapter(await getDb() as unknown as RawKyselyDb);
}

// GET /dashboard
export const dashboardHandler = withHandlerSequence(async (_: RouteHandlerInput, db: D1Binding, ctx: SikesraRequestContext) => {
  return getAdminDashboard(ctx);
});

// Public routes (no auth required)
export const publicMetadataHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getCloudflareDbFromRequest(routeCtx.request);
  return getPublicMetadata(db, ctx);
};

export const publicFiltersHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getCloudflareDbFromRequest(routeCtx.request);
  return getPublicFilters(db, ctx);
};

export const publicSummaryHandler = async (routeCtx: EmDashRouteContext) => {
  const ctx = buildContextFromEmDash(routeCtx);
  const db = await getCloudflareDbFromRequest(routeCtx.request);
  const url = new URL(routeCtx.request.url);
  const year = url.searchParams.get("year");

  return getPublicSummary(db, ctx, {
    districtCode: url.searchParams.get("districtCode") ?? undefined,
    villageCode: url.searchParams.get("villageCode") ?? undefined,
    objectTypeCode: url.searchParams.get("objectTypeCode") ?? undefined,
    year: year ? Number(year) : undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
};
