import emdashMod from "./entry.mjs";

const emdashWorker = emdashMod;

const SIKESRA_PUBLIC_HTML = `__SIKESRA_PUBLIC_HTML__`;
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};
const SIKESRA_ADMIN_BLOCKKIT_PATH = "/_emdash/api/plugins/sikesra/admin";

function errorMessage(err, fallback = "unknown") {
  return err instanceof Error ? err.message : fallback;
}

function withNoStoreHeaders(headers = {}) {
  return { ...NO_STORE_HEADERS, ...headers };
}

function routeResponse(body, init = {}, route) {
  const headers = new Headers(init.headers || {});
  headers.set("X-Route", route);
  return new Response(body, { ...init, headers });
}

function cloneResponseWithHeaders(response, route, extraHeaders = {}) {
  const headers = new Headers(response.headers);
  headers.set("X-Route", route);
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function notFoundResponse(route = "sikesra") {
  return routeResponse("Not Found", {
    status: 404,
    headers: withNoStoreHeaders(),
  }, route);
}



function ok(data, requestId, meta) {
  return new Response(JSON.stringify({ ok: true, requestId, data, meta }), {
    headers: withNoStoreHeaders({ "Content-Type": "application/json" }),
  });
}

function fail(requestId, code, message, status = 400) {
  return new Response(JSON.stringify({ ok: false, requestId, error: { code, message } }), {
    status,
    headers: withNoStoreHeaders({ "Content-Type": "application/json" }),
  });
}

function emdashPluginOk(data, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: withNoStoreHeaders({ "Content-Type": "application/json" }),
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

function withInsightsScriptSource(cspValue) {
  const source = "https://static.cloudflareinsights.com";
  if (!cspValue || cspValue.includes(source)) return cspValue;

  let next = cspValue;

  if (/script-src\s/i.test(next)) {
    next = next.replace(/script-src\s+([^;]+)/i, (match, group) => {
      return group.includes(source) ? match : `script-src ${group} ${source}`;
    });
  } else {
    next += `; script-src 'self' 'unsafe-inline' ${source}`;
  }

  if (/script-src-elem\s/i.test(next)) {
    next = next.replace(/script-src-elem\s+([^;]+)/i, (match, group) => {
      return group.includes(source) ? match : `script-src-elem ${group} ${source}`;
    });
  } else {
    next += `; script-src-elem 'self' 'unsafe-inline' ${source}`;
  }

  return next;
}

async function handleSikesra(request, env) {
  const url = new URL(request.url);
  const reqId = crypto.randomUUID();
  const path = url.pathname;

  try {
    if (path === "/sikesra" || path === "/sikesra/" || path.startsWith("/_emdash/api/plugins/sikesra/public/")) {
      const active = await isSikesraPluginActive(env);
      if (!active) {
        return notFoundResponse();
      }
    }

    if (path === "/health") {
      const dbCheck = await env.SIKESRA_DB.prepare("SELECT 1 as ok").first();
      return ok({ service: "SIKESRA", status: "operational", database: dbCheck ? "connected" : "error", timestamp: new Date().toISOString() }, reqId);
    }

    if (path === "/sikesra" || path === "/sikesra/") {
      return new Response(SIKESRA_PUBLIC_HTML, { headers: withNoStoreHeaders({ "Content-Type": "text/html; charset=utf-8" }) });
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
      const total = await env.SIKESRA_DB.prepare("SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE deleted_at IS NULL").first();
      const verified = await env.SIKESRA_DB.prepare("SELECT COUNT(*) as cnt FROM awcms_sikesra_entities WHERE status_verification = 'verified' AND deleted_at IS NULL").first();
      const villages = await env.SIKESRA_DB.prepare("SELECT COUNT(DISTINCT official_village_code) as cnt FROM awcms_sikesra_entities WHERE deleted_at IS NULL").first();
      const latest = await env.SIKESRA_DB.prepare("SELECT MAX(updated_at) as t FROM awcms_sikesra_entities WHERE deleted_at IS NULL").first();
      const byType = await env.SIKESRA_DB.prepare(
        "SELECT ot.code, ot.name, COUNT(e.id) as total, SUM(CASE WHEN e.status_verification='verified' THEN 1 ELSE 0 END) as verified FROM awcms_sikesra_object_types ot LEFT JOIN awcms_sikesra_entities e ON e.object_type_code=ot.code AND e.deleted_at IS NULL WHERE ot.deleted_at IS NULL AND ot.is_active=1 GROUP BY ot.code, ot.name ORDER BY ot.sort_order"
      ).all();
      const byVerifStatus = await env.SIKESRA_DB.prepare(
        "SELECT status_verification as status, COUNT(*) as cnt FROM awcms_sikesra_entities WHERE deleted_at IS NULL GROUP BY status_verification"
      ).all();
      const totalCnt = total?.cnt ?? 0;
      const verifiedCnt = verified?.cnt ?? 0;
      const settings = await env.SIKESRA_DB.prepare("SELECT small_cell_threshold FROM awcms_sikesra_settings WHERE deleted_at IS NULL LIMIT 1").first();
      const threshold = settings?.small_cell_threshold ?? 5;
      const safeByType = byType.results.map(r => ({
        code: r.code, name: r.name,
        total: r.total >= threshold ? r.total : 0,
        verified: r.verified >= threshold ? r.verified : 0,
        suppressed: r.total < threshold,
      }));
      const suppressedCells = safeByType.filter(r => r.suppressed).length;
      return ok({
        kpis: { totalEntities: totalCnt, verifiedEntities: verifiedCnt, activeVillages: villages?.cnt ?? 0, latestUpdateAt: latest?.t ?? new Date().toISOString() },
        charts: {
          byObjectType: safeByType,
          byVerificationStatus: byVerifStatus.results,
          byRegion: [], bySafeAttribute: [],
        },
        suppression: { threshold, suppressedCells },
        caveat: "Data pada halaman ini merupakan rekapitulasi agregat yang telah diverifikasi. Data pribadi tidak ditampilkan.",
      }, reqId);
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

    if (path === "/posts" || path === "/posts/") {
      const posts = await env.DB.prepare("SELECT id, title, slug, excerpt, status, published_at FROM ec_posts WHERE deleted_at IS NULL ORDER BY published_at DESC").all();
      const publishedPosts = posts.results.filter(p => p.status === "published");
      const html = renderPostsIndex(publishedPosts);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path === "/pages" || path === "/pages/") {
      const pages = await env.DB.prepare("SELECT id, title, slug, status, published_at FROM ec_pages WHERE deleted_at IS NULL ORDER BY published_at DESC").all();
      const publishedPages = pages.results.filter(p => p.status === "published");
      const html = renderPagesIndex(publishedPages);
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path.startsWith("/posts/")) {
      const slug = path.slice(7);
      if (slug) {
        const post = await env.DB.prepare("SELECT id, title, slug, content, status, published_at FROM ec_posts WHERE slug = ? AND deleted_at IS NULL LIMIT 1").bind(slug).first();
        if (post && post.status === "published") {
          return new Response(renderPostPage(post), { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      }
      return new Response(render404(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (path.startsWith("/pages/")) {
      const slug = path.slice(7);
      if (slug) {
        const page = await env.DB.prepare("SELECT id, title, slug, content, status, published_at FROM ec_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1").bind(slug).first();
        if (page && page.status === "published") {
          return new Response(renderPage(page), { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
      }
      return new Response(render404(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    // Pass through to EmDash for non-SIKESRA routes (including /404 and public blog pages)
    if (!path.startsWith("/sikesra") && !path.startsWith("/_emdash")) {
      return emdashWorker.default(request, env, ctx);
    }

    return fail(reqId, "NOT_FOUND", "Route not found", 404);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail(reqId, "INTERNAL_ERROR", message, 500);
  }
}

function render404() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>404 Not Found</title></head><body><h1>404 - Page Not Found</h1><p><a href="/">Go Home</a></p></body></html>`;
}

function renderPostsIndex(posts) {
  const items = posts.map(p => `<li><a href="/posts/${p.slug}"><h2>${escapeHtml(p.title)}</h2></a>${p.published_at ? `<time>${new Date(p.published_at).toDateString()}</time>` : ""}</li>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>All Posts - SIKESRA KOBAR</title></head><body><header><nav><a href="/">SIKESRA KOBAR</a></nav></header><main><h1>All Posts</h1>${posts.length ? `<ul>${items}</ul>` : "<p>No posts available.</p>"}</main><footer><p>© ${new Date().getFullYear()} SIKESRA KOBAR</p></footer></body></html>`;
}

function renderPagesIndex(pages) {
  const items = pages.map(p => `<li><a href="/pages/${p.slug}"><h2>${escapeHtml(p.title)}</h2></a>${p.published_at ? `<time>${new Date(p.published_at).toDateString()}</time>` : ""}</li>`).join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>All Pages - SIKESRA KOBAR</title></head><body><header><nav><a href="/">SIKESRA KOBAR</a></nav></header><main><h1>All Pages</h1>${pages.length ? `<ul>${items}</ul>` : "<p>No pages available.</p>"}</main><footer><p>© ${new Date().getFullYear()} SIKESRA KOBAR</p></footer></body></html>`;
}

function renderPostPage(post) {
  const content = post.content ? renderContent(post.content) : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(post.title)}</title></head><body><header><nav><a href="/">SIKESRA KOBAR</a></nav></header><main><article><h1>${escapeHtml(post.title)}</h1>${post.published_at ? `<time>${new Date(post.published_at).toDateString()}</time>` : ""}<div>${content}</div></article></main><footer><p>© ${new Date().getFullYear()} SIKESRA KOBAR</p></footer></body></html>`;
}

function renderPage(page) {
  const content = page.content ? renderContent(page.content) : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${escapeHtml(page.title)}</title></head><body><header><nav><a href="/">SIKESRA KOBAR</a></nav></header><main><article><h1>${escapeHtml(page.title)}</h1>${page.published_at ? `<time>${new Date(page.published_at).toDateString()}</time>` : ""}<div>${content}</div></article></main><footer><p>© ${new Date().getFullYear()} SIKESRA KOBAR</p></footer></body></html>`;
}

function renderContent(contentJson) {
  try {
    const content = typeof contentJson === "string" ? JSON.parse(contentJson) : contentJson;
    if (content && Array.isArray(content.children)) {
      return content.children.map(node => renderContentNode(node)).join("");
    }
    return "";
  } catch {
    return String(contentJson || "");
  }
}

function renderContentNode(node) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return escapeHtml(node.text || "");
  if (node.type === "paragraph") return `<p>${(node.children || []).map(renderContentNode).join("")}</p>`;
  if (node.type === "heading") return `<h${node.level || 2}>${(node.children || []).map(renderContentNode).join("")}</h${node.level || 2}>`;
  if (node.type === "list") return `<ul>${(node.children || []).map(renderContentNode).join("")}</ul>`;
  if (node.type === "list-item") return `<li>${(node.children || []).map(renderContentNode).join("")}</li>`;
  if (node.type === "link") return `<a href="${escapeHtml(node.url || "")}">${(node.children || []).map(renderContentNode).join("")}</a>`;
  if (node.type === "image") return `<img src="${escapeHtml(node.url || "")}" alt="${escapeHtml(node.alt || "")}">`;
  if (node.type === "blockquote") return `<blockquote>${(node.children || []).map(renderContentNode).join("")}</blockquote>`;
  if (node.type === "code") return `<pre><code>${escapeHtml(node.code || "")}</code></pre>`;
  return (node.children || []).map(renderContentNode).join("");
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function countWhere(db, table, extra = "") {
  const row = await db.prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE tenant_id = ? AND site_id = ? AND deleted_at IS NULL ${extra}`)
    .bind("default", "default")
    .first();
  return row?.cnt ?? 0;
}

function blockPage(title, description, blocks = []) {
  return {
    blocks: [
      { type: "banner", variant: "default", title, description },
      ...blocks,
    ],
  };
}

function emptyTable(columns, title, description) {
  return {
    type: "table",
    columns,
    rows: [{ [columns[0].key]: title, [columns[1]?.key ?? columns[0].key]: description }],
  };
}

function navActions(active) {
  const pages = [
    ["entities", "Data Utama"],
    ["verification", "Verifikasi"],
    ["imports", "Import Excel"],
    ["documents", "Dokumen"],
    ["reports", "Laporan"],
    ["regions", "Wilayah"],
    ["access", "Atribut & Akses"],
    ["audit", "Audit"],
    ["settings", "Pengaturan"],
  ];

  return {
    type: "actions",
    elements: pages
      .filter(([page]) => page !== active)
      .slice(0, 6)
      .map(([page, label], index) => ({
        type: "button",
        label,
        style: index === 0 ? "primary" : "secondary",
        action_id: `nav_${page}`,
      })),
  };
}

function workflowPanel(title, description, steps, endpoint, backPage) {
  return blockPage(title, description, [
    { type: "header", text: "Alur Kerja" },
    { type: "fields", fields: steps.map((step, index) => ({ label: `Langkah ${index + 1}`, value: step })) },
    { type: "header", text: "Endpoint Terkait" },
    { type: "section", text: endpoint },
    { type: "section", text: "Aksi final tetap divalidasi server-side: autentikasi, izin, ABAC, region scope, masking, alasan wajib, dan audit sesuai konfigurasi." },
    { type: "actions", elements: [
      { type: "button", label: "Kembali", style: "primary", action_id: `nav_${backPage}` },
      { type: "button", label: "Dashboard", style: "secondary", action_id: "nav_overview" },
    ] },
  ]);
}

async function handleSikesraAdminBlockKit(request, env) {
  const input = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const actionId = input?.action_id;
  const page = actionId?.startsWith("nav_")
    ? actionId.replace("nav_", "")
    : String(input?.page || "overview").replace(/^\//, "") || "overview";
  const db = env.SIKESRA_DB;

  if (!db) {
    return emdashPluginOk(blockPage("SIKESRA", "Database SIKESRA tidak tersedia."));
  }

  if (actionId && !actionId.startsWith("nav_")) {
    switch (actionId) {
      case "entity_create":
        return emdashPluginOk(workflowPanel(
          "Tambah Entitas",
          "Wizard input mengikuti dokumen SIKESRA: jenis data, wilayah, identitas utama, atribut inti, detail modul, dokumen, validasi, ID, dan review.",
          ["Pilih jenis dan subjenis data.", "Isi wilayah resmi dan wilayah lokal operasional.", "Lengkapi identitas utama dan atribut inti.", "Tambahkan detail modul dan dokumen pendukung.", "Jalankan validasi, cek duplikasi, generate ID, lalu submit."],
          "POST /_emdash/api/plugins/sikesra/v1/entities/create",
          "entities",
        ));
      case "verify_approve":
      case "verify_revise":
      case "verify_reject":
        return emdashPluginOk(workflowPanel(
          actionId === "verify_approve" ? "Verifikasi Data" : actionId === "verify_revise" ? "Minta Perbaikan" : "Tolak Data",
          "Keputusan verifikasi memerlukan resource terpilih, status yang valid, dan alasan untuk revisi atau penolakan.",
          ["Pilih entitas dari antrean verifikasi.", "Periksa ringkasan, checklist, dokumen, dan duplikasi.", "Isi catatan atau alasan bila diperlukan.", "Konfirmasi aksi dan tulis audit event."],
          "POST /_emdash/api/plugins/sikesra/v1/entities/{id}/verify",
          "verification",
        ));
      case "import_upload":
        return emdashPluginOk(workflowPanel(
          "Upload Workbook Import",
          "Import Excel wajib melewati staging sebelum promosi data final.",
          ["Upload workbook .xlsx sesuai template.", "Pilih sheet dan mapping kolom.", "Validasi mapping dan preview staging.", "Koreksi baris invalid dan review duplikasi.", "Promosikan hanya baris valid terpilih."],
          "POST /_emdash/api/plugins/sikesra/v1/imports/create",
          "imports",
        ));
      case "doc_upload":
        return emdashPluginOk(workflowPanel(
          "Unggah Dokumen",
          "Dokumen pendukung disimpan via backend/R2 dan tidak pernah menampilkan raw storage key.",
          ["Pilih entitas dan tipe dokumen.", "Tetapkan klasifikasi: internal, restricted, atau highly restricted.", "Minta upload URL backend.", "Upload file dan konfirmasi checksum.", "Tunggu verifikasi dokumen."],
          "POST /_emdash/api/plugins/sikesra/v1/documents/upload-url",
          "documents",
        ));
      case "export_create":
        return emdashPluginOk(workflowPanel(
          "Buat Ekspor",
          "Ekspor restricted memerlukan izin khusus, alasan, masking, dan audit.",
          ["Pilih jenis laporan dan format.", "Terapkan filter wilayah/status yang diizinkan.", "Isi alasan untuk ekspor restricted.", "Buat job ekspor.", "Ambil hasil hanya melalui URL/proxy backend."],
          "POST /_emdash/api/plugins/sikesra/v1/exports/create",
          "reports",
        ));
      case "region_create":
        return emdashPluginOk(workflowPanel(
          "Tambah Wilayah Lokal",
          "Wilayah lokal mendukung operasional lapangan dan tidak mengubah struktur ID SIKESRA 20 digit.",
          ["Pilih parent wilayah resmi.", "Tentukan tipe lokal: dusun, lingkungan, RW, RT, blok, zona, atau area petugas.", "Isi nama dan metadata operasional.", "Simpan dan audit perubahan."],
          "POST /_emdash/api/plugins/sikesra/v1/regions/local/create",
          "regions",
        ));
      case "settings_update":
        return emdashPluginOk(workflowPanel(
          "Ubah Pengaturan",
          "Pengaturan publik, threshold, upload, ekspor, dan highly restricted harus ditulis lewat endpoint settings dengan izin yang sesuai.",
          ["Review nilai aktif.", "Ubah hanya konfigurasi yang diperlukan.", "Validasi threshold dan limit.", "Simpan perubahan dan tulis audit event."],
          "PATCH /_emdash/api/plugins/sikesra/v1/settings/update",
          "settings",
        ));
      default:
        return emdashPluginOk(blockPage("Aksi SIKESRA", `Aksi ${actionId} belum memiliki workflow UI khusus.`, [navActions("overview")]));
    }
  }

  if (page === "entities") {
    const total = await countWhere(db, "awcms_sikesra_entities");
    const rows = await db.prepare(
      `SELECT e.display_name, e.object_type_code, ot.name as type_name, e.status_data, e.status_verification, e.completeness_percent
       FROM awcms_sikesra_entities e
       LEFT JOIN awcms_sikesra_object_types ot ON ot.code = e.object_type_code
       WHERE e.tenant_id = 'default' AND e.site_id = 'default' AND e.deleted_at IS NULL
       ORDER BY e.updated_at DESC LIMIT 20`
    ).all();
    const columns = [
      { key: "name", label: "Nama" },
      { key: "type", label: "Tipe" },
      { key: "data", label: "Data" },
      { key: "verification", label: "Verifikasi" },
      { key: "complete", label: "%" },
    ];
    return emdashPluginOk(blockPage("Data Utama", `${total} entitas terdaftar`, [
      rows.results.length ? { type: "table", columns, rows: rows.results.map((r) => ({
        name: String(r.display_name),
        type: String(r.type_name ?? r.object_type_code),
        data: String(r.status_data),
        verification: String(r.status_verification),
        complete: `${r.completeness_percent ?? 0}%`,
      })) } : emptyTable(columns, "Belum ada data", "Data entitas akan tampil setelah diinput."),
      { type: "actions", elements: [{ type: "button", label: "Tambah Entitas", style: "primary", action_id: "entity_create" }] },
      navActions("entities"),
    ]));
  }

  if (page === "verification") {
    const village = await countWhere(db, "awcms_sikesra_entities", "AND status_verification = 'submitted_village'");
    const subdistrict = await countWhere(db, "awcms_sikesra_entities", "AND status_verification = 'submitted_subdistrict'");
    const regency = await countWhere(db, "awcms_sikesra_entities", "AND status_verification = 'submitted_regency'");
    const queue = await db.prepare(
      `SELECT e.display_name, ot.name as type_name, e.status_verification, e.completeness_percent, e.updated_at
       FROM awcms_sikesra_entities e
       LEFT JOIN awcms_sikesra_object_types ot ON ot.code = e.object_type_code
       WHERE e.tenant_id = 'default' AND e.site_id = 'default' AND e.deleted_at IS NULL
         AND e.status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency')
       ORDER BY e.updated_at ASC LIMIT 15`
    ).all();
    const columns = [
      { key: "name", label: "Nama" },
      { key: "type", label: "Tipe" },
      { key: "level", label: "Tingkat" },
      { key: "complete", label: "Kelengkapan" },
      { key: "date", label: "Submit" },
    ];
    return emdashPluginOk(blockPage("Verifikasi", "Antrean dan proses verifikasi berjenjang", [
      { type: "stats", items: [
        { label: "Desa", value: String(village), description: "submitted_village" },
        { label: "Kecamatan", value: String(subdistrict), description: "submitted_subdistrict" },
        { label: "Kabupaten", value: String(regency), description: "submitted_regency" },
      ] },
      queue.results.length ? { type: "table", columns, rows: queue.results.map((r) => ({
        name: String(r.display_name),
        type: String(r.type_name ?? "-"),
        level: String(r.status_verification).replace("submitted_", ""),
        complete: `${r.completeness_percent ?? 0}%`,
        date: String(r.updated_at ?? "").slice(0, 10),
      })) } : emptyTable(columns, "Antrean kosong", "Tidak ada data menunggu verifikasi."),
      { type: "actions", elements: [
        { type: "button", label: "Verifikasi", style: "primary", action_id: "verify_approve" },
        { type: "button", label: "Perlu Perbaikan", style: "secondary", action_id: "verify_revise" },
        { type: "button", label: "Tolak", style: "destructive", action_id: "verify_reject" },
      ] },
      navActions("verification"),
    ]));
  }

  if (page === "imports") {
    const total = await countWhere(db, "awcms_sikesra_import_batches");
    const rows = await db.prepare(
      `SELECT original_filename, status, row_count, valid_row_count, invalid_row_count, promoted_row_count, created_at
       FROM awcms_sikesra_import_batches
       WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 10`
    ).all();
    const columns = [
      { key: "file", label: "File" },
      { key: "status", label: "Status" },
      { key: "rows", label: "Baris" },
      { key: "valid", label: "Valid" },
      { key: "invalid", label: "Invalid" },
      { key: "promoted", label: "Promoted" },
      { key: "date", label: "Tanggal" },
    ];
    return emdashPluginOk(blockPage("Import Excel", `${total} batch import`, [
      rows.results.length ? { type: "table", columns, rows: rows.results.map((r) => ({
        file: String(r.original_filename),
        status: String(r.status),
        rows: String(r.row_count ?? 0),
        valid: String(r.valid_row_count ?? 0),
        invalid: String(r.invalid_row_count ?? 0),
        promoted: String(r.promoted_row_count ?? 0),
        date: String(r.created_at ?? "").slice(0, 10),
      })) } : emptyTable(columns, "Belum ada import", "Upload workbook Excel untuk memulai."),
      { type: "section", text: "Alur import: upload, mapping, validasi, staging, koreksi, duplikat, promosi, laporan." },
      { type: "actions", elements: [{ type: "button", label: "Upload Workbook", style: "primary", action_id: "import_upload" }] },
      navActions("imports"),
    ]));
  }

  if (page === "documents") {
    const total = await countWhere(db, "awcms_sikesra_file_objects");
    const verified = await countWhere(db, "awcms_sikesra_file_objects", "AND is_verified = 1");
    return emdashPluginOk(blockPage("Dokumen", "Manajemen dokumen pendukung entitas", [
      { type: "stats", items: [
        { label: "Total Dokumen", value: String(total) },
        { label: "Terverifikasi", value: String(verified) },
        { label: "Menunggu", value: String(total - verified) },
      ] },
      { type: "section", text: "Format didukung: PDF, JPG, PNG. Dokumen restricted tidak menampilkan R2 key atau URL privat." },
      { type: "actions", elements: [{ type: "button", label: "Unggah Dokumen", style: "primary", action_id: "doc_upload" }] },
      navActions("documents"),
    ]));
  }

  if (page === "reports") {
    const total = await countWhere(db, "awcms_sikesra_export_jobs");
    const rows = await db.prepare(
      `SELECT report_type, format, status, total_rows, created_at
       FROM awcms_sikesra_export_jobs
       WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL
       ORDER BY created_at DESC LIMIT 10`
    ).all();
    const columns = [
      { key: "type", label: "Jenis" },
      { key: "format", label: "Format" },
      { key: "status", label: "Status" },
      { key: "rows", label: "Baris" },
      { key: "date", label: "Tanggal" },
    ];
    return emdashPluginOk(blockPage("Laporan", "Laporan dan ekspor data", [
      { type: "fields", fields: [
        { label: "Ringkasan Entitas", value: "Agregat per jenis, subjenis, dan wilayah" },
        { label: "Status Verifikasi", value: "Daftar status verifikasi tanpa nilai sangat terbatas" },
        { label: "Bukti Audit", value: "Log audit dengan nilai sensitif tersamarkan" },
      ] },
      { type: "header", text: `Job Ekspor (${total})` },
      rows.results.length ? { type: "table", columns, rows: rows.results.map((r) => ({
        type: String(r.report_type),
        format: String(r.format).toUpperCase(),
        status: String(r.status),
        rows: String(r.total_rows ?? 0),
        date: String(r.created_at ?? "").slice(0, 10),
      })) } : emptyTable(columns, "Belum ada ekspor", "Buat ekspor pertama."),
      { type: "actions", elements: [{ type: "button", label: "Buat Ekspor", style: "primary", action_id: "export_create" }] },
      navActions("reports"),
    ]));
  }

  if (page === "regions") {
    const official = await countWhere(db, "awcms_sikesra_official_regions");
    const local = await countWhere(db, "awcms_sikesra_local_regions");
    const levels = await db.prepare(
      `SELECT level, COUNT(*) as cnt FROM awcms_sikesra_official_regions
       WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL
       GROUP BY level ORDER BY level`
    ).all();
    return emdashPluginOk(blockPage("Wilayah", "Manajemen wilayah resmi dan lokal", [
      { type: "stats", items: [
        { label: "Wilayah Resmi", value: String(official) },
        { label: "Wilayah Lokal", value: String(local) },
      ] },
      { type: "fields", fields: levels.results.map((r) => ({ label: String(r.level), value: String(r.cnt) })) },
      { type: "section", text: "Wilayah lokal bersifat operasional dan tidak mempengaruhi SIKESRA ID 20 digit." },
      { type: "actions", elements: [{ type: "button", label: "Tambah Wilayah Lokal", style: "primary", action_id: "region_create" }] },
      navActions("regions"),
    ]));
  }

  if (page === "access") {
    const policies = await countWhere(db, "awcms_sikesra_abac_policies");
    const active = await countWhere(db, "awcms_sikesra_abac_policies", "AND is_active = 1");
    const attributes = await countWhere(db, "awcms_sikesra_attribute_definitions");
    const categories = await db.prepare(
      `SELECT category, COUNT(*) as cnt FROM awcms_sikesra_attribute_definitions
       WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL
       GROUP BY category ORDER BY cnt DESC`
    ).all();
    return emdashPluginOk(blockPage("Atribut & Akses", "Definisi atribut dan kebijakan ABAC", [
      { type: "stats", items: [
        { label: "Total Kebijakan", value: String(policies) },
        { label: "Kebijakan Aktif", value: String(active) },
        { label: "Definisi Atribut", value: String(attributes) },
      ] },
      { type: "fields", fields: categories.results.map((r) => ({ label: String(r.category), value: String(r.cnt) })) },
      { type: "section", text: "Kebijakan ABAC dievaluasi server-side. Deny selalu menang atas allow." },
      navActions("access"),
    ]));
  }

  if (page === "audit") {
    const total = await db.prepare("SELECT COUNT(*) as cnt FROM awcms_sikesra_audit_logs WHERE tenant_id = 'default' AND site_id = 'default'").first();
    const rows = await db.prepare(
      `SELECT action, resource_type, resource_id, actor_id, actor_role, success, created_at
       FROM awcms_sikesra_audit_logs
       WHERE tenant_id = 'default' AND site_id = 'default'
       ORDER BY created_at DESC LIMIT 20`
    ).all();
    const columns = [
      { key: "time", label: "Waktu" },
      { key: "action", label: "Aksi" },
      { key: "resource", label: "Resource" },
      { key: "actor", label: "Aktor" },
      { key: "role", label: "Role" },
      { key: "ok", label: "OK" },
    ];
    return emdashPluginOk(blockPage("Audit", "Log audit aksi kritikal", [
      { type: "header", text: `Log Audit (${total?.cnt ?? 0})` },
      rows.results.length ? { type: "table", columns, rows: rows.results.map((r) => ({
        time: String(r.created_at ?? "").slice(0, 16).replace("T", " "),
        action: String(r.action),
        resource: `${String(r.resource_type)}/${String(r.resource_id).slice(0, 15)}`,
        actor: String(r.actor_id),
        role: String(r.actor_role),
        ok: r.success ? "OK" : "Failed",
      })) } : emptyTable(columns, "Belum ada log", "Audit events akan muncul setelah ada aksi kritikal."),
      { type: "section", text: "Nilai before/after yang sensitif harus disamarkan sebelum ditampilkan." },
      navActions("audit"),
    ]));
  }

  if (page === "settings") {
    const settings = await db.prepare(
      `SELECT public_enabled, public_title, small_cell_threshold, max_upload_bytes, export_max_sync_rows, require_reason_for_highly_restricted_download
       FROM awcms_sikesra_settings WHERE tenant_id = 'default' AND site_id = 'default' AND deleted_at IS NULL LIMIT 1`
    ).first();
    const maxUploadMb = Math.round(Number(settings?.max_upload_bytes ?? 10485760) / 1048576);
    return emdashPluginOk(blockPage("Pengaturan", "Konfigurasi plugin SIKESRA", [
      { type: "fields", fields: [
        { label: "Halaman Publik", value: Number(settings?.public_enabled) === 1 ? "Aktif" : "Nonaktif" },
        { label: "Judul Publik", value: String(settings?.public_title ?? "SIKESRA") },
        { label: "Small-Cell Threshold", value: String(settings?.small_cell_threshold ?? 5) },
        { label: "Maks. Upload", value: `${maxUploadMb} MB` },
        { label: "Maks. Baris Ekspor", value: String(settings?.export_max_sync_rows ?? 5000) },
        { label: "Alasan Highly Restricted", value: Number(settings?.require_reason_for_highly_restricted_download) === 1 ? "Wajib" : "Tidak wajib" },
      ] },
      { type: "actions", elements: [{ type: "button", label: "Ubah Pengaturan", style: "primary", action_id: "settings_update" }] },
      navActions("settings"),
    ]));
  }

  const [total, draft, submitted, verified, pending] = await Promise.all([
    countWhere(db, "awcms_sikesra_entities"),
    countWhere(db, "awcms_sikesra_entities", "AND status_data = 'draft'"),
    countWhere(db, "awcms_sikesra_entities", "AND status_data = 'submitted'"),
    countWhere(db, "awcms_sikesra_entities", "AND status_verification = 'verified'"),
    countWhere(db, "awcms_sikesra_entities", "AND status_verification IN ('submitted_village','submitted_subdistrict','submitted_regency')"),
  ]);
  const byType = await db.prepare(
    `SELECT ot.name, COUNT(e.id) as cnt
     FROM awcms_sikesra_object_types ot
     LEFT JOIN awcms_sikesra_entities e ON e.object_type_code = ot.code AND e.deleted_at IS NULL AND e.tenant_id = 'default' AND e.site_id = 'default'
     WHERE ot.deleted_at IS NULL AND ot.is_active = 1
     GROUP BY ot.code, ot.name ORDER BY ot.sort_order`
  ).all();

  return emdashPluginOk(blockPage("SIKESRA", "Dashboard operasional Sistem Informasi Kesejahteraan Rakyat", [
    { type: "stats", items: [
      { label: "Total Entitas", value: String(total) },
      { label: "Draft", value: String(draft) },
      { label: "Submitted", value: String(submitted) },
      { label: "Terverifikasi", value: String(verified) },
      { label: "Menunggu Verifikasi", value: String(pending) },
    ] },
    { type: "fields", fields: byType.results.map((r) => ({ label: String(r.name), value: String(r.cnt) })) },
    { type: "actions", elements: [
      { type: "button", label: "Data Utama", style: "primary", action_id: "nav_entities" },
      { type: "button", label: "Verifikasi", style: "secondary", action_id: "nav_verification" },
      { type: "button", label: "Import Excel", style: "secondary", action_id: "nav_imports" },
      { type: "button", label: "Dokumen", style: "secondary", action_id: "nav_documents" },
      { type: "button", label: "Pengaturan", style: "secondary", action_id: "nav_settings" },
    ] },
    navActions("overview"),
  ]));
}

export default {
  async fetch(request, env, ctx) {
    // Clear any stale cache for root path on first request
    ctx.waitUntil(clearRootCache(request));

    const url = new URL(request.url);
    const path = url.pathname;

  const isSikesraAdminBlockKit = path === SIKESRA_ADMIN_BLOCKKIT_PATH;

    if (isSikesraAdminBlockKit) {
      try {
        const authResp = await emdashWorker.fetch(request.clone(), env, ctx);
        if (!authResp.ok) return authResp;
        const active = await isSikesraPluginActive(env);
        if (!active) return notFoundResponse("sikesra-admin");
        const resp = await handleSikesraAdminBlockKit(request, env);
        return cloneResponseWithHeaders(resp, "sikesra-admin", NO_STORE_HEADERS);
      } catch (e) {
        return routeResponse(`SIKESRA admin error: ${errorMessage(e)}`, { status: 500, headers: withNoStoreHeaders() }, "sikesra-admin");
      }
    }

    // Send to EmDash: everything except SIKESRA-specific paths and content pages
    // SIKESRA handles: /health, /sikesra, /_emdash/api/plugins/sikesra/*, /posts/*, /pages/*
    const isSikesraPath = path.startsWith("/_emdash/api/plugins/sikesra/") ||
       path === "/sikesra" || path === "/sikesra/" || path === "/health" ||
       path === "/posts" || path === "/posts/" || path.startsWith("/posts/") ||
       path === "/pages" || path === "/pages/" || path.startsWith("/pages/");
    const goToEmDash = !isSikesraPath;

    if (goToEmDash) {
      try {
        const resp = await emdashWorker.fetch(request, env, ctx);
        const headers = new Headers(resp.headers);
        const csp = headers.get("content-security-policy");
        if (csp) {
          headers.set("content-security-policy", withInsightsScriptSource(csp));
        }
        for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
          headers.set(key, value);
        }
        return cloneResponseWithHeaders(resp, path === "/" ? "emdash-root" : "emdash", Object.fromEntries(headers.entries()));
      } catch (e) {
        return routeResponse(`EmDash error: ${errorMessage(e)}`, { status: 500, headers: withNoStoreHeaders() }, path === "/" ? "emdash-root" : "emdash");
      }
    }

    try {
      const resp = await handleSikesra(request, env);
      return cloneResponseWithHeaders(resp, "sikesra");
    } catch (e) {
      return routeResponse(`Handler error: ${errorMessage(e)}`, { status: 500, headers: withNoStoreHeaders() }, "sikesra");
    }
  },
};
