import { readdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const DIST_SERVER_DIR = resolve(root, "dist/server");
const DIST_CLIENT_ASTRO_DIR = resolve(root, "dist/client/_astro");
const WRAPPER_PLACEHOLDER = "__SIKESRA_PUBLIC_HTML__";

function readRequired(path, label) {
  if (!existsSync(path)) {
    throw new Error(`[postbuild] missing ${label}: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function escapeTemplateLiteral(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

// 1. Patch generated wrangler.json to use our wrapper as main entry + strip Images binding.
const wranglerPath = resolve(DIST_SERVER_DIR, "wrangler.json");
const cfg = JSON.parse(readRequired(wranglerPath, "generated wrangler config"));
cfg.main = "worker-wrapper.mjs";
delete cfg.images;
if (cfg.previews) delete cfg.previews.images;
writeFileSync(wranglerPath, JSON.stringify(cfg));

// 2. Strip cloudflare:workers import from entry.mjs (required for hybrid worker compatibility)
const entryPath = resolve(DIST_SERVER_DIR, "entry.mjs");
if (existsSync(entryPath)) {
  let entrySource = readFileSync(entryPath, "utf8");
  if (entrySource.includes('import "cloudflare:workers"')) {
    entrySource = entrySource.replace(/import "cloudflare:workers";\n?/g, "");
    writeFileSync(entryPath, entrySource);
    console.log("[postbuild] stripped cloudflare:workers import from entry.mjs");
  }
}

// 3. Load the SIKESRA public HTML from the template file
let publicHtml = "";
const htmlPath = resolve(__dirname, "sikesra-public-html.txt");
try { publicHtml = readFileSync(htmlPath, "utf8"); } catch {}

// 4. Load the wrapper template and inject the HTML
let wrapper = readRequired(resolve(__dirname, "worker-wrapper-template.mjs"), "worker wrapper template");
if (!wrapper.includes(WRAPPER_PLACEHOLDER)) {
  throw new Error(`[postbuild] wrapper template is missing placeholder ${WRAPPER_PLACEHOLDER}`);
}
wrapper = wrapper.replace(WRAPPER_PLACEHOLDER, escapeTemplateLiteral(publicHtml));
writeFileSync(resolve(DIST_SERVER_DIR, "worker-wrapper.mjs"), wrapper);

// 5. Patch generated EmDash admin sidebar ordering for this self-contained host.
// EmDash currently groups all plugin admin pages under a generic Plugins group
// after the Admin group. SIKESRA is the primary app surface in this deployment,
// so keep the runtime plugin APIs intact while moving that generated group near
// the top and labelling it explicitly.
function patchAdminSidebar() {
  const astroDir = DIST_CLIENT_ASTRO_DIR;
  if (!existsSync(astroDir)) return false;

  for (const file of readdirSync(astroDir)) {
    if (!file.endsWith(".js")) continue;
    const path = resolve(astroDir, file);
    let source = readFileSync(path, "utf8");
    const hasPluginSidebar = source.includes("visiblePlugins.length > 0") || source.includes("v.length>0&&c.jsxs(c.Fragment");
    const hasPluginLabel = source.includes('message: "Plugins"') || source.includes('message:"Plugins"');
    if (!hasPluginSidebar || !hasPluginLabel) continue;

    const original = source;
    source = patchSidebarSpacing(source);
    const pluginGroup = 'visiblePlugins.length > 0 && (0, import_jsx_runtime83.jsxs)(import_jsx_runtime83.Fragment, { children: [(0, import_jsx_runtime83.jsx)(Je5.Separator, {}), (0, import_jsx_runtime83.jsxs)(Je5.Group, {\n          collapsible: true,\n          defaultOpen: true,\n          children: [(0, import_jsx_runtime83.jsx)(Je5.GroupLabel, {\n            className: "[&>span]:text-start [&_svg]:rtl:-scale-x-100 [&_svg]:rtl:-scale-y-100",\n            children: _t6({\n              id: "ohUJJM",\n              message: "Plugins"\n            })\n          }), (0, import_jsx_runtime83.jsx)(Je5.GroupContent, { children: (0, import_jsx_runtime83.jsx)(Je5.Menu, { children: renderNavItems(visiblePlugins) }) })]\n        })] })';
    const topPluginGroup = 'visiblePlugins.length > 0 && (0, import_jsx_runtime83.jsxs)(Je5.Group, {\n          collapsible: true,\n          defaultOpen: true,\n          children: [(0, import_jsx_runtime83.jsx)(Je5.GroupLabel, {\n            className: "[&>span]:text-start [&_svg]:rtl:-scale-x-100 [&_svg]:rtl:-scale-y-100",\n            children: _t6({\n              id: "ohUJJM",\n              message: "SIKESRA"\n            })\n          }), (0, import_jsx_runtime83.jsx)(Je5.GroupContent, { children: (0, import_jsx_runtime83.jsx)(Je5.Menu, { children: renderNavItems(visiblePlugins) }) })]\n        })';
    const dashboardGroup = '(0, import_jsx_runtime83.jsx)(Je5.Group, { children: (0, import_jsx_runtime83.jsx)(Je5.Menu, { children: (0, import_jsx_runtime83.jsx)(NavMenuLink, {\n          item: {\n            to: "/",\n            label: _t6({\n              id: "7p5kLi",\n              message: "Dashboard"\n            }),\n            icon: n193\n          },\n          isActive: isItemActive("/", currentPath)\n        }) }) }),\n        (0, import_jsx_runtime83.jsx)(Je5.Separator, {})';

    if (source.includes(pluginGroup) && source.includes(dashboardGroup)) {
      source = source.replace(`,\n        ${pluginGroup}`, "");
      source = source.replace(dashboardGroup, `${dashboardGroup},\n        ${topPluginGroup}`);
    }

    const minifiedPluginGroup = 'v.length>0&&c.jsxs(c.Fragment,{children:[c.jsx(vn.Separator,{}),c.jsxs(vn.Group,{collapsible:!0,defaultOpen:!0,children:[c.jsx(vn.GroupLabel,{className:"[&>span]:text-start [&_svg]:rtl:-scale-x-100 [&_svg]:rtl:-scale-y-100",children:t({id:"ohUJJM",message:"Plugins"})}),c.jsx(vn.GroupContent,{children:c.jsx(vn.Menu,{children:x(v)})})]})]})';
    const minifiedTopPluginGroup = 'v.length>0&&c.jsxs(vn.Group,{collapsible:!0,defaultOpen:!0,children:[c.jsx(vn.GroupLabel,{className:"[&>span]:text-start [&_svg]:rtl:-scale-x-100 [&_svg]:rtl:-scale-y-100",children:t({id:"ohUJJM",message:"SIKESRA"})}),c.jsx(vn.GroupContent,{children:c.jsx(vn.Menu,{children:x(v)})})]})';
    const minifiedDashboardSeparator = 'c.jsx(vn.Group,{children:c.jsx(vn.Menu,{children:c.jsx(_F,{item:{to:"/",label:t({id:"7p5kLi",message:"Dashboard"}),icon:vp},isActive:TF("/",n)})})}),c.jsx(vn.Separator,{})';

    if (source.includes(minifiedPluginGroup) && source.includes(minifiedDashboardSeparator)) {
      source = source.replace(`,${minifiedPluginGroup}`, "");
      source = source.replace(minifiedDashboardSeparator, `${minifiedDashboardSeparator},${minifiedTopPluginGroup}`);
    }

    if (source !== original) {
      const hash = createHash("sha256").update(source).digest("hex").slice(0, 8);
      const nextFile = file.replace(/\.js$/, `.sikesra-${hash}.js`);
      const nextPath = resolve(astroDir, nextFile);

      writeFileSync(path, source);
      renameSync(path, nextPath);
      patchDistReferences(file, nextFile);
      return true;
    }
  }

  return false;
}

function patchDistReferences(fromFile, toFile) {
  const roots = [resolve(root, "dist/server"), resolve(root, "dist/client")];

  for (const base of roots) {
    if (!existsSync(base)) continue;
    for (const file of walkFiles(base)) {
      if (!/\.(mjs|js|json|html|css)$/.test(file)) continue;
      const source = readFileSync(file, "utf8");
      if (!source.includes(fromFile)) continue;
      writeFileSync(file, source.split(fromFile).join(toFile));
    }
  }
}

function* walkFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(path);
    } else if (entry.isFile()) {
      yield path;
    }
  }
}

function patchSidebarSpacing(source) {
  if (source.includes("SIKESRA sidebar spacing")) return source;

  const css = `
      /* SIKESRA sidebar spacing: compact WordPress-like grouping */
      .emdash-sidebar [data-sidebar="content"] {
        gap: 0 !important;
      }
      .emdash-sidebar [data-sidebar="group"] {
        padding-top: 0.25rem !important;
        padding-bottom: 0.25rem !important;
        gap: 0.125rem !important;
      }
      .emdash-sidebar [data-sidebar="group-label"] {
        padding-top: 0.4rem !important;
        padding-bottom: 0.35rem !important;
        min-height: 1.75rem !important;
      }
      .emdash-sidebar [data-sidebar="group-content"] [data-sidebar="menu"] {
        gap: 0.125rem !important;
      }
      .emdash-sidebar [data-sidebar="separator"] {
        margin: 0.35rem 0.75rem !important;
      }
    `;

  return source.includes("/* Header/footer borders */")
    ? source.replace("/* Header/footer borders */", `${css}\n\t\t\t/* Header/footer borders */`)
    : source;
}

const sidebarPatched = patchAdminSidebar();

// 5.5 Patch compiled emdash output for publish resilience
function patchCompiledEmdash() {
  let patched = 0;
  const chunksDir = resolve(DIST_SERVER_DIR, "chunks");
  if (!existsSync(chunksDir)) return patched;

  // Use dynamic import for readdirSync (already imported at top)
  for (const file of readdirSync(chunksDir)) {
    if (!file.endsWith(".mjs")) continue;
    const filePath = resolve(chunksDir, file);
    let source = readFileSync(filePath, "utf8");
    if (!source.includes("CONTENT_PUBLISH_ERROR")) continue;

    let changed = false;

    // Patch collectionHasSeo to be resilient to missing has_seo column
    const oldHasSeo = `async function collectionHasSeo(db, collection) {
  return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
}`;
    const newHasSeo = `async function collectionHasSeo(db, collection) {
  try {
    return (await db.selectFrom("_emdash_collections").select("has_seo").where("slug", "=", collection).executeTakeFirst())?.has_seo === 1;
  } catch {
    return false;
  }
}`;
    if (source.includes(oldHasSeo)) {
      source = source.replaceAll(oldHasSeo, newHasSeo);
      changed = true;
      patched++;
    }

    // Include actual error message in CONTENT_PUBLISH_ERROR response
    const oldErrMsg = `message: "Failed to publish content"`;
    const newErrMsg = `message: \`Failed to publish content: \${error instanceof Error ? error.message : String(error)}\``;
    if (source.includes(oldErrMsg) && !source.includes(newErrMsg)) {
      source = source.replace(oldErrMsg, newErrMsg);
      changed = true;
      patched++;
    }

    if (changed) writeFileSync(filePath, source);
  }
  return patched;
}

const emdashPatched = patchCompiledEmdash();

const parts = ["wrangler.json + worker-wrapper.mjs"];
if (sidebarPatched) parts.push("admin sidebar");
if (emdashPatched) parts.push(`emdash publish (${emdashPatched})`);
console.log(`[postbuild] patched ${parts.join(" + ")}`);
