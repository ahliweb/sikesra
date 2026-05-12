// SIKESRA Deduplication Repository
// D1 SQL for duplicate candidate detection and decision persistence
// Source: docs/sikesra/03_data_model.md

import type { D1Binding } from "./db";
import type { SikesraRequestContext } from "../security/request-context";

const CANDIDATES_TABLE = "awcms_sikesra_duplicate_candidates";
const DECISIONS_TABLE = "awcms_sikesra_duplicate_decisions";
const ENTITIES_TABLE = "awcms_sikesra_entities";

export interface DuplicateCandidateRow {
  id: string;
  tenant_id: string;
  site_id: string;
  entity_id_a: string;
  entity_id_b: string;
  match_signals_json?: string | null;
  match_score?: number | null;
  risk_level: "low" | "medium" | "high" | "blocking";
  detection_source: "system" | "manual" | "import";
  import_batch_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface DuplicateDecisionRow {
  id: string;
  tenant_id: string;
  site_id: string;
  candidate_id: string;
  decision: "skip" | "promote_as_new" | "merge" | "dismiss" | "confirm_duplicate";
  reason?: string | null;
  resolved_entity_id?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface DuplicateCandidateSummary {
  id: string;
  entityIdA: string;
  entityIdB: string;
  displayNameA: string;
  displayNameB: string;
  matchScore: number;
  riskLevel: "low" | "medium" | "high" | "blocking";
  matchSignals: string[];
  hasDecision: boolean;
  decision?: string;
}

export async function findDuplicateCandidatesByBatch(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  importBatchId: string,
): Promise<DuplicateCandidateRow[]> {
  const rows = await db.prepare(
    `SELECT * FROM ${CANDIDATES_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND import_batch_id = ? AND deleted_at IS NULL
     ORDER BY risk_level DESC, match_score DESC`,
  ).bind(tenantId, siteId, importBatchId).all<DuplicateCandidateRow>();

  return rows.results;
}

export async function findDuplicateCandidatesForEntity(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  entityId: string,
): Promise<DuplicateCandidateRow[]> {
  const rows = await db.prepare(
    `SELECT * FROM ${CANDIDATES_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL
       AND (entity_id_a = ? OR entity_id_b = ?)
     ORDER BY risk_level DESC, match_score DESC`,
  ).bind(tenantId, siteId, entityId, entityId).all<DuplicateCandidateRow>();

  return rows.results;
}

export async function insertDuplicateCandidate(
  db: D1Binding,
  input: {
    id: string;
    tenantId: string;
    siteId: string;
    entityIdA: string;
    entityIdB: string;
    matchSignalsJson?: string;
    matchScore?: number;
    riskLevel: "low" | "medium" | "high" | "blocking";
    detectionSource?: "system" | "manual" | "import";
    importBatchId?: string;
    createdBy?: string;
  },
): Promise<void> {
  await db.prepare(
    `INSERT INTO ${CANDIDATES_TABLE}
     (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, import_batch_id, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    input.id,
    input.tenantId,
    input.siteId,
    input.entityIdA,
    input.entityIdB,
    input.matchSignalsJson ?? null,
    input.matchScore ?? null,
    input.riskLevel,
    input.detectionSource ?? "system",
    input.importBatchId ?? null,
    input.createdBy ?? null,
    input.createdBy ?? null,
  ).run();
}

export async function recordDuplicateDecision(
  db: D1Binding,
  input: {
    id: string;
    tenantId: string;
    siteId: string;
    candidateId: string;
    decision: "skip" | "promote_as_new" | "merge" | "dismiss" | "confirm_duplicate";
    reason?: string;
    resolvedEntityId?: string;
    createdBy: string;
  },
): Promise<DuplicateDecisionRow> {
  await db.prepare(
    `INSERT INTO ${DECISIONS_TABLE}
     (id, tenant_id, site_id, candidate_id, decision, reason, resolved_entity_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    input.id,
    input.tenantId,
    input.siteId,
    input.candidateId,
    input.decision,
    input.reason ?? null,
    input.resolvedEntityId ?? null,
    input.createdBy,
  ).run();

  return {
    id: input.id,
    tenant_id: input.tenantId,
    site_id: input.siteId,
    candidate_id: input.candidateId,
    decision: input.decision,
    reason: input.reason ?? null,
    resolved_entity_id: input.resolvedEntityId ?? null,
    created_at: new Date().toISOString(),
    created_by: input.createdBy,
  };
}

export async function getDecisionForCandidate(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  candidateId: string,
): Promise<DuplicateDecisionRow | null> {
  return db.prepare(
    `SELECT * FROM ${DECISIONS_TABLE}
     WHERE tenant_id = ? AND site_id = ? AND candidate_id = ?
     LIMIT 1`,
  ).bind(tenantId, siteId, candidateId).first<DuplicateDecisionRow>();
}

export async function getDuplicateCandidateSummaries(
  db: D1Binding,
  tenantId: string,
  siteId: string,
  importBatchId?: string,
): Promise<DuplicateCandidateSummary[]> {
  const params: unknown[] = [tenantId, siteId];
  let whereClause = "c.tenant_id = ? AND c.site_id = ? AND c.deleted_at IS NULL";

  if (importBatchId) {
    whereClause += " AND c.import_batch_id = ?";
    params.push(importBatchId);
  }

  const rows = await db.prepare(
    `SELECT c.id, c.entity_id_a, c.entity_id_b, c.match_score, c.risk_level, c.match_signals_json,
            ea.display_name AS display_name_a, eb.display_name AS display_name_b,
            d.decision AS has_decision
     FROM ${CANDIDATES_TABLE} c
     JOIN ${ENTITIES_TABLE} ea ON ea.id = c.entity_id_a AND ea.tenant_id = c.tenant_id AND ea.site_id = c.site_id
     JOIN ${ENTITIES_TABLE} eb ON eb.id = c.entity_id_b AND eb.tenant_id = c.tenant_id AND eb.site_id = c.site_id
     LEFT JOIN ${DECISIONS_TABLE} d ON d.candidate_id = c.id AND d.tenant_id = c.tenant_id AND d.site_id = c.site_id
     WHERE ${whereClause}
     ORDER BY c.risk_level DESC, c.match_score DESC`,
  ).bind(...params).all<Record<string, unknown>>();

  return rows.results.map((row) => ({
    id: String(row.id),
    entityIdA: String(row.entity_id_a),
    entityIdB: String(row.entity_id_b),
    displayNameA: String(row.display_name_a ?? ""),
    displayNameB: String(row.display_name_b ?? ""),
    matchScore: Number(row.match_score ?? 0),
    riskLevel: String(row.risk_level) as "low" | "medium" | "high" | "blocking",
    matchSignals: parseMatchSignals(row.match_signals_json),
    hasDecision: !!row.has_decision,
    decision: row.has_decision ? String(row.has_decision) : undefined,
  }));
}

function parseMatchSignals(json: unknown): string[] {
  if (typeof json !== "string" || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === "object" && parsed !== null) return Object.keys(parsed as Record<string, unknown>);
    return [];
  } catch {
    return [];
  }
}
