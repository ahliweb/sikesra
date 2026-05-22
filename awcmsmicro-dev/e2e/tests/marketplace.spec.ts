/**
 * Plugin Marketplace E2E Tests
 *
 * Tests the plugin marketplace admin pages:
 * - Browse page at /plugins/marketplace
 * - Detail page at /plugins/marketplace/{pluginId}
 *
 * These tests run against a mock marketplace server (port 4445) that serves
 * canned plugin data. The proxy endpoints in the EmDash admin forward
 * requests to the mock, so we're testing the full UI flow.
 */

import { test, expect } from "../fixtures";

// URL patterns (module scope for e18e/prefer-static-regex)
const PLUGIN_DETAIL_URL_PATTERN = /\/plugins\/marketplace\/seo-toolkit/;
const MARKETPLACE_BROWSE_URL_PATTERN = /\/plugins\/marketplace\/?$/;

test.describe("Plugin Marketplace", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.devBypassAuth();
	});

	test.describe("Browse page", () => {
		test("renders marketplace page with plugin cards", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Wait for at least one plugin card to appear (the mock serves SEO Toolkit)
			await expect(page.getByText("SEO Toolkit")).toBeVisible({ timeout: 15000 });
		});

		test("plugin card shows name, author, version", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Wait for cards to load
			await expect(page.getByText("SEO Toolkit")).toBeVisible({ timeout: 15000 });

			// The card is a link element containing plugin info
			const seoCard = page.locator("a", { hasText: "SEO Toolkit" }).first();

			// Author
			await expect(seoCard.getByText("Labs")).toBeVisible();

			// Version
			await expect(seoCard.getByText("v2.1.0")).toBeVisible();
		});

		test("search filters plugins by name", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			await expect(page.getByText("SEO Toolkit")).toBeVisible({ timeout: 15000 });

			// Type in the search box
			const searchInput = page.getByPlaceholder("Search plugins...");
			await searchInput.fill("nonexistent-plugin-xyz");

			// Wait for the debounced search to complete
			await page.waitForTimeout(1000);

			// No plugins should match
			await expect(page.getByText("SEO Toolkit")).not.toBeVisible({ timeout: 5000 });
		});
	});

	test.describe("Plugin detail page", () => {
		test("navigates to detail page on card click", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Wait for cards
			const seoCard = page.locator("a", { hasText: "SEO Toolkit" }).first();
			await expect(seoCard).toBeVisible({ timeout: 15000 });

			// Click the card
			await seoCard.click();

			// URL should include the plugin ID
			await expect(page).toHaveURL(PLUGIN_DETAIL_URL_PATTERN, { timeout: 10000 });
		});

		test("detail page shows plugin info", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace/seo-toolkit");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Plugin name in heading (use first() since sidebar may also have an h1)
			await expect(page.locator("h1").first()).toContainText("SEO Toolkit", { timeout: 15000 });

			// Author
			await expect(page.getByText("EmDash Labs").first()).toBeVisible();
		});

		test("back link navigates to browse page", async ({ admin, page }) => {
			await admin.goto("/plugins/marketplace/seo-toolkit");
			await admin.waitForShell();
			await admin.waitForLoading();

			await expect(page.locator("h1").first()).toContainText("SEO Toolkit", { timeout: 15000 });

			// Click the back link (look for any link going back to marketplace)
			const backLink = page.locator("a", { hasText: "Marketplace" }).first();
			await backLink.click();

			// Should navigate back to browse page
			await expect(page).toHaveURL(MARKETPLACE_BROWSE_URL_PATTERN, { timeout: 10000 });
		});
	});
});
