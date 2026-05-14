export interface MaskingContext {
	canRevealSensitive: boolean;
	canRevealHighlyRestricted: boolean;
}

const MASKED_ID_VALUE = "************????";
const MASKED_CONTACT_VALUE = "**********";

export function maskNikKia(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	if (ctx.canRevealHighlyRestricted) return value;
	return value.length >= 4 ? `************${value.slice(-4)}` : MASKED_ID_VALUE;
}

export function maskNikKiaHash(): null {
	return null;
}

export function maskPhone(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	if (ctx.canRevealSensitive) return value;
	return value.length >= 4 ? `******${value.slice(-4)}` : MASKED_CONTACT_VALUE;
}

export function maskProtectedName(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	if (ctx.canRevealSensitive) return value;
	return value.length <= 2 ? "**" : `${value.charAt(0)}**`;
}

export function maskEmail(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	if (ctx.canRevealSensitive) return value;
	const parts = value.split("@");
	if (parts.length !== 2) return "***@***";
	const [localPart, domain] = parts;
	if (!localPart || !domain) return "***@***";
	return localPart.length <= 2 ? `**@${domain}` : `${localPart.charAt(0)}***@${domain}`;
}

export function maskAddress(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	return ctx.canRevealSensitive ? value : null;
}

export function maskDisabilityDetails(): null {
	return null;
}

export function maskDesilLevel(
	value: number | null | undefined,
	ctx: MaskingContext,
): number | null {
	if (value === null || value === undefined) return null;
	return ctx.canRevealSensitive ? value : null;
}

export function maskR2Key(): null {
	return null;
}

export function maskDocumentMetadata(
	metadata: Record<string, unknown> | null | undefined,
	ctx: MaskingContext,
): Record<string, unknown> | null {
	if (!metadata) return null;
	const safe: Record<string, unknown> = {
		type: metadata.document_type,
		status: metadata.is_verified,
	};
	if (ctx.canRevealSensitive) {
		safe.mime_type = metadata.mime_type;
		safe.size_bytes = metadata.size_bytes;
	}
	return safe;
}

export function maskAuditBeforeAfter(
	value: Record<string, unknown> | null | undefined,
	ctx: MaskingContext,
): Record<string, unknown> | null {
	if (!value) return null;
	return ctx.canRevealSensitive
		? value
		: { _redacted: true, _reason: "insufficient_permission" };
}

export function maskGuardianDetails(
	value: string | null | undefined,
	ctx: MaskingContext,
): string | null {
	if (!value) return null;
	return ctx.canRevealSensitive ? value : maskProtectedName(value, ctx);
}
