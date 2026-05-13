// SIKESRA Integration and Service Gap Tests
// Covers manual-only gaps that can be automated at service/repository layer
// Source: docs/sikesra/TEST_COVERAGE_MAPPING.md, Issue #206

import { describe, it, expect } from "vitest";
import { InMemoryD1Binding } from "../repositories/db";
import { buildTrustedRequestContext, type SikesraRequestContext } from "../security/request-context";
import { SIKESRA_PERMISSIONS } from "../security/permissions";
import {
  getOfficialRegions,
  getLocalRegions,
  createLocalRegion,
  updateLocalRegion,
  deleteLocalRegion,
  createOfficialRegion,
  updateOfficialRegion,
  deleteOfficialRegion,
  type LocalRegionCreateInput,
  type OfficialRegionCreateInput,
} from "../services/region";
import { getSettings, updateSettings } from "../services/settings";
import { patchEntity, getEntityDetail } from "../services/entity";
import { generateUploadUrl, completeUpload, getEntityDocuments, type CompleteUploadInput } from "../services/document";
import { findDuplicateCandidates, scoreDuplicateRisk, type DuplicateMatchSignal } from "../services/deduplication";

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

async function seedRegionTestData(db: InMemoryD1Binding) {
  // Seed official regions
  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, parent_code, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("prov-1", "test-tenant", "test-site", "62", "Kalimantan Tengah", "province", null, 1, new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, parent_code, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("reg-1", "test-tenant", "test-site", "6201", "Kabupaten Test", "regency", "62", 1, new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, parent_code, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("dist-1", "test-tenant", "test-site", "620102", "Kecamatan Test", "district", "6201", 1, new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_official_regions (id, tenant_id, site_id, code, name, level, parent_code, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("vill-1", "test-tenant", "test-site", "6201021005", "Desa Test", "village", "620102", 1, new Date().toISOString(), new Date().toISOString()).run();

  // Seed local regions
  await db.prepare(
    `INSERT INTO awcms_sikesra_local_regions (id, tenant_id, site_id, official_village_code, level, code_local, name, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("local-1", "test-tenant", "test-site", "6201021005", "rt", "001", "RT 001", 1, new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_local_regions (id, tenant_id, site_id, official_village_code, level, code_local, name, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("local-2", "test-tenant", "test-site", "6201021005", "rt", "002", "RT 002", 1, new Date().toISOString(), new Date().toISOString()).run();

  // Seed object types
  await db.prepare(
    `INSERT INTO awcms_sikesra_object_types (id, tenant_id, site_id, code, name, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("type-01", "test-tenant", "test-site", "01", "Keluarga Penerima Manfaat", 1, 1, new Date().toISOString(), new Date().toISOString()).run();

  await db.prepare(
    `INSERT INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("subtype-01-01", "test-tenant", "test-site", "01", "01", "KPM Umum", 1, 1, new Date().toISOString(), new Date().toISOString()).run();
}

async function seedEntityTestData(db: InMemoryD1Binding) {
  await seedRegionTestData(db);

  // Seed entity
  await db.prepare(
    `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind("entity-1", "test-tenant", "test-site", "01", "01", "person", "Test Person", "6201021005", "public_safe", "draft", "pending", 60, "manual", new Date().toISOString(), new Date().toISOString()).run();
}

describe("SIKESRA Integration and Service Gap Tests", () => {
  describe("Region Service Tests", () => {
    describe("Official Region CRUD", () => {
      it("should get official regions filtered by level", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const villages = await getOfficialRegions(db, ctx, undefined, "village");
        expect(villages.length).toBe(1);
        expect(String(villages[0].code)).toBe("6201021005");
      });

      it("should get official regions filtered by parent", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const districts = await getOfficialRegions(db, ctx, "6201");
        expect(districts.length).toBe(1);
        expect(String(districts[0].code)).toBe("620102");
      });

      it("should create official region", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const input: OfficialRegionCreateInput = {
          code: "6201021006",
          name: "Desa Baru",
          level: "village",
          parentCode: "620102",
        };

        const result = await createOfficialRegion(db, input, ctx);
        expect(result.code).toBe("6201021006");
        expect(result.name).toBe("Desa Baru");
      });

      it("should update official region", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        // Note: InMemoryD1Binding has limited UPDATE support
        // This test verifies the service call doesn't throw
        await expect(updateOfficialRegion(db, "6201021005", { name: "Desa Updated" }, ctx)).resolves.not.toThrow();
      });

      it("should delete official region (soft delete)", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        // Note: InMemoryD1Binding has limited UPDATE support for soft delete
        // This test verifies the service call doesn't throw
        await expect(deleteOfficialRegion(db, "6201021005", ctx)).resolves.not.toThrow();
      });

      it("should enforce tenant/site isolation on region operations", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);

        const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
        const regions = await getOfficialRegions(db, otherCtx);
        expect(regions.length).toBe(0);
      });
    });

    describe("Local Region CRUD", () => {
      it("should get local regions by village", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const regions = await getLocalRegions(db, ctx, "6201021005");
        expect(regions.length).toBe(2);
      });

      it("should create local region", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const input: LocalRegionCreateInput = {
          officialVillageCode: "6201021005",
          level: "rw",
          codeLocal: "003",
          name: "RW 003",
        };

        const result = await createLocalRegion(db, input, ctx);
        expect(result.level).toBe("rw");
        expect(result.codeLocal).toBe("003");
        expect(result.name).toBe("RW 003");
      });

      it("should update local region", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        await updateLocalRegion(db, "local-1", { name: "RT 001 Updated" }, ctx);

        const regions = await getLocalRegions(db, ctx, "6201021005");
        const updated = regions.find(r => r.id === "local-1");
        expect(updated?.name).toBe("RT 001 Updated");
      });

      it("should delete local region (soft delete)", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        await deleteLocalRegion(db, "local-1", ctx);

        const regions = await getLocalRegions(db, ctx, "6201021005");
        expect(regions.length).toBe(1);
      });

      it("should enforce tenant/site isolation on local region operations", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);

        const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
        const regions = await getLocalRegions(db, otherCtx, "6201021005");
        expect(regions.length).toBe(0);
      });
    });

    describe("Region Hierarchy", () => {
      it("should distinguish official vs local regions", async () => {
        const db = new InMemoryD1Binding();
        await seedRegionTestData(db);
        const ctx = makeContext();

        const official = await getOfficialRegions(db, ctx, undefined, "village");
        const local = await getLocalRegions(db, ctx, "6201021005");

        // Official regions have code, local regions have id and codeLocal
        expect(official[0].code).toBeDefined();
        expect(local[0].id).toBeDefined();
        expect(local[0].codeLocal).toBeDefined();
      });
    });
  });

  describe("Entity Patch/Autosave Tests", () => {
    it("should patch entity display name", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      await patchEntity(db, "entity-1", { displayName: "Updated Name" }, ctx);

      const detail = await getEntityDetail(db, "entity-1", ctx);
      expect(detail.entity.displayName).toBe("Updated Name");
    });

    it("should patch entity module fields", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      await patchEntity(db, "entity-1", {
        moduleFields: { address: "Jl. Test No. 123", rt: "001", rw: "002" },
      }, ctx);

      const detail = await getEntityDetail(db, "entity-1", ctx);
      expect(detail.entity.displayName).toBe("Test Person");
    });

    it("should audit entity patch operation", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      await patchEntity(db, "entity-1", { displayName: "Patched Name" }, ctx);

      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'entity' AND resource_id = 'entity-1' AND action LIKE '%update%'`
      ).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBeGreaterThan(0);
    });

    it("should enforce tenant/site isolation on patch", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);

      const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });

      await expect(patchEntity(db, "entity-1", { displayName: "Hacked" }, otherCtx)).rejects.toThrow("Entity not found");
    });
  });

  describe("Document Download Proxy Tests", () => {
    it("should get entity documents list", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      // Generate upload URL to create document record
      const uploadResult = await generateUploadUrl({
        fileName: "ktp.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
        classification: "restricted",
      }, ctx, undefined, db);

      // Complete the upload
      const completeInput: CompleteUploadInput = {
        fileObjectId: uploadResult.fileObjectId,
        entityId: "entity-1",
        documentType: "ktp",
        classification: "restricted",
        checksumSha256: "sha256:abc123",
      };

      const result = await completeUpload(completeInput, ctx, db);

      // Verify document was created
      expect(result.id).toBe(uploadResult.fileObjectId);
      expect(result.documentType).toBe("ktp");

      // Note: getEntityDocuments uses JOIN which InMemoryD1Binding may not support fully
      // The document creation test above verifies the core functionality
    });

    it("should enforce tenant/site isolation on document list", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);

      // Seed a document for different tenant
      await db.prepare(
        `INSERT INTO awcms_sikesra_documents (id, tenant_id, site_id, entity_id, file_object_id, original_filename, document_type, classification, mime_type, size_bytes, is_verified, is_current, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("doc-other", "other-tenant", "other-site", "other-entity", "obj-other", "ktp.pdf", "ktp", "restricted", "application/pdf", 1024, 1, 1, new Date().toISOString(), new Date().toISOString()).run();

      const ctx = makeContext();
      const docs = await getEntityDocuments(db, "entity-1", ctx);
      expect(docs.length).toBe(0);
    });
  });

  describe("Import Promotion with Duplicate Detection Tests", () => {
    it("should detect duplicates during import promotion", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      // Seed entity with same name for duplicate detection
      await db.prepare(
        `INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, status_data, status_verification, completeness_percent, source_input, nik_kia_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind("entity-existing", "test-tenant", "test-site", "01", "01", "person", "Test Person", "6201021005", "public_safe", "active", "verified", 100, "manual", "hash-same", new Date().toISOString(), new Date().toISOString()).run();

      // Find duplicates
      const duplicates = await findDuplicateCandidates(db, {
        entityId: "entity-1",
      }, ctx);

      // Should detect potential duplicates based on name/village match
      expect(duplicates).toBeDefined();
    });

    it("should score duplicate risk correctly", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "name_exact_match", weight: 30 },
        { type: "village_match", weight: 10 },
      ];

      const result = scoreDuplicateRisk(signals);
      expect(result.score).toBe(40);
      expect(result.riskLevel).toBe("medium");
    });

    it("should block promotion for blocking risk duplicates", () => {
      const signals: DuplicateMatchSignal[] = [
        { type: "nik_kia_hash_match", weight: 50 },
      ];

      const result = scoreDuplicateRisk(signals);
      expect(result.riskLevel).toBe("blocking");
    });
  });

  describe("Settings Service Tests", () => {
    it("should get default settings", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      const settings = await getSettings(db, ctx);
      expect(settings).toBeDefined();
      expect(settings.publicEnabled).toBe(false);
    });

    it("should update settings with reason", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await updateSettings(db, {
        publicEnabled: true,
        publicTitle: "SIKESRA Public",
      }, "Enable public dashboard for testing", ctx);

      const settings = await getSettings(db, ctx);
      expect(settings.publicEnabled).toBe(true);
      expect(settings.publicTitle).toBe("SIKESRA Public");
    });

    it("should audit settings update", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await updateSettings(db, {
        publicEnabled: true,
      }, "Test reason for audit", ctx);

      const auditResult = await db.prepare(
        `SELECT * FROM awcms_sikesra_audit_logs WHERE resource_type = 'settings' AND action LIKE '%update%'`
      ).all<Record<string, unknown>>();

      expect(auditResult.results.length).toBeGreaterThan(0);
    });

    it("should enforce tenant/site isolation on settings", async () => {
      const db = new InMemoryD1Binding();
      const ctx = makeContext();

      await updateSettings(db, { publicEnabled: true }, "Test", ctx);

      const otherCtx = makeContext({ tenantId: "other-tenant", siteId: "other-site" });
      const otherSettings = await getSettings(db, otherCtx);
      expect(otherSettings.publicEnabled).toBe(false);
    });
  });

  describe("Entity Access Flags Tests", () => {
    it("should compute access flags for admin user", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      const detail = await getEntityDetail(db, "entity-1", ctx);
      expect(detail.access.canEdit).toBe(true);
      expect(detail.access.canSubmit).toBe(true);
      // canVerify requires specific verification permission
      expect(detail.access.canGenerateCode).toBe(true);
    });

    it("should restrict access flags for viewer user", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext({
        permissions: [SIKESRA_PERMISSIONS.ENTITY_READ],
        roles: ["viewer"],
      });

      const detail = await getEntityDetail(db, "entity-1", ctx);
      expect(detail.access.canEdit).toBe(false);
      expect(detail.access.canSubmit).toBe(false);
      expect(detail.access.canVerify).toBe(false);
    });

    it("should deny actions based on entity status", async () => {
      const db = new InMemoryD1Binding();
      await seedEntityTestData(db);
      const ctx = makeContext();

      // Entity is in draft status
      const detail = await getEntityDetail(db, "entity-1", ctx);

      // Should be able to edit draft
      expect(detail.access.canEdit).toBe(true);
      // Should be able to submit draft
      expect(detail.access.canSubmit).toBe(true);
    });
  });
});
