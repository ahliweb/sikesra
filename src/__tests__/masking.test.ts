// SIKESRA Sensitive Masking Tests
// Dedicated test suite for sensitive data masking
// Source: Issue #191, docs/sikesra/06_security_rbac_abac.md

import { describe, it, expect } from "vitest";
import {
  maskNikKia,
  maskNikKiaHash,
  maskPhone,
  maskProtectedName,
  maskEmail,
  maskAddress,
  maskDisabilityDetails,
  maskDesilLevel,
  maskR2Key,
  maskDocumentMetadata,
  maskAuditBeforeAfter,
  maskGuardianDetails,
  type MaskingContext,
} from "../security/masking";

const publicContext: MaskingContext = {
  canRevealSensitive: false,
  canRevealHighlyRestricted: false,
};

const sensitiveContext: MaskingContext = {
  canRevealSensitive: true,
  canRevealHighlyRestricted: false,
};

const highlyRestrictedContext: MaskingContext = {
  canRevealSensitive: true,
  canRevealHighlyRestricted: true,
};

describe("SIKESRA Sensitive Masking Tests", () => {
  describe("NIK/KIA Masking", () => {
    it("should mask NIK/KIA for public users", () => {
      expect(maskNikKia("1234567890123456", publicContext)).toBe("************3456");
    });

    it("should mask NIK/KIA for sensitive-authorized users", () => {
      expect(maskNikKia("1234567890123456", sensitiveContext)).toBe("************3456");
    });

    it("should reveal NIK/KIA for highly-restricted-authorized users", () => {
      expect(maskNikKia("1234567890123456", highlyRestrictedContext)).toBe("1234567890123456");
    });

    it("should handle short NIK values", () => {
      expect(maskNikKia("123", publicContext)).toBe("************????");
    });

    it("should handle null/undefined values", () => {
      expect(maskNikKia(null, publicContext)).toBeNull();
      expect(maskNikKia(undefined, publicContext)).toBeNull();
    });

    it("should never return NIK/KIA hash", () => {
      expect(maskNikKiaHash("hash123", publicContext)).toBeNull();
      expect(maskNikKiaHash("hash123", sensitiveContext)).toBeNull();
      expect(maskNikKiaHash("hash123", highlyRestrictedContext)).toBeNull();
    });
  });

  describe("Phone Masking", () => {
    it("should mask phone for public users", () => {
      expect(maskPhone("081234567890", publicContext)).toBe("******7890");
    });

    it("should reveal phone for sensitive-authorized users", () => {
      expect(maskPhone("081234567890", sensitiveContext)).toBe("081234567890");
    });

    it("should handle short phone values", () => {
      expect(maskPhone("123", publicContext)).toBe("**********");
    });

    it("should handle null/undefined values", () => {
      expect(maskPhone(null, publicContext)).toBeNull();
      expect(maskPhone(undefined, publicContext)).toBeNull();
    });
  });

  describe("Name Masking", () => {
    it("should mask name for public users", () => {
      expect(maskProtectedName("John Doe", publicContext)).toBe("J**");
    });

    it("should reveal name for sensitive-authorized users", () => {
      expect(maskProtectedName("John Doe", sensitiveContext)).toBe("John Doe");
    });

    it("should handle short names", () => {
      expect(maskProtectedName("Jo", publicContext)).toBe("**");
    });

    it("should handle null/undefined values", () => {
      expect(maskProtectedName(null, publicContext)).toBeNull();
      expect(maskProtectedName(undefined, publicContext)).toBeNull();
    });
  });

  describe("Email Masking", () => {
    it("should mask email for public users", () => {
      expect(maskEmail("john.doe@example.com", publicContext)).toBe("j***@example.com");
    });

    it("should reveal email for sensitive-authorized users", () => {
      expect(maskEmail("john.doe@example.com", sensitiveContext)).toBe("john.doe@example.com");
    });

    it("should handle short email names", () => {
      expect(maskEmail("jo@example.com", publicContext)).toBe("**@example.com");
    });

    it("should handle invalid email format", () => {
      expect(maskEmail("invalid-email", publicContext)).toBe("***@***");
    });

    it("should handle null/undefined values", () => {
      expect(maskEmail(null, publicContext)).toBeNull();
      expect(maskEmail(undefined, publicContext)).toBeNull();
    });
  });

  describe("Address Masking", () => {
    it("should hide address for public users", () => {
      expect(maskAddress("Jl. Example No. 123", publicContext)).toBeNull();
    });

    it("should reveal address for sensitive-authorized users", () => {
      expect(maskAddress("Jl. Example No. 123", sensitiveContext)).toBe("Jl. Example No. 123");
    });

    it("should handle null/undefined values", () => {
      expect(maskAddress(null, publicContext)).toBeNull();
      expect(maskAddress(undefined, publicContext)).toBeNull();
    });
  });

  describe("Disability Details Masking", () => {
    it("should always hide disability details", () => {
      expect(maskDisabilityDetails("ODGJ details", publicContext)).toBeNull();
      expect(maskDisabilityDetails("ODGJ details", sensitiveContext)).toBeNull();
      expect(maskDisabilityDetails("ODGJ details", highlyRestrictedContext)).toBeNull();
    });

    it("should handle null/undefined values", () => {
      expect(maskDisabilityDetails(null, publicContext)).toBeNull();
      expect(maskDisabilityDetails(undefined, publicContext)).toBeNull();
    });
  });

  describe("Desil Level Masking", () => {
    it("should hide desil level for public users", () => {
      expect(maskDesilLevel(3, publicContext)).toBeNull();
    });

    it("should reveal desil level for sensitive-authorized users", () => {
      expect(maskDesilLevel(3, sensitiveContext)).toBe(3);
    });

    it("should handle null/undefined values", () => {
      expect(maskDesilLevel(null, publicContext)).toBeNull();
      expect(maskDesilLevel(undefined, publicContext)).toBeNull();
    });
  });

  describe("R2 Key Masking", () => {
    it("should never return R2 key", () => {
      expect(maskR2Key("tenant-1/doc-123.pdf", publicContext)).toBeNull();
      expect(maskR2Key("tenant-1/doc-123.pdf", sensitiveContext)).toBeNull();
      expect(maskR2Key("tenant-1/doc-123.pdf", highlyRestrictedContext)).toBeNull();
    });

    it("should handle null/undefined values", () => {
      expect(maskR2Key(null, publicContext)).toBeNull();
      expect(maskR2Key(undefined, publicContext)).toBeNull();
    });
  });

  describe("Document Metadata Masking", () => {
    it("should return safe metadata for public users", () => {
      const metadata = {
        document_type: "ktp",
        is_verified: true,
        mime_type: "image/jpeg",
        size_bytes: 123456,
      };

      const result = maskDocumentMetadata(metadata, publicContext);

      expect(result).toEqual({
        type: "ktp",
        status: true,
      });
      expect(result).not.toHaveProperty("mime_type");
      expect(result).not.toHaveProperty("size_bytes");
    });

    it("should reveal full metadata for sensitive-authorized users", () => {
      const metadata = {
        document_type: "ktp",
        is_verified: true,
        mime_type: "image/jpeg",
        size_bytes: 123456,
      };

      const result = maskDocumentMetadata(metadata, sensitiveContext);

      expect(result).toEqual({
        type: "ktp",
        status: true,
        mime_type: "image/jpeg",
        size_bytes: 123456,
      });
    });

    it("should handle null/undefined values", () => {
      expect(maskDocumentMetadata(null, publicContext)).toBeNull();
      expect(maskDocumentMetadata(undefined, publicContext)).toBeNull();
    });
  });

  describe("Audit Before/After Masking", () => {
    it("should redact audit data for public users", () => {
      const auditData = { field: "value", sensitive: "data" };

      const result = maskAuditBeforeAfter(auditData, publicContext);

      expect(result).toEqual({
        _redacted: true,
        _reason: "insufficient_permission",
      });
    });

    it("should reveal audit data for sensitive-authorized users", () => {
      const auditData = { field: "value", sensitive: "data" };

      const result = maskAuditBeforeAfter(auditData, sensitiveContext);

      expect(result).toEqual(auditData);
    });

    it("should handle null/undefined values", () => {
      expect(maskAuditBeforeAfter(null, publicContext)).toBeNull();
      expect(maskAuditBeforeAfter(undefined, publicContext)).toBeNull();
    });
  });

  describe("Guardian Details Masking", () => {
    it("should mask guardian details for public users", () => {
      expect(maskGuardianDetails("Guardian Name", publicContext)).toBe("G**");
    });

    it("should reveal guardian details for sensitive-authorized users", () => {
      expect(maskGuardianDetails("Guardian Name", sensitiveContext)).toBe("Guardian Name");
    });

    it("should handle null/undefined values", () => {
      expect(maskGuardianDetails(null, publicContext)).toBeNull();
      expect(maskGuardianDetails(undefined, publicContext)).toBeNull();
    });
  });

  describe("Security Invariants", () => {
    it("should never expose raw NIK in any masked output", () => {
      const nik = "1234567890123456";
      expect(maskNikKia(nik, publicContext)).not.toContain("1234567890");
      expect(maskNikKia(nik, sensitiveContext)).not.toContain("1234567890");
    });

    it("should never expose R2 keys in any context", () => {
      const key = "tenant-1/site-1/documents/ktp-123.pdf";
      expect(maskR2Key(key, publicContext)).toBeNull();
      expect(maskR2Key(key, sensitiveContext)).toBeNull();
      expect(maskR2Key(key, highlyRestrictedContext)).toBeNull();
    });

    it("should never expose NIK/KIA hashes in any context", () => {
      const hash = "sha256:abc123def456";
      expect(maskNikKiaHash(hash, publicContext)).toBeNull();
      expect(maskNikKiaHash(hash, sensitiveContext)).toBeNull();
      expect(maskNikKiaHash(hash, highlyRestrictedContext)).toBeNull();
    });

    it("should always hide disability details regardless of permission", () => {
      const details = "Schizophrenia diagnosis";
      expect(maskDisabilityDetails(details, publicContext)).toBeNull();
      expect(maskDisabilityDetails(details, sensitiveContext)).toBeNull();
      expect(maskDisabilityDetails(details, highlyRestrictedContext)).toBeNull();
    });
  });
});
