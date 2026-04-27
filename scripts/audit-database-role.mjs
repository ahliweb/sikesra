import postgres from "postgres";

import { buildDefaultEnvFiles, hasValue, loadLocalEnv } from "./_local-env.mjs";

function summarizeUrl(raw) {
  if (!hasValue(raw)) return { configured: false, parseable: false, username: null, database: null };

  try {
    const url = new URL(raw);
    return {
      configured: true,
      parseable: true,
      username: hasValue(url.username) ? url.username : null,
      database: url.pathname.replace(/^\//, "") || null,
    };
  } catch {
    return { configured: true, parseable: false, username: null, database: null };
  }
}

function resolveRuntimeUrl(env = process.env) {
  if (hasValue(env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE)) {
    return env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;
  }

  return env.DATABASE_URL;
}

async function auditRole(url) {
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 15,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    onnotice: () => {},
  });

  try {
    const rows = await sql`
      select
        current_user::text as current_user,
        current_database()::text as current_database,
        r.rolsuper as is_superuser,
        r.rolcreatedb as can_create_db,
        r.rolcreaterole as can_create_role,
        r.rolreplication as can_replicate,
        r.rolbypassrls as can_bypass_rls
      from pg_roles r
      where r.rolname = current_user
    `;

    const role = rows[0] ?? {};
    const checks = {
      roleResolved: hasValue(role.current_user),
      dedicatedRuntimeRole: hasValue(role.current_user) && role.current_user !== "postgres",
      notSuperuser: role.is_superuser === false,
      noCreateDb: role.can_create_db === false,
      noCreateRole: role.can_create_role === false,
      noReplication: role.can_replicate === false,
      noBypassRls: role.can_bypass_rls === false,
    };

    return {
      ok: Object.values(checks).every(Boolean),
      role: {
        currentUser: role.current_user ?? null,
        currentDatabase: role.current_database ?? null,
        isSuperuser: role.is_superuser ?? null,
        canCreateDb: role.can_create_db ?? null,
        canCreateRole: role.can_create_role ?? null,
        canReplicate: role.can_replicate ?? null,
        canBypassRls: role.can_bypass_rls ?? null,
      },
      checks,
    };
  } finally {
    await sql.end();
  }
}

async function main() {
  loadLocalEnv(buildDefaultEnvFiles(process.env));

  const runtimeUrl = resolveRuntimeUrl(process.env);
  if (!hasValue(runtimeUrl)) {
    throw new Error(
      "Missing DATABASE_URL or CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE.",
    );
  }

  const runtimeSummary = summarizeUrl(runtimeUrl);
  const migrationSummary = summarizeUrl(process.env.DATABASE_MIGRATION_URL);
  const runtimeAudit = await auditRole(runtimeUrl);
  const migrationRoleDistinct =
    migrationSummary.configured && migrationSummary.parseable
      ? migrationSummary.username !== runtimeSummary.username
      : null;

  const checks = {
    runtimeRoleLeastPrivilege: runtimeAudit.ok,
    migrationRoleDistinct,
  };

  console.log(
    JSON.stringify(
      {
        service: "sikesra-database-role-audit",
        ok:
          runtimeAudit.ok &&
          (migrationRoleDistinct === null || migrationRoleDistinct === true),
        runtimeConnection: runtimeSummary,
        migrationConnection: migrationSummary,
        runtimeAudit,
        checks,
        redaction:
          "No passwords, tokens, connection strings, hosts, or raw query payloads are printed.",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        service: "sikesra-database-role-audit",
        ok: false,
        error: error.message,
        redaction:
          "No passwords, tokens, connection strings, hosts, or raw query payloads are printed.",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
