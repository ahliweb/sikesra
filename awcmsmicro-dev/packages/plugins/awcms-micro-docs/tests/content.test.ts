import { describe, expect, it } from "vitest";

import { getDocsCopy } from "../src/content.js";

describe("docs copy", () => {
	it("returns English by default", () => {
		expect(getDocsCopy(undefined).title).toContain("AWCMS-Micro");
	});

	it("returns Indonesian for id locales", () => {
		expect(getDocsCopy("id-ID").title).toContain("Dokumen");
	});

	it("includes the docs plugin boundary", () => {
		expect(getDocsCopy("en").sections[2]?.bullets.join(" ")).toContain("awcms-micro-docs");
	});

	it("includes PRD summary content", () => {
		const copy = getDocsCopy("en");
		expect(copy.prTitle).toContain("PRD");
		expect(copy.prBacklog.join(" ")).toContain("#51");
	});
});
