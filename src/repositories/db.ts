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
  private _tables: Map<string, Map<string, Record<string, unknown>>> = new Map();
  private _sequences: Map<string, number> = new Map();

  prepare(query: string): D1PreparedStatement {
    return new InMemoryPreparedStatement(query, this._tables, this._sequences);
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
  private _tables: Map<string, Map<string, Record<string, unknown>>>;
  private _sequences: Map<string, number>;
  private _params: unknown[] = [];

  constructor(
    query: string,
    tables: Map<string, Map<string, Record<string, unknown>>>,
    sequences: Map<string, number>,
  ) {
    this._query = query;
    this._tables = tables;
    this._sequences = sequences;
  }

  bind(...values: unknown[]): D1PreparedStatement {
    this._params = values;
    return this;
  }

  async first<T = Record<string, unknown>>(_colName?: string): Promise<T | null> {
    const result = await this.all<T>();
    return result.results.length > 0 ? result.results[0] : null;
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const { tableName, columns, whereClause, orderBy, limit, offset } = this.parseSelect();
    
    if (!tableName || !this._tables.has(tableName)) {
      return { results: [] as T[], success: true };
    }

    const table = this._tables.get(tableName)!;
    let rows = Array.from(table.values());

    // Apply WHERE clause
    if (whereClause) {
      rows = rows.filter((row) => this.evaluateWhere(whereClause, row));
    }

    // Apply ORDER BY
    if (orderBy) {
      const [col, dir] = orderBy;
      rows.sort((a, b) => {
        const aVal = a[col] ?? "";
        const bVal = b[col] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal));
        return dir === "DESC" ? -cmp : cmp;
      });
    }

    // Apply OFFSET and LIMIT
    const start = offset ?? 0;
    const end = limit ? start + limit : rows.length;
    const sliced = rows.slice(start, end);

    // Project columns
    const projected = sliced.map((row) => {
      if (columns && columns.length > 0 && !columns.includes("*")) {
        const projected: Record<string, unknown> = {};
        for (const col of columns) {
          projected[col] = row[col];
        }
        return projected;
      }
      return row;
    });

    return { results: projected as T[], success: true, meta: { rows_read: rows.length } };
  }

  async run(): Promise<D1Result> {
    const upperQuery = this._query.trim().toUpperCase();
    
    if (upperQuery.startsWith("INSERT")) {
      return this.executeInsert();
    } else if (upperQuery.startsWith("UPDATE")) {
      return this.executeUpdate();
    } else if (upperQuery.startsWith("DELETE")) {
      return this.executeDelete();
    } else if (upperQuery.startsWith("SELECT")) {
      const result = await this.all();
      return { results: result.results, success: true, meta: result.meta };
    }
    
    return { results: [], success: true, meta: { rows_written: 0 } };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    const result = await this.all();
    return result.results.map((row) => Object.values(row)) as T[];
  }

  private executeInsert(): D1Result {
    const { tableName, columns, values } = this.parseInsert();
    
    if (!tableName || !values || values.length === 0) {
      return { results: [], success: false, meta: { rows_written: 0 } };
    }

    if (!this._tables.has(tableName)) {
      this._tables.set(tableName, new Map());
    }

    const table = this._tables.get(tableName)!;
    const paramValues = this.resolveParams(values);
    
    // Build the row
    const row: Record<string, unknown> = {};
    if (columns) {
      for (let i = 0; i < columns.length; i++) {
        row[columns[i]] = paramValues[i] ?? null;
      }
    }

    // Use id column as key if available
    const id = row["id"] || `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    row["id"] = id;
    
    // Add timestamps if not present
    if (!row["created_at"]) {
      row["created_at"] = new Date().toISOString().replace("T", " ").substring(0, 19);
    }
    if (!row["updated_at"]) {
      row["updated_at"] = new Date().toISOString().replace("T", " ").substring(0, 19);
    }

    table.set(String(id), row);
    
    return { results: [], success: true, meta: { rows_written: 1 } };
  }

  private executeUpdate(): D1Result {
    const { tableName, setClauses, whereClause } = this.parseUpdate();
    
    if (!tableName || !this._tables.has(tableName)) {
      return { results: [], success: false, meta: { rows_written: 0 } };
    }

    const table = this._tables.get(tableName)!;
    let updatedCount = 0;

    for (const [id, row] of table.entries()) {
      if (whereClause && !this.evaluateWhere(whereClause, row)) {
        continue;
      }

      // Apply SET clauses
      const paramValues = this.resolveParams(setClauses.map(([, v]) => v));
      for (let i = 0; i < setClauses.length; i++) {
        const [col] = setClauses[i];
        row[col] = paramValues[i];
      }

      // Update timestamp
      row["updated_at"] = new Date().toISOString().replace("T", " ").substring(0, 19);
      
      table.set(id, row);
      updatedCount++;
    }

    return { results: [], success: true, meta: { rows_written: updatedCount } };
  }

  private executeDelete(): D1Result {
    const { tableName, whereClause } = this.parseDelete();
    
    if (!tableName || !this._tables.has(tableName)) {
      return { results: [], success: false, meta: { rows_written: 0 } };
    }

    const table = this._tables.get(tableName)!;
    let deletedCount = 0;

    // Check if this is a soft delete (setting deleted_at)
    if (this._query.toUpperCase().includes("DELETED_AT")) {
      // Actually an UPDATE in disguise
      return this.executeUpdate();
    }

    for (const [id, row] of table.entries()) {
      if (whereClause && !this.evaluateWhere(whereClause, row)) {
        continue;
      }

      table.delete(id);
      deletedCount++;
    }

    return { results: [], success: true, meta: { rows_written: deletedCount } };
  }

  private resolveParams(values: unknown[]): unknown[] {
    return values.map((v) => {
      if (v === "?") {
        return this._params.shift() ?? null;
      }
      return v;
    });
  }

  private parseSelect(): {
    tableName?: string;
    columns?: string[];
    whereClause?: string;
    orderBy?: [string, string];
    limit?: number;
    offset?: number;
  } {
    const query = this._query.trim();
    const upper = query.toUpperCase();
    
    // Extract table name
    const fromMatch = upper.match(/FROM\s+(\w+)/);
    const tableName = fromMatch ? fromMatch[1].toLowerCase() : undefined;
    
    // Extract columns
    const selectMatch = upper.match(/SELECT\s+(.+?)\s+FROM/);
    const columns = selectMatch 
      ? selectMatch[1].split(",").map((c) => c.trim().toLowerCase())
      : ["*"];
    
    // Extract WHERE clause
    const whereIndex = upper.indexOf("WHERE");
    const orderIndex = upper.indexOf("ORDER BY");
    const limitIndex = upper.indexOf("LIMIT");
    const offsetIndex = upper.indexOf("OFFSET");
    
    let whereClause: string | undefined;
    if (whereIndex !== -1) {
      const endIdx = orderIndex !== -1 ? orderIndex : limitIndex !== -1 ? limitIndex : query.length;
      whereClause = query.substring(whereIndex + 5, endIdx).trim();
    }
    
    // Extract ORDER BY
    let orderBy: [string, string] | undefined;
    if (orderIndex !== -1) {
      const endIdx = limitIndex !== -1 ? limitIndex : query.length;
      const orderClause = query.substring(orderIndex + 8, endIdx).trim();
      const parts = orderClause.split(/\s+/);
      orderBy = [parts[0].toLowerCase(), parts[1]?.toUpperCase() || "ASC"];
    }
    
    // Extract LIMIT
    let limit: number | undefined;
    if (limitIndex !== -1) {
      const endIdx = offsetIndex !== -1 ? offsetIndex : query.length;
      limit = parseInt(query.substring(limitIndex + 5, endIdx).trim(), 10);
    }
    
    // Extract OFFSET
    let offset: number | undefined;
    if (offsetIndex !== -1) {
      offset = parseInt(query.substring(offsetIndex + 6).trim(), 10);
    }
    
    return { tableName, columns, whereClause, orderBy, limit, offset };
  }

  private parseInsert(): {
    tableName?: string;
    columns?: string[];
    values?: unknown[];
  } {
    const query = this._query.trim();
    const upper = query.toUpperCase();
    
    // Extract table name
    const intoMatch = upper.match(/INTO\s+(\w+)/);
    const tableName = intoMatch ? intoMatch[1].toLowerCase() : undefined;
    
    // Extract columns
    const columnsMatch = query.match(/\(([^)]+)\)\s*VALUES/i);
    const columns = columnsMatch 
      ? columnsMatch[1].split(",").map((c) => c.trim().toLowerCase())
      : undefined;
    
    // Extract values
    const valuesMatch = query.match(/VALUES\s*\(([^)]+)\)/i);
    let values: unknown[] | undefined;
    if (valuesMatch) {
      values = valuesMatch[1].split(",").map((v) => {
        const trimmed = v.trim();
        if (trimmed === "?") {
          return this._params.shift() ?? null;
        }
        if (trimmed === "NULL") return null;
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
          return trimmed.slice(1, -1);
        }
        const num = Number(trimmed);
        return isNaN(num) ? trimmed : num;
      });
    }
    
    return { tableName, columns, values };
  }

  private parseUpdate(): {
    tableName?: string;
    setClauses: [string, unknown][];
    whereClause?: string;
  } {
    const query = this._query.trim();
    const upper = query.toUpperCase();
    
    // Extract table name
    const updateMatch = upper.match(/UPDATE\s+(\w+)/);
    const tableName = updateMatch ? updateMatch[1].toLowerCase() : undefined;
    
    // Extract SET clauses
    const setMatch = upper.match(/SET\s+(.+?)(?:\s+WHERE|$)/);
    const setClauses: [string, unknown][] = [];
    if (setMatch) {
      const setStr = setMatch[1];
      const clauses = setStr.split(",");
      for (const clause of clauses) {
        const parts = clause.split("=");
        if (parts.length === 2) {
          const col = parts[0].trim().toLowerCase();
          const val = parts[1].trim();
          setClauses.push([col, val === "?" ? "?" : val]);
        }
      }
    }
    
    // Extract WHERE clause
    const whereIndex = upper.indexOf("WHERE");
    let whereClause: string | undefined;
    if (whereIndex !== -1) {
      whereClause = query.substring(whereIndex + 5).trim();
    }
    
    return { tableName, setClauses, whereClause };
  }

  private parseDelete(): {
    tableName?: string;
    whereClause?: string;
  } {
    const query = this._query.trim();
    const upper = query.toUpperCase();
    
    // Extract table name
    const fromMatch = upper.match(/FROM\s+(\w+)/);
    const tableName = fromMatch ? fromMatch[1].toLowerCase() : undefined;
    
    // Extract WHERE clause
    const whereIndex = upper.indexOf("WHERE");
    let whereClause: string | undefined;
    if (whereIndex !== -1) {
      whereClause = query.substring(whereIndex + 5).trim();
    }
    
    return { tableName, whereClause };
  }

  private evaluateWhere(whereClause: string, row: Record<string, unknown>): boolean {
    if (!whereClause) return true;
    
    // Handle IN clause
    const inMatch = whereClause.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
    if (inMatch) {
      const col = inMatch[1].toLowerCase();
      const values = inMatch[2].split(",").map((v) => {
        const trimmed = v.trim();
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
        return trimmed;
      });
      const rowVal = String(row[col] ?? "");
      if (!values.includes(rowVal)) return false;
    }
    
    // Handle IS NULL
    const isNullMatch = whereClause.match(/(\w+)\s+IS\s+NULL/i);
    if (isNullMatch) {
      const col = isNullMatch[1].toLowerCase();
      if (row[col] !== null && row[col] !== undefined) return false;
    }
    
    // Handle IS NOT NULL
    const isNotNullMatch = whereClause.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
    if (isNotNullMatch) {
      const col = isNotNullMatch[1].toLowerCase();
      if (row[col] === null || row[col] === undefined) return false;
    }
    
    // Handle LIKE
    const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+'([^']+)'/i);
    if (likeMatch) {
      const col = likeMatch[1].toLowerCase();
      const pattern = likeMatch[2].replace(/%/g, ".*").replace(/_/g, ".");
      const rowVal = String(row[col] ?? "");
      if (!new RegExp(`^${pattern}$`, "i").test(rowVal)) return false;
    }
    
    // Handle = comparisons
    const eqMatches = whereClause.matchAll(/(\w+)\s*=\s*([^AND\s]+)/g);
    for (const match of eqMatches) {
      const col = match[1].toLowerCase();
      const expected = match[2].replace(/['"]/g, "").trim();
      const rowVal = String(row[col] ?? "");
      if (rowVal !== expected) return false;
    }
    
    // Handle != comparisons
    const neqMatches = whereClause.matchAll(/(\w+)\s*!=\s*([^AND\s]+)/g);
    for (const match of neqMatches) {
      const col = match[1].toLowerCase();
      const expected = match[2].replace(/['"]/g, "").trim();
      const rowVal = String(row[col] ?? "");
      if (rowVal === expected) return false;
    }
    
    // Handle >= comparisons
    const gteMatches = whereClause.matchAll(/(\w+)\s*>=\s*(\d+)/g);
    for (const match of gteMatches) {
      const col = match[1].toLowerCase();
      const expected = Number(match[2]);
      const rowVal = Number(row[col] ?? 0);
      if (rowVal < expected) return false;
    }
    
    // Handle <= comparisons
    const lteMatches = whereClause.matchAll(/(\w+)\s*<=\s*(\d+)/g);
    for (const match of lteMatches) {
      const col = match[1].toLowerCase();
      const expected = Number(match[2]);
      const rowVal = Number(row[col] ?? 0);
      if (rowVal > expected) return false;
    }
    
    // Handle AND conditions (basic)
    if (whereClause.includes(" AND ")) {
      const conditions = whereClause.split(" AND ");
      return conditions.every((cond) => this.evaluateWhere(cond.trim(), row));
    }
    
    return true;
  }
}
