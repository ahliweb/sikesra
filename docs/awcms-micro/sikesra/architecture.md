# Architecture

## Runtime Shape

- EmDash provides the upstream CMS runtime.
- SIKESRA is implemented as a plugin in `packages/plugins/sikesra/`.
- Public presentation is owned by the host site route `/sikesra`.
- Admin routes mount under `/_emdash/admin/plugins/sikesra/*`.
- Plugin API routes mount under `/_emdash/api/plugins/sikesra/v1/*`.

## Current Divergence

The canonical path rename to `packages/plugins/awcms-micro-sikesra/` is still pending. The existing package path remains the active implementation to avoid broad path churn while the architecture policy lands first.
