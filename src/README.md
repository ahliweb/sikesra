# SIKESRA Plugin Shell

This package is the initial EmDash-native plugin shell for SIKESRA.

Current scope is intentionally minimal:

1. Descriptor factory (`sikesraPlugin`) for host registration.
2. Runtime plugin factory (`createPlugin`) using `definePlugin`.
3. API utility scaffolding for request IDs and response envelopes.
4. Trusted request-context builder utility scaffolding.
5. Permission catalog defining all `awcms:sikesra:*` constants.
6. Server-side masking utility for sensitive data (NIK/KIA, phone, names, addresses, documents, desil, R2 keys, audit).
7. Audit service baseline with full action catalog and high-risk action tagging.
8. ABAC evaluator scaffold with deny precedence, region scope, and policy condition engine.

No business workflows, API contracts, data model, ABAC, audit, or UI implementation are included yet.
