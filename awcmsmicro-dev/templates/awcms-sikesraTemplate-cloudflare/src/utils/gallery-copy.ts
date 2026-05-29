const GALLERY_COPY = {
	en: {
		all: "All",
		photo: "Photo",
		video: "Video",
		mixed: "Mixed",
		filtersLabel: "Gallery filters",
		carouselLabel: "Gallery carousel",
		lightboxLabel: "Gallery media shortcuts",
		imageAlt: "Gallery image",
		mediaItem: "Media item",
		placeholder: "Gallery",
		featured: "Featured",
		pageTitle: "Gallery",
		pageDescription: "Published AWCMS-Micro photo and video galleries managed from EmDash on Cloudflare.",
		pageKicker: "Cloudflare Media",
		pageHeading: "Photo and Video Gallery",
		pageIntro: "Published galleries are stored in EmDash collections and rendered from the Cloudflare production template.",
		noGalleries: "No galleries found.",
	},
	id: {
		all: "Semua",
		photo: "Foto",
		video: "Video",
		mixed: "Campuran",
		filtersLabel: "Filter galeri",
		carouselLabel: "Karusel galeri",
		lightboxLabel: "Tautan cepat media galeri",
		imageAlt: "Gambar galeri",
		mediaItem: "Item media",
		placeholder: "Galeri",
		featured: "Unggulan",
		pageTitle: "Galeri",
		pageDescription: "Galeri foto dan video AWCMS-Micro yang dipublikasikan dan dikelola dari EmDash di Cloudflare.",
		pageKicker: "Media Cloudflare",
		pageHeading: "Galeri Foto dan Video",
		pageIntro: "Galeri yang dipublikasikan disimpan di koleksi EmDash dan dirender dari template produksi Cloudflare.",
		noGalleries: "Belum ada galeri.",
	},
} as const;

export function getGalleryCopy(locale: string | undefined) {
	return locale?.startsWith("id") ? GALLERY_COPY.id : GALLERY_COPY.en;
}
