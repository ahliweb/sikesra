/**
 * TOTP two-factor authentication module.
 * Issue: ahliweb/sikesra#66
 *
 * Implements RFC 6238 (TOTP) + RFC 4226 (HOTP) using the Web Crypto API
 * (built into Node 20+). No external library dependencies.
 *
 * Security requirements:
 * - TOTP secrets stored AES-256-GCM encrypted in user_security_settings.
 * - Recovery codes stored as SHA-256 HMAC hashes (with pepper).
 * - Plaintext values never persisted; display-once only for recovery codes.
 */

import { createHash, createHmac, randomBytes } from "node:crypto";

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // ±1 period drift tolerance
const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_BYTES = 10; // 10 random bytes → 20 hex chars

// ── Base32 helpers ────────────────────────────────────────────────────────────

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]!;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(str: string): Buffer {
  const s = str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of s) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ── HOTP/TOTP ─────────────────────────────────────────────────────────────────

function hotp(key: Buffer, counter: bigint): number {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    10 ** TOTP_DIGITS;
  return code;
}

function currentCounter(atMs?: number): bigint {
  const ts = Math.floor((atMs ?? Date.now()) / 1000);
  return BigInt(Math.floor(ts / TOTP_PERIOD));
}

/**
 * Generate a random TOTP secret (20 random bytes, base32-encoded).
 */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Build an otpauth:// URI for QR code generation.
 */
export function buildOtpAuthUri(opts: {
  secret: string;
  accountName: string;
  issuer: string;
}): string {
  const { secret, accountName, issuer } = opts;
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  return (
    `otpauth://totp/${label}` +
    `?secret=${secret}` +
    `&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1` +
    `&digits=${TOTP_DIGITS}` +
    `&period=${TOTP_PERIOD}`
  );
}

/**
 * Verify a 6-digit TOTP code.
 * Accepts codes within ±TOTP_WINDOW periods to tolerate clock drift.
 */
export function verifyTotpCode(
  secret: string,
  code: string,
  atMs?: number,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secret);
  const inputCode = parseInt(code, 10);
  const counter = currentCounter(atMs);
  for (let d = -TOTP_WINDOW; d <= TOTP_WINDOW; d++) {
    if (hotp(key, counter + BigInt(d)) === inputCode) return true;
  }
  return false;
}

// ── Encryption (AES-256-GCM) ──────────────────────────────────────────────────

/**
 * Derive a 32-byte key from the encryption key string using SHA-256.
 */
function deriveKey(encryptionKey: string): Buffer {
  return createHash("sha256").update(encryptionKey).digest();
}

/**
 * Encrypt a TOTP secret for storage.
 * Format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export async function encryptTotpSecret(
  secret: string,
  encryptionKey: string,
): Promise<string> {
  const iv = randomBytes(12);
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    deriveKey(encryptionKey),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const cipherBuf = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    Buffer.from(secret, "utf8"),
  );
  const cipher = Buffer.from(cipherBuf);
  const ciphertext = cipher.subarray(0, cipher.length - 16);
  const authTag = cipher.subarray(cipher.length - 16);
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

/**
 * Decrypt a stored TOTP secret.
 */
export async function decryptTotpSecret(
  stored: string,
  encryptionKey: string,
): Promise<string> {
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted secret format");
  const [ivHex, authTagHex, ciphertextHex] = parts as [string, string, string];
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  // AES-GCM expects ciphertext+authTag concatenated.
  const combined = Buffer.concat([ciphertext, authTag]);
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    deriveKey(encryptionKey),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
  const plainBuf = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    combined,
  );
  return Buffer.from(plainBuf).toString("utf8");
}

// ── Recovery codes ────────────────────────────────────────────────────────────

export interface RecoveryCodeSet {
  /** Plaintext codes — display once, never store. */
  plaintext: string[];
  /** Hashed codes — store these in user_recovery_codes. */
  hashed: string[];
}

/**
 * Generate a set of single-use recovery codes.
 * Plaintext codes are displayed once; only hashed codes are stored.
 */
export function generateRecoveryCodes(pepper: string): RecoveryCodeSet {
  const plaintext: string[] = [];
  const hashed: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = randomBytes(RECOVERY_CODE_BYTES).toString("hex");
    // Format as XXXXX-XXXXX for readability.
    const formatted = `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15, 20)}`;
    plaintext.push(formatted);
    hashed.push(hashRecoveryCode(formatted, pepper));
  }
  return { plaintext, hashed };
}

/**
 * Hash a recovery code with the pepper for storage/comparison.
 */
export function hashRecoveryCode(code: string, pepper: string): string {
  return createHmac("sha256", pepper).update(code.toLowerCase()).digest("hex");
}

/**
 * Check whether a plaintext recovery code matches any of the stored hashes.
 * Returns the index of the matching hash (for single-use invalidation), or -1.
 */
export function findMatchingRecoveryCode(
  code: string,
  storedHashes: string[],
  pepper: string,
): number {
  const hash = hashRecoveryCode(code, pepper);
  return storedHashes.indexOf(hash);
}
