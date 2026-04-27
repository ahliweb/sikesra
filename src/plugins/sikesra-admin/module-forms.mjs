import { createSikesraFormWizardState } from "./form-wizard.mjs";
import { createSikesraIdDisplayModel } from "./id-sikesra.mjs";
import { createSikesraRegionFormGroup } from "./region-model.mjs";
import { createSikesraAgamaSelectModel } from "./religion-reference.mjs";
import { createSikesraSensitiveFieldProps } from "./sensitive-fields.mjs";

export const SIKESRA_MODULE_FORM_ISSUES = Object.freeze({
  rumah_ibadah: "ahliweb/sikesra#20",
  lembaga_keagamaan: "ahliweb/sikesra#21",
  lembaga_pendidikan_keagamaan: "ahliweb/sikesra#22",
  lembaga_kesejahteraan_sosial: "ahliweb/sikesra#23",
  guru_agama: "ahliweb/sikesra#24",
  anak_yatim: "ahliweb/sikesra#25",
  disabilitas: "ahliweb/sikesra#26",
  lansia_terlantar: "ahliweb/sikesra#43",
});

export const SIKESRA_MODULE_FORM_DEFINITIONS = Object.freeze({
  rumah_ibadah: definition({
    moduleKey: "rumah_ibadah",
    label: "Rumah Ibadah",
    subject: "institution",
    requiresDocuments: true,
    vulnerablePerson: false,
    fieldsBySection: {
      primary_identity: [field("nama_rumah_ibadah", "Nama Rumah Ibadah"), field("agama", "Agama", { type: "agama" })],
      module_detail: [field("jenis_rumah_ibadah", "Jenis Rumah Ibadah"), field("kapasitas_jamaah", "Kapasitas Jamaah", { inputType: "number" })],
      related_personnel: [field("nama_pengurus", "Nama Pengurus"), field("kontak_pengurus", "Kontak Pengurus", { sensitiveType: "phone" })],
      documents: [document("foto_bangunan", "Foto Bangunan"), document("dokumen_legalitas", "Dokumen Legalitas")],
    },
  }),
  lembaga_keagamaan: definition({
    moduleKey: "lembaga_keagamaan",
    label: "Lembaga Keagamaan",
    subject: "institution",
    requiresDocuments: true,
    vulnerablePerson: false,
    fieldsBySection: {
      primary_identity: [field("nama_lembaga", "Nama Lembaga"), field("agama", "Agama", { type: "agama" })],
      module_detail: [field("jenis_lembaga", "Jenis Lembaga"), field("nomor_izin", "Nomor Izin", { sensitiveType: "document_number" })],
      related_personnel: [field("nama_pimpinan", "Nama Pimpinan"), field("kontak_pimpinan", "Kontak Pimpinan", { sensitiveType: "phone" })],
      documents: [document("akta_pendirian", "Akta Pendirian"), document("surat_keterangan", "Surat Keterangan")],
    },
  }),
  lembaga_pendidikan_keagamaan: definition({
    moduleKey: "lembaga_pendidikan_keagamaan",
    label: "Lembaga Pendidikan Keagamaan",
    subject: "institution",
    requiresDocuments: true,
    vulnerablePerson: false,
    fieldsBySection: {
      primary_identity: [field("nama_lembaga", "Nama Lembaga"), field("agama", "Agama", { type: "agama" })],
      module_detail: [field("jenjang_pendidikan", "Jenjang Pendidikan"), field("jumlah_santri_siswa", "Jumlah Santri/Siswa", { inputType: "number" })],
      related_personnel: [field("nama_kepala", "Nama Kepala/Pimpinan"), field("kontak_lembaga", "Kontak Lembaga", { sensitiveType: "phone" })],
      documents: [document("izin_operasional", "Izin Operasional"), document("profil_lembaga", "Profil Lembaga")],
    },
  }),
  lembaga_kesejahteraan_sosial: definition({
    moduleKey: "lembaga_kesejahteraan_sosial",
    label: "Lembaga Kesejahteraan Sosial",
    subject: "institution",
    requiresDocuments: true,
    vulnerablePerson: true,
    fieldsBySection: {
      primary_identity: [field("nama_lks", "Nama LKS"), field("agama", "Agama", { type: "agama" })],
      module_detail: [field("jenis_layanan", "Jenis Layanan"), field("kelompok_sasaran", "Kelompok Sasaran")],
      related_personnel: [field("nama_penanggung_jawab", "Nama Penanggung Jawab"), field("kontak_penanggung_jawab", "Kontak Penanggung Jawab", { sensitiveType: "phone" })],
      documents: [document("izin_lks", "Izin LKS"), document("daftar_program", "Daftar Program")],
    },
  }),
  guru_agama: definition({
    moduleKey: "guru_agama",
    label: "Guru Agama",
    subject: "teacher",
    requiresDocuments: false,
    vulnerablePerson: false,
    fieldsBySection: {
      primary_identity: [
        field("nama_guru", "Nama Guru"),
        field("nik", "NIK", { sensitiveType: "nik" }),
        field("agama", "Agama", { type: "agama", agamaSubject: "teacher" }),
      ],
      module_detail: [field("jenis_guru", "Jenis Guru"), field("tempat_mengajar", "Tempat Mengajar")],
      related_personnel: [field("nomor_hp", "Nomor HP", { sensitiveType: "phone" })],
      documents: [document("sertifikat_pendidik", "Sertifikat/Surat Tugas", { optional: true })],
    },
  }),
  anak_yatim: definition({
    moduleKey: "anak_yatim",
    label: "Anak Yatim/Piatu",
    subject: "child",
    requiresDocuments: true,
    vulnerablePerson: true,
    privacyLevel: "highly_restricted",
    fieldsBySection: {
      primary_identity: [
        field("nama_anak", "Nama Anak", { sensitiveType: "child_name", classification: "highly_restricted" }),
        field("nik", "NIK", { sensitiveType: "nik", classification: "highly_restricted" }),
        field("kia", "KIA", { sensitiveType: "kia", classification: "highly_restricted" }),
        field("agama", "Agama Anak", { type: "agama", agamaSubject: "child" }),
      ],
      module_detail: [field("status_yatim", "Status Yatim/Piatu"), field("jenjang_sekolah", "Jenjang Sekolah")],
      related_personnel: [
        field("nama_wali", "Nama Wali/Pengasuh", { classification: "highly_restricted" }),
        field("kontak_wali", "Kontak Wali/Pengasuh", { sensitiveType: "phone", classification: "highly_restricted" }),
      ],
      documents: [document("akta_kelahiran", "Akta Kelahiran"), document("surat_kematian_orangtua", "Surat Keterangan Kematian Orang Tua")],
    },
  }),
  disabilitas: definition({
    moduleKey: "disabilitas",
    label: "Penyandang Disabilitas",
    subject: "person",
    requiresDocuments: false,
    vulnerablePerson: true,
    privacyLevel: "highly_restricted",
    fieldsBySection: {
      primary_identity: [
        field("nama_penerima", "Nama Penerima", { classification: "highly_restricted" }),
        field("nik", "NIK", { sensitiveType: "nik", classification: "highly_restricted" }),
        field("agama", "Agama", { type: "agama", agamaSubject: "person" }),
      ],
      module_detail: [
        field("jenis_disabilitas", "Jenis Disabilitas", { classification: "highly_restricted" }),
        field("catatan_disabilitas", "Catatan Disabilitas", { sensitiveType: "disability_note", classification: "highly_restricted" }),
      ],
      related_personnel: [field("nama_pendamping", "Nama Pendamping"), field("kontak_pendamping", "Kontak Pendamping", { sensitiveType: "phone" })],
      documents: [document("surat_keterangan_medis", "Surat Keterangan Medis", { optional: true })],
    },
  }),
  lansia_terlantar: definition({
    moduleKey: "lansia_terlantar",
    label: "Lansia Terlantar",
    subject: "elderly",
    requiresDocuments: true,
    vulnerablePerson: true,
    privacyLevel: "highly_restricted",
    fieldsBySection: {
      primary_identity: [
        field("nama_lansia", "Nama Lansia", { classification: "highly_restricted" }),
        field("nik", "NIK", { sensitiveType: "nik", classification: "highly_restricted" }),
        field("agama", "Agama Lansia", { type: "agama", agamaSubject: "elderly" }),
      ],
      module_detail: [
        field("kondisi_lansia", "Kondisi Lansia"),
        field("catatan_kesehatan", "Catatan Kesehatan", { sensitiveType: "health_note", classification: "highly_restricted" }),
      ],
      related_personnel: [field("nama_pendamping", "Nama Pendamping/Penanggung Jawab"), field("kontak_pendamping", "Kontak Pendamping", { sensitiveType: "phone" })],
      documents: [document("foto_kondisi", "Foto Kondisi"), document("surat_keterangan_domisili", "Surat Keterangan Domisili")],
    },
  }),
});

