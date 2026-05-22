/**
 * Device Authorization E2E Tests
 *
 * Tests the device authorization page at /device. This is a standalone page
 * (no Shell wrapper) used for OAuth device flow -- the user enters a code
 * shown by `emdash login` in their terminal.
 *
 * The page checks authentication and redirects to login if not authenticated.
 * For these tests we bypass auth first, then navigate directly.
 */

import { test, expect } from "../fixtures";

// Regex patterns
const DEVICE_AUTHORIZE_PATTERN = /\/api\/oauth\/device\/authorize$/;

test.describe("Device Authorization", () => {
	test.beforeEach(async ({ admin }) => {
		await admin.devBypassAuth();
	});

	test.describe("Page rendering", () => {
		test("renders the device authorization page with heading", async ({ admin }) => {
			// Navigate directly -- device page is standalone (no Shell)
			await admin.page.goto("/_emdash/admin/device");
			await admin.waitForHydration();

			// Page heading
			await expect(admin.page.locator("h1")).toContainText("Authorize Device", {
				timeout: 15000,
			});

			// Subtitle
			await expect(admin.page.locator("text=Enter the code from your terminal")).toBeVisible();
		});

		test("shows user info badge for authenticated user", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device");

			// Wait for the auth check to complete (shows "Checking authentication..." first)
			// then the user badge appears with role info.
			await expect(admin.page.getByText("Dev Admin")).toBeVisible({ timeout: 15000 });
			await expect(admin.page.getByText("Admin", { exact: true })).toBeVisible();
		});
	});

	test.describe("Code input", () => {
		test("shows device code input field", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device");
			await admin.waitForHydration();

			// Wait for the input to appear (after auth check completes)
			const codeInput = admin.page.locator("#user-code");
			await expect(codeInput).toBeVisible({ timeout: 15000 });

			// Input should have the expected placeholder
			await expect(codeInput).toHaveAttribute("placeholder", "XXXX-XXXX");
		});

		test("Authorize button is disabled until 8 characters are entered", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device");
			await admin.waitForHydration();

			const codeInput = admin.page.locator("#user-code");
			await expect(codeInput).toBeVisible({ timeout: 15000 });

			// Both buttons should be disabled with empty input
			const authorizeBtn = admin.page.getByRole("button", { name: "Authorize" });
			const denyBtn = admin.page.getByRole("button", { name: "Deny" });
			await expect(authorizeBtn).toBeDisabled();
			await expect(denyBtn).toBeDisabled();

			// Type a partial code (less than 8 chars) -- still disabled
			await codeInput.fill("ABCD");
			await expect(authorizeBtn).toBeDisabled();

			// Type a full 8-character code -- buttons should enable
			await codeInput.fill("ABCD-1234");
			await expect(authorizeBtn).toBeEnabled();
			await expect(denyBtn).toBeEnabled();
		});

		test("auto-formats code with hyphen after 4 characters", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device");
			await admin.waitForHydration();

			const codeInput = admin.page.locator("#user-code");
			await expect(codeInput).toBeVisible({ timeout: 15000 });

			// Type 5 characters without hyphen -- should auto-insert
			await codeInput.pressSequentially("ABCDE");

			// Value should be "ABCD-E" (hyphen auto-inserted after 4th char)
			await expect(codeInput).toHaveValue("ABCD-E");
		});
	});

	test.describe("Invalid code submission", () => {
		test("submitting an invalid code shows error", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device");
			await admin.waitForHydration();

			const codeInput = admin.page.locator("#user-code");
			await expect(codeInput).toBeVisible({ timeout: 15000 });

			// Enter a valid-format but non-existent code
			await codeInput.fill("ZZZZ-9999");

			// Submit the form
			const authorizeBtn = admin.page.getByRole("button", { name: "Authorize" });
			await expect(authorizeBtn).toBeEnabled();

			// Wait for the API response (should be an error)
			const authResponse = admin.page.waitForResponse(
				(res) => DEVICE_AUTHORIZE_PATTERN.test(res.url()) && res.request().method() === "POST",
				{ timeout: 15000 },
			);

			await authorizeBtn.click();
			await authResponse;

			// Error message should appear
			await expect(
				admin.page
					.locator("text=Invalid or expired code")
					.or(admin.page.locator(".text-destructive")),
			).toBeVisible({ timeout: 10000 });
		});
	});

	test.describe("URL pre-population", () => {
		test("pre-populates code from URL query parameter", async ({ admin }) => {
			await admin.page.goto("/_emdash/admin/device?code=TEST-CODE");
			await admin.waitForHydration();

			const codeInput = admin.page.locator("#user-code");
			await expect(codeInput).toBeVisible({ timeout: 15000 });

			// Should be pre-filled from the query param
			await expect(codeInput).toHaveValue("TEST-CODE");
		});
	});
});
