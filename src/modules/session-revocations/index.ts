/**
 * Server-side session revocation helpers.
 * Issue: ahliweb/sikesra#68
 *
 * Raw JWTs and raw jti values are never stored. The database only receives an
 * HMAC-SHA256 revocation identifier derived from the JWT jti when available.
 */

import { createHmac } from "node:crypto";
import { getPool } from "../../db/client.js";
import type { JwtPayload } from "../session/index.js";

function hashSessionIdentifier(identifier: string, secret: string): string {
  return createHmac("sha256", secret).update(identifier).digest("hex");
}

export function getSessionRevocationHash(payload: JwtPayload, token: string, secret: string): string {
  return hashSessionIdentifier(payload.jti ?? token, secret);
}

export async function revokeSessionToken(payload: JwtPayload, token: string, secret: string): Promise<void> {
  const pool = getPool();
  const tokenHash = getSessionRevocationHash(payload, token, secret);
  const expiresAt = new Date(payload.exp * 1000).toISOString();

  await pool`
    insert into public.session_revocations (token_hash, user_id, expires_at, revoked_at)
    values (${tokenHash}, ${payload.sub}, ${expiresAt}, now())
    on conflict (token_hash) do update
      set revoked_at = least(public.session_revocations.revoked_at, excluded.revoked_at),
          expires_at = greatest(public.session_revocations.expires_at, excluded.expires_at)
  `;
}

export async function isSessionTokenRevoked(payload: JwtPayload, token: string, secret: string): Promise<boolean> {
  const pool = getPool();
  const tokenHash = getSessionRevocationHash(payload, token, secret);
  const rows = await pool<{ exists: boolean }[]>`
    select exists(
      select 1
      from public.session_revocations
      where token_hash = ${tokenHash}
        and expires_at > now()
      limit 1
    ) as exists
  `;

  return rows[0]?.exists === true;
}

export async function deleteExpiredSessionRevocations(): Promise<number> {
  const pool = getPool();
  const rows = await pool<{ deleted_count: number }[]>`
    with deleted as (
      delete from public.session_revocations
      where expires_at <= now()
      returning 1
    )
    select count(*)::int as deleted_count from deleted
  `;

  return rows[0]?.deleted_count ?? 0;
}
