export const AWCMS_SIKESRA_PERMISSIONS = {
	dashboardRead: "awcms:sikesra:dashboard:read",
	settingsRead: "awcms:sikesra:settings:read",
	settingsUpdate: "awcms:sikesra:settings:update",
	auditRead: "awcms:sikesra:audit:read",
	publicStatusRead: "awcms:sikesra:public-status:read",
	stateTouch: "awcms:sikesra:state:touch",
	permissionCatalogRead: "awcms:sikesra:permissions:read",
	permissionCatalogWrite: "awcms:sikesra:permissions:write",
	roleCatalogRead: "awcms:sikesra:roles:read",
	roleCatalogWrite: "awcms:sikesra:roles:write",
	accessPreviewRead: "awcms:sikesra:access-preview:read",
	abacAttributeRead: "awcms:sikesra:abac-attributes:read",
	abacAttributeWrite: "awcms:sikesra:abac-attributes:write",
	abacPolicyRead: "awcms:sikesra:abac-policies:read",
	abacPolicyWrite: "awcms:sikesra:abac-policies:write",
	abacPreviewRead: "awcms:sikesra:abac-preview:read",
} as const;

export const AWCMS_SIKESRA_PERMISSION_LIST = Object.values(AWCMS_SIKESRA_PERMISSIONS);