export function createSikesraModuleFormModel(moduleKey, input = {}) {
  const definition = SIKESRA_MODULE_FORM_DEFINITIONS[moduleKey];
  if (!definition) {
    throw new Error(`Unknown SIKESRA module form: "${moduleKey}"`);
  }

  const permissionSet = new Set(input.grantedPermissions ?? []);
  const canViewReligion = permissionSet.has("sikesra.registry.religion.read");
  const canRevealSensitive = permissionSet.has("sikesra.registry.sensitive.read");

  const wizard = createSikesraFormWizardState({
    mode: input.mode,
    values: input.values,
    activeSectionId: input.activeSectionId,
    hasUnsavedChanges: input.hasUnsavedChanges,
  });

  const region = createSikesraRegionFormGroup({
    officialRegion: input.officialRegion,
    customRegionValue: input.customRegionValue,
    operatorScope: input.operatorScope,
  });

  const idSikesra = createSikesraIdDisplayModel(input.idSikesra ?? null, {
    isArchived: input.isArchived === true,
  });

  const fields = Object.fromEntries(
    Object.entries(definition.fieldsBySection).map(([sectionId, sectionFields]) => [
      sectionId,
      sectionFields.map((item) => hydrateField(item, {
        mode: wizard.mode,
        canViewReligion,
        canRevealSensitive,
        privacyLevel: definition.privacyLevel,
      })),
    ])
  );

  return {
    moduleKey,
    label: definition.label,
    implementationIssue: definition.implementationIssue,
    wizard,
    idSikesra,
    region,
    privacy: {
      vulnerablePerson: definition.vulnerablePerson,
      classification: definition.privacyLevel,
      containsPersonalData: true,
      containsReligionData: hasAgamaField(definition.fieldsBySection),
    },
    requiresDocuments: definition.requiresDocuments,
    fields,
    backendDependencies: collectBackendDependencies(definition),
  };
}

