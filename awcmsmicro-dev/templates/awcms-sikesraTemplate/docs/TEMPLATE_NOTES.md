# Template Notes

## Scope

This template exists as an AWCMS-Micro example only.

## What It Demonstrates

- a small Astro-first public site shell
- a minimal EmDash seed file for local setup and repeatable example content
- explicit AWCMS-Micro conventions in a new folder
- compatibility with EmDash runtime patterns without editing EmDash core

## What It Does Not Do

- it does not replace EmDash built-in templates
- it does not register itself into EmDash core
- it does not add custom plugin or template loading mechanisms
- the checked-in local workflow includes the AWCMS-Micro example plugin, but only through normal EmDash plugin registration

## Safe Adoption Path

Copy the folder into a new app directory or project root, ensure the standard EmDash boilerplate is present including `src/live.config.ts`, then customize it through normal EmDash configuration and site-level code.

Use `README.md` in this folder as the entry point for template-specific guidance.

This example now uses published package versions so it can install outside the parent monorepo without rewriting dependency specifiers.

If you want to reproduce the same plugin-enabled local shape in another site, use `PLUGIN_ENABLED_ASTRO_CONFIG.md` as the reference.
