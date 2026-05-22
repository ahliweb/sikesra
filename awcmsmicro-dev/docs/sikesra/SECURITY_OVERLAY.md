# SIKESRA Security Overlay

The SIKESRA security layer is restored as package-local overlay code in `packages/plugins/sikesra/src/security/`.

Included now:

1. SIKESRA permission catalog under the `awcms:sikesra:*` namespace
2. Route guard helpers for authentication, permission, and region-scope checks
3. ABAC evaluator with deny precedence and public-detail denial
4. Server-side masking helpers for sensitive identifiers, contacts, addresses, names, and document metadata
5. Audit action catalog and high-risk audit helper set
6. Versioned manifest route: `/_emdash/api/plugins/sikesra/v1/security/manifest`

Verification completed in the plugin package:

- `pnpm --filter @ahliweb/plugin-sikesra test`
- `pnpm --filter @ahliweb/plugin-sikesra typecheck`

This restores the non-core authorization/privacy building blocks without patching EmDash auth internals. Route-by-route adoption for richer entity, document, import, export, and audit workflows can now build on these utilities.
