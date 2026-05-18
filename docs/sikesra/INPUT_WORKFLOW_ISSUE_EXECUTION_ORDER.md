# SIKESRA Input Workflow Issue Execution Order

Use this order so each issue proves one small part of the draft input workflow before the next layer depends on it.

## Rules

- Do not delete upstream EmDash plugin packages.
- Disable non-SIKESRA plugins only from the SIKESRA runtime registration path.
- Do not modify EmDash core unless unavoidable.
- If EmDash core is changed, document the reason, risk, and rollback path in the PR.

## Order

1. `#323` plugin isolation
   Proves the SIKESRA runtime only exposes `@ahliweb/plugin-sikesra` in production/admin.
2. `#328` migration readiness check
   Proves the production schema has every required SIKESRA input table and key column.
3. `#324` create-draft smoke test for all 8 modules
   Proves each module can create one draft row and one matching detail row.
4. `#325` module draft registry tests
   Proves each module list shows its own draft data and excludes other modules.
5. `#329` reopen draft from list to detail
   Proves a newly created draft can be found in the draft list and reopened safely.
6. `#326` wizard step navigation
   Proves the same entity stays alive across Data Type, Region, Details, Documents, Validation, Review, and Submit.
7. `#327` required-field validation coverage
   Proves missing required fields are visible to operators and block code generation or verification submit.
8. `#330` inline person profile hardening
   Proves person modules can create or update drafts without manual `person_profile_id` handling.
9. `#331` create-draft to submit-readiness block test
   Proves one real module can reach review/submit readiness without unhandled exceptions.
10. `#332` admin route smoke check
    Proves the dashboard, entities, and verification admin routes still return valid block responses.
11. `#333` execution-order doc
    Proves the work can be followed by a junior programmer in a stable order.

## Validation Commands

Run the focused package checks first:

```bash
pnpm sikesra:build
pnpm --filter @ahliweb/plugin-sikesra typecheck
pnpm --filter @ahliweb/plugin-sikesra test
```

Run the route-level smoke check when the local app is up:

```bash
node scripts/sikesra-smoke-admin-route.mjs
```

Optional single-page smoke checks:

```bash
SIKESRA_ADMIN_PAGE=/ node scripts/sikesra-smoke-admin-route.mjs
SIKESRA_ADMIN_PAGE=/entities node scripts/sikesra-smoke-admin-route.mjs
SIKESRA_ADMIN_PAGE=/verification node scripts/sikesra-smoke-admin-route.mjs
```
