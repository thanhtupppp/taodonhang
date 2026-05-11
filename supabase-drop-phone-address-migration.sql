alter table public.orders
  drop column if exists phone,
  drop column if exists address,
  alter column note drop default;
