import test from "node:test";
import assert from "node:assert/strict";

import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  decryptTotpSecret,
  encryptTotpSecret,
  findMatchingRecoveryCode,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "../../src/modules/two-factor/index.ts";
import {
  extractBearerToken,
  issuePending2faToken,
  issueToken,
  verifyToken,
} from "../../src/modules/session/index.ts";
import { getSessionRevocationHash } from "../../src/modules/session-revocations/index.ts";
import {
  evaluateLoginTwoFactorDecision,
  shouldBlockLoginAttempt,
} from "../../src/api/routes/auth.ts";

test("base32 helpers round-trip binary data", () => {
  const original = Buffer.from("sikesra-two-factor");
  const encoded = base32Encode(original);
  assert.equal(base32Decode(encoded).toString("utf8"), original.toString("utf8"));
});

test("otpauth URI includes issuer, account, and secret", () => {
  const uri = buildOtpAuthUri({
    secret: "JBSWY3DPEHPK3PXP",
    accountName: "admin@example.test",
    issuer: "SIKESRA",
  });
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(uri, /issuer=SIKESRA/);
});

test("TOTP verifier rejects malformed codes", () => {
  assert.equal(verifyTotpCode("JBSWY3DPEHPK3PXP", "not-code"), false);
  assert.equal(verifyTotpCode("JBSWY3DPEHPK3PXP", "12345"), false);
});

test("TOTP secrets encrypt and decrypt", async () => {
  const key = "test-key-that-is-long-enough-for-derivation";
  const encrypted = await encryptTotpSecret("JBSWY3DPEHPK3PXP", key);
  assert.notEqual(encrypted, "JBSWY3DPEHPK3PXP");
  assert.equal(await decryptTotpSecret(encrypted, key), "JBSWY3DPEHPK3PXP");
});

test("recovery codes are display-once plaintext with hashed storage values", () => {
  const pepper = "test-recovery-pepper";
  const generated = generateRecoveryCodes(pepper);
  assert.equal(generated.plaintext.length, 8);
  assert.equal(generated.hashed.length, 8);
  assert.notEqual(generated.plaintext[0], generated.hashed[0]);

  const first = generated.plaintext[0];
  assert.equal(
    findMatchingRecoveryCode(first, generated.hashed, pepper),
    0,
  );
  assert.equal(
    generated.hashed[0],
    hashRecoveryCode(first, pepper),
  );
});

test("JWT sessions verify and reject tampering", () => {
  const signingKey = "test-jwt-signing-key-that-is-long-enough";
  const token = issueToken("user-1", "admin", signingKey, {
    twoFactorVerified: true,
  });
  const payload = verifyToken(token, signingKey);
  assert.equal(payload?.sub, "user-1");
  assert.equal(payload?.role, "admin");
  assert.equal(payload?.twoFactorVerified, true);
  assert.equal(typeof payload?.jti, "string");

  const tampered = token.replace(/.$/, "x");
  assert.equal(verifyToken(tampered, signingKey), null);
});

test("pending 2FA token is marked as partial session", () => {
  const signingKey = "test-jwt-signing-key-that-is-long-enough";
  const token = issuePending2faToken("user-2", "auditor", signingKey);
  const payload = verifyToken(token, signingKey);
  assert.equal(payload?.sub, "user-2");
  assert.equal(payload?.pending2fa, true);
  assert.equal(payload?.twoFactorVerified, false);
  assert.equal(typeof payload?.jti, "string");
});

test("session revocation hashes never expose raw JWT identifiers", () => {
  const signingKey = "test-jwt-signing-key-that-is-long-enough";
  const token = issueToken("user-3", "admin", signingKey, {
    twoFactorVerified: true,
  });
  const payload = verifyToken(token, signingKey);
  assert.ok(payload);

  const tokenHash = getSessionRevocationHash(payload, token, signingKey);
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHash, payload.jti);
  assert.equal(tokenHash.includes(token), false);
});

test("protected roles without confirmed 2FA are blocked pending setup", () => {
  assert.deepEqual(
    evaluateLoginTwoFactorDecision({
      roleNames: ["admin"],
      twoFactorConfirmedAt: null,
    }),
    { kind: "setup_required" },
  );
});

test("confirmed 2FA requires login challenge for protected roles", () => {
  assert.deepEqual(
    evaluateLoginTwoFactorDecision({
      roleNames: ["auditor"],
      twoFactorConfirmedAt: "2026-04-27T00:00:00.000Z",
    }),
    { kind: "challenge_required" },
  );
});

test("non-protected roles without confirmed 2FA can continue login", () => {
  assert.deepEqual(
    evaluateLoginTwoFactorDecision({
      roleNames: ["viewer"],
      twoFactorConfirmedAt: null,
    }),
    { kind: "not_required" },
  );
});

test("login lockout decision blocks attempts at configured threshold", () => {
  assert.equal(
    shouldBlockLoginAttempt({ recentFailureCount: 4, maxFailures: 5 }),
    false,
  );
  assert.equal(
    shouldBlockLoginAttempt({ recentFailureCount: 5, maxFailures: 5 }),
    true,
  );
});

test("bearer token extraction is strict", () => {
  assert.equal(extractBearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(extractBearerToken("Basic abc.def.ghi"), null);
  assert.equal(extractBearerToken(undefined), null);
});
