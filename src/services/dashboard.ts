// SIKESRA Admin Dashboard Service
// Scoped admin KPIs, work queues, regional summary, activity feed
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { AggregatePoint } from "./public";

// ---------- Dashboard Types ----------

export interface DashboardScope {
  tenantId: string;
  siteId: string;
  regionScopeLabel: string;
}

export interface DashboardKpis {
  total: number;
  draft: number;
  submitted: number;
  verified: number;
  needRevision: number;
  rejected: number;
}

export interface DashboardWorkQueue {
  key: string;
  label: string;
  total: number;
  href: string;
  permission: string;
}

export interface DashboardRegionalSummary {
  regionCode: string;
  regionName: string;
  total: number;
  completionPercent: number;
  verificationPercent: number;
}

export interface AuditActivityItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actorId: string;
  createdAt: string;
  summary: string;
}

export interface DashboardResponse {
  scope: DashboardScope;
  kpis: DashboardKpis;
  workQueues: DashboardWorkQueue[];
  regionalSummary: DashboardRegionalSummary[];
  attributeSummary: AggregatePoint[];
  activity: AuditActivityItem[];
}

// ---------- Service ----------

export async function getAdminDashboard(ctx: SikesraRequestContext): Promise<DashboardResponse> {
  // TODO: query D1 for scoped dashboard data
  // All queries must use backend-computed region scope (ctx.regionScope)
  // Never trust frontend-supplied tenant/site/scope

  return {
    scope: {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      regionScopeLabel: ctx.regionScope.regencyCode ?? ctx.regionScope.districtCodes?.[0] ?? "all",
    },
    kpis: {
      total: 0,
      draft: 0,
      submitted: 0,
      verified: 0,
      needRevision: 0,
      rejected: 0,
    },
    workQueues: [
      {
        key: "pending_verification",
        label: "Menunggu Verifikasi",
        total: 0,
        href: "/_emdash/admin/plugins/sikesra/verification",
        permission: "awcms:sikesra:verification:verify",
      },
      {
        key: "duplicate_candidates",
        label: "Kandidat Duplikat",
        total: 0,
        href: "/_emdash/admin/plugins/sikesra/entities?duplicate=candidate",
        permission: "awcms:sikesra:entity:read",
      },
      {
        key: "incomplete_documents",
        label: "Dokumen Belum Lengkap",
        total: 0,
        href: "/_emdash/admin/plugins/sikesra/documents",
        permission: "awcms:sikesra:document:upload",
      },
      {
        key: "import_review",
        label: "Review Import",
        total: 0,
        href: "/_emdash/admin/plugins/sikesra/imports",
        permission: "awcms:sikesra:import:read",
      },
    ],
    regionalSummary: [],
    attributeSummary: [],
    activity: [],
  };
}
