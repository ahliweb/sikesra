# AWCMS-Micro Example Plugin

This package is an AWCMS-Micro example plugin that demonstrates an EmDash-compatible Access & Audit Demo plugin without modifying EmDash core.

## Purpose

- keep AWCMS-Micro-specific governance, navigation, access, audit, and ABAC examples inside an isolated plugin boundary
- demonstrate how downstream behavior can be added without forking EmDash core
- provide a reusable example package that templates and standalone EmDash sites can consume through normal plugin registration

## What It Demonstrates

- plugin descriptor factory and plugin identity/versioning
- EmDash registry manifest scaffolding in `emdash-plugin.jsonc`
- capabilities, allowed hosts, storage declarations, and KV conventions
- protected routes plus a public-safe status route
- lifecycle hooks: install, activate, deactivate, uninstall
- content hooks: before/after save, before/after delete, after publish, after unpublish
- media hooks: before upload, after upload
- cron hook scheduling and state recording
- page metadata contribution
- admin pages, dashboard widget, settings schema, and field widget contribution
- SIKESRA-grade reference admin screens for registry, verification, documents, and public aggregate reports
- admin UI styling uses Kumo semantic tokens so dark mode and light mode remain readable; do not hardcode light-only card or text colors in new plugin components
- Portable Text block contribution
- audit logging and content snapshot examples
- access-rights catalog example with role matrix and effective access preview
- ABAC policy management example with attribute catalogs, policy simulation, and a protected demo route
- SIKESRA-inspired registry fixtures for reference data modeling and public-safe aggregate examples
- a sandbox-compatible server-side entry in `src/sandbox.ts`

## Permission Namespace

The example uses the `awcms:sikesra:<resource>:<action>` namespace.

## Boundary Rule

- keep plugin-owned behavior in this package
- do not move these example capabilities into EmDash core packages
- let templates consume the plugin through normal `plugins: []` registration rather than duplicating plugin logic in template code

## Native And Sandbox Boundaries

- `src/index.ts` is the trusted/native plugin entry used when the plugin needs React admin pages, widgets, and field widgets.
- `src/sandbox.ts` contains the server-side hooks and routes in the standard sandbox-compatible format.
- Native-only admin UI features are intentionally kept in `src/admin.tsx`.

This separation keeps the server-side behavior portable while making the native-only surfaces explicit.

## Safe Enablement

This plugin is intentionally not registered globally in EmDash core. Enable it from project-level configuration through the normal `plugins: []` configuration path.

For an end-to-end standalone site integration example, see `docs/STANDALONE_CONSUMPTION.md`.
For a technical implementation PRD, see `docs/TECHNICAL_PRD.md`.

## Standalone Usage

1. Copy this folder into its own repository or into a local packages directory in your project.
2. Run `pnpm install` in the plugin repository, or from the workspace root if you placed it inside a pnpm workspace.
3. Run `pnpm build` to produce the `dist/` output.
4. Review `emdash-plugin.jsonc` and replace the example publisher with the real atproto DID or handle before publishing. DID is preferred; handle is also accepted.
5. If you want repository or security metadata in the published manifest, add your own `repo` and `security` fields to `emdash-plugin.jsonc` before publishing.
6. Set `repository` and `homepage` metadata in `package.json` to match the real source location before publishing, including monorepo subdirectory metadata when applicable.
7. Reference the plugin from your EmDash project as a local package or publish it to your own registry.

The package now uses published dependency versions, a local TypeScript toolchain, and a local `tsdown` build so it can be developed and packaged outside this monorepo.

For a release-oriented pass, use `docs/INTERNAL_PUBLISH_CHECKLIST.md`.
For the SIKESRA reference data model and fixtures, use `docs/SIKESRA_REFERENCE_DATA_MODEL.md`.
For concrete `repo` and `security` snippets, use `docs/MANIFEST_METADATA_EXAMPLES.md`.
For completed scenario-based manifests, use `docs/FINAL_MANIFEST_EXAMPLES.md`.
The default flow is to update the checked-in `emdash-plugin.jsonc` in place.
If you want a fresh starting point for registry metadata, copy `docs/emdash-plugin.template.jsonc` over `emdash-plugin.jsonc` first, then adapt it for your release.

## Demonstrated Routes And Hooks

- Public route: `public/status`
- Protected routes: `overview/summary`, `settings/get`, `settings/save`, `audit/list`, `state/touch`
- Access-rights routes: `access/permissions/list`, `access/permissions/save`, `access/roles/list`, `access/roles/save`, `access/users/save`, `access/matrix/get`, `access/matrix/save`, `access/preview`, `access/health`
- ABAC routes: `abac/attributes/list`, `abac/attributes/save`, `abac/subjects/list`, `abac/subjects/save`, `abac/resources/list`, `abac/resources/save`, `abac/policies/list`, `abac/policies/save`, `abac/preview`, `abac/enforce-demo`, `abac/health`
- Dashboard compatibility alias: `dashboard/summary`
- Hooks: lifecycle, content, media, cron, and `page:metadata`

## Access-Rights Example Boundaries

The access-rights catalog in this plugin is demonstrative.

- It manages plugin-owned catalog data, role assignments, and preview logic.
- It does not rewrite or replace EmDash core authorization internals.
- Effective access preview is enforced only inside the plugin's own route/demo surface.

This keeps the example explicit, isolated, and compatible with upstream EmDash.

## ABAC Example Boundaries

The ABAC example in this plugin is also demonstrative.

- It stores attribute definitions, subject/resource assignments, and policy rules inside plugin-owned storage.
- It evaluates decisions only inside plugin-owned preview and enforcement-demo routes.
- It does not replace EmDash core authorization or claim global admin enforcement.

The decision model used by the example is intentionally simple and deterministic:

1. explicit deny wins
2. allow requires matching subject, action, resource, and context conditions
3. missing required attributes returns deny with explanation
4. sensitive action decisions are auditable

## Testing

From this package directory:

1. `pnpm typecheck`
2. `pnpm test`
3. `pnpm build`

## License

This package is licensed under the AW Non-Commercial License 1.0. See `LICENSE.md`.
