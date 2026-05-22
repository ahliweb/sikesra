# Upstream Sync Status

## Status

- Current workspace role: in-place `awcmsmicro-dev`
- Parent sibling-tree layout: not yet materialized in this repo root
- EmDash upstream baseline: current repo history plus documented SIKESRA overlay

## Last Refactor Step

- Added canonical protected-path scaffolds for template, plugin, demo, docs, and e2e targets.
- Updated sync and validation scripts to work in both parent-layout and in-place workspace modes.
- Promoted `packages/plugins/awcms-micro-sikesra/` to the primary package with copied source, tests, migrations, and seeds.

## Blocking Items For Full Parent Layout

- Moving the entire active pnpm workspace under a new `awcmsmicro-dev/` child directory
- Adding a tracked `emdash-latest/` sibling tree or an external sync source
- Retiring the remaining legacy compatibility shim and updating external consumers to `@ahliweb/awcms-micro-sikesra`

## Validation Notes

Record lint, typecheck, test, and build results for each future upstream sync here.
