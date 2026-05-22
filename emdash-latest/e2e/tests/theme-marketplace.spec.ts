/**
 * Theme Marketplace E2E Tests
 *
 * Tests the theme marketplace admin pages:
 * - Browse page at /themes/marketplace
 * - Detail page at /themes/marketplace/{themeId}
 *
 * These tests run against a mock marketplace server (port 4445) that serves
 * canned theme data.
 */

import { test, expect } from "../fixtures";

// URL patterns (module scope for e18e/prefer-static-regex)
const THEME_DETAIL_URL_PATTERN = /\/themes\/marketplace\/minimal-blog/;
const THEME_BROWSE_URL_PATTERN = /\/themes\/marketplace\/?$/;

test.describe("Theme Marketplace", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.devBypassAuth();
	});

	test.describe("Browse page", () => {
		test("renders theme cards", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Wait for at least one theme to load
			await expect(page.getByText("Minimal Blog").first()).toBeVisible({ timeout: 15000 });
			await expect(page.getByText("Portfolio Pro").first()).toBeVisible();
		});

		test("theme cards show name, author, and description", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			await expect(page.getByText("Minimal Blog").first()).toBeVisible({ timeout: 15000 });

			// Author and description should be visible somewhere on the page
			await expect(page.getByText("EmDash Labs").first()).toBeVisible();
			await expect(page.getByText("A clean, minimal blog theme.")).toBeVisible();
		});

		test("search filters themes by name", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			await expect(page.getByText("Minimal Blog").first()).toBeVisible({ timeout: 15000 });

			// Search for something that doesn't match
			const searchInput = page.getByPlaceholder("Search themes...");
			await searchInput.fill("nonexistent-theme-xyz");

			// Wait for debounce
			await page.waitForTimeout(1000);

			// Neither theme should match
			await expect(page.getByText("Minimal Blog").first()).not.toBeVisible({ timeout: 5000 });
			await expect(page.getByText("Portfolio Pro")).not.toBeVisible();
		});
	});

	test.describe("Theme detail page", () => {
		test("navigates to detail page on click", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Wait for themes to load, then click
			const themeLink = page.locator("a", { hasText: "Minimal Blog" }).first();
			await expect(themeLink).toBeVisible({ timeout: 15000 });
			await themeLink.click();

			// URL should include the theme ID
			await expect(page).toHaveURL(THEME_DETAIL_URL_PATTERN, { timeout: 10000 });
		});

		test("detail page shows theme info", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace/minimal-blog");
			await admin.waitForShell();
			await admin.waitForLoading();

			// Theme name (use first() for multiple h1s)
			await expect(page.locator("h1").first()).toContainText("Minimal Blog", {
				timeout: 15000,
			});

			// Author
			await expect(page.getByText("EmDash Labs").first()).toBeVisible();

			// Description
			await expect(page.getByText("A clean, minimal blog theme.")).toBeVisible();
		});

		test("back link navigates to browse", async ({ admin, page }) => {
			await admin.goto("/themes/marketplace/minimal-blog");
			await admin.waitForShell();
			await admin.waitForLoading();

			await expect(page.locator("h1").first()).toContainText("Minimal Blog", {
				timeout: 15000,
			});

			// Click back link
			const backLink = page.locator("a", { hasText: "Themes" }).first();
			await backLink.click();

			await expect(page).toHaveURL(THEME_BROWSE_URL_PATTERN, { timeout: 10000 });
		});
	});
});
