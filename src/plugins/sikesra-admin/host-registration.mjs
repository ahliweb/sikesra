import { sikesraAdminPlugin, SIKESRA_ADMIN_PLUGIN_ID } from "./index.mjs";

export const SIKESRA_HOST_REGISTRATION = {
  pluginId: SIKESRA_ADMIN_PLUGIN_ID,
  importPath: "./src/plugins/sikesra-admin/index.mjs",
  importName: "sikesraAdminPlugin",
  upstreamConfigFile: "astro.config.mjs",
  emdashIntegrationOption: "plugins",
};

export function appendSikesraAdminPlugin(existingPlugins = []) {
  if (!Array.isArray(existingPlugins)) {
    throw new TypeError("Existing EmDash plugins must be provided as an array.");
  }

  const alreadyRegistered = existingPlugins.some((plugin) => plugin?.id === SIKESRA_ADMIN_PLUGIN_ID);
  return alreadyRegistered ? existingPlugins : [...existingPlugins, sikesraAdminPlugin()];
}

export function createAstroConfigRegistrationPatch() {
  return [
    "import { sikesraAdminPlugin } from './src/plugins/sikesra-admin/index.mjs';",
    "",
    "// In the emdash({ ... }) integration options:",
    "plugins: [awcmsUsersAdminPlugin(), sikesraAdminPlugin()]",
  ].join("\n");
}
