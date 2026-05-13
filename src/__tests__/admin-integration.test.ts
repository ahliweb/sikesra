import { describe, expect, it } from "vitest";
import { ADMIN_BLOCK_PAGE_ROUTES, parseAdminBlocksResponse, resolveAdminInteractionPage } from "../components/AdminBlocksPage";
import { pluginAdminHandler } from "../routes/admin-routes";

describe("SIKESRA admin integration", () => {
  it("parses the EmDash data.blocks envelope", () => {
    const blocks = parseAdminBlocksResponse({ data: { blocks: [{ type: "header", text: "Dashboard" }] } });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("header");
  });

  it("rejects raw blocks payloads without data wrapper", () => {
    expect(() => parseAdminBlocksResponse({ blocks: [] })).toThrow("data.blocks");
  });

  it("resolves admin interaction pages for navigation and detail actions", () => {
    expect(resolveAdminInteractionPage("overview", { type: "block_action", action_id: "nav_entities" })).toBe("entities");
    expect(resolveAdminInteractionPage("verification", { type: "block_action", action_id: "verification_open_entity-1" })).toBe("verification/entity-1");
    expect(resolveAdminInteractionPage("imports", { type: "block_action", action_id: "imports_open_batch-1" })).toBe("imports/batch-1");
    expect(resolveAdminInteractionPage("documents", { type: "block_action", action_id: "documents_back_to_list" })).toBe("documents");
  });

  it("routes core admin pages through the shared Block Kit bridge", () => {
    expect(ADMIN_BLOCK_PAGE_ROUTES).toMatchObject({
      "/": "overview",
      "/entities": "entities",
      "/entities/new": "entities/new",
      "/verification": "verification",
      "/imports": "imports",
      "/documents": "documents",
      "/reports": "reports",
      "/regions": "regions",
      "/access": "access",
      "/audit": "audit",
      "/settings": "settings",
    });
  });

  it("returns data.blocks from the plugin admin route", async () => {
    const response = await pluginAdminHandler({
      plugin: { id: "sikesra", version: "0.1.0" },
      request: new Request("https://example.com/_emdash/api/plugins/sikesra/admin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-emdash-user-id": "user-1",
          "x-emdash-user-roles": "admin",
        },
      }),
      input: { page: "unknown-page" },
      site: { url: "https://site-1.example.com", name: "site-1" },
    });

    expect(response).toHaveProperty("data.blocks");
    expect(Array.isArray((response as { data: { blocks: unknown[] } }).data.blocks)).toBe(true);
    expect(response).not.toHaveProperty("blocks");
  });
});
