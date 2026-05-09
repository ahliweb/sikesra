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
} from "./document-routes";

import {
  settingsGetHandler,
  settingsUpdateHandler,
} from "./settings-routes";

import {
  auditListHandler,
} from "./audit-routes";

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

  // Settings
  "v1/settings": { handler: settingsGetHandler },
  "v1/settings/update": { handler: settingsUpdateHandler },

  // Audit
  "v1/audit": { handler: auditListHandler },
};
