// SIKESRA Verification Service
// Queue, decisions, notes, audit
// Source: docs/sikesra/04_api_contracts.md, docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";

export type VerificationAction = "submit" | "verify" | "need_revision" | "reject" | "re_submit";
export type VerificationLevel = "desa" | "kecamatan" | "kabupaten" | "opd";

export interface VerificationQueueItem {
  entityId: string;
  displayName: string;
  objectTypeCode: string;
  objectSubtypeCode: string;
  officialVillageCode: string;
  verificationLevel: VerificationLevel;
  currentStatus: string;
  submittedAt: string;
  completenessPercent: number;
  duplicateStatus: string;
}

export interface VerificationDecision {
  action: VerificationAction;
  note?: string;
  verificationLevel: VerificationLevel;
}

export interface VerificationEvent {
  id: string;
  entityId: string;
  actorId: string;
  actorRole: string;
  verificationLevel: VerificationLevel;
  action: VerificationAction;
  previousStatus: string;
  nextStatus: string;
  note?: string;
  createdAt: string;
}

export async function getVerificationQueue(
  level: VerificationLevel,
  ctx: SikesraRequestContext,
): Promise<VerificationQueueItem[]> {
  // TODO: query awcms_sikesra_entities filtered by level, region scope, status_verification
  return [];
}

export async function submitEntity(
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<{ ok: boolean; newStatus: string }> {
  // TODO: validate completeness, duplicates, required fields
  // Transition from draft to submitted_village
  // Write verification event + audit
  throw new Error("Not implemented");
}

export async function verifyEntity(
  entityId: string,
  decision: VerificationDecision,
  ctx: SikesraRequestContext,
): Promise<{ ok: boolean; newStatus: string }> {
  // TODO: validate level, scope, status transition
  // Need_revision and reject require note
  // Transition status, write verification event + audit
  throw new Error("Not implemented");
}
