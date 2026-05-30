export type DocsLocale = "en" | "id";

export interface DocsReferenceItem {
	title: string;
	description: string;
}

export interface DocsSection {
	title: string;
	intro: string;
	bullets: string[];
}

export interface DocsCopy {
	kicker: string;
	title: string;
	intro: string;
	prTitle: string;
	prIntro: string;
	prBullets: string[];
	prBacklogTitle: string;
	prBacklog: string[];
	openAdmin: string;
	openDocsAdmin: string;
	viewPublicDocs: string;
	publicPagesTitle: string;
	publicPagesDescription: string;
	openPage: string;
	managePagesInAdmin: string;
	sections: DocsSection[];
	referencesTitle: string;
	references: DocsReferenceItem[];
}

const DOCS_COPY: Record<DocsLocale, DocsCopy> = {
	en: {
		kicker: "Documentation",
		title: "AWCMS-Micro docs and operating notes",
		intro:
			"This plugin surfaces the workspace guidance that keeps AWCMS-Micro aligned with EmDash while preserving the approved downstream boundaries.",
		prTitle: "Reference PRD",
		prIntro:
			"The SIKESRA reference PRD frames the example standard without turning it into production SIKESRA code.",
		prBullets: [
			"In scope: the docs boundary, the example plugin, both templates, and E2E coverage.",
			"Reference goals: plugin/runtime shape, public-safe aggregate, registry and verification screens, masked fixtures, and validation guidance.",
			"Execution order: document the standard, build the reference plugin and fixtures, align admin UI, align both templates, then harden E2E validation.",
		],
		prBacklogTitle: "Backlog map",
		prBacklog: [
			"#51 PRD and execution standard",
			"#52 Reference plugin standard",
			"#54 Admin UI/UX reference",
			"#55 Data model and fixtures",
			"#56 Security tests",
			"#57 Public aggregate page",
			"#58 Cloudflare deployability",
			"#59 E2E validation",
		],
		openAdmin: "Open docs admin",
		openDocsAdmin: "Open docs page",
		viewPublicDocs: "View public docs",
		publicPagesTitle: "Public reference pages",
		publicPagesDescription:
			"Published pages are editable from the standard Pages collection and can be surfaced from the docs hub.",
		openPage: "Open page",
		managePagesInAdmin: "Manage pages in admin",
		sections: [
			{
				title: "Workspace shape",
				intro: "The parent repo is a maintenance layer, not a runtime host.",
				bullets: [
					"`emdash-latest/` stays as the upstream reference tree.",
					"`awcmsmicro-dev/` is rebuilt from upstream and then receives approved AWCMS-Micro overlays.",
					"`scripts/` owns the sync and validation workflow for both trees.",
				],
			},
			{
				title: "Sync flow",
				intro: "Rebuilds must stay deterministic and reversible.",
				bullets: [
					"Check runtime prerequisites before any sync or validation step.",
					"Rebuild `awcmsmicro-dev/` from `emdash-latest/` with the protected-path allowlist.",
					"Restore only approved downstream paths and patch overlays after the rebuild.",
				],
			},
			{
				title: "Protected boundaries",
				intro:
					"AWCMS-Micro-owned work lives in explicit plugin, template, docs, demo, and release paths.",
				bullets: [
					"Plugins: `packages/plugins/awcms-micro-sikesra`, `packages/plugins/awcms-micro-gallery`, and `packages/plugins/awcms-micro-docs`.",
					"Templates: `templates/awcms-micro-default` and `templates/awcms-micro-default-cloudflare`.",
					"Docs and release metadata stay inside the approved downstream boundaries listed in the implementation-boundaries document.",
				],
			},
		],
		referencesTitle: "Reference documents",
		references: [
			{ title: "README.md", description: "Root entry point for the workspace and sync model." },
			{ title: "AGENTS.md", description: "Agent execution rules for the parent workspace." },
			{
				title: "docs/implementation-instructions.md",
				description: "How to work inside the maintenance layer.",
			},
			{
				title: "docs/synchronization-workflow.md",
				description: "How upstream refreshes flow into the dev workspace.",
			},
			{
				title: "docs/awcms-micro-implementation-boundaries.md",
				description: "The rebuild-safe path allowlist and preservation rules.",
			},
			{
				title: "docs/operator-workflow.md",
				description: "Continuation vs fresh-clone guidance for operators.",
			},
		],
	},
	id: {
		kicker: "Dokumentasi",
		title: "Dokumen dan catatan operasi AWCMS-Micro",
		intro:
			"Plugin ini menampilkan panduan workspace yang menjaga AWCMS-Micro tetap selaras dengan EmDash sambil mempertahankan boundary downstream yang disetujui.",
		prTitle: "PRD Referensi",
		prIntro:
			"PRD referensi SIKESRA membingkai standar contoh tanpa mengubahnya menjadi kode SIKESRA produksi.",
		prBullets: [
			"Ruang lingkup: boundary docs, plugin contoh, kedua template, dan cakupan E2E.",
			"Tujuan referensi: bentuk plugin/runtime, aggregate aman-publik, layar registry dan verifikasi, fixture yang dimasking, dan panduan validasi.",
			"Urutan eksekusi: dokumentasikan standar, bangun plugin dan fixture referensi, selaraskan UI admin, selaraskan kedua template, lalu perkuat validasi E2E.",
		],
		prBacklogTitle: "Peta backlog",
		prBacklog: [
			"#51 PRD dan standar eksekusi",
			"#52 Standar plugin referensi",
			"#54 Referensi UI/UX admin",
			"#55 Model data dan fixture",
			"#56 Tes keamanan",
			"#57 Halaman aggregate publik",
			"#58 Kesiapan deploy Cloudflare",
			"#59 Validasi E2E",
		],
		openAdmin: "Buka admin docs",
		openDocsAdmin: "Buka halaman docs",
		viewPublicDocs: "Lihat docs publik",
		publicPagesTitle: "Halaman referensi publik",
		publicPagesDescription:
			"Halaman terpublikasi dapat diedit dari koleksi Pages standar dan bisa ditampilkan dari hub docs.",
		openPage: "Buka halaman",
		managePagesInAdmin: "Kelola halaman di admin",
		sections: [
			{
				title: "Bentuk workspace",
				intro: "Parent repo adalah lapisan pemeliharaan, bukan host runtime.",
				bullets: [
					"`emdash-latest/` tetap menjadi pohon referensi upstream.",
					"`awcmsmicro-dev/` dibangun ulang dari upstream lalu menerima overlay AWCMS-Micro yang disetujui.",
					"`scripts/` memiliki workflow sinkronisasi dan validasi untuk kedua tree.",
				],
			},
			{
				title: "Alur sinkronisasi",
				intro: "Rebuild harus deterministik dan bisa dibalik.",
				bullets: [
					"Periksa prerequisite runtime sebelum langkah sync atau validasi apa pun.",
					"Bangun ulang `awcmsmicro-dev/` dari `emdash-latest/` dengan allowlist protected path.",
					"Pulihkan hanya path downstream yang disetujui dan patch overlay setelah rebuild.",
				],
			},
			{
				title: "Boundary yang dilindungi",
				intro:
					"Pekerjaan milik AWCMS-Micro berada di path plugin, template, docs, demo, dan release yang eksplisit.",
				bullets: [
					"Plugin: `packages/plugins/awcms-micro-sikesra`, `packages/plugins/awcms-micro-gallery`, dan `packages/plugins/awcms-micro-docs`.",
					"Template: `templates/awcms-micro-default` dan `templates/awcms-micro-default-cloudflare`.",
					"Docs dan metadata rilis tetap berada di boundary downstream yang disetujui pada dokumen implementation-boundaries.",
				],
			},
		],
		referencesTitle: "Dokumen referensi",
		references: [
			{
				title: "README.md",
				description: "Pintu masuk root untuk workspace dan model sinkronisasi.",
			},
			{ title: "AGENTS.md", description: "Aturan eksekusi agent untuk parent workspace." },
			{
				title: "docs/implementation-instructions.md",
				description: "Cara bekerja di dalam lapisan maintenance.",
			},
			{
				title: "docs/synchronization-workflow.md",
				description: "Cara refresh upstream mengalir ke workspace dev.",
			},
			{
				title: "docs/awcms-micro-implementation-boundaries.md",
				description: "Allowlist path rebuild-safe dan aturan preservasi.",
			},
			{
				title: "docs/operator-workflow.md",
				description: "Panduan continuation vs fresh-clone untuk operator.",
			},
		],
	},
};

export function getDocsCopy(locale: string | undefined): DocsCopy {
	return locale?.startsWith("id") ? DOCS_COPY.id : DOCS_COPY.en;
}
