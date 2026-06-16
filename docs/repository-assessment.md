# Repository Assessment

## Current Assessment (Updated June 2026)

- The repository already follows the parent-workspace shape with `emdash-latest/` and `awcmsmicro-dev/` checked in, and no separate `emdash/` checkout.
- Root governance docs previously lagged behind the structure used by `awcms-micro`, and separately lagged behind the real SIKESRA plugin implementation — both gaps were corrected in June 2026 after a direct code/repo audit (see `docs/prd/03.PLUGIN_ARCHITECTURE.md` §8 and §8a, and `docs/decision-records.md`).
- Canonical template naming uses `awcms-sikesraTemplate` (default) and `awcms-sikesraTemplate-cloudflare` (Cloudflare deployment target) — **not** `awcms-micro-sikesraTemplate`, which was a planned rename that never landed on disk.
- Canonical plugin naming is `awcms-sikesra` (npm `@ahliweb/awcms-sikesra`, plugin ID `awcms-sikesra`) — a leftover duplicate package under the old `@awcms-micro/plugin-sikesra` name still exists at `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/` but is unreferenced by any workspace/template/CI config (cleanup tracked in `docs/prd/02.IMPLEMENTATION_BACKLOG.md` H2-05).
- `docs/prd/` is now the canonical, code-verified source of truth for SIKESRA product/technical documentation; other docs referencing SIKESRA specifics should defer to it rather than duplicating claims.

## Maintenance Focus

- Keep root docs aligned with actual layout and the `awcms-micro` upstream.
- Keep downstream work isolated to approved boundaries (see `awcms-micro-implementation-boundaries.md`).
- Reduce undocumented divergence from upstream EmDash.
- Periodically re-verify `docs/prd/` claims against the real plugin code — documentation drift (not just upstream drift) is a recurring risk for this project, as the June 2026 audit demonstrated.
