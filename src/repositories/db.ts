// SIKESRA D1 Database Adapter
// Abstraction over Cloudflare D1 binding
// Source: docs/sikesra/03_data_model.md, EmDash deployment docs

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: { rows_read?: number; rows_written?: number };
}

export interface D1Binding {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  exec(query: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  bind(params: Record<string, unknown>): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
  raw<T = unknown[]>(): Promise<T[]>;
}

// In-memory adapter for testing/development
export class InMemoryD1Binding implements D1Binding {
  private _tables: Map<string, Record<string, unknown>[]> = new Map();

  prepare(query: string): D1PreparedStatement {
    return new InMemoryPreparedStatement(query, this._tables);
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    const results: D1Result[] = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }

  async exec(query: string): Promise<D1Result> {
    return this.prepare(query).run();
  }
}

class InMemoryPreparedStatement implements D1PreparedStatement {
  private _query: string;
  private _tables: Map<string, Record<string, unknown>[]>;
  private _params: unknown[] = [];

  constructor(query: string, tables: Map<string, Record<string, unknown>[]>) {
    this._query = query;
    this._tables = tables;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this._params = values;
    return this;
  }

  async first<T = Record<string, unknown>>(_colName?: string): Promise<T | null> {
    return null;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    return { results: [] as T[], success: true };
  }

  async run(): Promise<D1Result> {
    return { results: [], success: true, meta: { rows_written: 0 } };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    return [] as T[];
  }
}
