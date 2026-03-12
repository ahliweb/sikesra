/**
 * Widget fetching and rendering utilities for dynamic widgets from Supabase.
 * Syncs with WidgetsManager in admin panel for unified widget management.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface WidgetData {
  id: string;
  name: string;
  type: string;
  area: string;
  config: Record<string, unknown>;
  content?: string;
  sort_order: number;
  is_active: boolean;
  show_title: boolean;
  custom_classes?: string;
}

/**
 * Fetch widgets by area (sidebar, footer-1, footer-2, etc.)
 */
export async function getWidgetsByArea(
  supabase: SupabaseClient,
  area: string,
  tenantId?: string | null,
): Promise<WidgetData[]> {
  let query = supabase
    .from("widgets")
    .select("*")
    .eq("area", area)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      `[Widget] Error fetching widgets for area "${area}":`,
      error.message,
    );
    return [];
  }

  return (data || []).map((widget) => ({
    id: widget.id,
    name: widget.name,
    type: widget.type,
    area: widget.area,
    config:
      typeof widget.config === "string"
        ? JSON.parse(widget.config)
        : widget.config || {},
    content: widget.content,
    sort_order: widget.sort_order || 0,
    is_active: widget.is_active,
    show_title: widget.show_title ?? true,
    custom_classes: widget.custom_classes,
  }));
}

/**
 * Fetch all active widgets for a tenant grouped by area
 */
export async function getAllWidgetsByArea(
  supabase: SupabaseClient,
  tenantId?: string | null,
): Promise<Record<string, WidgetData[]>> {
  let query = supabase
    .from("widgets")
    .select("*")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("area")
    .order("sort_order", { ascending: true });

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Widget] Error fetching all widgets:", error.message);
    return {};
  }

  const grouped: Record<string, WidgetData[]> = {};

  for (const widget of data || []) {
    const area = widget.area || "default";
    if (!grouped[area]) {
      grouped[area] = [];
    }
    grouped[area].push({
      id: widget.id,
      name: widget.name,
      type: widget.type,
      area: widget.area,
      config:
        typeof widget.config === "string"
          ? JSON.parse(widget.config)
          : widget.config || {},
      content: widget.content,
      sort_order: widget.sort_order || 0,
      is_active: widget.is_active,
      show_title: widget.show_title ?? true,
      custom_classes: widget.custom_classes,
    });
  }

  return grouped;
}

/**
 * Fetch widgets for sidebar area
 */
export async function getSidebarWidgets(
  supabase: SupabaseClient,
  tenantId?: string | null,
): Promise<WidgetData[]> {
  return getWidgetsByArea(supabase, "sidebar", tenantId);
}

/**
 * Fetch footer widgets for a specific column
 */
export async function getFooterWidgets(
  supabase: SupabaseClient,
  column: number | string,
  tenantId?: string | null,
): Promise<WidgetData[]> {
  const area = typeof column === "number" ? `footer-${column}` : column;
  return getWidgetsByArea(supabase, area, tenantId);
}
