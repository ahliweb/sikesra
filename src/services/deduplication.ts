// SIKESRA Deduplication Service
// Candidate detection, risk scoring, and decision persistence
// Source: docs/sikesra/07_operations_sop.md, docs/sikesra/04_api_contracts.md

import type { D1Binding } from "../repositories/db";
import type { SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { writeAuditEvent, AUDIT_ACTIONS } from "./audit";
import {
  findDuplicateCandidatesByBatch,
  findDuplicateCandidatesForEntity,
  insertDuplicateCandidate,
  recordDuplicateDecision,
  getDecisionForCandidate,
  getDuplicateCandidateSummaries,
  type DuplicateCandidateSummary,
} from "../repositories/deduplication-repository";

export type DuplicateRiskLevel = "low" | "medium" | "high" | "blocking";
export type DuplicateDecision = "skip" | "promote_as_new" | "merge" | "dismiss" | "confirm_duplicate";

export interface DuplicateCandidateResult {
  candidates: DuplicateCandidateSummary[];
  totalCount: number;
  highRiskCount: number;
  blockingCount: number;
}

export interface DuplicateDetectionInput {
  importBatchId?: string;
  entityId?: string;
  displayName?: string;
  officialVillageCode?: string;
  objectTypeCode?: string;
  objectSubtypeCode?: string;
}

// ---------- Duplicate Detection ----------

export async function findDuplicateCandidates(
  db: D1Binding,
  input: DuplicateDetectionInput,
  ctx: SikesraRequestContext,
): Promise<DuplicateCandidateResult> {
  let candidates: DuplicateCandidateSummary[];

  if (input.importBatchId) {
    candidates = await getDuplicateCandidateSummaries(db, ctx.tenantId, ctx.siteId, input.importBatchId);
  } else if (input.entityId) {
    const rows = await findDuplicateCandidatesForEntity(db, ctx.tenantId, ctx.siteId, input.entityId);
    candidates = rows.map((row) => ({
      id: row.id,
      entityIdA: row.entity_id_a,
      entityIdB: row.entity_id_b,
      displayNameA: "",
      displayNameB: "",
      matchScore: row.match_score ?? 0,
      riskLevel: row.risk_level,
      matchSignals: parseMatchSignals(row.match_signals_json),
      hasDecision: false,
    }));
  } else {
    candidates = await getDuplicateCandidateSummaries(db, ctx.tenantId, ctx.siteId);
  }

  const highRiskCount = candidates.filter((c) => c.riskLevel === "high").length;
  const blockingCount = candidates.filter((c) => c.riskLevel === "blocking").length;

  return {
    candidates,
    totalCount: candidates.length,
    highRiskCount,
    blockingCount,
  };
}

// ---------- Risk Scoring ----------

export function scoreDuplicateRisk(signals: DuplicateMatchSignal[]): { score: number; riskLevel: DuplicateRiskLevel } {
  let score = 0;

  for (const signal of signals) {
    switch (signal.type) {
      case "nik_kia_hash_match":
        score += 50;
        break;
      case "name_exact_match":
        score += 30;
        break;
      case "name_similar":
        score += 15;
        break;
      case "birth_date_match":
        score += 20;
        break;
      case "gender_match":
        score += 5;
        break;
      case "village_match":
        score += 10;
        break;
      case "address_similar":
        score += 10;
        break;
      case "guardian_match":
        score += 10;
        break;
      case "phone_match":
        score += 10;
        break;
      case "document_checksum_match":
        score += 40;
        break;
    }
  }

  score = Math.min(score, 100);

  let riskLevel: DuplicateRiskLevel = "low";
  if (score >= 80 || signals.some((s) => s.type === "nik_kia_hash_match")) {
    riskLevel = "blocking";
  } else if (score >= 60) {
    riskLevel = "high";
  } else if (score >= 30) {
    riskLevel = "medium";
  }

  return { score, riskLevel };
}

export interface DuplicateMatchSignal {
  type: string;
  weight: number;
  details?: Record<string, unknown>;
}

// ---------- Batch Duplicate Detection ----------

export async function detectBatchDuplicates(
  db: D1Binding,
  importBatchId: string,
  ctx: SikesraRequestContext,
): Promise<{ detected: number }> {
  // Get staging rows for this batch
  const stagingRows = await db.prepare(
    `SELECT id, mapped_data_json, validation_status
     FROM awcms_sikesra_import_staging_rows
     WHERE tenant_id = ? AND site_id = ? AND import_batch_id = ? AND deleted_at IS NULL AND validation_status = 'valid'`,
  ).bind(ctx.tenantId, ctx.siteId, importBatchId).all<Record<string, unknown>>();

  // Get existing entities in the same village/type for comparison
  const existingEntities = await db.prepare(
    `SELECT id, display_name, official_village_code, object_type_code, object_subtype_code
     FROM awcms_sikesra_entities
     WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(ctx.tenantId, ctx.siteId).all<Record<string, unknown>>();

  let detected = 0;

  // Compare each staging row against existing entities
  for (const stagingRow of stagingRows.results) {
    const mappedData = parseJsonRecord(stagingRow.mapped_data_json);
    if (!mappedData) continue;

    const stagingName = normalizeName(String(mappedData.display_name ?? ""));
    const stagingVillage = String(mappedData.official_village_code ?? "");
    const stagingType = String(mappedData.object_type_code ?? "");

    for (const entity of existingEntities.results) {
      const entityName = normalizeName(String(entity.display_name ?? ""));
      const entityVillage = String(entity.official_village_code ?? "");
      const entityType = String(entity.object_type_code ?? "");

      // Quick filter: must match village and type
      if (stagingVillage !== entityVillage || stagingType !== entityType) continue;

      const signals: DuplicateMatchSignal[] = [];

      // Name matching
      if (stagingName === entityName) {
        signals.push({ type: "name_exact_match", weight: 30 });
      } else if (stagingName && entityName && levenshteinDistance(stagingName, entityName) <= 2) {
        signals.push({ type: "name_similar", weight: 15 });
      }

      if (signals.length === 0) continue;

      const { score, riskLevel } = scoreDuplicateRisk(signals);

      // Only insert if score is above threshold
      if (score < 30) continue;

      const candidateId = `dup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await insertDuplicateCandidate(db, {
        id: candidateId,
        tenantId: ctx.tenantId,
        siteId: ctx.siteId,
        entityIdA: String(entity.id),
        entityIdB: String(stagingRow.id),
        matchSignalsJson: JSON.stringify(signals.map((s) => s.type)),
        matchScore: score,
        riskLevel,
        detectionSource: "import",
        importBatchId,
        createdBy: ctx.userId,
      });

      detected++;
    }
  }

  return { detected };
}

