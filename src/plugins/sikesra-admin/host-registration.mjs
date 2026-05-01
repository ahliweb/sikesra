import {
  createSikesraAdminShellNavigation,
  sikesraAdminPlugin,
  SIKESRA_ADMIN_PLUGIN_ID,
} from "./index.mjs";

export const SIKESRA_HOST_REGISTRATION = {
  plugin: {
    id: SIKESRA_ADMIN_PLUGIN_ID,
    importPath: "./src/plugins/sikesra-admin/index.mjs",
    importName: "sikesraAdminPlugin",
  },
  astro: {
    upstreamConfigFile: "astro.config.mjs",
    emdashIntegrationOption: "plugins",
  },
  guidance: {
    integration: "plugins: [awcmsUsersAdminPlugin(), sikesraAdminPlugin()]",
    shellState: "createSikesraAdminHostShellState({ currentPath, grantedPermissions, plugin });",
  },
};

export function appendSikesraAdminPlugin(existingPlugins = []) {
  if (!Array.isArray(existingPlugins)) {
    throw new TypeError("Existing EmDash plugins must be provided as an array.");
  }

  const alreadyRegistered = existingPlugins.some((plugin) => plugin?.id === SIKESRA_ADMIN_PLUGIN_ID);
  return alreadyRegistered ? existingPlugins : [...existingPlugins, sikesraAdminPlugin()];
}

export function createSikesraAdminHostShellState(input = {}) {
  const plugin = input.plugin ?? sikesraAdminPlugin();

  if (!plugin || plugin.id !== SIKESRA_ADMIN_PLUGIN_ID) {
    throw new TypeError("A valid SIKESRA admin plugin descriptor is required.");
  }

  return {
    pluginId: plugin.id,
    currentPath: input.currentPath ?? "/",
    navigation: createSikesraAdminShellNavigation({
      currentPath: input.currentPath,
      grantedPermissions: input.grantedPermissions,
      pages: plugin.adminPages,
    }),
  };
}
