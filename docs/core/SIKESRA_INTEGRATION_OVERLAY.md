# SIKESRA Integration Overlay

This repository now restores the SIKESRA shell as a workspace plugin at `packages/plugins/sikesra`.

Current integration contract:

- Register `sikesraPlugin()` through normal EmDash plugin configuration.
- Admin pages mount under `/_emdash/admin/plugins/sikesra/*` through the supported plugin shell.
- Plugin routes mount under `/_emdash/api/plugins/sikesra/*` through the supported plugin route registry.
- Public site output at `/sikesra` remains host-app owned and should call the plugin's public-safe endpoints.
- D1 schema and seed replay use `scripts/sikesra-d1-overlay.mjs` plus the preserved SQL in `update-backup/d1/`, not EmDash core migration edits.
- Cloudflare deployment bindings and wrapper behavior use `infra/sikesra/wrangler.jsonc`, `infra/sikesra/worker-wrapper-template.mjs`, and repo-local helper scripts rather than core package patches.
- Domain data, ABAC, audit, D1 schema replay, and operational flows remain follow-up overlay work and must stay outside EmDash core packages.
