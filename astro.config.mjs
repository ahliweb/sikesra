import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB", session: "auto" }),
      storage: r2({ binding: "MEDIA" }),
      plugins: [
        {
          id: "sikesra",
          version: "0.1.0",
          format: "native",
          entrypoint: "@ahliweb/plugin-sikesra",
          adminPages: [{ path: "/", label: "SIKESRA" }],
        },
      ],
    }),
  ],
  devToolbar: { enabled: false },
});
