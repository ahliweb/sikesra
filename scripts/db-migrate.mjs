import { loadLocalEnv } from "./_local-env.mjs";
import { createSikesraDatabaseAccess } from "../src/db/index.mjs";
import { createSikesraMigrationRunner } from "../src/db/migrations/runner.mjs";

async function main() {
  loadLocalEnv();

  const command = process.argv[2] ?? "status";
  if (!["status", "up", "probe"].includes(command)) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command,
          error: "Unsupported repository migration command. Use probe, status, or up.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const database = createSikesraDatabaseAccess(process.env);
  const runner = createSikesraMigrationRunner();

  try {
    const client = database.createMigrationClient();
    const output =
      command === "probe"
        ? {
            ok: true,
            command,
            database: {
              seam: database.seam,
              connection: database.getConnectionSummary(),
              migrationConnection: database.getMigrationConnectionSummary(),
            },
            probe: client.probeReachability(),
            redaction: "No passwords, tokens, or connection strings are printed.",
          }
        : command === "up"
        ? {
            ok: true,
            command,
            database: {
              seam: database.seam,
              connection: database.getConnectionSummary(),
              migrationConnection: database.getMigrationConnectionSummary(),
            },
            migrations: await runner.applyPendingAtomically(client),
            redaction: "No passwords, tokens, or connection strings are printed.",
          }
        : {
            ok: true,
            command,
            database: {
              seam: database.seam,
              connection: database.getConnectionSummary(),
              migrationConnection: database.getMigrationConnectionSummary(),
            },
            migrations: runner.getLiveStatus(client),
            redaction: "No passwords, tokens, or connection strings are printed.",
          };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command,
          database: {
            seam: database.seam,
            connection: database.getConnectionSummary(),
            migrationConnection: database.getMigrationConnectionSummary(),
          },
          error: {
            kind: error?.kind ?? "unknown",
            reason: error?.reason ?? "unexpected_failure",
            message: error?.message ?? "Repository migration command failed.",
          },
          redaction: "No passwords, tokens, or connection strings are printed.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