function hydrateField(item, context) {
  if (item.type === "document") {
    return {
      ...item,
      status: item.optional ? "optional" : "required",
      audited: true,
    };
  }

  if (item.type === "agama") {
    const model = createSikesraAgamaSelectModel({
      subject: item.agamaSubject,
      usage: "form",
      required: item.required,
      readOnly: context.mode === "read_only",
      canViewIndividualReligion: context.canViewReligion,
    });

    return {
      ...item,
      optionsSource: model.optionsSource,
      model,
    };
  }

  if (item.sensitiveType) {
    return {
      ...item,
      sensitiveDisplay: createSikesraSensitiveFieldProps({
        fieldType: item.sensitiveType,
        classification: item.classification ?? context.privacyLevel,
        value: item.exampleValue ?? "contoh",
        canReveal: context.canRevealSensitive,
        revealRequested: context.canRevealSensitive,
        context: item.label,
      }),
    };
  }

  return item;
}

function collectBackendDependencies(definition) {
  const dependencies = [];
  if (hasAgamaField(definition.fieldsBySection)) {
    dependencies.push("ahliweb/sikesra#49");
  }
  if (definition.requiresDocuments) {
    dependencies.push("ahliweb/sikesra#28");
  }
  return dependencies;
}

function hasAgamaField(fieldsBySection) {
  return Object.values(fieldsBySection).flat().some((item) => item.type === "agama");
}

function definition(input) {
  return Object.freeze({
    ...input,
    implementationIssue: SIKESRA_MODULE_FORM_ISSUES[input.moduleKey],
    privacyLevel: input.privacyLevel ?? "restricted",
  });
}

function field(key, label, options = {}) {
  return Object.freeze({
    key,
    label,
    required: options.required !== false,
    inputType: options.inputType ?? "text",
    type: options.type ?? "field",
    agamaSubject: options.agamaSubject ?? "person",
    sensitiveType: options.sensitiveType ?? null,
    classification: options.classification ?? null,
    exampleValue: options.exampleValue ?? null,
  });
}

function document(key, label, options = {}) {
  return Object.freeze({
    key,
    label,
    type: "document",
    required: options.optional !== true,
    optional: options.optional === true,
  });
}