// ---------- Decision Recording ----------

export async function recordDuplicateDecisionAction(
  db: D1Binding,
  candidateId: string,
  decision: DuplicateDecision,
  reason: string,
  ctx: SikesraRequestContext,
): Promise<{ ok: boolean; decision: string }> {
  // Check permission for high-risk overrides
  const candidate = await db.prepare(
    `SELECT id, risk_level, entity_id_a, entity_id_b FROM ${"awcms_sikesra_duplicate_candidates"}
     WHERE id = ? AND tenant_id = ? AND site_id = ? AND deleted_at IS NULL`,
  ).bind(candidateId, ctx.tenantId, ctx.siteId).first<Record<string, unknown>>();

  if (!candidate) {
    throw new Error("Duplicate candidate not found");
  }

  // High/blocking risk requires reason and permission
  const riskLevel = String(candidate.risk_level);
  if ((riskLevel === "high" || riskLevel === "blocking") && !reason.trim()) {
    throw new Error("Reason is required for high-risk duplicate decisions");
  }

  if (riskLevel === "blocking" && !ctx.permissions.includes(SIKESRA_PERMISSIONS.DUPLICATE_OVERRIDE)) {
    throw new Error("Missing permission to override blocking duplicates");
  }

  // Check if decision already exists
  const existingDecision = await getDecisionForCandidate(db, ctx.tenantId, ctx.siteId, candidateId);
  if (existingDecision) {
    throw new Error("Decision already recorded for this candidate");
  }

  // Record decision
  const decisionId = `dd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await recordDuplicateDecision(db, {
    id: decisionId,
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    candidateId,
    decision,
    reason: reason.trim(),
    createdBy: ctx.userId,
  });

  // Audit the decision
  await writeAuditEvent(db, {
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    action: AUDIT_ACTIONS.DUPLICATE_DECISION,
    resourceType: "duplicate_candidate",
    resourceId: candidateId,
    success: true,
    reason: reason.trim(),
    after: { decision, riskLevel },
  }, ctx);

  return { ok: true, decision };
}

// ---------- Helpers ----------

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function parseMatchSignals(json: string | null | undefined): string[] {
  if (!json || typeof json !== "string" || !json.trim()) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
    if (typeof parsed === "object" && parsed !== null) return Object.keys(parsed as Record<string, unknown>);
    return [];
  } catch {
    return [];
  }
}
