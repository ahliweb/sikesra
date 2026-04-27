import { loadLocalEnv } from "./_local-env.mjs";
import { createSikesraDatabaseAccess } from "../src/db/index.mjs";
import { createSikesraMigrationRunner } from "../src/db/migrations/runner.mjs";

function main() {
  loadLocalEnv();

  const command = process.argv[2] ?? "status";
  if (command !== "status") {
    console.error(
      JSON.stringify(
        {
          ok: false,
          command,
          error: "Unsupported migration command in current scaffold. Use status only.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const database = createSikesraDatabaseAccess(process.env);
  const runner = createSikesraMigrationRunner();

  console.log(
    JSON.stringify(
      {
        ok: true,
        command,
        database: {
          seam: database.seam,
          connection: database.getConnectionSummary(),
        },
        migrations: runner.getStatus(),
        redaction: "No passwords, tokens, or connection strings are printed.",
      },
      null,
      2,
    ),
  );
}

main();
