import emdashMod from "./entry.mjs";

const emdashWorker = emdashMod;

const SIKESRA_PUBLIC_HTML = `__SIKESRA_PUBLIC_HTML__`;

function ok(data, requestId, meta) {
  return new Response(JSON.stringify({ ok: true, requestId, data, meta }), {
    headers: { "Content-Type": "application/json" },
  });
}

function fail(requestId, code, message, status = 400) {
  return new Response(JSON.stringify({ ok: false, requestId, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let cacheCleared = false;
let pluginStateCache = { active: true, expiresAt: 0 };

async function isSikesraPluginActive(env) {
  const now = Date.now();
  if (pluginStateCache.expiresAt > now) return pluginStateCache.active;
  try {
    const row = await env.DB.prepare("SELECT status FROM _plugin_state WHERE plugin_id = ? LIMIT 1").bind("sikesra").first();
    const active = !row || row.status === "active";
    pluginStateCache = { active, expiresAt: now + 15000 };
    return active;
  } catch {
    pluginStateCache = { active: true, expiresAt: now + 5000 };
    return true;
  }
}

async function clearRootCache(request) {
  if (cacheCleared) return;
  cacheCleared = true;
  try {
    const cache = await caches.open("default");
    const url = new URL(request.url);
    await cache.delete(url.origin + "/", { ignoreMethod: true });
  } catch (e) {
    // ignore
  }
}

async function handleSikesra(request, env) {
  const url = new URL(request.url);
  const reqId = crypto.randomUUID();
  const path = url.pathname;

  try {
    if (path === "/sikesra" || path === "/sikesra/" || path.startsWith("/_emdash/api/plugins/sikesra/")) {
      const active = await isSikesraPluginActive(env);
      if (!active) {
        return new Response("Not Found", {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "CDN-Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        });
      }
    }

    if (path === "/health") {
      const dbCheck = await env.SIKESRA_DB.prepare("SELECT 1 as ok").first();
      return ok({ service: "SIKESRA", status: "operational", database: dbCheck ? "connected" : "error", timestamp: new Date().toISOString() }, reqId);
    }

    if (path === "/sikesra" || path === "/sikesra/") {
      return new Response(SIKESRA_PUBLIC_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path === "/_emdash/api/plugins/sikesra/public/metadata") {
      const row = await env.SIKESRA_DB.prepare("SELECT public_enabled, public_title, public_description, data_scope_note, official_contact, updated_at FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1").first();
      const data = row ? { enabled: !!row.public_enabled, title: row.public_title, description: row.public_description, dataScopeNote: row.data_scope_note ?? "", officialContact: row.official_contact, latestUpdateAt: row.updated_at } : { enabled: false, title: "SIKESRA", description: "Data agregat kesejahteraan rakyat", dataScopeNote: "" };
      return ok(data, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/public/filters") {
      const types = await env.SIKESRA_DB.prepare("SELECT code, name FROM awcms_sikesra_object_types WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order").all();
      return ok({ districts: [], villages: [], objectTypes: types.results, years: [], statuses: [{ code: "active", label: "Aktif" }, { code: "verified", label: "Terverifikasi" }] }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/public/summary") {
      const total = await env.SIKESRA_DB.prepare("SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE status_data = 'active' AND status_verification = 'verified' AND deleted_at IS NULL").first();
      const villages = await env.SIKESRA_DB.prepare("SELECT COUNT(DISTINCT official_village_code) as cnt FROM awcms_sikesra_entities WHERE deleted_at IS NULL").first();
      return ok({ kpis: { totalEntities: total?.cnt ?? 0, verifiedEntities: total?.cnt ?? 0, activeVillages: villages?.cnt ?? 0, latestUpdateAt: new Date().toISOString() }, charts: { byObjectType: [], byRegion: [], byVerificationStatus: [], bySafeAttribute: [] }, suppression: { threshold: 5, suppressedCells: 0 }, caveat: "Data pada halaman ini merupakan rekapitulasi agregat yang telah diverifikasi. Data pribadi tidak ditampilkan." }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/admin" && request.method === "POST") {
      return ok({ blocks: [] }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/entities" && request.method === "GET") {
      const page = parseInt(url.searchParams.get("page") ?? "1", 10);
      const perPage = Math.min(parseInt(url.searchParams.get("per_page") ?? "50", 10), 100);
      const offset = (page - 1) * perPage;
      const keyword = url.searchParams.get("keyword");
      const typeCode = url.searchParams.get("object_type");
      let where = "WHERE deleted_at IS NULL";
      const params = [];
      if (keyword) { where += " AND (display_name LIKE ? OR sikesra_id_20 LIKE ?)"; params.push(`%${keyword}%`, `%${keyword}%`); }
      if (typeCode) { where += " AND object_type_code = ?"; params.push(typeCode); }
      const total = (await env.SIKESRA_DB.prepare(`SELECT COUNT(*) as cnt FROM awcms_sikesra_entities ${where}`).bind(...params).first())?.cnt ?? 0;
      const rows = await env.SIKESRA_DB.prepare(`SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, verification_level, sensitivity_level, completeness_percent, duplicate_status, source_input, created_at, updated_at FROM awcms_sikesra_entities ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, perPage, offset).all();
      return ok({ items: rows.results.map((r) => ({ id: r.id, sikesraId20: r.sikesra_id_20, objectTypeCode: r.object_type_code, objectTypeName: "", objectSubtypeCode: r.object_subtype_code, objectSubtypeName: "", entityKind: r.entity_kind, displayName: r.display_name, masked: false, officialRegion: {}, statusData: r.status_data, statusVerification: r.status_verification, verificationLevel: r.verification_level, sensitivityLevel: r.sensitivity_level, completenessPercent: r.completeness_percent, duplicateStatus: r.duplicate_status, sourceInput: r.source_input, createdAt: r.created_at, updatedAt: r.updated_at })), meta: { page, perPage, total, hasMore: offset + perPage < total } }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/object-types") {
      const rows = await env.SIKESRA_DB.prepare("SELECT code, name, entity_kind, description FROM awcms_sikesra_object_types WHERE deleted_at IS NULL ORDER BY sort_order").all();
      return ok(rows.results, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/entities/create" && request.method === "POST") {
      const body = await request.json();
      const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const typeCode = String(body.objectTypeCode ?? "01");
      const kindMap = { "01": "building", "02": "institution", "03": "institution", "04": "institution", "05": "person", "06": "person", "07": "person", "08": "person" };
      await env.SIKESRA_DB.prepare("INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, source_input, source_institution, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, "default", "default", typeCode, body.objectSubtypeCode ?? "01", kindMap[typeCode] ?? "institution", body.displayName ?? "Untitled", body.officialVillageCode ?? "0000000000", body.sensitivityLevel ?? "internal", body.sourceInput ?? "manual", body.sourceInstitution ?? null, "api-user").run();
      const row = await env.SIKESRA_DB.prepare("SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, sensitivity_level, completeness_percent, source_input, created_at FROM awcms_sikesra_entities WHERE id = ?").bind(id).first();
      return ok(row, reqId);
    }

    if (path.startsWith("/_emdash/api/plugins/sikesra/v1/entities/") && !path.includes("/create")) {
      const parts = path.split("/");
      const entIdx = parts.indexOf("entities");
      const entityId = parts[entIdx + 1];
      const action = parts[entIdx + 2];
      if (!entityId) return fail(reqId, "NOT_FOUND", "Entity ID not found", 404);

      if ((!action || action === "patch") && request.method === "PATCH") {
        const body = await request.json();
        const sets = []; const params = [];
        const fieldMap = { displayName: "display_name", localRegionId: "local_region_id", addressText: "address_text", latitude: "latitude", longitude: "longitude", sensitivityLevel: "sensitivity_level" };
        for (const [key, col] of Object.entries(fieldMap)) { if (body[key] !== undefined) { sets.push(`${col} = ?`); params.push(body[key]); } }
        if (sets.length) { sets.push("updated_at = datetime('now')"); params.push(entityId); await env.SIKESRA_DB.prepare(`UPDATE awcms_sikesra_entities SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`).bind(...params).run(); }
        const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_entities WHERE id = ? AND deleted_at IS NULL").bind(entityId).first();
        if (!row) return fail(reqId, "NOT_FOUND", "Entity not found", 404);
        return ok(row, reqId);
      }

      if (action === "submit" && request.method === "POST") {
        const existing = await env.SIKESRA_DB.prepare("SELECT status_data FROM awcms_sikesra_entities WHERE id = ? AND deleted_at IS NULL").bind(entityId).first();
        if (!existing) return fail(reqId, "NOT_FOUND", "Entity not found", 404);
        if (existing.status_data !== "draft") return fail(reqId, "INVALID_STATE", "Only draft entities can be submitted");
        await env.SIKESRA_DB.prepare("UPDATE awcms_sikesra_entities SET status_data = 'submitted', status_verification = 'submitted_village', verification_level = 'desa', updated_at = datetime('now') WHERE id = ?").bind(entityId).run();
        const evtId = `vevt_${Date.now()}`;
        await env.SIKESRA_DB.prepare("INSERT INTO awcms_sikesra_verification_events (id, tenant_id, site_id, entity_id, actor_id, actor_role, verification_level, action, previous_status, next_status, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(evtId, "default", "default", entityId, "api-user", "admin", "desa", "submit", "draft", "submitted_village", reqId).run();
        return ok({ entityId, newStatus: "submitted", verificationStatus: "submitted_village", eventId: evtId }, reqId);
      }

      const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_entities WHERE id = ? AND deleted_at IS NULL").bind(entityId).first();
      if (!row) return fail(reqId, "NOT_FOUND", "Entity not found", 404);
      return ok({ entity: { id: row.id, sikesraId20: row.sikesra_id_20, objectTypeCode: row.object_type_code, objectTypeName: "", objectSubtypeCode: row.object_subtype_code, objectSubtypeName: "", entityKind: row.entity_kind, displayName: row.display_name, masked: false, officialRegion: {}, localRegion: null, statusData: row.status_data, statusVerification: row.status_verification, verificationLevel: row.verification_level, sensitivityLevel: row.sensitivity_level, completenessPercent: row.completeness_percent, duplicateStatus: row.duplicate_status, sourceInput: row.source_input, createdAt: row.created_at, updatedAt: row.updated_at }, summary: {}, attributes: [], documents: [], verification: [], benefits: [], audit: [], access: { canEdit: true, canSubmit: true, canVerify: false, canGenerateCode: false, canRevealSensitive: false, canDownloadDocuments: false, deniedActions: [] } }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/verification/queue") {
      const level = url.searchParams.get("level") ?? "desa";
      const rows = await env.SIKESRA_DB.prepare("SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_verification, verification_level, completeness_percent, duplicate_status, created_at FROM awcms_sikesra_entities WHERE status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency') AND verification_level = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 50").bind(level).all();
      return ok(rows.results.map((r) => ({ entityId: r.id, displayName: r.display_name, objectTypeCode: r.object_type_code, objectSubtypeCode: r.object_subtype_code, officialVillageCode: r.official_village_code, verificationLevel: r.verification_level, currentStatus: r.status_verification, submittedAt: r.created_at, completenessPercent: r.completeness_percent, duplicateStatus: r.duplicate_status })), reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/settings" && request.method === "GET") {
      const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1").first();
      return ok(row ?? { publicEnabled: false, publicTitle: "SIKESRA", smallCellThreshold: 5, maxUploadBytes: 10485760, exportMaxSyncRows: 5000, requireReasonForHighlyRestrictedDownload: true }, reqId);
    }

    if (path === "/_emdash/api/plugins/sikesra/v1/settings/update" && request.method === "PATCH") {
      const body = await request.json();
      let existing = await env.SIKESRA_DB.prepare("SELECT id FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1").first();
      if (!existing) { const id = crypto.randomUUID(); await env.SIKESRA_DB.prepare("INSERT INTO awcms_sikesra_settings (id, tenant_id, site_id) VALUES (?, 'default', 'default')").bind(id).run(); existing = { id }; }
      const sets = []; const params = [];
      const fm = { publicEnabled: "public_enabled", publicTitle: "public_title", publicDescription: "public_description", dataScopeNote: "data_scope_note", officialContact: "official_contact", smallCellThreshold: "small_cell_threshold", maxUploadBytes: "max_upload_bytes", exportMaxSyncRows: "export_max_sync_rows", requireReasonForHighlyRestrictedDownload: "require_reason_for_highly_restricted_download" };
      for (const [key, col] of Object.entries(fm)) { if (body[key] !== undefined) { sets.push(`${col} = ?`); params.push(typeof body[key] === "boolean" ? (body[key] ? 1 : 0) : body[key]); } }
      if (body.allowedMimeTypes !== undefined) { sets.push("allowed_mime_types_json = ?"); params.push(JSON.stringify(body.allowedMimeTypes)); }
      if (body.featureFlags !== undefined) { sets.push("feature_flags_json = ?"); params.push(JSON.stringify(body.featureFlags)); }
      if (sets.length) { sets.push("updated_at = datetime('now')"); params.push(existing.id); await env.SIKESRA_DB.prepare(`UPDATE awcms_sikesra_settings SET ${sets.join(", ")} WHERE id = ?`).bind(...params).run(); }
      const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_settings WHERE id = ?").bind(existing.id).first();
      return ok(row, reqId);
    }

    return fail(reqId, "NOT_FOUND", "Route not found", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail(reqId, "INTERNAL_ERROR", message, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    // Clear any stale cache for root path on first request
    ctx.waitUntil(clearRootCache(request));

    const url = new URL(request.url);
    const path = url.pathname;

    const isSIKESRA = path.startsWith("/_emdash/api/plugins/sikesra");
    if (!isSIKESRA && (path.startsWith("/_emdash") || path.startsWith("/_astro") || path === "/")) {
      try {
        const resp = await emdashWorker.fetch(request, env, ctx);
        resp.headers.set("X-Route", path === "/" ? "emdash-root" : "emdash");
        resp.headers.set("CDN-Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        resp.headers.set("Pragma", "no-cache");
        resp.headers.set("Expires", "0");
        return resp;
      } catch (e) {
        return new Response("EmDash error: " + (e && e.message || "unknown"), { status: 500 });
      }
    }

    try {
      const resp = await handleSikesra(request, env);
      resp.headers.set("X-Route", "sikesra");
      return resp;
    } catch (e) {
      return new Response("Handler error: " + (e && e.message || "unknown"), { status: 500 });
    }
  },
};
