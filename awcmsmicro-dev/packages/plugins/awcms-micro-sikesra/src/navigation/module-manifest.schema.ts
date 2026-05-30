import { z } from "zod";

import { AwcmsAdminNavGroupSchema, AwcmsAdminNavItemSchema } from "./admin-nav.schema.js";

export const AwcmsModuleManifestSchema = z.object({
	id: z.string(),
	name: z.string(),
	version: z.string().optional(),
	description: z.string().optional(),
	navigation: z
		.object({
			groups: z.array(AwcmsAdminNavGroupSchema).optional(),
			items: z.array(AwcmsAdminNavItemSchema).optional(),
		})
		.optional(),
	i18n: z
		.object({
			defaultLocale: z.string().default("en"),
			supportedLocales: z.array(z.string()).default(["en", "id"]),
			messages: z.record(z.string(), z.record(z.string(), z.string())).optional(),
		})
		.optional(),
});

export type AwcmsModuleManifest = z.infer<typeof AwcmsModuleManifestSchema>;
