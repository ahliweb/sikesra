# Repository Structure

## Target Pattern

The target parent repository shape from `tmp/prompt-refactor` is:

```txt
sikesra/
  emdash-latest/
  awcmsmicro-dev/
  docs/
  scripts/
```

## Current In-Place Mapping

This repository currently maps to the `awcmsmicro-dev/` subtree so the existing pnpm workspace remains stable during the refactor.

| Target role | Current path |
| --- | --- |
| `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` | `packages/plugins/awcms-micro-sikesra/` canonical primary package |
| `awcmsmicro-dev/templates/awcms-micro-sikesra/` | `templates/awcms-micro-sikesra/` scaffold |
| `awcmsmicro-dev/templates/awcms-micro-sikesra-cloudflare/` | `templates/awcms-micro-sikesra-cloudflare/` scaffold |
| `awcmsmicro-dev/demos/awcms-micro-sikesra-cloudflare/` | `demos/awcms-micro-sikesra-cloudflare/` scaffold |
| `awcmsmicro-dev/docs/awcms-micro/sikesra/` | `docs/awcms-micro/sikesra/` |
| `awcmsmicro-dev/e2e/awcms-micro/sikesra/` | `e2e/awcms-micro/sikesra/` scaffold |
| `awcmsmicro-dev` sync control docs | `docs/*.md` in this repo root |
| protected path inventory | `scripts/awcmsmicro-dev-protected-paths.txt` |

## Intentionally Deferred

- Literal nesting of the entire current workspace under `awcmsmicro-dev/`
- A checked-in `emdash-latest/` sibling tree inside this repo root
- Final retirement of the legacy compatibility shim at `packages/plugins/sikesra/`

These are tracked as known divergences so the workspace remains buildable while the architecture policy is added first.
