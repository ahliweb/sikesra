// SIKESRA Admin Dashboard Service
// Scoped admin KPIs, work queues, regional summary, activity feed
// Source: docs/sikesra/04_api_contracts.md

import type { SikesraRequestContext } from "../security/request-context";
import type { AggregatePoint } from "./public";
import type { D1Binding } from "../repositories/db";

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

export async function getAdminDashboard(ctx: SikesraRequestContext, db?: D1Binding): Promise<DashboardResponse> {
  // If no D1 binding provided, return safe defaults
  if (!db) {
    return defaultDashboard(ctx);
  }

  const tid = ctx.tenantId;
  const sid = ctx.siteId;

  // KPI queries — count entities by status
  const kpiRows = await db.prepare(
    `SELECT status_data, status_verification, COUNT(*) as cnt
     FROM awcms_sikesra_entities
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     GROUP BY status_data, status_verification`
  ).bind(tid, sid).all<Record<string, unknown>>();

  let total = 0, draft = 0, submitted = 0, verified = 0, needRevision = 0, rejected = 0;
  for (const r of kpiRows.results) {
    const cnt = Number(r.cnt ?? 0);
    total += cnt;
    if (r.status_data === "draft") draft += cnt;
    if (r.status_data === "submitted") submitted += cnt;
    if (r.status_verification === "verified") verified += cnt;
    if (r.status_verification === "need_revision") needRevision += cnt;
    if (r.status_verification === "rejected") rejected += cnt;
  }

  // Work queue counts
  const pendingVerif = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_entities
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
     AND status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency')`
  ).bind(tid, sid).first<{ cnt: number }>();

  const dupCandidates = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_entities
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND duplicate_status = 'candidate'`
  ).bind(tid, sid).first<{ cnt: number }>();

  const pendingImport = await db.prepare(
    `SELECT COUNT(*) as cnt FROM awcms_sikesra_import_batches
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL AND status IN ('uploaded','mapped','validated')`
  ).bind(tid, sid).first<{ cnt: number }>();

  // Recent audit activity
  const recentAudit = await db.prepare(
    `SELECT id, action, resource_type, resource_id, actor_id, created_at
     FROM awcms_sikesra_audit_logs WHERE tenant_id = ? AND site_id = ?
     ORDER BY created_at DESC LIMIT 5`
  ).bind(tid, sid).all<Record<string, unknown>>();

  const activity: AuditActivityItem[] = recentAudit.results.map(r => ({
    id: String(r.id),
    action: String(r.action),
    resourceType: String(r.resource_type ?? ""),
    resourceId: String(r.resource_id ?? ""),
    actorId: String(r.actor_id ?? ""),
    createdAt: String(r.created_at ?? ""),
    summary: `${String(r.action)} pada ${String(r.resource_type)}/${String(r.resource_id)}`,
  }));

  return {
    scope: {
      tenantId: tid,
      siteId: sid,
      regionScopeLabel: ctx.regionScope.regencyCode ?? ctx.regionScope.districtCodes?.[0] ?? "all",
    },
    kpis: { total, draft, submitted, verified, needRevision, rejected },
    workQueues: [
      {
        key: "pending_verification", label: "Menunggu Verifikasi",
        total: pendingVerif?.cnt ?? 0,
        href: "/_emdash/admin/plugins/sikesra/verification",
        permission: "awcms:sikesra:verification:verify",
      },
      {
        key: "duplicate_candidates", label: "Kandidat Duplikat",
        total: dupCandidates?.cnt ?? 0,
        href: "/_emdash/admin/plugins/sikesra/entities?duplicate=candidate",
        permission: "awcms:sikesra:entity:read",
      },
      {
        key: "import_review", label: "Review Import",
        total: pendingImport?.cnt ?? 0,
        href: "/_emdash/admin/plugins/sikesra/imports",
        permission: "awcms:sikesra:import:read",
      },
    ],
    regionalSummary: [],
    attributeSummary: [],
    activity,
  };
}

// Fallback when D1 is unavailable
function defaultDashboard(ctx: SikesraRequestContext): DashboardResponse {
  return {
    scope: {
      tenantId: ctx.tenantId,
      siteId: ctx.siteId,
      regionScopeLabel: ctx.regionScope.regencyCode ?? ctx.regionScope.districtCodes?.[0] ?? "all",
    },
    kpis: { total: 0, draft: 0, submitted: 0, verified: 0, needRevision: 0, rejected: 0 },
    workQueues: [],
    regionalSummary: [],
    attributeSummary: [],
    activity: [],
  };
}

