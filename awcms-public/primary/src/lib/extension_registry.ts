/**
 * Extension registry for managing third-party integrations.
 * Extensions are more complex than plugins, providing full features/modules.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ExtensionData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  version: string;
  category:
    | "ecommerce"
    | "crm"
    | "marketing"
    | "analytics"
    | "social"
    | "utility"
    | "custom";
  config: Record<string, unknown>;
  permissions: string[];
  is_active: boolean;
  is_premium: boolean;
  api_endpoints?: Record<string, string>;
  webhook_urls?: Record<string, string>;
}

export interface ExtensionRegistry {
  extensions: Map<string, ExtensionData>;
  getBySlug: (slug: string) => ExtensionData | undefined;
  getByCategory: (category: string) => ExtensionData[];
  isActive: (slug: string) => boolean;
  getConfig: <T>(slug: string, key: string) => T | undefined;
}

/**
 * Fetch all extensions for a tenant
 */
export async function getExtensions(
  supabase: SupabaseClient,
  tenantId?: string | null,
): Promise<ExtensionData[]> {
  let query = supabase
    .from("extensions")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Extension] Error fetching extensions:", error.message);
    return [];
  }

  return (data || []).map((ext) => ({
    id: ext.id,
    name: ext.name,
    slug: ext.slug,
    description: ext.description,
    version: ext.version || "1.0.0",
    category: ext.category || "custom",
    config:
      typeof ext.config === "string"
        ? JSON.parse(ext.config)
        : ext.config || {},
    permissions: Array.isArray(ext.permissions) ? ext.permissions : [],
    is_active: ext.is_active,
    is_premium: ext.is_premium || false,
    api_endpoints: ext.api_endpoints,
    webhook_urls: ext.webhook_urls,
  }));
}

/**
 * Fetch only active extensions
 */
export async function getActiveExtensions(
  supabase: SupabaseClient,
  tenantId?: string | null,
): Promise<ExtensionData[]> {
  const extensions = await getExtensions(supabase, tenantId);
  return extensions.filter((e) => e.is_active);
}

/**
 * Create an extension registry from loaded extensions
 */
export function createExtensionRegistry(
  extensions: ExtensionData[],
): ExtensionRegistry {
  const extensionMap = new Map<string, ExtensionData>();

  for (const ext of extensions) {
    extensionMap.set(ext.slug, ext);
  }

  return {
    extensions: extensionMap,

    getBySlug(slug: string): ExtensionData | undefined {
      return extensionMap.get(slug);
    },

    getByCategory(category: string): ExtensionData[] {
      return extensions.filter((e) => e.category === category);
    },

    isActive(slug: string): boolean {
      const ext = extensionMap.get(slug);
      return ext?.is_active ?? false;
    },

    getConfig<T>(slug: string, key: string): T | undefined {
      const ext = extensionMap.get(slug);
      return ext?.config?.[key] as T | undefined;
    },
  };
}

/**
 * Check if a specific extension feature is enabled
 */
export function hasExtensionFeature(
  registry: ExtensionRegistry,
  extensionSlug: string,
  feature: string,
): boolean {
  const ext = registry.getBySlug(extensionSlug);
  if (!ext || !ext.is_active) return false;

  const features = ext.config.features as string[] | undefined;
  return features?.includes(feature) ?? false;
}

/**
 * Get extension API endpoint
 */
export function getExtensionEndpoint(
  registry: ExtensionRegistry,
  extensionSlug: string,
  endpointName: string,
): string | undefined {
  const ext = registry.getBySlug(extensionSlug);
  return ext?.api_endpoints?.[endpointName];
}

/**
 * Known extension slugs for type-safe access
 */
export const KNOWN_EXTENSIONS = {
  WOOCOMMERCE: "woocommerce",
  STRIPE: "stripe",
  MAILCHIMP: "mailchimp",
  HUBSPOT: "hubspot",
  ZAPIER: "zapier",
  SLACK: "slack",
  WHATSAPP: "whatsapp-business",
  GOOGLE_SHEETS: "google-sheets",
} as const;
