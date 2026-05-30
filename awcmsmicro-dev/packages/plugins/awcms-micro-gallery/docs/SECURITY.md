# Security Notes

The gallery plugin validates public media references before gallery content is saved or accepted by the plugin validation route.

- Only EmDash media URLs, local upload URLs, or HTTPS URLs are accepted.
- Image MIME types must start with `image/`.
- Video MIME types must start with `video/`.
- Filenames must not include paths and must use a conservative safe-character policy.
- Image and video byte limits are configurable through plugin settings.
- Private R2 credentials, Cloudflare Images tokens, and Stream API tokens must stay in Cloudflare bindings or secrets and are never exposed by this plugin.
