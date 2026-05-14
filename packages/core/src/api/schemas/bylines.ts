import { z } from "zod";

import { cursorPaginationQuery, httpUrl } from "./common.js";

/** Slug pattern: lowercase letters, digits, and hyphens; must start with a letter */
const bylineSlugPattern = /^[a-z][a-z0-9-]*$/;

export const bylineSummarySchema = z
	.object({
		id: z.string(),
		slug: z.string(),
		displayName: z.string(),
		bio: z.string().nullable(),
		avatarMediaId: z.string().nullable(),
		websiteUrl: z.string().nullable(),
		userId: z.string().nullable(),
		isGuest: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.meta({ id: "BylineSummary" });

export const bylineCreditSchema = z
	.object({
		byline: bylineSummarySchema,
		sortOrder: z.number().int(),
		roleLabel: z.string().nullable(),
		source: z.enum(["explicit", "inferred"]).optional().meta({
			description: "Whether this credit was explicitly assigned or inferred from authorId",
		}),
	})
	.meta({ id: "BylineCredit" });

export const contentBylineInputSchema = z
	.object({
		bylineId: z.string().min(1),
		roleLabel: z.string().nullish(),
	})
	.meta({ id: "ContentBylineInput" });

export const bylinesListQuery = cursorPaginationQuery
	.extend({
		search: z.string().optional(),
		isGuest: z.coerce.boolean().optional(),
		userId: z.string().optional(),
	})
	.meta({ id: "BylinesListQuery" });

export const bylineCreateBody = z
	.object({
		slug: z
			.string()
			.min(1)
			.regex(bylineSlugPattern, "Slug must contain only lowercase letters, digits, and hyphens"),
		displayName: z.string().min(1),
		bio: z.string().nullish(),
		avatarMediaId: z.string().nullish(),
		websiteUrl: httpUrl.nullish(),
		userId: z.string().nullish(),
		isGuest: z.boolean().optional(),
	})
	.meta({ id: "BylineCreateBody" });

export const bylineUpdateBody = z
	.object({
		slug: z
			.string()
			.min(1)
			.regex(bylineSlugPattern, "Slug must contain only lowercase letters, digits, and hyphens")
			.optional(),
		displayName: z.string().min(1).optional(),
		bio: z.string().nullish(),
		avatarMediaId: z.string().nullish(),
		websiteUrl: httpUrl.nullish(),
		userId: z.string().nullish(),
		isGuest: z.boolean().optional(),
	})
	.meta({ id: "BylineUpdateBody" });

export const bylineListResponseSchema = z
	.object({
		items: z.array(bylineSummarySchema),
		nextCursor: z.string().optional(),
	})
	.meta({ id: "BylineListResponse" });
