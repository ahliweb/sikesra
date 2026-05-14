/**
 * Accessibility E2E Tests
 *
 * Automated WCAG 2.1 AA audit using axe-core.
 * Tests for critical and high-priority accessibility issues across admin pages.
 */

import AxeBuilder from "@axe-core/playwright";

import { test, expect } from "../fixtures";

// Regex patterns for URL assertions (anchored to prevent false matches)
const ADMIN_ROOT_URL = /\/_emdash\/admin\/?(?:[?#].*)?$/;
const CONTENT_POSTS_URL = /\/content\/posts\/?(?:[?#].*)?$/;
const CONTENT_POSTS_NEW_URL = /\/content\/posts\/new\/?(?:[?#].*)?$/;
const MEDIA_URL = /\/media\/?(?:[?#].*)?$/;
const USERS_URL = /\/users\/?(?:[?#].*)?$/;
const SETTINGS_URL = /\/settings\/?(?:[?#].*)?$/;

// Known a11y violations from upstream dependencies:
// - color-contrast: kumo design system colors on white backgrounds (needs upstream fix)
// - aria-valid-attr-value: Base UI's Collapsible sets aria-controls on triggers pointing
//   to panel IDs that may not be in the DOM when collapsed (kumo Sidebar collapsible groups)
const KNOWN_A11Y_EXCLUSIONS = ["color-contrast", "aria-valid-attr-value"];

test.describe("Accessibility Audit", () => {
	test.describe("Login Page", () => {
		test("should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goto("/login");

			// Wait for stable content — admin pages need Astro compilation on first hit
			await expect(admin.page.locator("h1")).toContainText("Sign in", { timeout: 15000 });

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});
	});

	test.describe("Authenticated Pages", () => {
		test.beforeEach(async ({ admin }) => {
			await admin.devBypassAuth();
		});

		test("dashboard should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goToDashboard();
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(ADMIN_ROOT_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("content list should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goToContent("posts");
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(CONTENT_POSTS_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("content editor should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goToNewContent("posts");
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(CONTENT_POSTS_NEW_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.exclude(".ProseMirror") // Rich text editor has complex a11y needs
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("media library should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goToMedia();
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(MEDIA_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("users page should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goto("/users");
			await admin.waitForShell();
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(USERS_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("settings page should have no WCAG 2.x AA violations", async ({ admin }) => {
			await admin.goToSettings();
			await admin.waitForLoading();
			await expect(admin.page).toHaveURL(SETTINGS_URL);

			const results = await new AxeBuilder({ page: admin.page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
				.disableRules(KNOWN_A11Y_EXCLUSIONS)
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("content list should be keyboard navigable", async ({ admin }) => {
			await admin.goToContent("posts");
			await admin.waitForLoading();

			// Tab through key interactive elements
			await admin.page.keyboard.press("Tab");

			const focusedElements: string[] = [];
			for (let i = 0; i < 10; i++) {
				const focused = await admin.page.evaluate(() => document.activeElement?.tagName || "");
				focusedElements.push(focused);
				await admin.page.keyboard.press("Tab");
			}

			// Should have found interactive elements (buttons, links)
			expect(focusedElements.some((el) => el === "BUTTON" || el === "A")).toBe(true);
		});
	});
});
