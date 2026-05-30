# AWCMS-Micro Gallery

The gallery feature adds a `galleries` EmDash collection, public Astro rendering, and the isolated plugin package `@awcms-micro/plugin-gallery`. EmDash core remains the canonical upstream reference and is not modified.

## Usage

1. Run an AWCMS-Micro template and open `/_emdash/admin`.
2. Create or edit entries in the `Galleries` collection.
3. Add a title, description, cover image, type, event date, location, layout variant, and JSON gallery items.
4. Publish the gallery.
5. Visit `/gallery` or `/gallery/[slug]`.

Gallery item JSON shape:

```json
{
	"type": "image",
	"src": "/_emdash/api/media/file/example.jpg",
	"mimeType": "image/jpeg",
	"filename": "example.jpg",
	"sizeBytes": 420000,
	"alt": "Accessible image description",
	"caption": "Optional caption",
	"provider": "emdash-media"
}
```

Video items use `"type": "video"`, a `video/*` MIME type, and a caption.

## Rendering

Public rendering is template-owned:

- `src/pages/gallery/index.astro`
- `src/pages/gallery/[slug].astro`
- `src/components/GalleryGrid.astro`
- `src/components/GalleryCard.astro`
- `src/components/GalleryLightbox.astro`
- `src/components/GalleryVideo.astro`
- `src/components/GalleryCarousel.astro`
- `src/components/GalleryFilters.astro`

Layouts supported by the template are `grid`, `masonry`, `carousel`, and `slider`.

## Plugin

The isolated plugin package is `@awcms-micro/plugin-gallery`.

It provides:

- Plugin descriptor and sandbox entry.
- Block Kit admin page.
- Settings route.
- Public list route.
- Media validation route.
- `content:beforeSave` validation hooks for gallery content.
- Audit-ready storage entries for validation and settings changes.

Routes:

- `GET /_emdash/api/plugins/awcms-micro-gallery/settings`
- `POST /_emdash/api/plugins/awcms-micro-gallery/settings`
- `GET /_emdash/api/plugins/awcms-micro-gallery/public/list`
- `POST /_emdash/api/plugins/awcms-micro-gallery/media/validate`

## Rollback

To roll back the gallery feature, remove the gallery plugin from the template `astro.config.mjs`, remove the `galleries` collection from the template seed, and delete the public gallery pages/components. Existing EmDash content remains in the database until removed through admin or a forward migration.

## Naming Guidance

- package name: `@awcms-micro/plugin-gallery`
- approved workspace folder: `packages/plugins/awcms-micro-gallery/`
- template integration should keep gallery rendering template-owned and gallery management plugin-owned
