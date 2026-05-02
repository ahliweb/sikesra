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
  site_title: string | null;
  tagline: string | null;
  payload: Record<string, unknown> | null;
  completed_at: string | Date | null;
};

export function createSetupRouter() {
  const setup = new Hono<{ Variables: Variables }>();

  setup.get("/status", async (c) => {
    const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
    const db = getDb();

    await ensureSetupTables(db);

    const row = await readSetupState(db);
    const posture = getDatabaseRuntimePosture();

    return c.json(
      {
        success: true,
        data: {
          needsSetup: row ? row.completed_at === null : true,
          setupState: row
            ? {
                siteTitle: row.site_title,
                tagline: row.tagline,
                completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
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

    await ensureSetupTables(db);

    const result = await db.begin(async (tx) => {
      await tx`
        insert into public.sikesra_setup_state (
          id,
          site_title,
          tagline,
          payload,
          completed_at,
          updated_at
        ) values (
          'default',
          ${siteTitle},
          ${tagline},
          ${JSON.stringify(rawBody)}::jsonb,
          ${completed ? new Date() : null},
          now()
        )
        on conflict (id) do update set
          site_title = excluded.site_title,
          tagline = excluded.tagline,
          payload = excluded.payload,
          completed_at = case
            when excluded.completed_at is not null then excluded.completed_at
            else public.sikesra_setup_state.completed_at
          end,
          updated_at = now()
      `;

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
          ${JSON.stringify(rawBody)}::jsonb,
          now()
        )
        on conflict (slug) do update set
          name = excluded.name,
          description = excluded.description,
          config = excluded.config,
          updated_at = now()
      `;

      return readSetupState(tx);
    });

    const posture = getDatabaseRuntimePosture();

    return c.json(
      {
        success: true,
        data: {
          needsSetup: result ? result.completed_at === null : true,
          setupState: result
            ? {
                siteTitle: result.site_title,
                tagline: result.tagline,
                completedAt: result.completed_at ? new Date(result.completed_at).toISOString() : null,
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
    create table if not exists public.sikesra_setup_state (
      id text primary key,
      site_title text,
      tagline text,
      payload jsonb not null default '{}'::jsonb,
      completed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;

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
    select id, site_title, tagline, payload, completed_at
    from public.sikesra_setup_state
    where id = 'default'
    limit 1
  `;

  return rows[0] ?? null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export const setup = createSetupRouter();
