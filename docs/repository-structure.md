# Repository Structure

## Parent Workspace Layout

This repository follows the same parent layout used by `awcms-micro`:

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
| `emdash-latest/` | Clean upstream EmDash reference tree |
| `awcmsmicro-dev/` | Active downstream implementation workspace |
| `docs/` | Root governance, sync, and operator documentation |
| `scripts/` | Root maintenance and validation scripts |

## Approved Downstream Boundaries

| Boundary | Purpose |
| --- | --- |
| `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/` | Example downstream template |
| `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/` | Example downstream Cloudflare template |
| `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` | Canonical SIKESRA plugin package |
| `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/` | Reserved downstream demo boundary |
| `awcmsmicro-dev/docs/awcms-micro/sikesra/` | Downstream architecture and product docs |
| `awcmsmicro-dev/e2e/awcms-micro/sikesra/` | Downstream E2E boundary |

## Supporting Control Files

- Protected path inventory: `scripts/awcmsmicro-dev-protected-paths.txt`
- Boundary policy: `docs/awcms-micro-implementation-boundaries.md`
- Sync workflow: `docs/synchronization-workflow.md`
- Divergence tracking: `docs/divergence-log.md`

## Current Notes

- `awcmsmicro-dev/` is the editable downstream tree.
- `emdash-latest/` is retained as the upstream comparison baseline.
- The legacy compatibility shim at `awcmsmicro-dev/packages/plugins/sikesra/` still exists and should be treated as transitional.
