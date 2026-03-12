-- Remove retired portfolio, commerce, and school-site modules

DELETE FROM public.admin_menus
WHERE key IN (
  'portfolio',
  'products',
  'product_types',
  'orders',
  'school_pages',
  'site_images'
);

DELETE FROM public.resources_registry
WHERE key IN (
  'portfolio',
  'products',
  'product_types',
  'orders',
  'school_pages',
  'site_images'
);

DELETE FROM public.settings
WHERE key IN (
  'site_images',
  'page_profile',
  'page_organization',
  'page_staff',
  'page_services',
  'page_achievements',
  'page_alumni',
  'page_finance',
  'page_gallery',
  'page_agenda',
  'page_contact'
);

DELETE FROM public.role_permissions rp
USING public.permissions p
WHERE rp.permission_id = p.id
  AND (
    p.name LIKE 'tenant.portfolio.%'
    OR p.name LIKE 'tenant.products.%'
    OR p.name LIKE 'tenant.product_types.%'
    OR p.name LIKE 'tenant.orders.%'
    OR p.name LIKE 'tenant.school_pages.%'
    OR p.name LIKE 'platform.school_pages.%'
  );

DELETE FROM public.permissions
WHERE name LIKE 'tenant.portfolio.%'
   OR name LIKE 'tenant.products.%'
   OR name LIKE 'tenant.product_types.%'
   OR name LIKE 'tenant.orders.%'
   OR name LIKE 'tenant.school_pages.%'
   OR name LIKE 'platform.school_pages.%';

DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.product_tags CASCADE;
DROP TABLE IF EXISTS public.product_type_tags CASCADE;
DROP TABLE IF EXISTS public.portfolio_tags CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_types CASCADE;
DROP TABLE IF EXISTS public.portfolio CASCADE;
