// SIKESRA Route Registry
// Maps route names to handler functions for EmDash plugin registration
// Source: docs/sikesra/02_architecture.md, docs/sikesra/04_api_contracts.md

import {
  entityListHandler,
  entityCreateHandler,
  entityDetailHandler,
  entityPatchHandler,
} from "./entity-routes";

import {
  dashboardHandler,
  publicMetadataHandler,
  publicFiltersHandler,
  publicSummaryHandler,
} from "./dashboard-routes";

import {
  officialRegionsHandler,
  localRegionsHandler,
  localRegionCreateHandler,
} from "./region-routes";

import {
  entityDocumentsHandler,
  uploadUrlHandler,
  documentDownloadHandler,
  documentProxyHandler,
  documentVerifyHandler,
  documentReplaceHandler,
} from "./document-routes";

import {
  settingsGetHandler,
  settingsUpdateHandler,
} from "./settings-routes";

import {
  auditListHandler,
  auditDetailHandler,
  auditExportHandler,
} from "./audit-routes";

import {
  importListHandler,
  importCreateHandler,
  importRowsHandler,
  importRowUpdateHandler,
  importPromoteHandler,
} from "./import-routes";

import {
  reportListHandler,
  exportListHandler,
  exportCreateHandler,
  exportDetailHandler,
  exportGenerateHandler,
  exportDownloadHandler,
} from "./report-routes";

import {
  verificationQueueHandler,
  verificationSubmitHandler,
  verificationVerifyHandler,
  verificationTimelineHandler,
} from "./verification-routes";

import {
  duplicatesListHandler,
  duplicatesDecideHandler,
  duplicatesDetectHandler,
} from "./deduplication-routes";

import {
  completenessCheckHandler,
  completenessBatchCheckHandler,
  completenessUpdateHandler,
} from "./completeness-routes";

import {
  pluginAdminHandler,
} from "./admin-routes";

import {
  abacPolicyListHandler,
  abacPolicyDetailHandler,
  abacPolicyCreateHandler,
  abacPolicyUpdateHandler,
  abacPolicyActivateHandler,
  abacPolicyDeactivateHandler,
  abacPolicyDeleteHandler,
  abacPolicyPreviewHandler,
  abacAttributeListHandler,
  abacAttributeDetailHandler,
  abacAttributeCreateHandler,
  abacAttributeUpdateHandler,
  abacAttributeActivateHandler,
  abacAttributeDeactivateHandler,
  abacAttributeDeleteHandler,
} from "./abac-routes";

export interface RouteDefinition {
  handler: (...args: any[]) => Promise<unknown>;
  public?: boolean;
}

export const SIKESRA_ROUTES: Record<string, RouteDefinition> = {
  // Public data routes
  "public/metadata": { handler: publicMetadataHandler, public: true },
  "public/filters": { handler: publicFiltersHandler, public: true },
  "public/summary": { handler: publicSummaryHandler, public: true },

  // Admin dashboard
  "dashboard": { handler: dashboardHandler },
  "admin": { handler: pluginAdminHandler },

  // Entity CRUD
  "v1/entities": { handler: entityListHandler },
  "v1/entities/create": { handler: entityCreateHandler },
  "v1/entities/detail": { handler: entityDetailHandler },
  "v1/entities/patch": { handler: entityPatchHandler },

  // Regions
  "v1/regions/official": { handler: officialRegionsHandler },
  "v1/regions/local": { handler: localRegionsHandler },
  "v1/regions/local/create": { handler: localRegionCreateHandler },

  // Documents
  "v1/entities/documents": { handler: entityDocumentsHandler },
  "v1/documents/upload-url": { handler: uploadUrlHandler },
  "v1/documents/download": { handler: documentDownloadHandler },
  "v1/documents/proxy": { handler: documentProxyHandler },
  "v1/documents/verify": { handler: documentVerifyHandler },
  "v1/documents/replace": { handler: documentReplaceHandler },

  // Settings
  "v1/settings": { handler: settingsGetHandler },
  "v1/settings/update": { handler: settingsUpdateHandler },

  // Audit
  "v1/audit": { handler: auditListHandler },
  "v1/audit/detail": { handler: auditDetailHandler },
  "v1/audit/export": { handler: auditExportHandler },

  // Imports
  "v1/imports": { handler: importListHandler },
  "v1/imports/create": { handler: importCreateHandler },
  "v1/imports/rows": { handler: importRowsHandler },
  "v1/imports/rows/update": { handler: importRowUpdateHandler },
  "v1/imports/promote": { handler: importPromoteHandler },

  // Reports & Exports
  "v1/reports": { handler: reportListHandler },
  "v1/exports": { handler: exportListHandler },
  "v1/exports/create": { handler: exportCreateHandler },
  "v1/exports/detail": { handler: exportDetailHandler },
  "v1/exports/generate": { handler: exportGenerateHandler },
  "v1/exports/download": { handler: exportDownloadHandler },

  // Verification
  "v1/verification/queue": { handler: verificationQueueHandler },
  "v1/verification/submit": { handler: verificationSubmitHandler },
  "v1/verification/verify": { handler: verificationVerifyHandler },
  "v1/verification/timeline": { handler: verificationTimelineHandler },

  // Deduplication
  "v1/duplicates": { handler: duplicatesListHandler },
  "v1/duplicates/decide": { handler: duplicatesDecideHandler },
  "v1/duplicates/detect": { handler: duplicatesDetectHandler },

  // Completeness
  "v1/completeness/check": { handler: completenessCheckHandler },
  "v1/completeness/batch-check": { handler: completenessBatchCheckHandler },
  "v1/completeness/update": { handler: completenessUpdateHandler },

  // ABAC Policies
  "v1/abac/policies": { handler: abacPolicyListHandler },
  "v1/abac/policies/detail": { handler: abacPolicyDetailHandler },
  "v1/abac/policies/create": { handler: abacPolicyCreateHandler },
  "v1/abac/policies/update": { handler: abacPolicyUpdateHandler },
  "v1/abac/policies/activate": { handler: abacPolicyActivateHandler },
  "v1/abac/policies/deactivate": { handler: abacPolicyDeactivateHandler },
  "v1/abac/policies/delete": { handler: abacPolicyDeleteHandler },
  "v1/abac/policies/preview": { handler: abacPolicyPreviewHandler },

  // ABAC Attributes
  "v1/abac/attributes": { handler: abacAttributeListHandler },
  "v1/abac/attributes/detail": { handler: abacAttributeDetailHandler },
  "v1/abac/attributes/create": { handler: abacAttributeCreateHandler },
  "v1/abac/attributes/update": { handler: abacAttributeUpdateHandler },
  "v1/abac/attributes/activate": { handler: abacAttributeActivateHandler },
  "v1/abac/attributes/deactivate": { handler: abacAttributeDeactivateHandler },
  "v1/abac/attributes/delete": { handler: abacAttributeDeleteHandler },
};
