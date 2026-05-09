// SIKESRA Code Service
// 20-digit SIKESRA ID generation and correction
// Format: [kode_desa_kel_10][jenis_2][subjenis_2][sequence_6]
// Source: docs/sikesra/07_operations_sop.md

import type { SikesraRequestContext } from "../security/request-context";

export async function generateSikesraId(
  entityId: string,
  ctx: SikesraRequestContext,
): Promise<{ sikesraId20: string }> {
  // TODO: validate required fields (village code, type code, subtype code)
  // Read or create sequence row
  // Increment and build ID
  // Update entity with generated ID
  // Write code history + audit
  // ID is stable - local RT/RW changes do not affect it
  throw new Error("Not implemented");
}

export async function correctSikesraId(
  entityId: string,
  newId: string,
  reason: string,
  ctx: SikesraRequestContext,
): Promise<{ oldId: string; newId: string }> {
  // TODO: require awcms:sikesra:code:correct permission
  // Validate reason provided
  // Write old/new to code history
  // Audit the correction
  throw new Error("Not implemented");
}
