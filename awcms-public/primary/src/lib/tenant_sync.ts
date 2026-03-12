/**
 * Cross-tenant synchronization service for content replication.
 * Enables syncing content from primary tenant to secondary tenants.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SyncConfig {
  source_tenant_id: string;
  target_tenant_id: string;
  content_types: ("pages" | "articles" | "categories" | "tags" | "menus")[];
  sync_mode: "full" | "incremental";
  overwrite_existing: boolean;
}

export interface SyncResult {
  success: boolean;
  synced_count: number;
  skipped_count: number;
  error_count: number;
  errors: string[];
  duration_ms: number;
}

/**
 * Sync content from source tenant to target tenant
 */
export async function syncContentFromTenant(
  supabase: SupabaseClient,
  config: SyncConfig,
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    success: true,
    synced_count: 0,
    skipped_count: 0,
    error_count: 0,
    errors: [],
    duration_ms: 0,
  };

  for (const contentType of config.content_types) {
    try {
      const syncedItems = await syncTable(supabase, contentType, config);
      result.synced_count += syncedItems.synced;
      result.skipped_count += syncedItems.skipped;
    } catch (error) {
      result.error_count++;
      result.errors.push(
        `Error syncing ${contentType}: ${(error as Error).message}`,
      );
    }
  }

  result.duration_ms = Date.now() - startTime;
  result.success = result.error_count === 0;

  return result;
}

async function syncTable(
  supabase: SupabaseClient,
  tableName: string,
  config: SyncConfig,
): Promise<{ synced: number; skipped: number }> {
  // Fetch source content
  const { data: sourceData, error: sourceError } = await supabase
    .from(tableName)
    .select("*")
    .eq("tenant_id", config.source_tenant_id)
    .is("deleted_at", null);

  if (sourceError) throw sourceError;
  if (!sourceData?.length) return { synced: 0, skipped: 0 };

  let synced = 0;
  let skipped = 0;

  for (const item of sourceData) {
    // Check if item already exists in target
    const { data: existing } = await supabase
      .from(tableName)
      .select("id, sync_source_id")
      .eq("tenant_id", config.target_tenant_id)
      .eq("slug", item.slug)
      .single();

    if (existing && !config.overwrite_existing) {
      skipped++;
      continue;
    }

    // Prepare synced item
    const syncedItem = {
      ...item,
      id: existing?.id || undefined, // Use existing ID or let database generate new
      tenant_id: config.target_tenant_id,
      sync_source_id: item.id,
      created_at: existing ? undefined : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    delete syncedItem.id;

    if (existing) {
      // Update existing
      const { error: updateError } = await supabase
        .from(tableName)
        .update(syncedItem)
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from(tableName)
        .insert([syncedItem]);

      if (insertError) throw insertError;
    }

    synced++;
  }

  return { synced, skipped };
}

/**
 * Get sync status for a tenant
 */
export async function getSyncStatus(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<{
  last_sync?: string;
  source_tenant_id?: string;
  synced_items_count: number;
}> {
  // Count items with sync_source_id (synced from another tenant)
  const { count, error } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .not("sync_source_id", "is", null);

  if (error) {
    console.error("[TenantSync] Error getting sync status:", error.message);
    return { synced_items_count: 0 };
  }

  return {
    synced_items_count: count || 0,
  };
}

/**
 * Check if content was synced from another tenant
 */
export function isSyncedContent(item: {
  sync_source_id?: string | null;
}): boolean {
  return !!item.sync_source_id;
}
