// SIKESRA Export Service
// CSV/XLSX export jobs, field sensitivity, restricted export controls
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";

export type ExportFormat = "csv" | "xlsx";
export type ExportJobStatus = "pending" | "generating" | "ready" | "failed" | "expired";

export interface ExportJob {
  id: string;
  reportType: string;
  filters: Record<string, unknown>;
  fields: string[];
  fieldSensitivity: Record<string, string>;
  format: ExportFormat;
  reason?: string;
  totalRows?: number;
  status: ExportJobStatus;
  createdAt: string;
}

export interface ExportCreateInput {
  reportType: string;
  filters?: Record<string, unknown>;
  fields?: string[];
  format?: ExportFormat;
  reason?: string;
}

export interface ReportMetadata {
  id: string;
  name: string;
  description: string;
  availableFields: Array<{ key: string; label: string; sensitivity: string }>;
  requiredPermission: string;
}

export async function getReports(): Promise<ReportMetadata[]> {
  // TODO: return available report types with field sensitivity
  return [];
}

export async function createExportJob(
  input: ExportCreateInput,
  ctx: SikesraRequestContext,
): Promise<ExportJob> {
  // TODO: validate fields against sensitivity
  // Restricted fields require export:restricted permission and reason
  // Create export_jobs record
  // Generate file, store in R2
  // Audit export.create
  throw new Error("Not implemented");
}

export async function getExportJob(
  jobId: string,
  ctx: SikesraRequestContext,
): Promise<ExportJob | null> {
  // TODO: query export_jobs
  // Return job with download URL if ready
  // Never expose raw R2 key
  return null;
}
