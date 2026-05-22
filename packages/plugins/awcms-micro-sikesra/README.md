# awcms-micro-sikesra Plugin

This package is the canonical AWCMS-Micro SIKESRA plugin path requested by `tmp/prompt-refactor`.

## Current Behavior

- The package contains the primary SIKESRA source, tests, migrations, and seeds used by current build and verification flows.
- `awcmsMicroSikesraPlugin()` and `sikesraPlugin()` both return a descriptor whose sandbox entrypoint is `@ahliweb/awcms-micro-sikesra/sandbox`.
- The legacy `@ahliweb/plugin-sikesra` package is retained as a compatibility shim for older import sites.

## Why This Exists

It makes the canonical package path the primary implementation target while preserving backward compatibility for existing import sites that still depend on `@ahliweb/plugin-sikesra`.

## Next Migration Step

Retire the remaining legacy package internals once all consumers and release flows have migrated to this package directly.
