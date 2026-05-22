# AWCMSMicro Dev Protected Paths

## Current Protected Paths

The active protected-path list lives in `scripts/awcmsmicro-dev-protected-paths.txt`.

Current entries match the canonical prompt paths directly:

- `templates/awcms-micro-sikesra`
- `templates/awcms-micro-sikesra-cloudflare`
- `packages/plugins/awcms-micro-sikesra`
- `demos/awcms-micro-sikesra-cloudflare`
- `docs/awcms-micro/sikesra`
- `e2e/awcms-micro/sikesra`

## Why They Differ From The Prompt

`tmp/prompt-refactor` assumes a parent repository with `awcmsmicro-dev/` as a child directory. This repository is still the implementation workspace itself, so the validation and sync scripts resolve those canonical paths from either `awcmsmicro-dev/` or the current repo root.

## Required Migration Later

When the parent split happens, the same protected-path list can stay in place. Only the legacy compatibility allowances in the validation script should be removed.
