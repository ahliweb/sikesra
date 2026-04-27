/**
 * Unit tests for the ABAC/RBAC policy engine.
 * Issue: ahliweb/sikesra#65
 *
 * These tests are pure — no live DB, no network access.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluatePolicy,
  PERMISSION_KEYS,
} from "../../src/api/middleware/abac.policy.mjs";

// Helper: build a base allowed context.
function allowed(overrides = {}) {
  return {
    userId: "user-1",
    role: "admin",
    permissions: [...PERMISSION_KEYS],
    requiredPermission: "users.read",
    channel: "api",
    ...overrides,
  };
}

describe("evaluatePolicy", () => {
  it("allows when permission key is present", () => {
    const result = evaluatePolicy(allowed());
    assert.equal(result.allowed, true);
    assert.equal(result.reason, "ok");
  });

  it("denies when permission key is missing", () => {
    const result = evaluatePolicy(
      allowed({ permissions: [], requiredPermission: "users.read" }),
    );
    assert.equal(result.allowed, false);
    assert.match(result.reason, /Missing permission/);
  });

  it("denies viewer role on sensitive resource", () => {
    const result = evaluatePolicy(
      allowed({
        role: "viewer",
        permissions: ["users.read"],
        requiredPermission: "users.read",
        sensitivity: "sensitive",
      }),
    );
    assert.equal(result.allowed, false);
    assert.match(result.reason, /viewer/);
  });

  it("denies viewer role on restricted resource", () => {
    const result = evaluatePolicy(
      allowed({
        role: "viewer",
        permissions: ["users.read"],
        requiredPermission: "users.read",
        sensitivity: "restricted",
      }),
    );
    assert.equal(result.allowed, false);
  });

  it("allows non-viewer on sensitive resource with permission", () => {
    const result = evaluatePolicy(
      allowed({
        role: "operator",
        permissions: ["users.read"],
        requiredPermission: "users.read",
        sensitivity: "sensitive",
      }),
    );
    assert.equal(result.allowed, true);
  });

  it("denies CLI channel for sensitive resources", () => {
    const result = evaluatePolicy(
      allowed({
        role: "admin",
        permissions: ["users.read"],
        requiredPermission: "users.read",
        sensitivity: "sensitive",
        channel: "cli",
      }),
    );
    assert.equal(result.allowed, false);
    assert.match(result.reason, /CLI/i);
  });

  it("allows CLI channel for non-sensitive resources", () => {
    const result = evaluatePolicy(
      allowed({
        role: "admin",
        permissions: ["users.read"],
        requiredPermission: "users.read",
        sensitivity: "internal",
        channel: "cli",
      }),
    );
    assert.equal(result.allowed, true);
  });

  it("denies non-admin access to resource owned by another user", () => {
    const result = evaluatePolicy(
      allowed({
        role: "operator",
        permissions: ["users.update"],
        requiredPermission: "users.update",
        userId: "user-1",
        ownedBy: "user-2",
      }),
    );
    assert.equal(result.allowed, false);
    assert.match(result.reason, /own/i);
  });

  it("allows admin access to resource owned by another user", () => {
    const result = evaluatePolicy(
      allowed({
        role: "admin",
        permissions: ["users.update"],
        requiredPermission: "users.update",
        userId: "user-1",
        ownedBy: "user-2",
      }),
    );
    assert.equal(result.allowed, true);
  });

  it("allows owner to access their own resource", () => {
    const result = evaluatePolicy(
      allowed({
        role: "operator",
        permissions: ["users.update"],
        requiredPermission: "users.update",
        userId: "user-1",
        ownedBy: "user-1",
      }),
    );
    assert.equal(result.allowed, true);
  });

  it("PERMISSION_KEYS contains expected keys", () => {
    assert.ok(PERMISSION_KEYS.includes("users.read"));
    assert.ok(PERMISSION_KEYS.includes("audit.read"));
    assert.ok(PERMISSION_KEYS.includes("integrations.mailketing.manage"));
    assert.equal(PERMISSION_KEYS.length, 20);
  });
});
