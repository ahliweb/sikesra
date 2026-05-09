// SIKESRA Cloudflare Worker
// D1-backed API endpoints for public and admin routes
// Source: docs/sikesra/04_api_contracts.md

import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

interface Env {
  SIKESRA_DB: D1Database;
  SIKESRA_DOCUMENTS: R2Bucket;
}

function ok<T>(data: T, requestId: string, meta?: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, requestId, data, meta }), {
    headers: { "Content-Type": "application/json" },
  });
}

function fail(requestId: string, code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, requestId, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SIKESRA_PUBLIC_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SIKESRA — Sistem Informasi Kesejahteraan Rakyat</title>
<style>
:root{--bg:#f8fafc;--card:#fff;--text:#1e293b;--muted:#64748b;--accent:#0369a1;--border:#e2e8f0}
@media(prefers-color-scheme:dark){:root{--bg:#0f172a;--card:#1e293b;--text:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--border:#334155}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.container{max-width:1000px;margin:0 auto;padding:1rem}
header{background:var(--card);border-bottom:1px solid var(--border);padding:1.5rem 1rem;text-align:center}
header h1{font-size:1.5rem;color:var(--accent)}header p{color:var(--muted);font-size:.9rem;margin-top:.25rem}
.notice{background:#fef3c7;color:#92400e;padding:.75rem 1rem;border-radius:6px;margin:1rem 0;font-size:.85rem;text-align:center}
@media(prefers-color-scheme:dark){.notice{background:#422006;color:#fde68a}}
.kpigrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem;margin:1.5rem 0}
.kpi{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:1.25rem;text-align:center}
.kpi .value{font-size:2rem;font-weight:700;color:var(--accent)}.kpi .label{font-size:.8rem;color:var(--muted);margin-top:.25rem}
h2{font-size:1.1rem;margin:1.5rem 0 .75rem}
.chart{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:1rem}
.bar{display:flex;align-items:center;margin:.5rem 0;gap:.5rem}
.bar .barlabel{width:150px;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bar .bartrack{flex:1;height:20px;background:var(--border);border-radius:4px;overflow:hidden}
.bar .barfill{height:100%;background:var(--accent);border-radius:4px;min-width:4px}
.bar .barval{width:50px;font-size:.8rem;text-align:right;color:var(--muted)}
.caveat{margin-top:2rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:8px;font-size:.8rem;color:var(--muted)}
footer{text-align:center;padding:1.5rem;font-size:.75rem;color:var(--muted);border-top:1px solid var(--border);margin-top:2rem}
</style>
</head>
<body>
<header><h1>SIKESRA</h1><p id="meta-desc">Sistem Informasi Kesejahteraan Rakyat</p><small id="meta-update"></small></header>
<div class="container">
<div class="notice">Halaman ini menampilkan data agregat yang telah diverifikasi. Data pribadi, alamat detail, dan informasi sensitif tidak ditampilkan.</div>
<div class="kpigrid"><div class="kpi"><div class="value" id="kpi-total">—</div><div class="label">Total Data</div></div><div class="kpi"><div class="value" id="kpi-verified">—</div><div class="label">Terverifikasi</div></div><div class="kpi"><div class="value" id="kpi-villages">—</div><div class="label">Desa Aktif</div></div><div class="kpi"><div class="value" id="kpi-update">—</div><div class="label">Pembaruan</div></div></div>
<h2>Kategori Data</h2><div class="chart" id="chart-types">Memuat…</div>
<div class="caveat"><h3>Catatan</h3><p id="caveat-text"></p><p id="caveat-scope" style="margin-top:.5rem"></p></div>
</div>
<footer><p id="footer-contact"></p><p>Didukung oleh AWCMS-Micro &amp; EmDash</p></footer>
<script>
var A="/_emdash/api/plugins/sikesra";
async function f(u){var r=await fetch(u);var j=await r.json();if(!j.ok)throw new Error(j.error?.message||"Gagal");return j.data}
function n(v){return v?.toLocaleString("id-ID")||"—"}
function d(t){if(!t)return"—";var diff=Date.now()-new Date(t).getTime();var days=Math.floor(diff/864e5);return days===0?"Hari ini":days===1?"Kemarin":days+" hari lalu"}
(async function(){try{var m=await f(A+"/public/metadata");var s=await f(A+"/public/summary");var fl=await f(A+"/public/filters");ge("meta-desc").textContent=m.description||m.title;ge("meta-update").textContent=m.latestUpdateAt?"Diperbarui "+d(m.latestUpdateAt):"";ge("footer-contact").textContent=m.officialContact?"Kontak: "+m.officialContact:"";ge("kpi-total").textContent=n(s.kpis.totalEntities);ge("kpi-verified").textContent=n(s.kpis.verifiedEntities);ge("kpi-villages").textContent=n(s.kpis.activeVillages);ge("kpi-update").textContent=d(s.kpis.latestUpdateAt);ge("caveat-text").textContent=s.caveat||"";ge("caveat-scope").textContent=m.dataScopeNote||"";var c=ge("chart-types");if(fl.objectTypes&&fl.objectTypes.length){c.innerHTML=fl.objectTypes.map(function(t){return'<div class="bar"><span class="barlabel">'+t.name+'</span><div class="bartrack"><div class="barfill" style="width:100%"></div></div><span class="barval">—</span></div>'}).join("")}else{c.innerHTML="Belum ada data kategori"}}catch(e){ge("kpi-grid").innerHTML='Gagal memuat data. Coba lagi nanti.';console.error(e)}})();
function ge(id){return document.getElementById(id)}
</script>
</body></html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const reqId = crypto.randomUUID();
    const path = url.pathname;

    try {
      // Health check
      if (path === "/" || path === "/health") {
        const dbCheck = await env.SIKESRA_DB.prepare("SELECT 1 as ok").first();
        return ok({ service: "SIKESRA", status: "operational", database: dbCheck ? "connected" : "error", timestamp: new Date().toISOString() }, reqId);
      }

      // Public /sikesra page
      if (path === "/sikesra" || path === "/sikesra/") {
        return new Response(SIKESRA_PUBLIC_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      // Public metadata
      if (path === "/_emdash/api/plugins/sikesra/public/metadata") {
        const row = await env.SIKESRA_DB.prepare(
          "SELECT public_enabled, public_title, public_description, data_scope_note, official_contact, updated_at FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1"
        ).first<Record<string, unknown>>();
        const data = row ? {
          enabled: !!row.public_enabled, title: row.public_title, description: row.public_description,
          dataScopeNote: row.data_scope_note ?? "", officialContact: row.official_contact, latestUpdateAt: row.updated_at,
        } : { enabled: false, title: "SIKESRA", description: "Data agregat kesejahteraan rakyat", dataScopeNote: "" };
        return ok(data, reqId);
      }

      // Public filters
      if (path === "/_emdash/api/plugins/sikesra/public/filters") {
        const types = await env.SIKESRA_DB.prepare("SELECT code, name FROM awcms_sikesra_object_types WHERE is_active = 1 AND deleted_at IS NULL ORDER BY sort_order").all<{ code: string; name: string }>();
        return ok({ districts: [], villages: [], objectTypes: types.results, years: [], statuses: [{ code: "active", label: "Aktif" }, { code: "verified", label: "Terverifikasi" }] }, reqId);
      }

      // Public summary
      if (path === "/_emdash/api/plugins/sikesra/public/summary") {
        const total = await env.SIKESRA_DB.prepare("SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE status_data = 'active' AND status_verification = 'verified' AND deleted_at IS NULL").first<{ cnt: number }>();
        const villages = await env.SIKESRA_DB.prepare("SELECT COUNT(DISTINCT official_village_code) as cnt FROM awcms_sikesra_entities WHERE deleted_at IS NULL").first<{ cnt: number }>();
        return ok({
          kpis: { totalEntities: total?.cnt ?? 0, verifiedEntities: total?.cnt ?? 0, activeVillages: villages?.cnt ?? 0, latestUpdateAt: new Date().toISOString() },
          charts: { byObjectType: [], byRegion: [], byVerificationStatus: [], bySafeAttribute: [] },
          suppression: { threshold: 5, suppressedCells: 0 },
          caveat: "Data pada halaman ini merupakan rekapitulasi agregat yang telah diverifikasi. Data pribadi tidak ditampilkan.",
        }, reqId);
      }

      // Entity list
      if (path === "/_emdash/api/plugins/sikesra/v1/entities") {
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const perPage = Math.min(parseInt(url.searchParams.get("per_page") ?? "50", 10), 100);
        const offset = (page - 1) * perPage;
        const keyword = url.searchParams.get("keyword");
        const typeCode = url.searchParams.get("object_type");
        let where = "WHERE deleted_at IS NULL";
        const params: unknown[] = [];
        if (keyword) { where += " AND (display_name LIKE ? OR sikesra_id_20 LIKE ?)"; params.push(`%${keyword}%`, `%${keyword}%`); }
        if (typeCode) { where += " AND object_type_code = ?"; params.push(typeCode); }
        const total = (await env.SIKESRA_DB.prepare(`SELECT COUNT(*) as cnt FROM awcms_sikesra_entities ${where}`).bind(...params).first<{ cnt: number }>())?.cnt ?? 0;
        const rows = await env.SIKESRA_DB.prepare(`SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, verification_level, sensitivity_level, completeness_percent, duplicate_status, source_input, created_at, updated_at FROM awcms_sikesra_entities ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, perPage, offset).all<Record<string, unknown>>();
        return ok({ items: rows.results.map((r) => ({
          id: r.id, sikesraId20: r.sikesra_id_20, objectTypeCode: r.object_type_code, objectTypeName: "", objectSubtypeCode: r.object_subtype_code, objectSubtypeName: "",
          entityKind: r.entity_kind, displayName: r.display_name, masked: false, officialRegion: {}, statusData: r.status_data,
          statusVerification: r.status_verification, verificationLevel: r.verification_level, sensitivityLevel: r.sensitivity_level,
          completenessPercent: r.completeness_percent, duplicateStatus: r.duplicate_status, sourceInput: r.source_input,
          createdAt: r.created_at, updatedAt: r.updated_at,
        })), meta: { page, perPage, total, hasMore: offset + perPage < total } }, reqId);
      }

      // Object types
      if (path === "/_emdash/api/plugins/sikesra/v1/object-types") {
        const rows = await env.SIKESRA_DB.prepare("SELECT code, name, entity_kind, description FROM awcms_sikesra_object_types WHERE deleted_at IS NULL ORDER BY sort_order").all();
        return ok(rows.results, reqId);
      }

      // Entity create
      if (path === "/_emdash/api/plugins/sikesra/v1/entities/create" && request.method === "POST") {
        const body: Record<string, unknown> = await request.json();
        const id = `ent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const typeCode = String(body.objectTypeCode ?? "01");
        const kindMap: Record<string, string> = { "01": "building", "02": "institution", "03": "institution", "04": "institution", "05": "person", "06": "person", "07": "person", "08": "person" };
        await env.SIKESRA_DB.prepare(
          "INSERT INTO awcms_sikesra_entities (id, tenant_id, site_id, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, sensitivity_level, source_input, source_institution, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, "default", "default", typeCode, body.objectSubtypeCode ?? "01", kindMap[typeCode] ?? "institution", body.displayName ?? "Untitled", body.officialVillageCode ?? "0000000000", body.sensitivityLevel ?? "internal", body.sourceInput ?? "manual", body.sourceInstitution ?? null, "api-user").run();
        const row = await env.SIKESRA_DB.prepare("SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_data, status_verification, sensitivity_level, completeness_percent, source_input, created_at FROM awcms_sikesra_entities WHERE id = ?").bind(id).first<Record<string, unknown>>();
        return ok(row, reqId);
      }

      // Entity detail and submit
      if (path.startsWith("/_emdash/api/plugins/sikesra/v1/entities/") && !path.includes("/create")) {
        const parts = path.split("/");
        const entIdx = parts.indexOf("entities");
        const entityId = parts[entIdx + 1];
        const action = parts[entIdx + 2];

        if (!entityId) return fail(reqId, "NOT_FOUND", "Entity ID not found", 404);

        // Submit endpoint
        if (action === "submit" && request.method === "POST") {
          const existing = await env.SIKESRA_DB.prepare("SELECT status_data FROM awcms_sikesra_entities WHERE id = ? AND deleted_at IS NULL").bind(entityId).first<{ status_data: string }>();
          if (!existing) return fail(reqId, "NOT_FOUND", "Entity not found", 404);
          if (existing.status_data !== "draft") return fail(reqId, "INVALID_STATE", "Only draft entities can be submitted");
          await env.SIKESRA_DB.prepare("UPDATE awcms_sikesra_entities SET status_data = 'submitted', status_verification = 'submitted_village', verification_level = 'desa', updated_at = datetime('now') WHERE id = ?").bind(entityId).run();
          const evtId = `vevt_${Date.now()}`;
          await env.SIKESRA_DB.prepare("INSERT INTO awcms_sikesra_verification_events (id, tenant_id, site_id, entity_id, actor_id, actor_role, verification_level, action, previous_status, next_status, request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(evtId, "default", "default", entityId, "api-user", "admin", "desa", "submit", "draft", "submitted_village", reqId).run();
          return ok({ entityId, newStatus: "submitted", verificationStatus: "submitted_village", eventId: evtId }, reqId);
        }

        // Detail endpoint
        const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_entities WHERE id = ? AND deleted_at IS NULL").bind(entityId).first<Record<string, unknown>>();
        if (!row) return fail(reqId, "NOT_FOUND", "Entity not found", 404);
        return ok({
          entity: {
            id: row.id, sikesraId20: row.sikesra_id_20, objectTypeCode: row.object_type_code, objectTypeName: "", objectSubtypeCode: row.object_subtype_code, objectSubtypeName: "",
            entityKind: row.entity_kind, displayName: row.display_name, masked: false, officialRegion: {}, localRegion: null,
            statusData: row.status_data, statusVerification: row.status_verification, verificationLevel: row.verification_level,
            sensitivityLevel: row.sensitivity_level, completenessPercent: row.completeness_percent, duplicateStatus: row.duplicate_status,
            sourceInput: row.source_input, createdAt: row.created_at, updatedAt: row.updated_at,
          },
          summary: {}, attributes: [], documents: [], verification: [], benefits: [], audit: [],
          access: { canEdit: true, canSubmit: true, canVerify: false, canGenerateCode: false, canRevealSensitive: false, canDownloadDocuments: false, deniedActions: [] },
        }, reqId);
      }

      // Verification queue
      if (path === "/_emdash/api/plugins/sikesra/v1/verification/queue") {
        const level = url.searchParams.get("level") ?? "desa";
        const rows = await env.SIKESRA_DB.prepare(
          "SELECT id, sikesra_id_20, object_type_code, object_subtype_code, entity_kind, display_name, official_village_code, status_verification, verification_level, completeness_percent, duplicate_status, created_at FROM awcms_sikesra_entities WHERE status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency') AND verification_level = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 50"
        ).bind(level).all<Record<string, unknown>>();
        return ok(rows.results.map((r) => ({
          entityId: r.id, displayName: r.display_name, objectTypeCode: r.object_type_code, objectSubtypeCode: r.object_subtype_code,
          officialVillageCode: r.official_village_code, verificationLevel: r.verification_level, currentStatus: r.status_verification,
          submittedAt: r.created_at, completenessPercent: r.completeness_percent, duplicateStatus: r.duplicate_status,
        })), reqId);
      }

      // Settings
      if (path === "/_emdash/api/plugins/sikesra/v1/settings") {
        const row = await env.SIKESRA_DB.prepare("SELECT * FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1").first<Record<string, unknown>>();
        return ok(row ?? { publicEnabled: false, publicTitle: "SIKESRA", smallCellThreshold: 5, maxUploadBytes: 10485760, exportMaxSyncRows: 5000, requireReasonForHighlyRestrictedDownload: true }, reqId);
      }

      return fail(reqId, "NOT_FOUND", "Route not found", 404);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return fail(reqId, "INTERNAL_ERROR", message, 500);
    }
  },
};
