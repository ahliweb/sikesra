import { withHandlerSequence } from "./handler-utils";

interface PluginAdminInteraction {
  type?: string;
  page?: string;
}

// EmDash Block Kit admin interaction route
// POST /_emdash/api/plugins/sikesra/admin
export const pluginAdminHandler = withHandlerSequence(async (input?: PluginAdminInteraction) => {
  return {
    blocks: [],
  };
});
