import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadLocalEnv, requireValue } from "./_local-env.mjs";

const WORKER_SCRIPT = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/__smoke/r2") {
      const key = "smoke/sikesra-worker-smoke.txt";
      await env.MEDIA_BUCKET.put(key, "ok", {
        httpMetadata: { contentType: "text/plain; charset=utf-8" },
      });
      const object = await env.MEDIA_BUCKET.get(key);
      const value = object ? await object.text() : null;
      await env.MEDIA_BUCKET.delete(key);
      return Response.json({ ok: value === "ok", service: "sikesra-r2-smoke" }, { status: value === "ok" ? 200 : 500 });
    }

    if (url.pathname === "/__smoke/db") {
      return Response.json({
        ok: Boolean(env.SESSION),
        service: "sikesra-worker-binding-smoke",
        sessionBindingPresent: Boolean(env.SESSION),
      });
    }

    if (url.pathname === "/_emdash" || url.pathname === "/_emdash/") {
      return new Response("SIKESRA EmDash smoke surface", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    return Response.json({ ok: true, service: "sikesra-kobar", runtime: "cloudflare-worker-smoke" }, {
      headers: { "cache-control": "no-store" },
    });
  },
};
`;

function stripJsonc(input) {
  let output = "";
  let inString = false;
  let stringQuote = "";
  let escaping = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (inString) {
      output += char;
      if (escaping) escaping = false;
      else if (char === "\\") escaping = true;
      else if (char === stringQuote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < input.length && input[index] !== "\n") index += 1;
      output += "\n";
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < input.length && !(input[index] === "*" && input[index + 1] === "/")) index += 1;
      index += 1;
      continue;
    }
    output += char;
  }
  return output.replace(/,\s*([}\]])/g, "$1");
}

async function cloudflareFetch(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      ...options.headers,
    },
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

export function buildSmokeWorkerMetadata(wrangler) {
  return {
    main_module: "worker.mjs",
    compatibility_date: wrangler.compatibility_date,
    compatibility_flags: wrangler.compatibility_flags ?? [],
    bindings: [
      ...Object.entries(wrangler.vars ?? {}).map(([name, text]) => ({ type: "plain_text", name, text })),
      ...(wrangler.r2_buckets ?? []).map((bucket) => ({
        type: "r2_bucket",
        name: bucket.binding,
        bucket_name: bucket.bucket_name,
      })),
      ...(wrangler.kv_namespaces ?? []).map((namespace) => ({
        type: "kv_namespace",
        name: namespace.binding,
        namespace_id: namespace.id,
      })),
    ],
    observability: wrangler.observability ?? { enabled: true },
  };
}

export function summarizeSmokeWorkerBindings(metadata) {
  const bindings = Array.isArray(metadata?.bindings) ? metadata.bindings : [];
  return bindings.map((binding) => ({ type: binding.type, name: binding.name })).sort((left, right) => `${left.type}:${left.name}`.localeCompare(`${right.type}:${right.name}`));
}

function assertSmokeDeployAllowed(env = process.env) {
  if (env.SIKESRA_ALLOW_SMOKE_WORKER_DEPLOY !== "true") {
    throw new Error("Refusing to replace the live Worker with the smoke Worker unless SIKESRA_ALLOW_SMOKE_WORKER_DEPLOY=true is set locally.");
  }
}

async function main() {
  loadLocalEnv();
  assertSmokeDeployAllowed();

  const accountId = requireValue(process.env.CLOUDFLARE_ACCOUNT_ID, "CLOUDFLARE_ACCOUNT_ID");
  requireValue(process.env.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN");

  const wrangler = JSON.parse(stripJsonc(readFileSync("wrangler.jsonc", "utf8")));
  const workerName = wrangler.name;
  const metadata = buildSmokeWorkerMetadata(wrangler);

  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.set("worker.mjs", new Blob([WORKER_SCRIPT], { type: "application/javascript+module" }), "worker.mjs");

  const deploy = await cloudflareFetch(`/accounts/${accountId}/workers/scripts/${workerName}`, {
    method: "PUT",
    body: form,
  });

  console.log(
    JSON.stringify(
      {
        ok: deploy.response.ok && deploy.json?.success !== false,
        workerName,
        httpStatus: deploy.response.status,
        bindings: summarizeSmokeWorkerBindings(metadata),
        errors: Array.isArray(deploy.json?.errors) ? deploy.json.errors.map((error) => ({ code: error.code, message: error.message })) : [],
        redaction: "API token, raw response, and secret values omitted.",
      },
      null,
      2,
    ),
  );
  process.exit(deploy.response.ok && deploy.json?.success !== false ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.log(JSON.stringify({ ok: false, error: error.message, redaction: "Secret values omitted." }, null, 2));
    process.exit(1);
  });
}
