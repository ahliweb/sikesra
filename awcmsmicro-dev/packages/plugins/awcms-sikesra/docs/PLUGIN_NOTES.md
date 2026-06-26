# Plugin Notes

## Scope

This package is the checked-in SIKESRA reference plugin for AWCMS-Micro. It keeps downstream registry, verification, governance, access, and ABAC behavior plugin-owned without modifying EmDash core or built-in plugin packages.

## Highlights

- native trusted-plugin wiring for SIKESRA
- namespaced permissions under `awcms:sikesra:*`
- isolated route and admin surfaces
- plugin-owned audit logging helpers in `src/runtime.ts`
- EmDash registry manifest in `emdash-plugin.jsonc`
- deterministic SIKESRA reference fixtures for registry, verification, and public-safe aggregate modeling
- SIKESRA-grade admin references for registry, verification, documents, and reports
- canonical implementation details live in repository-root `docs/prd/`
- route previews for access/ABAC remain demonstrative; mutating routes still need server-side authorization hardening

## Safe Enablement

Add the plugin from project-level configuration only. Do not hardcode it into EmDash core registries.

Use `docs/STANDALONE_CONSUMPTION.md` for a standalone site integration flow.

This package uses published dependency versions and a local build step so it can be copied into a standalone repository or local package workspace without rewriting monorepo-only specifiers.

Replace the publisher value in `emdash-plugin.jsonc` with the real atproto DID or handle before any internal or registry publish.
Set `repository` and `homepage` in `package.json` to match the real published source location, including monorepo subdirectory metadata when applicable.
Add `repo` and `security` to `emdash-plugin.jsonc` only after you know the final standalone repository and security contact URLs.

Use `docs/INTERNAL_PUBLISH_CHECKLIST.md` before any internal or registry release.
Use `docs/SIKESRA_REFERENCE_DATA_MODEL.md` when you need the registry fixture reference shapes.
Use `docs/MANIFEST_METADATA_EXAMPLES.md` for ready-to-copy `repo` and `security` examples.
Use `docs/FINAL_MANIFEST_EXAMPLES.md` for completed monorepo and standalone manifest examples.
The default flow is to edit `emdash-plugin.jsonc` in place.
Use `docs/emdash-plugin.template.jsonc` only when you want to replace it with a fresh checklist-oriented starting point.
