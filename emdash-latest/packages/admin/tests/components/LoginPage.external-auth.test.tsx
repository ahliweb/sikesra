import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "../utils/render.tsx";

vi.mock("@tanstack/react-router", async () => {
	const actual = await vi.importActual("@tanstack/react-router");
	return {
		...actual,
		Link: ({ children, to, ...props }: any) => (
			<a href={to} {...props}>
				{children}
			</a>
		),
		useNavigate: () => vi.fn(),
	};
});

const mockFetchAuthMode = vi.fn().mockResolvedValue({
	authMode: "cloudflare-access",
	devPasskeyFallback: false,
});

vi.mock("../../src/lib/api", async () => {
	const actual = await vi.importActual("../../src/lib/api");
	return {
		...actual,
		fetchAuthMode: (...args: unknown[]) => mockFetchAuthMode(...args),
		apiFetch: vi.fn(),
	};
});

const { LoginPage } = await import("../../src/components/LoginPage");

Object.defineProperty(window, "PublicKeyCredential", {
	value: function PublicKeyCredential() {},
	writable: true,
});

function QueryWrapper({ children }: { children: React.ReactNode }) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("LoginPage external auth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetchAuthMode.mockResolvedValue({
			authMode: "cloudflare-access",
			devPasskeyFallback: false,
		});
		window.history.replaceState({}, "", window.location.pathname);
	});

	it("shows an external-auth sign-in prompt instead of redirecting immediately", async () => {
		const screen = await render(
			<QueryWrapper>
				<LoginPage />
			</QueryWrapper>,
		);

		await expect
			.element(
				screen.getByText(
					"Authentication is managed by an external provider (cloudflare-access). Passkey settings are not available when using external authentication.",
				),
			)
			.toBeInTheDocument();
		await expect.element(screen.getByText("Continue →")).toBeInTheDocument();
	});

	it("shows passkey login in dev fallback mode", async () => {
		mockFetchAuthMode.mockResolvedValueOnce({
			authMode: "cloudflare-access",
			devPasskeyFallback: true,
		});

		const screen = await render(
			<QueryWrapper>
				<LoginPage />
			</QueryWrapper>,
		);

		await expect.element(screen.getByText("Sign in with Passkey")).toBeInTheDocument();
	});

	it("shows provider errors on the external-auth prompt", async () => {
		window.history.replaceState({}, "", "/_emdash/admin/login?error=access_denied&message=Access%20denied");

		const screen = await render(
			<QueryWrapper>
				<LoginPage />
			</QueryWrapper>,
		);

		await expect.element(screen.getByText("Access denied")).toBeInTheDocument();
	});
});
