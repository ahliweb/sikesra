# Cloudflare Gallery Media

The Cloudflare production template uses EmDash storage backed by R2:

```js
emdash({
	database: d1({ binding: "DB", session: "auto" }),
	storage: r2({ binding: "MEDIA" }),
});
```

The `MEDIA` R2 binding is declared in `templates/awcms-micro-default-cloudflare/wrangler.jsonc`. Gallery JSON should store public URLs or EmDash media URLs only. Do not store private R2 keys, signed upload credentials, or API tokens in gallery content.

## Optional Cloudflare Images

Cloudflare Images can be used by storing the public delivery URL in `gallery_items[].src` and setting `provider` to `cloudflare-images`. API tokens must be stored as Cloudflare secrets or bindings, never in collection JSON.

## Optional Cloudflare Stream

Cloudflare Stream can be used by storing a public playback URL in `gallery_items[].src` and setting `provider` to `cloudflare-stream`. Use the plugin settings to mark Stream as enabled for operators. Keep Stream API credentials outside public content.

## Production Variables

The Cloudflare template includes non-secret marker variables:

- `AWCMS_MICRO_GALLERY_MEDIA_STORAGE=r2`
- `AWCMS_MICRO_GALLERY_CLOUDFLARE_IMAGES=optional`
- `AWCMS_MICRO_GALLERY_CLOUDFLARE_STREAM=optional`

Use `wrangler secret put` for any token needed by future upload/proxy workflows.
