import {
  mapSikesraReligionReferenceImport,
  toSikesraReligionOption,
} from "../reference-data/religion-reference.mjs";
import { sikesraReligionReferenceRepository } from "../repositories/religion-reference-repository.mjs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { writeAuditLog } from "../../modules/audit/index.js";

export const SIKESRA_RELIGION_REFERENCE_ACCESS = Object.freeze({
  readActivePermission: null,
  readInactivePermission: "sikesra.reference.manage",
  readInactiveAuditAction: "sikesra.reference.inactive_read",
  manageLifecyclePermission: "sikesra.reference.manage",
  lifecycleUpdateAuditAction: "sikesra.reference.lifecycle_update",
});

export function evaluateReligionReferenceReadAccess(input = {}) {
  const includeInactive = input.includeInactive === true;
  const permissionSet = new Set(input.permissions ?? []);

  if (includeInactive && !permissionSet.has(SIKESRA_RELIGION_REFERENCE_ACCESS.readInactivePermission)) {
    return {
      allowed: false,
      code: "RELIGION_REFERENCE_INACTIVE_FORBIDDEN",
      message: "Akses referensi agama nonaktif memerlukan izin sikesra.reference.manage.",
      auditAction: null,
    };
  }

  return {
    allowed: true,
    code: null,
    message: null,
    auditAction: includeInactive ? SIKESRA_RELIGION_REFERENCE_ACCESS.readInactiveAuditAction : null,
  };
}

export function evaluateReligionReferenceLifecycleAccess(input = {}) {
  const permissionSet = new Set(input.permissions ?? []);

  if (!permissionSet.has(SIKESRA_RELIGION_REFERENCE_ACCESS.manageLifecyclePermission)) {
    return {
      allowed: false,
      code: "RELIGION_REFERENCE_MANAGE_FORBIDDEN",
      message: "Perubahan lifecycle referensi agama memerlukan izin sikesra.reference.manage.",
      auditAction: null,
    };
  }

  return {
    allowed: true,
    code: null,
    message: null,
    auditAction: SIKESRA_RELIGION_REFERENCE_ACCESS.lifecycleUpdateAuditAction,
  };
}

export function createSikesraReligionReferenceService(input = {}) {
  const repository = input.repository ?? sikesraReligionReferenceRepository;
  const auditWriter = input.auditWriter ?? writeAuditLog;

  return Object.freeze({
    seam: repository.seam,
    access: SIKESRA_RELIGION_REFERENCE_ACCESS,
    listOptions(input) {
      const references = repository.list({ includeInactive: input?.includeInactive === true });
      return references.map((reference) => toSikesraReligionOption(reference));
    },
    async listRuntimeOptions(input) {
      const references = await repository.listRuntime({ includeInactive: input?.includeInactive === true });
      return references.map((reference) => toSikesraReligionOption(reference));
    },
    evaluateReadAccess(input) {
      return evaluateReligionReferenceReadAccess(input);
    },
    async listAuthorizedRuntimeOptions(input = {}) {
      const access = evaluateReligionReferenceReadAccess(input);
      if (!access.allowed) {
        return {
          ok: false,
          code: access.code,
          message: access.message,
          auditAction: access.auditAction,
          options: [],
        };
      }

      const options = await this.listRuntimeOptions({ includeInactive: input.includeInactive === true });
      return {
        ok: true,
        code: null,
        message: null,
        auditAction: access.auditAction,
        options,
      };
    },
    evaluateLifecycleAccess(input) {
      return evaluateReligionReferenceLifecycleAccess(input);
    },
    async updateReferenceLifecycle(input = {}) {
      const access = evaluateReligionReferenceLifecycleAccess(input);
      if (!access.allowed) {
        return {
          ok: false,
          code: access.code,
          message: access.message,
          auditAction: null,
          reference: null,
          changed: false,
        };
      }

      let updated;
      try {
        updated = await repository.updateLifecycle({
          referenceId: input.referenceId,
          isActive: input.isActive === true,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "RELIGION_REFERENCE_ID_REQUIRED") {
          return {
            ok: false,
            code: error.message,
            message: "ID referensi agama wajib diisi.",
            auditAction: null,
            reference: null,
            changed: false,
          };
        }

        return {
          ok: false,
          code: "RELIGION_REFERENCE_RUNTIME_UNAVAILABLE",
          message: "Runtime PostgreSQL referensi agama belum tersedia untuk perubahan lifecycle.",
          auditAction: null,
          reference: null,
          changed: false,
        };
      }

      if (!updated) {
        return {
          ok: false,
          code: "RELIGION_REFERENCE_NOT_FOUND",
          message: "Referensi agama tidak ditemukan.",
          auditAction: null,
          reference: null,
          changed: false,
        };
      }

      const changed = updated.previousActive !== updated.active;
      const reference = toSikesraReligionOption(updated);

      if (changed) {
        await auditWriter({
          actorId: input.actorId ?? null,
          action: access.auditAction,
          resourceType: "religion_reference",
          resourceId: updated.id,
          payloadSafe: {
            code: updated.code,
            displayName: updated.displayName,
            previousActive: updated.previousActive,
            nextActive: updated.active,
          },
        });
      }

      return {
        ok: true,
        code: null,
        message: null,
        auditAction: changed ? access.auditAction : null,
        reference,
        changed,
      };
    },
    normalizeValue(value) {
      const reference = repository.findByAny(value);
      return reference ? { value: reference.code, label: reference.displayName } : { value: "", label: "" };
    },
    async normalizeRuntimeValue(value) {
      const reference = await repository.findByAnyRuntime(value);
      return reference ? { value: reference.code, label: reference.displayName } : { value: "", label: "" };
    },
    mapImportValue(value) {
      const mapped = mapSikesraReligionReferenceImport(value);
      return {
        ok: mapped.ok,
        value: mapped.reference?.code ?? "",
        label: mapped.reference?.displayName ?? "",
        normalizedInput: mapped.normalizedInput,
        message: mapped.message,
      };
    },
    async mapRuntimeImportValue(value) {
      const reference = await repository.findByAnyRuntime(value);
      const normalizedInput = String(value ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, "_");

      if (!normalizedInput) {
        return { ok: false, value: "", label: "", normalizedInput, message: "Nilai agama kosong." };
      }

      if (!reference) {
        return {
          ok: false,
          value: "",
          label: "",
          normalizedInput,
          message: "Nilai agama tidak ditemukan dalam referensi backend terkontrol.",
        };
      }

      return {
        ok: true,
        value: reference.code,
        label: reference.displayName,
        normalizedInput,
        message: "Nilai agama berhasil dipetakan ke referensi backend terkontrol.",
      };
    },
  });
}

export const sikesraReligionReferenceService = createSikesraReligionReferenceService();
