import { withHandlerSequence } from "./handler-utils";

interface PluginAdminInteraction {
  type?: string;
  page?: string;
}

// EmDash Block Kit admin interaction route
// POST /_emdash/api/plugins/sikesra/admin
export const pluginAdminHandler = withHandlerSequence(async (input?: PluginAdminInteraction) => {
  const currentPage = input?.page || "overview";

  return {
    blocks: [
      {
        type: "banner",
        variant: "default",
        title: "SIKESRA plugin active",
        description: "Admin plugin route is responding and ready.",
      },
      {
        type: "header",
        text: "SIKESRA Admin",
      },
      {
        type: "section",
        text: `Current page: ${currentPage}`,
      },
      {
        type: "section",
        text: "Use the EmDash plugin sidebar entries (Overview, Entities, Verification, Documents, Settings) to access SIKESRA workflows.",
      },
      {
        type: "stats",
        items: [
          {
            label: "Public page",
            value: "/sikesra",
            description: "Aggregate-safe public output",
          },
          {
            label: "Admin API",
            value: "online",
            description: "/_emdash/api/plugins/sikesra/v1/*",
          },
        ],
      },
    ],
  };
});
