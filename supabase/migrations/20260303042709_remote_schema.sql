drop policy "blogs_delete_hierarchy" on "public"."blogs";

drop policy "blogs_insert_hierarchy" on "public"."blogs";

drop policy "blogs_select_unified" on "public"."blogs";

drop policy "blogs_update_hierarchy" on "public"."blogs";

drop policy "role_permissions_insert_policy" on "public"."role_permissions";

drop policy "role_permissions_update_hierarchy" on "public"."role_permissions";

alter table "public"."admin_menus" drop constraint "admin_menus_key_key";

drop index if exists "public"."admin_menus_key_key";

CREATE UNIQUE INDEX admin_menus_key_tenant_unique ON public.admin_menus USING btree (key, tenant_id);

alter table "public"."admin_menus" add constraint "admin_menus_key_tenant_unique" UNIQUE using index "admin_menus_key_tenant_unique";


  create policy "role_permissions_insert_policy"
  on "public"."role_permissions"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND ((r.tenant_id = public.current_tenant_id()) OR public.tenant_can_access_resource(r.tenant_id, 'roles'::text, 'write'::text) OR public.is_platform_admin())))));



  create policy "role_permissions_update_hierarchy"
  on "public"."role_permissions"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND ((r.tenant_id = public.current_tenant_id()) OR public.tenant_can_access_resource(r.tenant_id, 'roles'::text, 'write'::text) OR public.is_platform_admin())))));



