create extension if not exists pgcrypto;

create type public.order_status as enum ('pending', 'confirmed', 'shipping', 'completed', 'cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  customer_name text not null,
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 10000,
  status public.order_status not null default 'pending',
  total_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_products_active on public.products(active);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_order_total_amount()
returns trigger
language plpgsql
as $$
begin
  new.total_amount := coalesce(new.subtotal, 0) + coalesce(new.shipping_fee, 0);
  return new;
end;
$$;

create or replace function public.generate_order_code()
returns text
language sql
stable
as $$
  select 'OD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin')
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_sync_total_amount on public.orders;
create trigger trg_orders_sync_total_amount
before insert or update on public.orders
for each row execute function public.sync_order_total_amount();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy if not exists "Public can read active products"
on public.products for select
using (active = true);

create policy if not exists "Admins can manage products"
on public.products for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy if not exists "Public can create orders"
on public.orders for insert
with check (true);

create policy if not exists "Admins can read orders"
on public.orders for select
using (auth.role() = 'authenticated');

create policy if not exists "Admins can update orders"
on public.orders for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy if not exists "Admins can read order items"
on public.order_items for select
using (auth.role() = 'authenticated');

create policy if not exists "Admins can manage order items"
on public.order_items for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
