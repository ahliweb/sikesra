# Gallery Security And Privacy

The gallery feature avoids raw private storage access and keeps public rendering separate from EmDash core.

## Controls

- MIME validation requires `image/*` for images and `video/*` for videos.
- File size validation is enforced by plugin settings and validation hooks.
- Filenames must not include path traversal segments or unsafe characters.
- Image alt text is required by validation.
- Video captions are required by validation.
- Public pages render only the public URL stored in collection data.
- R2, Cloudflare Images, and Stream secrets must stay in Cloudflare secrets or bindings.

## Privacy

Editors should only publish media intended for public display. The gallery JSON must not include private bucket names, signed URLs with long-lived secrets, API tokens, user PII, or internal moderation notes.

## Audit Readiness

The plugin writes validation and settings events to plugin-scoped storage. These records are suitable for review workflows without requiring EmDash core changes.

## Rollback

Disable the plugin in `astro.config.mjs` first. Then remove gallery routes/components and collection seed entries. If published media must be removed, delete or unpublish the affected gallery entries and remove media assets through the EmDash media library or the backing R2 bucket process.
