export { createDatabase, EmDashDatabaseError } from "./connection.js";
export type { DatabaseConfig } from "./connection.js";
export { runMigrations, getMigrationStatus, rollbackMigration } from "./migrations/runner.js";
export type { MigrationStatus } from "./migrations/runner.js";
export type * from "./types.js";
