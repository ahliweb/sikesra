import * as React from "react";

function AboutSikesraPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">About SIKESRA</h1>
        <p className="text-sm text-kumo-subtle">
          SIKESRA Kobar berjalan sebagai ekstensi domain pada baseline EmDash-first AWCMS Mini.
        </p>
      </header>
      <section className="rounded-lg border bg-kumo-base p-4 sm:p-6">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-kumo-default">
          <li>Host browser: <strong>sikesrakobar.ahlikoding.com</strong> dengan alias admin <strong>/_emdash/</strong>.</li>
          <li>Backend produksi: Hono API pada Coolify-managed VPS.</li>
          <li>Database produksi: PostgreSQL <strong>sikesrakobar</strong> pada jaringan internal Docker Coolify.</li>
          <li>Penyimpanan berkas: R2 bucket <strong>sikesra</strong> melalui akses backend yang ditinjau.</li>
        </ul>
      </section>
    </main>
  );
}

export const pages = {
  "/about-sikesra": AboutSikesraPage,
};
