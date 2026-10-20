-- Run once in the Supabase SQL editor before adding the first MedBilling customer.
-- Every existing row becomes a JharLab ("pathlab") licence, so live labs are unaffected.
-- One PC may then hold one licence per product (a clinic running both apps has two rows).
alter table public.customers add column if not exists product text not null default 'pathlab';
alter table public.customers drop constraint if exists customers_machine_id_key;
create unique index if not exists customers_machine_product_idx on public.customers (lower(machine_id), product);
