import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const authenticateMock = vi.fn();

vi.mock("virtual:emdash/auth", () => ({ authenticate: authenticateMock }));
vi.mock("virtual:emdash/config", () => ({ default: {} }));
vi.mock("astro:middleware", () => ({
	defineMiddleware: (handler: unknown) => handler,
}));
vi.mock("@emdash-cms/auth", () => ({
	TOKEN_PREFIXES: {},
	generatePrefixedToken: vi.fn(),
	hashPrefixedToken: vi.fn(),
	VALID_SCOPES: [],
	validateScopes: vi.fn(),
	hasScope: vi.fn(() => false),
	computeS256Challenge: vi.fn(),
	Role: { ADMIN: 50 },
}));
vi.mock("@emdash-cms/auth/adapters/kysely", () => ({
	createKyselyAdapter: vi.fn(() => ({
		getUserById: vi.fn(),
		getUserByEmail: vi.fn(),
	})),
}));

type AuthMiddlewareModule = typeof import("../../../src/astro/middleware/auth.js");

let onRequest: AuthMiddlewareModule["onRequest"];

beforeAll(async () => {
	({ onRequest } = await import("../../../src/astro/middleware/auth.js"));
});

beforeEach(() => {
	vi.clearAllMocks();
	authenticateMock.mockRejectedValue(new Error("No Access JWT present"));
});

describe("external auth admin login route", () => {
	it("allows the public login page to render without external auth credentials", async () => {
		const url = new URL("/_emdash/admin/login", "https://example.com");
		const session = {
			get: vi.fn().mockResolvedValue(null),
			set: vi.fn(),
			destroy: vi.fn(),
		};
		const next = vi.fn(async () => new Response("login page"));

		const response = await onRequest(
			{
				url,
				request: new Request(url),
				locals: {
					emdash: {
						db: {},
						config: {
							auth: {
								type: "cloudflare-access",
								entrypoint: "@emdash-cms/cloudflare/auth",
								config: { teamDomain: "example.cloudflareaccess.com" },
							},
						},
					},
				},
				session,
				redirect: (location: string) =>
					new Response(null, { status: 302, headers: { Location: location } }),
			} as Parameters<AuthMiddlewareModule["onRequest"]>[0],
			next,
		);

		expect(next).toHaveBeenCalledOnce();
		expect(authenticateMock).not.toHaveBeenCalled();
		expect(response.status).toBe(200);
		await expect(response.text()).resolves.toBe("login page");
	});
});
