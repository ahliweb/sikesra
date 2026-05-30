# Divergence Log

This file records deliberate downstream differences from the checked-in EmDash baseline and from a plain `awcms-micro` maintenance workspace.

## Active Divergence Categories

- SIKESRA-specific plugin behavior under `awcmsmicro-dev/packages/plugins/awcms-micro-sikesra/`
- SIKESRA-specific template boundaries under `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate/` and `awcmsmicro-dev/templates/awcms-micro-sikesraTemplate-cloudflare/`
- SIKESRA-specific docs under `awcmsmicro-dev/docs/awcms-micro/sikesra/`
- Transitional compatibility shim at `awcmsmicro-dev/packages/plugins/sikesra/`

## Recording Rules

For each non-trivial divergence, record:

1. The affected path.
2. Why the divergence exists.
3. Whether the change is temporary or intended long-term.
4. How to roll it back or upstream it.
5. What verification was used.
