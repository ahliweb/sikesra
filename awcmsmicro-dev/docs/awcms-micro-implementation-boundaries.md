# AWCMS-Micro Implementation Boundaries

## Allowed SIKESRA Ownership Zones

- `templates/awcms-micro-sikesra/`
- `templates/awcms-micro-sikesra-cloudflare/`
- `packages/plugins/awcms-micro-sikesra/`
- `demos/awcms-micro-sikesra-cloudflare/`
- `e2e/awcms-micro/sikesra/`
- `packages/plugins/sikesra/`
- `docs/sikesra/`
- `docs/awcms-micro/sikesra/`
- `infra/sikesra/` only for Worker wrapper and deployment configuration
- `scripts/sikesra-*.mjs`
- `update-backup/d1/`
- `demos/cloudflare/` only for current plugin registration and deployment wiring
- `demos/plugins-demo/` only for plugin registration and validation wiring

## Disallowed Changes

- Direct SIKESRA logic in EmDash core packages without a documented divergence
- SIKESRA-specific database tables owned by `packages/core/`
- Public routes that expose sensitive individual data
- Undocumented environment or deployment behavior outside repo docs

## Canonical Future Zones

The canonical protected paths now exist as scaffold directories in this repo, while the current buildable runtime still uses the legacy in-place plugin and demo paths above.
