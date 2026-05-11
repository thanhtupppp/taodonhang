begin;

alter table public.order_items
  alter column quantity type numeric(12,2)
  using quantity::numeric(12,2);

alter table public.orders
  alter column status drop default;

alter table public.orders
  alter column status type text
  using status::text;

drop type if exists public.order_status;

create type public.order_status as enum (
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled'
);

alter table public.orders
  alter column status type public.order_status
  using status::public.order_status;

alter table public.orders
  alter column status set default 'pending';

commit;
