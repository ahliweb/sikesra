const PUBLIC_COPY = {
	en: {
		notFoundTitle: "Not Found",
		notFoundDescription: "The requested page could not be found.",
		notFoundMessage: "The requested page does not exist in this AWCMS-Micro Cloudflare example.",
		returnHome: "Return home",
		aggregateTitle: "Public Aggregate",
		aggregateDescription: "A public-safe summary page for the AWCMS-Micro Cloudflare template.",
		aggregateKicker: "Reference",
		aggregateHeading: (siteTitle: string) => `Public aggregate for ${siteTitle}`,
		aggregateIntro:
			"This page demonstrates the public-safe aggregate pattern. It exposes only coarse counts and avoids sensitive identifiers, raw storage keys, or private registry data.",
		summary: "Summary",
		privacyNote: "Privacy note",
		privacyNoteDescription:
			"This aggregate stays high level so it can be published without revealing individual registry entities, verification events, or protected attributes.",
		openAdmin: "Open admin",
		openAdminDescription: "to work with the underlying content and governance workflows.",
		postsTitle: "All Posts",
		postsHeading: "Posts",
		postsDescription: "Published posts from the AWCMS-Micro Cloudflare example.",
		noPostsYet: "No posts yet.",
		newsTitle: "News",
		newsDescription: "News updates from the AWCMS-Micro Cloudflare example.",
		noNewsYet: "No news items yet.",
		homeKicker: "AWCMS-Micro",
		homeHeading: "Public content, admin workflows, and Cloudflare delivery.",
		homeIntro:
			"A concise public site for published content, simple editing, and example governance surfaces.",
		createPost: "Create Post",
		createPage: "Create Page",
		viewDocs: "View Docs",
		pluginConsole: "Plugin Console",
		publicAggregateLink: "Public Aggregate",
		publicNavigationExample: "Public navigation example",
		nestedPrimaryMenu: "Nested primary menu",
		nestedPrimaryMenuDescription:
			"The primary navigation in the sticky header uses the seeded menu structure directly, including nested items, so visitors can move across the site without a second menu render inside the page body.",
		switchModeTitle: "Switch mode",
		lightDarkTheme: "Light and dark theme",
		lightDarkThemeDescription:
			"Use the homepage control below to toggle the same theme state managed by the header button.",
		switchModeButton: "Switch mode",
		cloudflareReady: "Cloudflare-ready",
		cloudflareReadyDescription:
			"Ready for D1, R2, Workers, observability, and the `awcms-micro.ahlikoding.com` deployment route.",
		pluginEnabled: "Plugin-enabled",
		pluginEnabledDescription:
			"Registers `@awcms-micro/plugin-sikesra` through the normal EmDash plugin path for audit, access-rights, and ABAC examples.",
		publicAggregateTitle: "Public aggregate",
		publicAggregateDescription:
			"Provides a public-safe summary page that exposes only high-level counts, not private registry details.",
		adminProtected: "Admin protected",
		adminProtectedDescription:
			"Unauthenticated visits are pushed to `/_emdash/admin/login` before the admin shell renders.",
		publishedFromAdmin: "Published from admin",
		publishedFromAdminDescription:
			"Posts, pages, and news created in EmDash are displayed by the public site routes immediately after publish.",
		publicSearchAndNavigation: "Public search and navigation",
		publicSearchAndNavigationDescription:
			"Menus, site identity, and live search are all reading from EmDash-managed content rather than template placeholders.",
		operationalSurfaces: "Operational surfaces",
		operationalSurfacesDescription:
			"Editors can jump from the public website into content creation, settings, and plugin dashboards without leaving the same deployment.",
		recentPosts: "Recent Posts",
		latestNews: "Latest News",
		managedPages: "Managed Pages",
		publicPagesTitle: "Public reference pages",
		publicPagesDescription:
			"Published pages are editable from the Pages collection and can be surfaced from the docs hub.",
		managePagesInAdmin: "Manage pages in admin",
		openPage: "Open page",
		featuredGalleryTitle: "Gallery spotlight",
		featuredGalleryDescription:
			"A featured gallery shows how media-rich content, layout variants, and admin-managed assets render publicly.",
		browseAllPosts: "Browse all posts ->",
		browseAllNews: "Browse all news ->",
		searchPlaceholder: "Search posts, pages, and news",
		adminLink: "Admin",
		pluginStatus: "Plugin Status",
		pluginOverview: "Plugin Overview",
		toggleTheme: "Toggle Theme",
		switchToLightMode: "Switch to Light Mode",
		switchToDarkMode: "Switch to Dark Mode",
		counts: { posts: "Posts", news: "News", pages: "Pages", galleries: "Galleries" },
	},
	id: {
		notFoundTitle: "Tidak Ditemukan",
		notFoundDescription: "Halaman yang diminta tidak dapat ditemukan.",
		notFoundMessage: "Halaman yang diminta tidak ada di contoh Cloudflare AWCMS-Micro ini.",
		returnHome: "Kembali ke beranda",
		aggregateTitle: "Agregat Publik",
		aggregateDescription: "Halaman ringkasan aman-publik untuk template Cloudflare AWCMS-Micro.",
		aggregateKicker: "Referensi",
		aggregateHeading: (siteTitle: string) => `Agregat publik untuk ${siteTitle}`,
		aggregateIntro:
			"Halaman ini mendemonstrasikan pola agregat aman-publik. Halaman ini hanya menampilkan hitungan tingkat tinggi dan menghindari pengenal sensitif, kunci storage mentah, atau data registry privat.",
		summary: "Ringkasan",
		privacyNote: "Catatan privasi",
		privacyNoteDescription:
			"Agregat ini tetap berada pada level tinggi sehingga dapat dipublikasikan tanpa mengungkap entitas registry individual, event verifikasi, atau atribut yang dilindungi.",
		openAdmin: "Buka admin",
		openAdminDescription: "untuk mengelola konten dan alur kerja tata kelola dasarnya.",
		postsTitle: "Semua Pos",
		postsHeading: "Pos",
		postsDescription: "Pos yang dipublikasikan dari contoh Cloudflare AWCMS-Micro.",
		noPostsYet: "Belum ada pos.",
		newsTitle: "Berita",
		newsDescription: "Pembaruan berita dari contoh Cloudflare AWCMS-Micro.",
		noNewsYet: "Belum ada berita.",
		homeKicker: "AWCMS-Micro",
		homeHeading: "Konten publik, workflow admin, dan delivery Cloudflare.",
		homeIntro:
			"Situs publik yang ringkas untuk konten terpublikasi, pengeditan mudah, dan surface tata kelola contoh.",
		createPost: "Buat Pos",
		createPage: "Buat Halaman",
		viewDocs: "Lihat Docs",
		pluginConsole: "Konsol Plugin",
		publicAggregateLink: "Agregat Publik",
		publicNavigationExample: "Contoh navigasi publik",
		nestedPrimaryMenu: "Menu utama bertingkat",
		nestedPrimaryMenuDescription:
			"Navigasi utama di header lengket menggunakan struktur menu hasil seed secara langsung, termasuk item bertingkat, sehingga pengunjung bisa bergerak di seluruh situs tanpa render menu kedua di dalam isi halaman.",
		switchModeTitle: "Ganti mode",
		lightDarkTheme: "Tema terang dan gelap",
		lightDarkThemeDescription:
			"Gunakan kontrol beranda di bawah ini untuk mengganti state tema yang sama dengan yang dikelola tombol header.",
		switchModeButton: "Ganti mode",
		cloudflareReady: "Siap Cloudflare",
		cloudflareReadyDescription:
			"Siap untuk D1, R2, Workers, observability, dan route deployment `awcms-micro.ahlikoding.com`.",
		pluginEnabled: "Plugin aktif",
		pluginEnabledDescription:
			"Mendaftarkan `@awcms-micro/plugin-sikesra` melalui jalur plugin EmDash normal untuk contoh audit, hak akses, dan ABAC.",
		publicAggregateTitle: "Agregat publik",
		publicAggregateDescription:
			"Menyediakan halaman ringkasan aman-publik yang hanya mengekspos hitungan tingkat tinggi, bukan detail registry privat.",
		adminProtected: "Admin terlindungi",
		adminProtectedDescription:
			"Kunjungan tanpa autentikasi diarahkan ke `/_emdash/admin/login` sebelum shell admin dirender.",
		publishedFromAdmin: "Dipublikasikan dari admin",
		publishedFromAdminDescription:
			"Pos, halaman, dan berita yang dibuat di EmDash langsung ditampilkan oleh route situs publik setelah publish.",
		publicSearchAndNavigation: "Pencarian dan navigasi publik",
		publicSearchAndNavigationDescription:
			"Menu, identitas situs, dan live search semuanya membaca dari konten yang dikelola EmDash, bukan placeholder template.",
		operationalSurfaces: "Surface operasional",
		operationalSurfacesDescription:
			"Editor dapat berpindah dari situs publik ke pembuatan konten, pengaturan, dan dasbor plugin tanpa meninggalkan deployment yang sama.",
		recentPosts: "Pos Terbaru",
		latestNews: "Berita Terbaru",
		managedPages: "Halaman Terkelola",
		publicPagesTitle: "Halaman referensi publik",
		publicPagesDescription:
			"Halaman terpublikasi dapat diedit dari koleksi Pages dan bisa ditampilkan dari hub docs.",
		managePagesInAdmin: "Kelola halaman di admin",
		openPage: "Buka halaman",
		featuredGalleryTitle: "Sorotan galeri",
		featuredGalleryDescription:
			"Galeri unggulan menunjukkan bagaimana konten kaya media, variasi layout, dan aset yang dikelola admin dirender secara publik.",
		browseAllPosts: "Lihat semua pos ->",
		browseAllNews: "Lihat semua berita ->",
		searchPlaceholder: "Cari pos, halaman, dan berita",
		adminLink: "Admin",
		pluginStatus: "Status Plugin",
		pluginOverview: "Ringkasan Plugin",
		toggleTheme: "Ganti Tema",
		switchToLightMode: "Ganti ke Mode Terang",
		switchToDarkMode: "Ganti ke Mode Gelap",
		counts: { posts: "Pos", news: "Berita", pages: "Halaman", galleries: "Galeri" },
	},
} as const;

export function getPublicCopy(locale: string | undefined) {
	return locale?.startsWith("id") ? PUBLIC_COPY.id : PUBLIC_COPY.en;
}
