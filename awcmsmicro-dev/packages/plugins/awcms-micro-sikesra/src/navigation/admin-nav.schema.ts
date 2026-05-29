import { z } from "zod";

export const AwcmsAdminNavItemSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		id: z.string(),
		labelKey: z.string(),
		fallbackLabel: z.string(),
		path: z.string(),
		icon: z.string().optional(),
		sortOrder: z.number().optional(),
		permission: z.string().optional(),
		children: z.array(AwcmsAdminNavItemSchema).optional(),
	})
);

export type AwcmsAdminNavItem = {
	id: string;
	labelKey: string;
	fallbackLabel: string;
	path: string;
	icon?: string;
	sortOrder?: number;
	permission?: string;
	children?: AwcmsAdminNavItem[];
};

export const AwcmsSidebarPlacementSchema = z.enum([
	"after-dashboard",
	"before-emdash-default",
	"after-emdash-default",
	"plugin-local-only",
	"header-only",
]);

export type AwcmsSidebarPlacement = z.infer<typeof AwcmsSidebarPlacementSchema>;

export const AwcmsAdminNavGroupSchema = z.object({
	id: z.string(),
	labelKey: z.string(),
	fallbackLabel: z.string(),
	icon: z.string().optional(),
	sortOrder: z.number().optional(),
	sidebarPlacement: AwcmsSidebarPlacementSchema.optional(),
	sidebarPriority: z.number().optional(),
	items: z.array(AwcmsAdminNavItemSchema),
});

export type AwcmsAdminNavGroup = z.infer<typeof AwcmsAdminNavGroupSchema>;
