import { describe, expect, it } from "vitest";

import { SIKESRA_DETAIL_MODULES } from "../src/detail-modules.js";
import { getModuleUiConfig, listModuleUiConfigs } from "../src/module-ui-config.js";

describe("SIKESRA module UI config", () => {
	it("covers all 8 MVP data modules with operator-facing metadata", () => {
		const modules = listModuleUiConfigs();

		expect(modules.map((moduleConfig) => moduleConfig.objectTypeCode)).toEqual([
			"01",
			"02",
			"03",
			"04",
			"05",
			"06",
			"07",
			"08",
		]);
		expect(getModuleUiConfig("04")).toEqual(
			expect.objectContaining({
				label: "LKS / Lembaga Kesejahteraan Sosial",
				entityKind: "institution",
			}),
		);
	});

	it("matches detail-modules.ts field coverage and required flags for all 8 modules", () => {
		for (const [objectTypeCode, detailModule] of Object.entries(SIKESRA_DETAIL_MODULES)) {
			const moduleConfig = getModuleUiConfig(objectTypeCode);

			expect(moduleConfig, `Missing module UI config for ${objectTypeCode}`).toBeDefined();
			expect(moduleConfig?.detailFields.map((field) => field.key)).toEqual(detailModule.fields);

			expect(
				moduleConfig?.detailFields.filter((field) => field.required).map((field) => field.key),
				`Required fields in ${objectTypeCode} must align exactly with detail-modules.ts`,
			).toEqual(detailModule.requiredFields);

			for (const fieldConfig of moduleConfig?.detailFields ?? []) {
				expect(fieldConfig.label, `Field ${fieldConfig.key} in ${objectTypeCode} needs a readable label`).not.toBe(fieldConfig.key);
			}
		}
	});

	it("marks person-profile modules clearly for interim UX", () => {
		const expectedHelperText = {
			"05": "Masukkan ID profil orang yang sudah ada. Pencarian dan pembuatan profil baru belum tersedia langsung di shell admin ini.",
			"06": "Masukkan ID profil orang yang sudah ada. Detail identitas sensitif tetap dimask server-side.",
			"07": "Masukkan ID profil orang yang sudah ada. Detail sensitif tidak akan ditampilkan penuh pada review umum.",
			"08": "Masukkan ID profil orang yang sudah ada. Workflow pencarian dan pembuatan profil baru masih akan ditingkatkan.",
		} as const;

		for (const code of ["05", "06", "07", "08"] as const) {
			const moduleConfig = getModuleUiConfig(code);
			const personProfileField = moduleConfig?.detailFields.find((field) => field.key === "person_profile_id");

			expect(personProfileField).toEqual(
				expect.objectContaining({
					label: "Profil Orang",
					required: true,
					helperText: expectedHelperText[code],
				}),
			);
		}
	});

	it("provides options for every select field", () => {
		const expectedSubtypeCounts = {
			"01": 8,
			"02": 7,
			"03": 3,
			"04": 8,
			"05": 3,
			"06": 3,
			"07": 4,
			"08": 3,
		} as const;
		const expectedSelectValues: Record<string, string[]> = {
			"01.jenis_rumah_ibadah": ["Masjid", "Musholla", "Surau", "Gereja", "Pura", "Wihara", "Klenteng", "Lainnya"],
			"01.status_pembangunan": ["beroperasi", "dalam_pembangunan", "renovasi"],
			"02.agama": ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"],
			"03.jenis_pendidikan": ["TPA/TPQ", "Pondok Pesantren", "Lainnya"],
			"03.status_akreditasi": ["terakreditasi", "proses", "belum"],
			"04.jenis_lks": ["BAZNAS", "PWRI", "Panti Asuhan", "Panti Yatim", "Panti Jompo", "Rukun Kematian", "Majelis Taklim", "LKS Lainnya"],
			"05.agama": ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"],
			"05.status_guru": ["aktif", "tidak_aktif", "pensiun", "almarhum"],
			"06.kategori_anak": ["yatim", "piatu", "yatim_piatu"],
			"07.jenis_disabilitas": ["Fisik", "Intelektual", "Mental", "Sensorik"],
			"07.tingkat_keparahan": ["ringan", "sedang", "berat"],
			"07.alat_bantu_dibutuhkan": ["1", "0"],
			"08.status_keterlantaran": ["terlantar", "rawan_terlantar", "mandiri_risiko"],
			"08.status_tinggal": ["sendiri", "pasangan", "keluarga", "panti"],
		};

		for (const moduleConfig of listModuleUiConfigs()) {
			expect(moduleConfig.subtypes.length).toBe(expectedSubtypeCounts[moduleConfig.objectTypeCode as keyof typeof expectedSubtypeCounts]);

			for (const fieldConfig of moduleConfig.detailFields) {
				if (fieldConfig.input !== "select") continue;
				const expectedValues = expectedSelectValues[`${moduleConfig.objectTypeCode}.${fieldConfig.key}`];

				expect(
					fieldConfig.options?.length,
					`Select field ${moduleConfig.objectTypeCode}.${fieldConfig.key} must define options`,
				).toBeGreaterThan(0);
				expect(fieldConfig.options?.every((option) => option.label.trim().length > 0 && option.value.trim().length > 0)).toBe(true);
				expect(fieldConfig.options?.map((option) => option.value)).toEqual(expectedValues);
			}
		}
	});
});
