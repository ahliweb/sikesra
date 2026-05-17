import { describe, expect, it } from "vitest";

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

	it("marks person-profile modules clearly for interim UX", () => {
		for (const code of ["05", "06", "07", "08"]) {
			const moduleConfig = getModuleUiConfig(code);
			const personProfileField = moduleConfig?.detailFields.find((field) => field.key === "person_profile_id");

			expect(personProfileField).toEqual(
				expect.objectContaining({
					label: "Person Profile",
					required: true,
					helperText: expect.stringContaining("profil"),
				}),
			);
		}
	});
});
