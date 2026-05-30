# AWCMS-Micro Product Docs Map

This document maps the main AWCMS-Micro product-facing documentation that lives inside the sync-safe `awcmsmicro-dev/docs/awcms-micro/` boundary.

## Core Documents

- `README.md`: boundary entry point for AWCMS-Micro-owned docs
- `cloudflare-deployment.md`: Cloudflare-specific template guidance
- `navigation-standard.md`: public and plugin navigation rules
- `navigation-release-notes.md`: concise navigation-related change notes
- `admin-navigation.md`: plugin-owned admin navigation compatibility guidance
- `plugin-i18n.md`: label resolution and plugin i18n behavior
- `sikesra-reference-prd.md`: product and backlog framing for the reference example
- `sikesra-reference-standard.md`: implementation scope and guardrails for the reference example

## How To Use This Map

1. Start with `README.md` for the boundary overview.
2. Read `navigation-standard.md` and `admin-navigation.md` for plugin/template UI behavior.
3. Read `cloudflare-deployment.md` when preparing Cloudflare delivery.
4. Read the SIKESRA reference documents when planning governance-style plugin or template work.

## Ownership Rule

Documents in this boundary should describe AWCMS-Micro-owned plugin, template, deployment, and validation behavior. They should not restate upstream EmDash core documentation unless needed for a direct AWCMS-Micro decision or compatibility note.
