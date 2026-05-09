-- SIKESRA Seed 0001: Object Types and Subtypes
-- Eight MVP data modules with initial subtypes
-- D1-compatible; use INSERT OR IGNORE for repeatability
-- Replace 'default' tenant_id/site_id with app-configured values

INSERT OR IGNORE INTO awcms_sikesra_object_types (code, tenant_id, site_id, name, entity_kind, sort_order)
VALUES
  ('01', 'default', 'default', 'Rumah Ibadah', 'building', 1),
  ('02', 'default', 'default', 'Lembaga Keagamaan', 'institution', 2),
  ('03', 'default', 'default', 'Pendidikan Keagamaan', 'institution', 3),
  ('04', 'default', 'default', 'Lembaga Kesejahteraan Sosial', 'institution', 4),
  ('05', 'default', 'default', 'Guru Agama', 'person', 5),
  ('06', 'default', 'default', 'Anak Yatim', 'person', 6),
  ('07', 'default', 'default', 'Disabilitas', 'person', 7),
  ('08', 'default', 'default', 'Lansia Terlantar', 'person', 8);

-- Type 01: Rumah Ibadah
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0101', 'default', 'default', '01', '01', 'Masjid', 1),
  ('0102', 'default', 'default', '01', '02', 'Musholla', 2),
  ('0103', 'default', 'default', '01', '03', 'Surau', 3),
  ('0104', 'default', 'default', '01', '04', 'Gereja', 4),
  ('0105', 'default', 'default', '01', '05', 'Pura', 5),
  ('0106', 'default', 'default', '01', '06', 'Wihara', 6),
  ('0107', 'default', 'default', '01', '07', 'Klenteng', 7),
  ('0199', 'default', 'default', '01', '99', 'Lainnya', 99);

-- Type 02: Lembaga Keagamaan
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0201', 'default', 'default', '02', '01', 'Islam', 1),
  ('0202', 'default', 'default', '02', '02', 'Kristen', 2),
  ('0203', 'default', 'default', '02', '03', 'Katolik', 3),
  ('0204', 'default', 'default', '02', '04', 'Hindu', 4),
  ('0205', 'default', 'default', '02', '05', 'Buddha', 5),
  ('0206', 'default', 'default', '02', '06', 'Konghucu', 6),
  ('0299', 'default', 'default', '02', '99', 'Lainnya', 99);

-- Type 03: Pendidikan Keagamaan
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0301', 'default', 'default', '03', '01', 'TPA/TPQ', 1),
  ('0302', 'default', 'default', '03', '02', 'Pondok Pesantren', 2),
  ('0399', 'default', 'default', '03', '99', 'Lainnya', 99);

-- Type 04: Lembaga Kesejahteraan Sosial
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0401', 'default', 'default', '04', '01', 'BAZNAS', 1),
  ('0402', 'default', 'default', '04', '02', 'PWRI', 2),
  ('0403', 'default', 'default', '04', '03', 'Panti Asuhan', 3),
  ('0404', 'default', 'default', '04', '04', 'Panti Yatim', 4),
  ('0405', 'default', 'default', '04', '05', 'Panti Jompo', 5),
  ('0406', 'default', 'default', '04', '06', 'Rukun Kematian', 6),
  ('0407', 'default', 'default', '04', '07', 'Majelis Taklim', 7),
  ('0499', 'default', 'default', '04', '99', 'LKS Lainnya', 99);

-- Type 05: Guru Agama
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0501', 'default', 'default', '05', '01', 'Rumahan', 1),
  ('0502', 'default', 'default', '05', '02', 'Lembaga', 2),
  ('0599', 'default', 'default', '05', '99', 'Lainnya', 99);

-- Type 06: Anak Yatim
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0601', 'default', 'default', '06', '01', 'Yatim', 1),
  ('0602', 'default', 'default', '06', '02', 'Piatu', 2),
  ('0603', 'default', 'default', '06', '03', 'Yatim Piatu', 3);

-- Type 07: Disabilitas
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0701', 'default', 'default', '07', '01', 'Fisik', 1),
  ('0702', 'default', 'default', '07', '02', 'Intelektual', 2),
  ('0703', 'default', 'default', '07', '03', 'Mental', 3),
  ('0704', 'default', 'default', '07', '04', 'Sensorik', 4);

-- Type 08: Lansia Terlantar
INSERT OR IGNORE INTO awcms_sikesra_object_subtypes (id, tenant_id, site_id, type_code, code, name, sort_order)
VALUES
  ('0801', 'default', 'default', '08', '01', 'Terlantar', 1),
  ('0802', 'default', 'default', '08', '02', 'Rawan Terlantar', 2),
  ('0803', 'default', 'default', '08', '03', 'Mandiri dengan Risiko', 3);
