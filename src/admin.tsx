// SIKESRA Admin Entry Point
// React bridge for the plugin Block Kit admin surface
import { PermissionRegistryPage } from "./components/PermissionRegistryPage";
import { AdminBlocksPage, ADMIN_BLOCK_PAGE_ROUTES } from "./components/AdminBlocksPage";
import { DashboardPage } from "./components/DashboardPage";

export const pages = {
  "/": DashboardPage,
  "/entities": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/entities"]} />,
  "/entities/new": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/entities/new"]} />,
  "/verification": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/verification"]} />,
  "/imports": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/imports"]} />,
  "/documents": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/documents"]} />,
  "/reports": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/reports"]} />,
  "/regions": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/regions"]} />,
  "/access": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/access"]} />,
  "/audit": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/audit"]} />,
  "/settings": () => <AdminBlocksPage page={ADMIN_BLOCK_PAGE_ROUTES["/settings"]} />,
  "/permissions": PermissionRegistryPage,
};

export const widgets = {};
