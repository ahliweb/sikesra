# AWCMS-Micro D1 Mirror Sync

This repository may use Cloudflare D1-backed downstream environments inside `awcmsmicro-dev/`.

When D1 mirror workflows are introduced or expanded, document:

- the source environment
- the target mirror
- the sync trigger
- validation and rollback steps

Until then, treat D1 synchronization as an operator concern scoped to downstream runtime configuration.
