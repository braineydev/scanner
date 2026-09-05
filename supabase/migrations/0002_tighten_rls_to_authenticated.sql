-- Phase (auth follow-up): tighten products RLS from "anon can write" to
-- "must be signed in to write."
--
-- DO NOT RUN THIS until you've:
--   1. Applied 0001_init.sql
--   2. Created at least one admin user (Supabase Dashboard -> Authentication
--      -> Users -> Add user), and confirmed you can sign in at /login and
--      reach /products.
--   3. Confirmed adding a product (scan or manual) still works while signed
--      in, on the version of the app that uses lib/supabase/server.ts for
--      saveProduct (already true as of this phase).
--
-- Running this before all three of those will not "lock you out of the app"
-- (auth itself doesn't depend on these policies) but it WILL make every
-- save fail with a permission error until login is working end to end.

drop policy if exists "products_anon_select" on public.products;
drop policy if exists "products_anon_insert" on public.products;

create policy "products_authenticated_select"
  on public.products for select
  to authenticated
  using (true);

create policy "products_authenticated_insert"
  on public.products for insert
  to authenticated
  with check (true);

-- product_images and inventory_movements follow the same tightening —
-- there's no UI writing to either yet, so this only affects future phases.

drop policy if exists "product_images_anon_select" on public.product_images;
drop policy if exists "product_images_anon_insert" on public.product_images;

create policy "product_images_authenticated_select"
  on public.product_images for select
  to authenticated
  using (true);

create policy "product_images_authenticated_insert"
  on public.product_images for insert
  to authenticated
  with check (true);

drop policy if exists "inventory_movements_anon_select" on public.inventory_movements;

create policy "inventory_movements_authenticated_select"
  on public.inventory_movements for select
  to authenticated
  using (true);

-- Storage: uploads to the product-images bucket now require a session too.
-- Public read stays as-is, since product photos need to render for anyone
-- viewing the storefront/app, not just signed-in admins.

drop policy if exists "product_images_bucket_anon_upload" on storage.objects;

create policy "product_images_bucket_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');
