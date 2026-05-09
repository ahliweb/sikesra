// SIKESRA Masking Utility
// Server-side masking for sensitive data before API serialization
// Source: docs/sikesra/06_security_rbac_abac.md

export interface MaskingContext {
  canRevealSensitive: boolean;
  canRevealHighlyRestricted: boolean;
}

const MASKED_ID_VALUE = "************????";
const MASKED_CONTACT_VALUE = "**********";

export function maskNikKia(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealHighlyRestricted) return value;
  if (value.length >= 4) {
    return "************" + value.slice(-4);
  }
  return MASKED_ID_VALUE;
}

export function maskNikKiaHash(_hash: string | null | undefined, _ctx: MaskingContext): null {
  // Nik/KIA hash must never be returned through normal API responses
  return null;
}

export function maskPhone(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealSensitive) return value;
  if (value.length >= 4) {
    return "******" + value.slice(-4);
  }
  return MASKED_CONTACT_VALUE;
}

export function maskProtectedName(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealSensitive) return value;
  if (value.length <= 2) return "**";
  return value.charAt(0) + "**";
}

export function maskEmail(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealSensitive) return value;
  const parts = value.split("@");
  if (parts.length !== 2) return "***@***";
  const name = parts[0];
  if (name.length <= 2) return "**@" + parts[1];
  return name.charAt(0) + "***@" + parts[1];
}

export function maskAddress(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealSensitive) return value;
  return null; // Show district/village only via region breadcrumb, not raw address
}

export function maskDisabilityDetails(_value: string | null | undefined, _ctx: MaskingContext): null {
  // Disability/ODGJ details are highly restricted - omit by default
  return null;
}

export function maskDesilLevel(value: number | null | undefined, ctx: MaskingContext): number | null {
  if (value === null || value === undefined) return null;
  if (ctx.canRevealSensitive) return value;
  return null; // Individual desil must not be exposed
}

export function maskR2Key(_key: string | null | undefined, _ctx: MaskingContext): null {
  // Raw R2 storage keys must never be returned through normal API responses
  return null;
}

export function maskDocumentMetadata(
  metadata: Record<string, unknown> | null | undefined,
  ctx: MaskingContext,
): Record<string, unknown> | null {
  if (!metadata) return null;
  const safe: Record<string, unknown> = { type: metadata["document_type"], status: metadata["is_verified"] };
  if (ctx.canRevealSensitive) {
    safe["mime_type"] = metadata["mime_type"];
    safe["size_bytes"] = metadata["size_bytes"];
  }
  return safe;
}

export function maskAuditBeforeAfter(
  value: Record<string, unknown> | null | undefined,
  ctx: MaskingContext,
): Record<string, unknown> | null {
  if (!value) return null;
  if (!ctx.canRevealSensitive) {
    return { _redacted: true, _reason: "insufficient_permission" };
  }
  return value;
}

export function maskGuardianDetails(value: string | null | undefined, ctx: MaskingContext): string | null {
  if (!value) return null;
  if (ctx.canRevealSensitive) return value;
  return maskProtectedName(value, ctx);
}
