// SIKESRA Duplicate Detection Tests
// Verify duplicate signals, risk scoring, decisions, and permission enforcement
// Source: docs/sikesra/07_operations_sop.md, docs/sikesra/10_validation_checklist.md

import { describe, it, expect } from "vitest";
import { scoreDuplicateRisk, recordDuplicateDecisionAction, type DuplicateMatchSignal, type DuplicateDecision } from "../services/deduplication";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import { InMemoryD1Binding } from "../repositories/db";

function makeContext(overrides: Partial<SikesraRequestContext> = {}): SikesraRequestContext {
  return buildTrustedRequestContext({
    requestId: `req_${Date.now()}`,
    tenantId: "test-tenant",
    siteId: "test-site",
    userId: "test-user",
    roles: ["admin"],
    permissions: Object.values(SIKESRA_PERMISSIONS),
    regionScope: { villageCodes: [] },
    ...overrides,
  });
}

describe("SIKESRA Duplicate Detection Tests", () => {
  describe("Risk Scoring", () => {
    it("should score low risk for weak signals", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "gender_match", weight: 5 },
        { type: "village_match", weight: 10 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(15);
      expect(result.riskLevel).toBe("low");
    });

    it("should score medium risk for name similarity", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "name_similar", weight: 15 },
        { type: "village_match", weight: 10 },
        { type: "birth_date_match", weight: 20 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(45);
      expect(result.riskLevel).toBe("medium");
    });

    it("should score high risk for strong signals", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "name_exact_match", weight: 30 },
        { type: "birth_date_match", weight: 20 },
        { type: "village_match", weight: 10 },
        { type: "phone_match", weight: 10 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(70);
      expect(result.riskLevel).toBe("high");
    });

    it("should score blocking risk for NIK/KIA hash match", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "nik_kia_hash_match", weight: 50 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(50);
      expect(result.riskLevel).toBe("blocking");
    });

    it("should score blocking risk for high combined score", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "name_exact_match", weight: 30 },
        { type: "birth_date_match", weight: 20 },
        { type: "village_match", weight: 10 },
        { type: "address_similar", weight: 10 },
        { type: "guardian_match", weight: 10 },
        { type: "phone_match", weight: 10 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(90);
      expect(result.riskLevel).toBe("blocking");
    });

    it("should cap score at 100", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "nik_kia_hash_match", weight: 50 },
        { type: "document_checksum_match", weight: 40 },
        { type: "name_exact_match", weight: 30 },
        { type: "birth_date_match", weight: 20 },
      ];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(100);
      expect(result.riskLevel).toBe("blocking");
    });

    it("should return low risk for empty signals", () => {
      const signals: DuplicateMatchSignal[] = [];

      const result = scoreDuplicateRisk(signals);

      expect(result.score).toBe(0);
      expect(result.riskLevel).toBe("low");
    });
  });

  describe("Duplicate Decision Recording", () => {
    it("should require reason for high-risk decisions", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      // Seed a high-risk duplicate candidate
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-high", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 70, "high", "manual", "test-user").run();

      await expect(recordDuplicateDecisionAction(db, "dup-high", "promote_as_new", "", ctx)).rejects.toThrow("Reason is required");
    });

    it("should require permission for blocking duplicate override", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext({ permissions: [] });

      // Seed a blocking duplicate candidate
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-blocking", "test-tenant", "test-site", "entity-1", "entity-2", '["nik_kia_hash_match"]', 50, "blocking", "manual", "test-user").run();

      await expect(recordDuplicateDecisionAction(db, "dup-blocking", "promote_as_new", "Test reason for override", ctx)).rejects.toThrow("Missing permission");
    });

    it("should allow decision for low-risk duplicates without reason", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      // Seed a low-risk duplicate candidate
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-low", "test-tenant", "test-site", "entity-1", "entity-2", '["village_match"]', 10, "low", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-low", "dismiss", "", ctx);

      expect(result.ok).toBe(true);
      expect(result.decision).toBe("dismiss");
    });

    it("should prevent duplicate decisions", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      // Seed a duplicate candidate
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-once", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      // First decision should succeed
      await recordDuplicateDecisionAction(db, "dup-once", "skip", "First decision", ctx);

      // Second decision should fail
      await expect(recordDuplicateDecisionAction(db, "dup-once", "merge", "Second decision", ctx)).rejects.toThrow("Decision already recorded");
    });

    it("should audit duplicate decisions", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      // Seed a duplicate candidate
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-audit", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      await recordDuplicateDecisionAction(db, "dup-audit", "merge", "Merge decision for testing", ctx);

      // Check audit log
      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'duplicate_candidate' AND resource_id = 'dup-audit'`
      ).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBe(1);
    });

    it("should enforce tenant/site isolation", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      // Seed a duplicate candidate for different tenant
      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-other", "other-tenant", "other-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      await expect(recordDuplicateDecisionAction(db, "dup-other", "skip", "Test reason", ctx)).rejects.toThrow("Duplicate candidate not found");
    });
  });

  describe("Decision Types", () => {
    it("should accept skip decision", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-skip", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-skip", "skip", "Skip this duplicate", ctx);

      expect(result.decision).toBe("skip");
    });

    it("should accept promote_as_new decision", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-promote", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-promote", "promote_as_new", "Promote as new entity", ctx);

      expect(result.decision).toBe("promote_as_new");
    });

    it("should accept merge decision", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-merge", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-merge", "merge", "Merge entities", ctx);

      expect(result.decision).toBe("merge");
    });

    it("should accept dismiss decision", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-dismiss", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-dismiss", "dismiss", "Dismiss false positive", ctx);

      expect(result.decision).toBe("dismiss");
    });

    it("should accept confirm_duplicate decision", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await db.prepare(
        `INSERT INTO awcms_sikesra_duplicate_candidates (id, tenant_id, site_id, entity_id_a, entity_id_b, match_signals_json, match_score, risk_level, detection_source, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("dup-confirm", "test-tenant", "test-site", "entity-1", "entity-2", '["name_exact_match"]', 30, "medium", "manual", "test-user").run();

      const result = await recordDuplicateDecisionAction(db, "dup-confirm", "confirm_duplicate", "Confirm this is a duplicate", ctx);

      expect(result.decision).toBe("confirm_duplicate");
    });
  });
});
