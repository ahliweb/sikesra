import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveEntrySlug, stripLocalePrefix, toLocalePath } from "./locale-path.ts";

const options = {
	defaultLocale: "en",
	locales: ["en", "id"],
};

void describe("locale path helpers", () => {
	void it("adds locale prefixes only for non-default locales", () => {
		assert.equal(toLocalePath("/", "en", options), "/");
		assert.equal(toLocalePath("/", "id", options), "/id");
		assert.equal(toLocalePath("/posts/hello-world", "id", options), "/id/posts/hello-world");
	});

	void it("strips and rebuilds locale-prefixed paths", () => {
		assert.equal(stripLocalePrefix("/id/posts/halo", options), "/posts/halo");
		assert.equal(toLocalePath("/id/posts/halo", "en", options), "/posts/halo");
		assert.equal(toLocalePath("/id/posts/halo", "id", options), "/id/posts/halo");
	});

	void it("leaves admin and asset paths untouched", () => {
		assert.equal(toLocalePath("/_emdash/admin", "id", options), "/_emdash/admin");
		assert.equal(toLocalePath("/_astro/app.js", "id", options), "/_astro/app.js");
	});

	void it("uses content slug when available", () => {
		assert.equal(resolveEntrySlug({ id: "entry_123", data: { slug: "hello-world" } }), "hello-world");
		assert.equal(resolveEntrySlug({ id: "entry_123", data: {} }), "entry_123");
	});
});
