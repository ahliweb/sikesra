# EmDash Drift Gate

## Purpose

Use this as the lightweight repository-side gate when reviewing future upstream EmDash changes.

## What It Covers

- SIKESRA host-registration metadata
- admin/setup smoke entrypoints
- the combined live verification wrapper
- canonical smoke paths under `/_emdash/`

## Gate

Run the normal validation path:

```bash
pnpm check
```

That suite includes the reviewed drift-gate unit test, which flags changes in the plugin seam or smoke CLI contract before they are treated as safe local updates.

## When To Refresh

- after pulling a new upstream `ahliweb/emdash-awcms` baseline
- after adjusting the reviewed `/_emdash/` setup or smoke flow
- after changing host-registration metadata or the CLI verification contract

## Cross-References

- `docs/process/runtime-smoke-test.md`
- `docs/process/cloudflare-hosted-runtime.md`
- `docs/process/migration-deployment-checklist.md`
