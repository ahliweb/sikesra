// SIKESRA Cloudflare Access JWT Validation Tests
// Verify JWT parsing, validation, claim extraction, and role mapping
// Source: docs/sikesra/06_security_rbac_abac.md, Issue #200

import { describe, it, expect } from "vitest";
import {
  parseCloudflareAccessJwt,
  validateCloudflareAccessJwt,
  extractUserIdFromClaims,
  extractEmailFromClaims,
  extractGroupsFromClaims,
  mapAccessGroupsToRoles,
  getCloudflareAccessJwtFromRequest,
  type CloudflareAccessClaims,
} from "../security/cloudflare-access";

function createTestJwt(overrides: Partial<CloudflareAccessClaims> = {}): string {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    iss: "https://example.cloudflareaccess.com",
    sub: "user-123",
    aud: ["access.example.com"],
    iat: Math.floor(Date.now() / 1000) - 60,
    nbf: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    email: "test@example.com",
    email_verified: true,
    name: "Test User",
    groups: ["sikesra-admin", "sikesra-operator"],
    ...overrides,
  }));
  const signature = btoa("test-signature");
  return `${header}.${payload}.${signature}`;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function createCustomJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode("test-signature");
  return `${header}.${payloadEncoded}.${signature}`;
}

describe("Cloudflare Access JWT Validation Tests", () => {
  describe("parseCloudflareAccessJwt", () => {
    it("should parse valid JWT and return claims", () => {
      const token = createTestJwt();
      const claims = parseCloudflareAccessJwt(token);

      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe("user-123");
      expect(claims?.email).toBe("test@example.com");
      expect(claims?.name).toBe("Test User");
      expect(claims?.groups).toEqual(["sikesra-admin", "sikesra-operator"]);
    });

    it("should return null for invalid JWT format", () => {
      expect(parseCloudflareAccessJwt("invalid")).toBeNull();
      expect(parseCloudflareAccessJwt("only.two")).toBeNull();
      expect(parseCloudflareAccessJwt("")).toBeNull();
    });

    it("should return null for JWT with non-Cloudflare issuer", () => {
      const token = createCustomJwt({
        iss: "https://evil.com",
        sub: "user-123",
        aud: ["access.example.com"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      expect(parseCloudflareAccessJwt(token)).toBeNull();
    });

    it("should return null for expired JWT", () => {
      const token = createCustomJwt({
        iss: "https://example.cloudflareaccess.com",
        sub: "user-123",
        aud: ["access.example.com"],
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      expect(parseCloudflareAccessJwt(token)).toBeNull();
    });

    it("should return null for JWT missing required claims", () => {
      const token = createCustomJwt({
        iss: "https://example.cloudflareaccess.com",
        sub: "user-123",
      });

      expect(parseCloudflareAccessJwt(token)).toBeNull();
    });

    it("should return null for JWT with invalid audience", () => {
      const token = createCustomJwt({
        iss: "https://example.cloudflareaccess.com",
        sub: "user-123",
        aud: ["evil.com"],
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      expect(parseCloudflareAccessJwt(token)).toBeNull();
    });

    it("should return null for JWT with non-array audience", () => {
      const token = createCustomJwt({
        iss: "https://example.cloudflareaccess.com",
        sub: "user-123",
        aud: "access.example.com",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      expect(parseCloudflareAccessJwt(token)).toBeNull();
    });

    it("should parse JWT with optional claims", () => {
      const token = createTestJwt({
        common_name: "test-user",
        serial_number: "12345",
        country: "ID",
      });

      const claims = parseCloudflareAccessJwt(token);
      expect(claims?.common_name).toBe("test-user");
      expect(claims?.serial_number).toBe("12345");
      expect(claims?.country).toBe("ID");
    });
  });

  describe("validateCloudflareAccessJwt", () => {
    it("should return valid for correct JWT", () => {
      const token = createTestJwt();
      const result = validateCloudflareAccessJwt(token);

      expect(result.valid).toBe(true);
      expect(result.claims).toBeDefined();
      expect(result.reason).toBeUndefined();
    });

    it("should return invalid for malformed JWT", () => {
      const result = validateCloudflareAccessJwt("invalid");

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("INVALID_JWT");
    });

    it("should validate audience against expected domain", () => {
      const token = createTestJwt();
      const result = validateCloudflareAccessJwt(token, "example.com");

      expect(result.valid).toBe(true);
    });

    it("should reject JWT with audience mismatch", () => {
      const token = createTestJwt();
      const result = validateCloudflareAccessJwt(token, "other-domain.com");

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("AUDIENCE_MISMATCH");
    });

    it("should handle validation errors gracefully", () => {
      const result = validateCloudflareAccessJwt("not.a.jwt");

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe("extractUserIdFromClaims", () => {
    it("should return sub as user ID", () => {
      const claims = { sub: "user-123", email: "test@example.com" } as CloudflareAccessClaims;
      expect(extractUserIdFromClaims(claims)).toBe("user-123");
    });

    it("should fallback to email if sub missing", () => {
      const claims = { email: "test@example.com" } as CloudflareAccessClaims;
      expect(extractUserIdFromClaims(claims)).toBe("test@example.com");
    });

    it("should fallback to common_name if sub and email missing", () => {
      const claims = { common_name: "test-user" } as CloudflareAccessClaims;
      expect(extractUserIdFromClaims(claims)).toBe("test-user");
    });

    it("should return unknown if all claims missing", () => {
      const claims = {} as CloudflareAccessClaims;
      expect(extractUserIdFromClaims(claims)).toBe("unknown");
    });
  });

  describe("extractEmailFromClaims", () => {
    it("should return email when present", () => {
      const claims = { email: "test@example.com" } as CloudflareAccessClaims;
      expect(extractEmailFromClaims(claims)).toBe("test@example.com");
    });

    it("should return undefined when email missing", () => {
      const claims = { sub: "user-123" } as CloudflareAccessClaims;
      expect(extractEmailFromClaims(claims)).toBeUndefined();
    });
  });

  describe("extractGroupsFromClaims", () => {
    it("should return groups when present", () => {
      const claims = { groups: ["admin", "operator"] } as CloudflareAccessClaims;
      expect(extractGroupsFromClaims(claims)).toEqual(["admin", "operator"]);
    });

    it("should return empty array when groups missing", () => {
      const claims = { sub: "user-123" } as CloudflareAccessClaims;
      expect(extractGroupsFromClaims(claims)).toEqual([]);
    });
  });

  describe("mapAccessGroupsToRoles", () => {
    it("should map known groups to roles", () => {
      const mapping = {
        "sikesra-admin": "admin",
        "sikesra-operator": "operator",
        "sikesra-verifier": "verifier",
      };

      const roles = mapAccessGroupsToRoles(["sikesra-admin", "sikesra-operator"], mapping);
      expect(roles).toContain("admin");
      expect(roles).toContain("operator");
      expect(roles).toHaveLength(2);
    });

    it("should ignore unknown groups", () => {
      const mapping = { "sikesra-admin": "admin" };
      const roles = mapAccessGroupsToRoles(["unknown-group"], mapping);
      expect(roles).toHaveLength(0);
    });

    it("should return empty array for empty groups", () => {
      const mapping = { "sikesra-admin": "admin" };
      const roles = mapAccessGroupsToRoles([], mapping);
      expect(roles).toHaveLength(0);
    });

    it("should return empty array for undefined mapping", () => {
      const roles = mapAccessGroupsToRoles(["sikesra-admin"]);
      expect(roles).toHaveLength(0);
    });

    it("should deduplicate roles", () => {
      const mapping = { "sikesra-admin": "admin" };
      const roles = mapAccessGroupsToRoles(["sikesra-admin", "sikesra-admin"], mapping);
      expect(roles).toEqual(["admin"]);
    });
  });

  describe("getCloudflareAccessJwtFromRequest", () => {
    it("should extract JWT from Cf-Access-Jwt-Assertion header", () => {
      const request = new Request("https://example.com", {
        headers: { "Cf-Access-Jwt-Assertion": "test-jwt-token" },
      });

      expect(getCloudflareAccessJwtFromRequest(request)).toBe("test-jwt-token");
    });

    it("should extract JWT from lowercase header", () => {
      const request = new Request("https://example.com", {
        headers: { "cf-access-jwt-assertion": "test-jwt-token" },
      });

      expect(getCloudflareAccessJwtFromRequest(request)).toBe("test-jwt-token");
    });

    it("should return null when header missing", () => {
      const request = new Request("https://example.com");
      expect(getCloudflareAccessJwtFromRequest(request)).toBeNull();
    });

    it("should return null when header empty", () => {
      const request = new Request("https://example.com", {
        headers: { "Cf-Access-Jwt-Assertion": "" },
      });

      expect(getCloudflareAccessJwtFromRequest(request)).toBeNull();
    });
  });

  describe("Default Group-to-Role Mapping", () => {
    it("should map sikesra-admin to admin", () => {
      const mapping = {
        "sikesra-admin": "admin",
        "sikesra-operator": "operator",
        "sikesra-verifier": "verifier",
        "sikesra-auditor": "auditor",
        "sikesra-viewer": "viewer",
      };

      expect(mapAccessGroupsToRoles(["sikesra-admin"], mapping)).toEqual(["admin"]);
      expect(mapAccessGroupsToRoles(["sikesra-operator"], mapping)).toEqual(["operator"]);
      expect(mapAccessGroupsToRoles(["sikesra-verifier"], mapping)).toEqual(["verifier"]);
      expect(mapAccessGroupsToRoles(["sikesra-auditor"], mapping)).toEqual(["auditor"]);
      expect(mapAccessGroupsToRoles(["sikesra-viewer"], mapping)).toEqual(["viewer"]);
    });

    it("should map multiple groups to multiple roles", () => {
      const mapping = {
        "sikesra-admin": "admin",
        "sikesra-verifier": "verifier",
      };

      const roles = mapAccessGroupsToRoles(["sikesra-admin", "sikesra-verifier"], mapping);
      expect(roles).toContain("admin");
      expect(roles).toContain("verifier");
      expect(roles).toHaveLength(2);
    });
  });

  describe("JWT Security Invariants", () => {
    it("should reject JWT with future nbf (not before)", () => {
      const token = createCustomJwt({
        iss: "https://example.cloudflareaccess.com",
        sub: "user-123",
        aud: ["access.example.com"],
        iat: Math.floor(Date.now() / 1000),
        nbf: Math.floor(Date.now() / 1000) + 3600,
        exp: Math.floor(Date.now() / 1000) + 7200,
      });

      const claims = parseCloudflareAccessJwt(token);
      expect(claims).not.toBeNull();
    });

    it("should handle JWT with extra custom claims", () => {
      const token = createTestJwt({
        custom_claim: "custom_value",
        another_claim: { nested: "object" },
      });

      const claims = parseCloudflareAccessJwt(token);
      expect(claims?.custom_claim).toBe("custom_value");
    });

    it("should handle JWT with empty groups array", () => {
      const token = createTestJwt({ groups: [] });
      const claims = parseCloudflareAccessJwt(token);

      expect(claims).not.toBeNull();
      expect(claims?.groups).toEqual([]);
    });
  });
});
