import { definePlugin } from "emdash";
import type { PluginDescriptor } from "emdash";
export { fail, ok } from "./api/envelope";
export { getOrCreateRequestId } from "./api/request-id";
export { buildTrustedRequestContext } from "./security/request-context";
export { SIKESRA_PERMISSIONS, SIKESRA_PERMISSION_LIST } from "./security/permissions";
export {
  maskNikKia,
  maskNikKiaHash,
  maskPhone,
  maskProtectedName,
  maskEmail,
  maskAddress,
  maskDisabilityDetails,
  maskDesilLevel,
  maskR2Key,
  maskDocumentMetadata,
  maskAuditBeforeAfter,
  maskGuardianDetails,
} from "./security/masking";
export { writeAuditEvent, AUDIT_ACTIONS, isHighRiskAction } from "./services/audit";
export { evaluateAbac, buildAbacSubject, evaluateAbacWithDb } from "./security/abac";
export { guardRoute, checkRegionScope } from "./security/route-guard";
export {
  getPublicMetadata,
  getPublicFilters,
  getPublicSummary,
  applySmallCellSuppression,
} from "./services/public";
export { getAdminDashboard } from "./services/dashboard";
export { listEntities, getEntityDetail, createEntity, patchEntity } from "./services/entity";
export { getOfficialRegions, getLocalRegions, createLocalRegion } from "./services/region";
export { generateSikesraId, correctSikesraId } from "./services/code";
export { submitEntity, verifyEntity, getVerificationQueue } from "./services/verification";
export {
  generateUploadUrl,
  completeUpload,
  getEntityDocuments,
  getDocumentDownloadUrl,
} from "./services/document";
export { createImportBatch, parseAndStageRows, promoteImportRows } from "./services/import";
export { getReports, createExportJob, getExportJob } from "./services/export";
export { getSettings, updateSettings } from "./services/settings";
export { listEntities as repoListEntities, getEntityById, createEntity as repoCreateEntity, patchEntity as repoPatchEntity } from "./repositories/entity-repository";
export { getOfficialRegionsRepo, getLocalRegionsRepo, createLocalRegionRepo } from "./repositories/region-repository";
export { writeVerificationEvent, getVerificationEvents, transitionEntityStatus } from "./repositories/verification-repository";
export { createFileObject, linkDocumentToEntity, getEntityDocumentsRepo } from "./repositories/document-repository";
export { getSettingsRepo, updateSettingsRepo } from "./repositories/settings-repository";
export { createImportBatchRepo, getImportBatch, getStagingRows, insertStagingRow, updateStagingRow, updateBatchCounts } from "./repositories/import-repository";
export { writeAuditLog, listAuditLogs } from "./repositories/audit-repository";
export { loadAbacPolicies } from "./repositories/abac-repository";

export interface SikesraPluginOptions {
  enabled?: boolean;
}

import { SIKESRA_ROUTES } from "./routes/registry";

export function sikesraPlugin(options: SikesraPluginOptions = {}): PluginDescriptor {
  return {
    id: "sikesra",
    version: "0.1.0",
    format: "native",
    entrypoint: "@ahliweb/plugin-sikesra",
    options,
    adminPages: [
      { path: "/", label: "SIKESRA" },
    ],
  };
}

export function createPlugin(_options: SikesraPluginOptions = {}) {
  const routes: Record<string, { handler: (ctx: unknown) => Promise<unknown>; public?: boolean }> = {};
  for (const [name, def] of Object.entries(SIKESRA_ROUTES)) {
    routes[name] = {
      public: def.public,
      handler: def.handler,
    };
  }

  return definePlugin({
    id: "sikesra",
    version: "0.1.0",
    routes,
    hooks: {},
  });
}

export default createPlugin;
