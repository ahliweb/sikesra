# Repository Structure

## Parent Workspace Layout

This repository follows the same parent layout used by `awcms-micro`, but keeps only the checked-in `emdash-latest/` baseline instead of a separate `emdash/` checkout:

```txt
sikesra/
  emdash-latest/
  awcmsmicro-dev/
  docs/
  scripts/
```

## Directory Roles

| Path | Role |
| --- | --- |
| `emdash-latest/` | Clean EmDash baseline/reference tree |
| `awcmsmicro-dev/` | Active downstream implementation workspace |
| `docs/` | Root governance, sync, and operator documentation |
| `scripts/` | Root maintenance and validation scripts |

## Approved Downstream Boundaries

| Boundary | Purpose |
| --- | --- |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate/` | Example downstream template |
| `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/` | Example downstream Cloudflare template |
| `awcmsmicro-dev/packages/plugins/awcms-sikesra/` | Canonical SIKESRA plugin package |
| `awcmsmicro-dev/demos/cloudflare/` | Reserved downstream demo boundary |
| `awcmsmicro-dev/docs/awcms-micro/sikesra/` | Downstream architecture and product docs |
| `awcmsmicro-dev/e2e/awcms-micro/sikesra/` | Downstream E2E boundary |

## Supporting Control Files

- Protected path inventory: `scripts/awcms-micro-protected-paths.txt`
- Boundary policy: `docs/awcms-micro-implementation-boundaries.md`
- Sync workflow: `docs/synchronization-workflow.md`
- Divergence tracking: `docs/divergence-log.md`

## Current Notes

- `awcmsmicro-dev/` is the editable downstream tree.
- `emdash-latest/` is retained as the local EmDash comparison baseline.
- The active downstream package and template names use the `awcms-sikesra` / `awcms-sikesraTemplate` suffixes.
