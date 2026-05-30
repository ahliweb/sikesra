const PUBLIC_COPY = {
	en: {
		notFoundTitle: "Page Not Found",
		notFoundDescription: "The requested AWCMS-Micro page was not found.",
		notFoundMessage: "The requested page does not exist or is no longer published.",
		returnHome: "Return to the homepage",
		aggregateTitle: "Public Aggregate",
		aggregateDescription:
			"A public-safe reference page that summarizes site content without exposing private records.",
		aggregateKicker: "Reference",
		aggregateHeading: (siteTitle: string) => `Public aggregate for ${siteTitle}`,
		aggregateIntro:
			"This page demonstrates the AWCMS-Micro public-safe aggregate pattern. It shows coarse counts only and avoids personal identifiers, raw storage keys, or sensitive document details.",
		summary: "Summary",
		privacyNote: "Privacy note",
		privacyNoteDescription:
			"The reference aggregate intentionally stays high level so it can be published publicly without revealing individual registry entities, verification events, or protected attributes.",
		openAdmin: "Open admin",
		openAdminDescription: "to work with the underlying content and governance workflows.",
		postsTitle: "Posts",
		postsDescription: "Published AWCMS-Micro posts managed from the EmDash admin.",
		noPostsYet: "No posts yet.",
		newsTitle: "News",
		newsDescription: "Operational and product news from AWCMS-Micro.",
		noNewsYet: "No news items yet.",
		homeKicker: "AWCMS-Micro",
		homeHeading: "A focused EmDash website and admin workflow for AWCMS-Micro.",
		homeIntro:
			"This local-development template shows how AWCMS-Micro presents public content, keeps EmDash core untouched, and routes editors into the standard admin interface for content, settings, and plugin-backed governance workflows.",
		createPost: "Create Post",
		createPage: "Create Page",
		viewDocs: "View Docs",
		viewPublicAggregate: "View Public Aggregate",
		nestedMenuTitle: "Nested menu and mode demo",
		publicNavigationExample: "Public navigation example",
		publicNavigationDescription:
			"The primary navigation in the header already renders the seeded menu structure, including nested items, so visitors can move across the site without a second menu render inside the page body.",
		switchModeTitle: "Switch mode",
		switchModeDescription:
			"The control below mirrors the header toggle and lets visitors flip light and dark mode from the homepage itself.",
		switchModeButton: "Switch mode",
		howConnectsTitle: "How the public site connects to admin",
		publishFromEmdash: "Publish from EmDash",
		publishFromEmdashDescription:
			"Posts, news, and pages created in the admin flow directly into the public routes below.",
		keepContentInSync: "Keep content in sync",
		keepContentInSyncDescription:
			"Menus, search, site identity, and widget content render from EmDash data instead of hard-coded placeholders.",
		extendWithAwcms: "Extend with AWCMS-Micro",
		extendWithAwcmsDescription:
			"The checked-in template already registers the example plugin so local development can exercise governance, audit, and access workflows without Cloudflare.",
		editorWorkflowShortcuts: "Editor workflow shortcuts",
		publishedPostsVisible: "Published posts currently visible on the public website.",
		viewPosts: "View posts",
		newsWorkflowVisible: "News updates connected to the same publishing workflow.",
		viewNews: "View news",
		managedPagesVisible: "Managed pages such as About, implementation notes, and product info.",
		viewAboutPage: "View about page",
		safeAggregateLabel: "Safe aggregate",
		safeAggregateDescription:
			"A public reference page summarises content without exposing sensitive identifiers.",
		viewAggregatePage: "View aggregate page",
		recentPosts: "Recent posts",
		noPostsCreateOne: "No posts yet. Create one from the admin.",
		latestNews: "Latest news",
		searchPlaceholder: "Search posts, pages, and news",
		adminLink: "Admin",
		toggleTheme: "Toggle Theme",
		switchToLightMode: "Switch to Light Mode",
		switchToDarkMode: "Switch to Dark Mode",
		// Hero Section
		heroTitle: "Build Anything on a Resilient Foundation",
		heroSubtitle:
			"AWCMS-Micro combines the absolute reliability of single-tenant architecture with the flexible extension model of EmDash. Fully integrated, zero core modifications, completely tenant-ready.",
		heroCtaPrimary: "Explore Admin",
		heroCtaSecondary: "Read Documentation",

		// Features
		featuresTitle: "Engineered for Every Use Case",
		featuresSubtitle:
			"From standard marketing sites to complex data backends, AWCMS-Micro provides a unified development experience.",
		featureCmsTitle: "Modern CMS",
		featureCmsDesc:
			"Flexible content structures for blogs, news, and pages with instant preview and publishing.",
		featureShopTitle: "E-Commerce Ready",
		featureShopDesc:
			"Secure transactions, product galleries, and inventory management powered by custom microservices.",
		featureAppTitle: "Custom Web Apps",
		featureAppDesc:
			"Robust APIs and serverless workflows to power tailored web portals and business applications.",
		featureAdminTitle: "Admin Center",
		featureAdminDesc:
			"A complete, customizable backoffice portal for data entry, audits, and governance workflows.",
		featureMobileTitle: "Mobile Backend",
		featureMobileDesc:
			"Ultra-fast REST and GraphQL endpoints designed to feed native Android and iOS applications.",
		featureIotAiTitle: "IoT & AI Integrations",
		featureIotAiDesc:
			"Real-time sensor pipelines, agent webhooks, and AI model orchestration out of the box.",

		// Use Cases Showcase
		useCasesTitle: "Concrete Implementations",
		useCasesSubtitle:
			"See how AWCMS-Micro templates and plugins adapt to your architectural demands.",
		useCaseCmsHeading: "1. Headless Website CMS",
		useCaseCmsText:
			"Manage content with standard EmDash collections and deliver it statically or dynamically. Astro-powered frontend provides optimal load times and top-tier SEO performance.",
		useCaseShopHeading: "2. Secure E-Commerce",
		useCaseShopText:
			"Implement product feeds, interactive search, and secure checkouts. Leverage Cloudflare KV or durable storage to build performant, globally-distributed storefronts.",
		useCaseAppHeading: "3. Enterprise Web Portals",
		useCaseAppText:
			"Construct responsive layouts and workflows with full support for user authorization, settings, and third-party API integrations.",
		useCaseAdminHeading: "4. Multi-Tenant Admin Portals",
		useCaseAdminText:
			"AWCMS-Micro includes a powerful admin dashboard featuring localized interfaces, collapsible sidebar groups, and extensible widgets.",
		useCaseMobileHeading: "5. Mobile & IoT Backend",
		useCaseMobileText:
			"Serve as a high-performance backend. Provide API endpoints with sub-millisecond response times, secure authentication, and real-time data sync.",
		useCaseAiHeading: "6. AI-Powered Workflows",
		useCaseAiText:
			"Run intelligent agents, monitor logs, and trigger automated workflows based on database events and webhooks.",

		// CTA Banner
		ctaTitle: "Ready to accelerate your next project?",
		ctaSubtitle:
			"Deploy AWCMS-Micro on Cloudflare Pages or run it locally in seconds. Join developers building resilient applications.",
		ctaPrimary: "Get Started Now",
		ctaSecondary: "View on GitHub",

		// Footer
		footerBrandDesc:
			"Resilient web templates and plugins built on top of EmDash. Lightweight, fast, and secure.",
		footerLinksProduct: "Product",
		footerLinksResources: "Resources",
		footerLinksCompany: "Company",
		footerLinkFeatures: "Features",
		footerLinkDocs: "Docs",
		footerLinkAggregate: "Aggregate",
		footerLinkGallery: "Gallery Demo",
		footerLinkSikesra: "Sikesra App",
		footerLinkPrivacy: "Privacy Policy",
		footerLinkTerms: "Terms of Service",
		footerCopyright: "© 2026 AWCMS-Micro. All rights reserved. Built with EmDash.",
		featuredPagesTitle: "Featured pages",
		featuredPagesDescription:
			"Published pages are editable from the Pages collection and can be promoted into the public navigation.",
		featuredGalleryTitle: "Gallery spotlight",
		featuredGalleryDescription:
			"A featured gallery shows how media-rich content, layout variants, and admin-managed assets render publicly.",
		publicPagesTitle: "Public reference pages",
		publicPagesDescription:
			"Useful pages managed in the standard Pages collection and linked from the public site.",
		managePagesInAdmin: "Manage pages in admin",
		openPage: "Open page",
		counts: { posts: "Posts", news: "News", pages: "Pages", galleries: "Galleries" },
	},
	id: {
		notFoundTitle: "Halaman Tidak Ditemukan",
		notFoundDescription: "Halaman AWCMS-Micro yang diminta tidak ditemukan.",
		notFoundMessage: "Halaman yang diminta tidak ada atau tidak lagi dipublikasikan.",
		returnHome: "Kembali ke beranda",
		aggregateTitle: "Agregat Publik",
		aggregateDescription:
			"Halaman referensi aman-publik yang merangkum konten situs tanpa mengekspos data privat.",
		aggregateKicker: "Referensi",
		aggregateHeading: (siteTitle: string) => `Agregat publik untuk ${siteTitle}`,
		aggregateIntro:
			"Halaman ini mendemonstrasikan pola agregat aman-publik AWCMS-Micro. Halaman ini hanya menampilkan hitungan tingkat tinggi dan menghindari pengenal pribadi, kunci storage mentah, atau detail dokumen sensitif.",
		summary: "Ringkasan",
		privacyNote: "Catatan privasi",
		privacyNoteDescription:
			"Agregat referensi ini sengaja tetap tingkat tinggi sehingga bisa dipublikasikan tanpa mengungkap entitas registry individual, event verifikasi, atau atribut yang dilindungi.",
		openAdmin: "Buka admin",
		openAdminDescription: "untuk mengelola konten dan alur kerja tata kelola dasarnya.",
		postsTitle: "Pos",
		postsDescription: "Pos AWCMS-Micro yang dipublikasikan dan dikelola dari admin EmDash.",
		noPostsYet: "Belum ada pos.",
		newsTitle: "Berita",
		newsDescription: "Berita operasional dan produk dari AWCMS-Micro.",
		noNewsYet: "Belum ada berita.",
		homeKicker: "AWCMS-Micro",
		homeHeading: "Situs EmDash dan alur kerja admin yang terfokus untuk AWCMS-Micro.",
		homeIntro:
			"Template pengembangan lokal ini menunjukkan bagaimana AWCMS-Micro menampilkan konten publik, menjaga core EmDash tetap utuh, dan mengarahkan editor ke antarmuka admin standar untuk konten, pengaturan, dan alur kerja tata kelola berbasis plugin.",
		createPost: "Buat Pos",
		createPage: "Buat Halaman",
		viewDocs: "Lihat Docs",
		viewPublicAggregate: "Lihat Agregat Publik",
		nestedMenuTitle: "Demo menu bertingkat dan mode",
		publicNavigationExample: "Contoh navigasi publik",
		publicNavigationDescription:
			"Navigasi utama di header sudah merender struktur menu yang di-seed, termasuk item bertingkat, sehingga pengunjung bisa bergerak di seluruh situs tanpa render menu kedua di dalam isi halaman.",
		switchModeTitle: "Ganti mode",
		switchModeDescription:
			"Kontrol di bawah ini mencerminkan toggle header dan memungkinkan pengunjung mengganti mode terang dan gelap langsung dari beranda.",
		switchModeButton: "Ganti mode",
		howConnectsTitle: "Bagaimana situs publik terhubung ke admin",
		publishFromEmdash: "Publikasikan dari EmDash",
		publishFromEmdashDescription:
			"Pos, berita, dan halaman yang dibuat di admin langsung mengalir ke route publik di bawah ini.",
		keepContentInSync: "Jaga konten tetap sinkron",
		keepContentInSyncDescription:
			"Menu, pencarian, identitas situs, dan konten widget dirender dari data EmDash alih-alih placeholder hard-coded.",
		extendWithAwcms: "Perluas dengan AWCMS-Micro",
		extendWithAwcmsDescription:
			"Template yang tersimpan ini sudah mendaftarkan plugin contoh sehingga pengembangan lokal dapat menjalankan alur kerja tata kelola, audit, dan akses tanpa Cloudflare.",
		editorWorkflowShortcuts: "Shortcut alur kerja editor",
		publishedPostsVisible: "Pos terpublikasi yang saat ini terlihat di situs publik.",
		viewPosts: "Lihat pos",
		newsWorkflowVisible: "Pembaruan berita yang terhubung ke alur kerja publikasi yang sama.",
		viewNews: "Lihat berita",
		managedPagesVisible: "Halaman terkelola seperti About, catatan implementasi, dan info produk.",
		viewAboutPage: "Lihat halaman tentang",
		safeAggregateLabel: "Agregat aman",
		safeAggregateDescription:
			"Halaman referensi publik yang merangkum konten tanpa mengekspos pengenal sensitif.",
		viewAggregatePage: "Lihat halaman agregat",
		recentPosts: "Pos terbaru",
		noPostsCreateOne: "Belum ada pos. Buat satu dari admin.",
		latestNews: "Berita terbaru",
		searchPlaceholder: "Cari pos, halaman, dan berita",
		adminLink: "Admin",
		toggleTheme: "Ganti Tema",
		switchToLightMode: "Ganti ke Mode Terang",
		switchToDarkMode: "Ganti ke Mode Gelap",
		// Hero Section
		heroTitle: "Bangun Apa Saja di Atas Fondasi yang Tangguh",
		heroSubtitle:
			"AWCMS-Micro menggabungkan keandalan mutlak arsitektur single-tenant dengan model ekstensi EmDash yang fleksibel. Terintegrasi penuh, tanpa modifikasi core, siap untuk multi-tenant.",
		heroCtaPrimary: "Jelajahi Admin",
		heroCtaSecondary: "Baca Dokumentasi",

		// Features
		featuresTitle: "Didesain untuk Segala Kebutuhan",
		featuresSubtitle:
			"Dari situs web pemasaran standar hingga backend data yang kompleks, AWCMS-Micro menyediakan pengalaman pengembangan yang terpadu.",
		featureCmsTitle: "CMS Modern",
		featureCmsDesc:
			"Struktur konten fleksibel untuk blog, berita, dan halaman dengan pratinjau dan publikasi instan.",
		featureShopTitle: "Siap E-Commerce",
		featureShopDesc:
			"Transaksi aman, galeri produk, dan manajemen inventaris yang didukung oleh microservices kustom.",
		featureAppTitle: "Aplikasi Web Kustom",
		featureAppDesc:
			"API tangguh dan alur kerja serverless untuk mendukung portal web kustom dan aplikasi bisnis.",
		featureAdminTitle: "Pusat Admin",
		featureAdminDesc:
			"Portal backoffice lengkap yang dapat disesuaikan untuk entri data, audit, dan alur kerja tata kelola.",
		featureMobileTitle: "Backend Mobile",
		featureMobileDesc:
			"Endpoint REST dan GraphQL super cepat yang dirancang untuk mendukung aplikasi native Android dan iOS.",
		featureIotAiTitle: "Integrasi IoT & AI",
		featureIotAiDesc:
			"Pipeline sensor real-time, webhook agen, dan orkestrasi model AI langsung dari kotak.",

		// Use Cases Showcase
		useCasesTitle: "Implementasi Nyata",
		useCasesSubtitle:
			"Lihat bagaimana template dan plugin AWCMS-Micro menyesuaikan dengan kebutuhan arsitektur Anda.",
		useCaseCmsHeading: "1. CMS Website Headless",
		useCaseCmsText:
			"Kelola konten dengan koleksi EmDash standar dan sajikan secara statis atau dinamis. Frontend bertenaga Astro memberikan waktu muat optimal dan performa SEO terbaik.",
		useCaseShopHeading: "2. E-Commerce yang Aman",
		useCaseShopText:
			"Implementasikan feed produk, pencarian interaktif, dan checkout aman. Manfaatkan Cloudflare KV atau penyimpanan tahan lama untuk membangun toko global berperforma tinggi.",
		useCaseAppHeading: "3. Portal Web Perusahaan",
		useCaseAppText:
			"Bangun tata letak dan alur kerja responsif dengan dukungan penuh untuk otorisasi pengguna, pengaturan, dan integrasi API pihak ketiga.",
		useCaseAdminHeading: "4. Portal Admin Multi-Tenant",
		useCaseAdminText:
			"AWCMS-Micro menyertakan dasbor admin canggih yang menampilkan antarmuka terlokalisasi, grup sidebar yang dapat diciutkan, dan widget yang dapat diperluas.",
		useCaseMobileHeading: "5. Backend Mobile & IoT",
		useCaseMobileText:
			"Berfungsi sebagai backend berkinerja tinggi. Sediakan endpoint API dengan waktu respons sub-milidetik, otentikasi aman, dan sinkronisasi data real-time.",
		useCaseAiHeading: "6. Alur Kerja Bertenaga AI",
		useCaseAiText:
			"Jalankan agen cerdas, pantau log, dan picu alur kerja otomatis berdasarkan event database dan webhook.",

		// CTA Banner
		ctaTitle: "Siap mempercepat proyek Anda berikutnya?",
		ctaSubtitle:
			"Deploy AWCMS-Micro di Cloudflare Pages atau jalankan secara lokal dalam hitungan detik. Bergabunglah dengan pengembang yang membangun aplikasi tangguh.",
		ctaPrimary: "Mulai Sekarang",
		ctaSecondary: "Lihat di GitHub",

		// Footer
		footerBrandDesc:
			"Template web dan plugin tangguh yang dibangun di atas EmDash. Ringan, cepat, dan aman.",
		footerLinksProduct: "Produk",
		footerLinksResources: "Sumber Daya",
		footerLinksCompany: "Perusahaan",
		footerLinkFeatures: "Fitur",
		footerLinkDocs: "Dokumentasi",
		footerLinkAggregate: "Agregat",
		footerLinkGallery: "Demo Galeri",
		footerLinkSikesra: "Aplikasi Sikesra",
		footerLinkPrivacy: "Kebijakan Privasi",
		footerLinkTerms: "Ketentuan Layanan",
		footerCopyright:
			"© 2026 AWCMS-Micro. Hak cipta dilindungi undang-undang. Dibangun dengan EmDash.",
		featuredPagesTitle: "Halaman unggulan",
		featuredPagesDescription:
			"Halaman terpublikasi dapat diedit dari koleksi Pages dan dipromosikan ke navigasi publik.",
		featuredGalleryTitle: "Sorotan galeri",
		featuredGalleryDescription:
			"Galeri unggulan menunjukkan bagaimana konten kaya media, variasi layout, dan aset yang dikelola admin dirender secara publik.",
		publicPagesTitle: "Halaman referensi publik",
		publicPagesDescription:
			"Halaman berguna yang dikelola di koleksi Pages standar dan ditautkan dari situs publik.",
		managePagesInAdmin: "Kelola halaman di admin",
		openPage: "Buka halaman",
		counts: { posts: "Pos", news: "Berita", pages: "Halaman", galleries: "Galeri" },
	},
} as const;

export function getPublicCopy(locale: string | undefined) {
	return locale?.startsWith("id") ? PUBLIC_COPY.id : PUBLIC_COPY.en;
}
