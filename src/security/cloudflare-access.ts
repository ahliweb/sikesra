// SIKESRA Cloudflare Access JWT Validation
// Parse and validate Cloudflare Access JWT assertions
// Source: docs/sikesra/06_security_rbac_abac.md, Issue #188

export interface CloudflareAccessClaims {
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  nbf: number;
  exp: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  groups?: string[];
  common_name?: string;
  serial_number?: string;
  country?: string;
  [key: string]: unknown;
}

export interface CloudflareAccessValidationResult {
  valid: boolean;
  claims?: CloudflareAccessClaims;
  reason?: string;
}

const ACCESS_AUD_DOMAIN = "access";

function base64UrlDecode(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  return decodeURIComponent(
    Array.from(atob(padded))
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

function parseJwtPayload(token: string): unknown {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("INVALID_JWT_FORMAT");
  }
  const payload = base64UrlDecode(parts[1]);
  return JSON.parse(payload);
}

export function parseCloudflareAccessJwt(token: string): CloudflareAccessClaims | null {
  try {
    const payload = parseJwtPayload(token);
    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const claims = payload as CloudflareAccessClaims;

    // Validate required claims
    if (!claims.iss || !claims.sub || !claims.aud || !claims.exp) {
      return null;
    }

    // Validate issuer is Cloudflare Access
    if (!claims.iss.includes(".cloudflareaccess.com")) {
      return null;
    }

    // Validate audience includes the app domain
    if (!Array.isArray(claims.aud) || !claims.aud.some((a) => a.includes(ACCESS_AUD_DOMAIN))) {
      return null;
    }

    // Validate expiration
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      return null;
    }

    return claims;
  } catch {
    return null;
  }
}

export function validateCloudflareAccessJwt(
  token: string,
  expectedAudDomain?: string,
): CloudflareAccessValidationResult {
  try {
    const claims = parseCloudflareAccessJwt(token);

    if (!claims) {
      return { valid: false, reason: "INVALID_JWT" };
    }

    // Validate audience if expected domain provided
    if (expectedAudDomain) {
      const hasExpectedAud = claims.aud.some((a) => a.includes(expectedAudDomain));
      if (!hasExpectedAud) {
        return { valid: false, reason: "AUDIENCE_MISMATCH" };
      }
    }

    return { valid: true, claims };
  } catch (err) {
    return {
      valid: false,
      reason: err instanceof Error ? err.message : "VALIDATION_ERROR",
    };
  }
}

export function extractUserIdFromClaims(claims: CloudflareAccessClaims): string {
  return claims.sub || claims.email || claims.common_name || "unknown";
}

export function extractEmailFromClaims(claims: CloudflareAccessClaims): string | undefined {
  return claims.email;
}

export function extractGroupsFromClaims(claims: CloudflareAccessClaims): string[] {
  return claims.groups ?? [];
}

export function mapAccessGroupsToRoles(
  groups: string[],
  groupRoleMapping?: Record<string, string>,
): string[] {
  if (!groupRoleMapping || groups.length === 0) {
    return [];
  }

  const roles = new Set<string>();
  for (const group of groups) {
    const role = groupRoleMapping[group];
    if (role) {
      roles.add(role);
    }
  }

  return Array.from(roles);
}

export function getCloudflareAccessJwtFromRequest(request: Request): string | null {
  return request.headers.get("Cf-Access-Jwt-Assertion") ||
    request.headers.get("cf-access-jwt-assertion") ||
    null;
}
