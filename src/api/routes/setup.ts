import { Hono } from "hono";
import { getDb, getDatabaseRuntimePosture } from "../config/database.js";

type Variables = { requestId: string };

type SetupPayload = {
  siteTitle?: string;
  title?: string;
  tagline?: string;
  step?: string;
  complete?: boolean;
  finished?: boolean;
  [key: string]: unknown;
};

type SetupStateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  config: Record<string, unknown> | null;
};

export function createSetupRouter() {
  const setup = new Hono<{ Variables: Variables }>();

  setup.get("/status", async (c) => {
    const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
    const db = getDb();

    await ensureSetupTables(db);

    const row = await readSetupState(db);
    const posture = getDatabaseRuntimePosture();
    const setupConfig = readSetupConfig(row?.config);

    return c.json(
      {
        success: true,
        data: {
          needsSetup: setupConfig.completedAt === null,
          setupState: row
            ? {
                siteTitle: row.name,
                tagline: row.description,
                completedAt: setupConfig.completedAt,
              }
            : null,
          runtimeHealth: {
            database: {
              ok: posture.ok,
              posture: posture.posture,
            },
          },
        },
        meta: { requestId },
      },
      200,
    );
  });

  setup.post("/", async (c) => {
    const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
    const db = getDb();
    const rawBody = (await c.req.json().catch(() => ({}))) as SetupPayload;
    const siteTitle = normalizeText(rawBody.siteTitle ?? rawBody.title) ?? "SIKESRA KOBAR";
    const tagline = normalizeText(rawBody.tagline);
    const completed = rawBody.complete === true || rawBody.finished === true;
    const setupConfig = buildSetupConfig(rawBody, siteTitle, tagline, completed);

    await ensureSetupTables(db);

    const result = await db.begin(async (tx) => {
      await tx`
        insert into public.sites (
          slug,
          name,
          description,
          config,
          updated_at
        ) values (
          'default',
          ${siteTitle},
          ${tagline},
          ${JSON.stringify(setupConfig)}::jsonb,
          now()
        )
        on conflict (slug) do update set
          name = excluded.name,
          description = excluded.description,
          config = public.sites.config || excluded.config,
          updated_at = now()
      `;

      return readSetupState(tx);
    });

    const posture = getDatabaseRuntimePosture();

    return c.json(
      {
        success: true,
        data: {
          needsSetup: readSetupConfig(result?.config).completedAt === null,
          setupState: result
            ? {
                siteTitle: result.name,
                tagline: result.description,
                completedAt: readSetupConfig(result.config).completedAt,
              }
            : null,
          runtimeHealth: {
            database: {
              ok: posture.ok,
              posture: posture.posture,
            },
          },
          nextStep: completed ? "complete" : "account",
        },
        meta: { requestId },
      },
      200,
    );
  });

  return setup;
}

async function ensureSetupTables(db: any): Promise<void> {
  await db`create extension if not exists pgcrypto`;

  await db`
    create table if not exists public.sites (
      id uuid primary key default gen_random_uuid(),
      slug text not null unique default 'default',
      name text not null,
      description text,
      config jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      created_by uuid,
      updated_by uuid,
      deleted_by uuid
    )
  `;
}

async function readSetupState(db: any): Promise<SetupStateRow | null> {
  const rows = await db<SetupStateRow[]>`
    select id, slug, name, description, config
    from public.sites
    where slug = 'default'
    limit 1
  `;

  return rows[0] ?? null;
}

function readSetupConfig(config: Record<string, unknown> | null | undefined) {
  const setup = config && config.setup && typeof config.setup === "object" ? (config.setup as Record<string, unknown>) : null;
  const completedAt = setup ? normalizeText(setup.completedAt) : null;

  return {
    completedAt,
  };
}

function buildSetupConfig(rawBody: SetupPayload, siteTitle: string, tagline: string | null, completed: boolean) {
  const now = completed ? new Date().toISOString() : null;

  return {
    setup: {
      payload: rawBody,
      siteTitle,
      tagline,
      completedAt: now,
      step: normalizeText(rawBody.step) ?? (completed ? "complete" : "site"),
    },
  };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export const setup = createSetupRouter();
