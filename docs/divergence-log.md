# Divergence Log

This file records deliberate downstream differences from the checked-in EmDash baseline and from a plain `awcms-micro` maintenance workspace.

## Active Divergence Categories (Current — Verified Against Code, June 2026)

- SIKESRA-specific plugin behavior under `awcmsmicro-dev/packages/plugins/awcms-sikesra/` (plugin ID `awcms-sikesra`, npm `@ahliweb/awcms-sikesra`)
- SIKESRA-specific template boundaries under `awcmsmicro-dev/templates/awcms-sikesraTemplate/` and `awcmsmicro-dev/templates/awcms-sikesraTemplate-cloudflare/`
- SIKESRA-specific PRD and technical docs under `docs/prd/` (canonical reference — see `docs/prd/20.MASTER_DOCUMENT_INDEX.md`)

## Superseded Divergence Categories (Historical — Do Not Treat as Current)

The paths below were recorded in earlier versions of this file and never matched, or no longer match, the real filesystem. Kept here only as a chronological record — see `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8a for the full three-generation history.

- ~~`awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`~~ — leftover duplicate from a rename that was completed differently (real path is `awcms-sikesra`, without `-micro`). Still git-tracked but unreferenced by any workspace/template/CI config; flagged for removal in `docs/prd/02.IMPLEMENTATION_BACKLOG.md` H2-05.
- ~~`awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/` and `awcms-micro-sikesraTemplate-cloudflare/`~~ — never existed on disk; the real templates are `awcms-sikesraTemplate`/`awcms-sikesraTemplate-cloudflare`.
- ~~`awcmsmicro-dev/docs/awcms-micro/sikesra/`~~ — planning documents for a rename that was never completed (the directory's own `architecture.md` admitted "the canonical path rename ... is still pending"). Archived with a notice — see `awcmsmicro-dev/docs/awcms-micro/sikesra/README.md`.
- ~~Transitional compatibility shim at `awcmsmicro-dev/packages/plugins/sikesra/`~~ — never created. References to it (e.g. in old `scripts/sikesra-seed.mjs`) point at a path that doesn't exist; those scripts are archived in `scripts/archive/`.

## Recording Rules

For each non-trivial divergence, record:

1. The affected path.
2. Why the divergence exists.
3. Whether the change is temporary or intended long-term.
4. How to roll it back or upstream it.
5. What verification was used.
