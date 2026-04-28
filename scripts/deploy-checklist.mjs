#!/usr/bin/env node

const lines = [
  "SIKESRA Quick Deploy Checklist",
  "",
  "1) Local Validate",
  "   pnpm docker:local:up",
  "   pnpm docker:local:migrate",
  "   pnpm check",
  "   docker build -t sikesra-local-test .",
  "",
  "2) Promote",
  "   - Open PR from reviewed changes",
  "   - Merge to deployment branch",
  "   - Deploy merged commit from remote Coolify",
  "",
  "3) Remote Verify",
  "   node scripts/verify-runtime-readiness.mjs",
  "   pnpm verify:live-runtime -- https://sikesrakobar.ahlikoding.com",
  "",
  "References:",
  "- DEPLOYMENT.md",
  "- docs/process/local-compose-remote-coolify-workflow.md",
  "- docs/process/migration-deployment-checklist.md",
];

process.stdout.write(`${lines.join("\n")}\n`);
