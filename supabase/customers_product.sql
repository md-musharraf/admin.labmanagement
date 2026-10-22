-- Run once in the Supabase SQL editor before adding the first MedBilling customer. Safe to run again.
-- Every existing row becomes a JharLab ("pathlab") licence, so live labs are unaffected.
-- One PC may then hold one licence per product (a clinic running both apps has two rows).
alter table public.customers add column if not exists product text not null default 'pathlab';

-- Drop the old one-licence-per-PC rule, whatever it is called (unique constraint or bare unique index on machine_id).
do $$
declare r record;
begin
  for r in select conname from pg_constraint
           where conrelid = 'public.customers'::regclass and contype = 'u'
             and conkey = array[(select attnum from pg_attribute where attrelid = 'public.customers'::regclass and attname = 'machine_id')]::int2[]
  loop
    execute format('alter table public.customers drop constraint %I', r.conname);
  end loop;
  for r in select c.relname from pg_index x join pg_class c on c.oid = x.indexrelid
           where x.indrelid = 'public.customers'::regclass and x.indisunique and not x.indisprimary
             and x.indnatts = 1 and pg_get_indexdef(x.indexrelid) ~ '\(machine_id\)'
  loop
    execute format('drop index public.%I', r.relname);
  end loop;
end $$;

create unique index if not exists customers_machine_product_idx on public.customers (lower(machine_id), product);

-- Make the API see the new column now, not on its next cache refresh.
notify pgrst, 'reload schema';
