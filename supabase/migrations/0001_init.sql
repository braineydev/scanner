-- Phase 2: initial schema for the product/barcode onboarding system.
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
-- Matches what app/actions/product.ts already reads and writes (barcode, name,
-- brand, category, description, selling_price, stock_quantity) and adds the
-- remaining fields the spec calls for as nullable columns, so existing code
-- keeps working unchanged and new fields can be filled in later phases
-- without another migration.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  -- product information
  barcode text not null,
  sku text,
  name text not null,
  brand text,
  category text,
  subcategory text,
  description text,

  -- pricing
  cost_price numeric(12, 2),
  selling_price numeric(12, 2) not null,
  discount numeric(12, 2),
  tax numeric(12, 2),

  -- inventory
  stock_quantity integer not null default 0,
  minimum_stock_level integer,
  warehouse text,
  storage_location text,

  -- media
  image_url text,

  -- additional information
  weight numeric(12, 3),
  dimensions text,
  supplier text,
  manufacturer text,
  country_of_origin text,

  -- provenance: where this row's data came from
  data_source text not null default 'admin'
    check (data_source in ('internal', 'external', 'admin')),

  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_barcode_key unique (barcode),
  constraint products_selling_price_nonnegative check (selling_price >= 0),
  constraint products_stock_quantity_nonnegative check (stock_quantity >= 0)
);

comment on table public.products is
  'One row per catalog item. Barcode is globally unique — this is what the app-level duplicate check and lookupBarcode() rely on.';

-- Barcode lookups (scan -> internal check) happen on every scan, so this index
-- carries real traffic. The unique constraint above already creates an index,
-- but keep this explicit in case the constraint is ever relaxed.
create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_name_idx on public.products using gin (to_tsvector('simple', name));
create index if not exists products_updated_at_idx on public.products (updated_at desc);

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
-- products.image_url covers the common single-image case (from external
-- lookup, a pasted URL, or one upload). This table is for the "additional
-- images" case in the spec (Section D) — created now so the storage bucket
-- and RLS shape exist, even though the UI for multiple images isn't built
-- until a later phase.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  url text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);

-- ---------------------------------------------------------------------------
-- inventory_movements
-- ---------------------------------------------------------------------------
-- Audit trail for stock changes. Not written to by any current code path —
-- created now per the spec's schema so stock adjustments have somewhere to
-- go without another migration later.

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('restock', 'sale', 'adjustment', 'return', 'damage')),
  quantity integer not null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_id_idx on public.inventory_movements (product_id);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- One row per auth.users row. Drives role-based authorization once login is
-- wired up (Phase auth). Auto-created via trigger on signup.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- IMPORTANT / TEMPORARY: this app has no login screen yet (see Phase 0
-- report — no Supabase Auth wired up). Locking these tables to
-- "authenticated only" right now would break every existing feature, since
-- the app currently talks to Supabase with the anon key and no session.
--
-- So for this phase: RLS is ON (not skipped), but the policies allow the
-- anon role the same access the app already has in practice, read + insert
-- on products. This is a deliberate, temporary widening documented here so
-- it isn't mistaken for the final security model. When the auth phase lands,
-- these anon policies should be dropped and replaced with authenticated +
-- role-based ones (see the commented block at the bottom of this file).

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "products_anon_select" on public.products;
create policy "products_anon_select"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "products_anon_insert" on public.products;
create policy "products_anon_insert"
  on public.products for insert
  to anon, authenticated
  with check (true);

-- No update/delete policy yet: nothing in the app updates or deletes a
-- product today, so the safer default is to leave those closed until the
-- edit/delete screens (and auth) exist.

drop policy if exists "product_images_anon_select" on public.product_images;
create policy "product_images_anon_select"
  on public.product_images for select
  to anon, authenticated
  using (true);

drop policy if exists "product_images_anon_insert" on public.product_images;
create policy "product_images_anon_insert"
  on public.product_images for insert
  to anon, authenticated
  with check (true);

drop policy if exists "inventory_movements_anon_select" on public.inventory_movements;
create policy "inventory_movements_anon_select"
  on public.inventory_movements for select
  to anon, authenticated
  using (true);

-- profiles: users can only see/update their own row. No anon access —
-- there's no anon use case for this table.
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Storage: product-images bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_bucket_public_read" on storage.objects;
create policy "product_images_bucket_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'product-images');

drop policy if exists "product_images_bucket_anon_upload" on storage.objects;
create policy "product_images_bucket_anon_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'product-images');

-- ---------------------------------------------------------------------------
-- FUTURE (do not run yet): tighten RLS once Supabase Auth is wired up.
-- Uncomment and run after the auth phase ships, replacing the anon
-- policies above.
-- ---------------------------------------------------------------------------

-- drop policy if exists "products_anon_select" on public.products;
-- drop policy if exists "products_anon_insert" on public.products;
--
-- create policy "products_authenticated_select"
--   on public.products for select
--   to authenticated
--   using (true);
--
-- create policy "products_authenticated_insert"
--   on public.products for insert
--   to authenticated
--   with check (true);
--
-- create policy "products_authenticated_update"
--   on public.products for update
--   to authenticated
--   using (true)
--   with check (true);
