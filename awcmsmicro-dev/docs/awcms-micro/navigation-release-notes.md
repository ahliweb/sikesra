# Navigation Release Notes

## Summary

AWCMS-Micro now demonstrates layered navigation without touching EmDash core:

- recursive public navigation in both templates
- nested seed data for the public `primary` menu
- plugin-owned header menu model with permission filtering
- plugin header submenu rendering inside example admin pages
- dashboard module cards for SIKESRA-style reference flows
- browser coverage for accessibility and smoke validation
- resolved mobile UX traps by natively expanding submenus and implementing responsive headers on smartphones
- fixed dark mode text visibility for LiveSearch and dropdown interaction stability via structural hover bridges

## Safety Guarantees

- EmDash admin sidebar remains flat and upstream-compatible.
- Public pages only render menu data and public-safe aggregate content.
- Plugin navigation filtering is UX only; backend authorization remains mandatory.

## Validation

Recommended checks after navigation changes:

```bash
pnpm lint:quick
pnpm typecheck
pnpm test:e2e
pnpm test:awcmsmicro:a11y
```

## Downstream Adoption

Downstream product repos can reuse the same pattern as a reference layer without copying production-only SIKESRA data into AWCMS-Micro.
