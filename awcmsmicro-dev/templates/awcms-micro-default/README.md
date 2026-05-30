# AWCMS-Micro Default Example Template

This folder is an AWCMS-Micro example template. It is not a replacement for EmDash built-in templates.

## Purpose

- demonstrate AWCMS-Micro conventions in an isolated example folder
- stay compatible with EmDash without modifying EmDash core
- show an Astro-first public rendering baseline for a single-tenant-first site
- include the AWCMS-Micro example plugin in the checked-in local workflow
- include the AWCMS-Micro docs plugin and public `/docs` route in the checked-in local workflow
- expose a public-safe aggregate reference page for operator and reviewer guidance

## AWCMS-Micro Notes

- Single-tenant-first: the default content and layout are optimized for one site owner.
- Tenant-ready structure: content sections and file layout keep room for future tenant separation.
- EmDash-compatible: the template uses standard Astro and EmDash integration points only.
- No EmDash core modification: manual adoption is documented here instead of changing built-in template registration.
- Plugin admin UI surfaces should use theme-aware semantic tokens; avoid hardcoded white/black card colors in plugin components.

## Boundary Rule

- keep public rendering and site presentation template-owned
- keep plugin behavior plugin-owned and register it through standard EmDash configuration
- do not replace or modify built-in EmDash templates in place

## Key Files

- `package.json`
- `seed/seed.json`
- `astro.config.mjs`
- `docs/README.md`
- `src/layouts/BaseLayout.astro`
- `src/components/SiteHeader.astro`
- `src/components/SiteFooter.astro`
- `src/pages/index.astro`
- `src/pages/aggregate.astro`
- `src/pages/[slug].astro`
- `docs/TEMPLATE_NOTES.md`

## Manual Usage

This template is intentionally not registered into EmDash core. It can be copied into a standalone project outside this monorepo.

1. Copy the folder into a new app directory, or use it as the project root for a new Node.js 22+ site.
2. Install dependencies with `pnpm install`.
3. Review `seed/seed.json` and adjust the starter collections, settings, and content to fit your site.
4. Start the site and confirm unauthenticated requests to `/_emdash/admin` redirect to `/_emdash/admin/login`.
5. Review the checked-in example-plugin registration if you need the local governance workflow.

For a small docs index for this template, start with `docs/README.md`.
For the implementation-level PRD, see `docs/TECHNICAL_PRD.md`.
If you are still working inside this parent workspace and want to attach the example plugin from this repository to a standalone EmDash site, see `../../packages/plugins/awcms-micro-sikesra/docs/STANDALONE_CONSUMPTION.md`.
If you want the exact plugin-enabled local `astro.config.mjs` shape for reuse elsewhere, see `docs/PLUGIN_ENABLED_ASTRO_CONFIG.md`.

## Standalone Notes

- `package.json` currently uses monorepo-local `catalog:` and `workspace:*` specifiers, so dependency ranges must be normalized before using this template outside this repository.
- The template still expects the standard EmDash runtime flow and Astro server output.
- The included `seed/seed.json` is intentionally minimal so the folder can bootstrap cleanly outside this repository.
- Review `astro.config.mjs` before production use: `siteUrl`, SQLite database location, and local uploads storage are example defaults.

## Naming Guidance

- package name: `@awcms-micro/template-default-example`
- recommended local folder example: `templates/awcms-micro-default/`
- related example plugin package: `@awcms-micro/plugin-sikesra`
- related docs plugin package: `@awcms-micro/plugin-docs`

## License

This template is licensed under the AW Non-Commercial License 1.0. See `LICENSE.md`.
