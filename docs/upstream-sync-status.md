# Upstream Sync Status

## 2026-05-22 Update

- Upstream `emdash-latest` was successfully synchronized from `https://github.com/emdash-cms/emdash.git`.
- `awcmsmicro-dev` was rebuilt with all protected SIKESRA paths correctly preserved.
- **Node Environment**: Updated local Node.js to v22.22.3 via `nvm` to support upstream's `pnpm@11` requirement (which depends on `node:sqlite`).
- **Validation Status**: `pnpm lint:quick` currently fails due to 139 upstream `oxlint` violations related to `no-underscore-dangle` rules. These lint failures originate directly from the `emdash-latest` upstream codebase and block the `validate-after-sync.sh` script from completing its `test` and `build` pipeline natively. This is a known upstream issue and has been documented.
