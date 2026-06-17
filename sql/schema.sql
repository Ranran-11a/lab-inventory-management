create extension if not exists "pgcrypto";

do $$ begin
  create type user_role as enum ('admin', 'editor', 'viewer');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type item_type as enum ('reagent', 'consumable', 'equipment', 'sample', 'other');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type movement_type as enum ('in', 'out', 'adjust', 'discard');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type audit_action as enum ('create', 'update', 'delete', 'restore');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists function_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  item_type item_type not null,
  function_category_id uuid not null references function_categories(id),
  catalog_number text,
  cas_number text,
  specification text not null,
  purity_or_concentration text,
  package_size text,
  manufacturer text not null,
  default_supplier text,
  unit text not null,
  min_quantity numeric not null default 0 check (min_quantity >= 0),
  default_location text not null,
  storage_condition text,
  safety_level text,
  owner_id uuid references profiles(id),
  notes text,
  tags text[] not null default '{}',
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists inventory_batches (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  lot_number text,
  purchase_date date not null,
  expiry_date date,
  purchased_quantity numeric not null check (purchased_quantity >= 0),
  current_quantity numeric not null check (current_quantity >= 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  currency text not null default 'CNY',
  supplier text,
  purchaser_id uuid references profiles(id),
  location text not null,
  invoice_number text,
  order_number text,
  notes text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint current_quantity_lte_purchased check (current_quantity <= purchased_quantity)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id),
  batch_id uuid references inventory_batches(id),
  movement_type movement_type not null,
  quantity_change numeric not null,
  quantity_before numeric not null,
  quantity_after numeric not null check (quantity_after >= 0),
  reason text,
  operator_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  notes text
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action audit_action not null,
  old_value jsonb,
  new_value jsonb,
  operator_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_search on inventory_items using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(catalog_number, '') || ' ' || coalesce(cas_number, '') || ' ' || coalesce(manufacturer, '') || ' ' || coalesce(specification, '') || ' ' || coalesce(default_location, '') || ' ' || coalesce(notes, ''))
);
create index if not exists idx_inventory_items_name on inventory_items(name);
create index if not exists idx_inventory_items_type on inventory_items(item_type);
create index if not exists idx_inventory_items_category on inventory_items(function_category_id);
create index if not exists idx_inventory_items_deleted_at on inventory_items(deleted_at);
create index if not exists idx_inventory_batches_item on inventory_batches(item_id);
create index if not exists idx_inventory_batches_expiry on inventory_batches(expiry_date);
create index if not exists idx_inventory_batches_current_quantity on inventory_batches(current_quantity);
create index if not exists idx_stock_movements_item on stock_movements(item_id);
create index if not exists idx_stock_movements_batch on stock_movements(batch_id);
create index if not exists idx_stock_movements_created_at on stock_movements(created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists trg_categories_updated_at on function_categories;
create trigger trg_categories_updated_at before update on function_categories for each row execute function set_updated_at();
drop trigger if exists trg_items_updated_at on inventory_items;
create trigger trg_items_updated_at before update on inventory_items for each row execute function set_updated_at();
drop trigger if exists trg_batches_updated_at on inventory_batches;
create trigger trg_batches_updated_at before update on inventory_batches for each row execute function set_updated_at();

alter table profiles enable row level security;
alter table function_categories enable row level security;
alter table inventory_items enable row level security;
alter table inventory_batches enable row level security;
alter table stock_movements enable row level security;
alter table audit_logs enable row level security;

create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function prevent_non_admin_soft_delete()
returns trigger as $$
begin
  if current_user_role() <> 'admin' and old.deleted_at is distinct from new.deleted_at then
    raise exception 'Only admin can delete or restore inventory items';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace function prevent_profile_role_escalation()
returns trigger as $$
begin
  if tg_op = 'INSERT' and new.role <> 'viewer' and current_user_role() <> 'admin' then
    raise exception 'New profiles must start as viewer';
  end if;
  if tg_op = 'UPDATE' and old.role is distinct from new.role and current_user_role() <> 'admin' then
    raise exception 'Only admin can change roles';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_profiles_prevent_role_escalation on profiles;
create trigger trg_profiles_prevent_role_escalation
before insert or update on profiles
for each row execute function prevent_profile_role_escalation();

drop trigger if exists trg_items_prevent_non_admin_soft_delete on inventory_items;
create trigger trg_items_prevent_non_admin_soft_delete
before update on inventory_items
for each row execute function prevent_non_admin_soft_delete();

drop policy if exists "profiles can read all" on profiles;
drop policy if exists "profiles self insert" on profiles;
drop policy if exists "profiles self update" on profiles;
drop policy if exists "profiles admin update" on profiles;
drop policy if exists "categories readable" on function_categories;
drop policy if exists "categories admin write" on function_categories;
drop policy if exists "items readable" on inventory_items;
drop policy if exists "items editor insert" on inventory_items;
drop policy if exists "items editor update" on inventory_items;
drop policy if exists "items admin delete" on inventory_items;
drop policy if exists "items admin physical delete" on inventory_items;
drop policy if exists "batches readable" on inventory_batches;
drop policy if exists "batches editor insert" on inventory_batches;
drop policy if exists "batches editor update" on inventory_batches;
drop policy if exists "batches admin delete" on inventory_batches;
drop policy if exists "movements readable" on stock_movements;
drop policy if exists "movements editor insert" on stock_movements;
drop policy if exists "audit readable" on audit_logs;
drop policy if exists "audit insert" on audit_logs;

create policy "profiles can read all" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles self insert" on profiles for insert with check (id = auth.uid() and role = 'viewer');
create policy "profiles self update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles admin update" on profiles for update using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "categories readable" on function_categories for select using (auth.role() = 'authenticated');
create policy "categories admin write" on function_categories for all using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

create policy "items readable" on inventory_items for select using (auth.role() = 'authenticated' and deleted_at is null);
create policy "items editor insert" on inventory_items for insert with check (current_user_role() in ('admin', 'editor'));
create policy "items editor update" on inventory_items for update using (current_user_role() in ('admin', 'editor')) with check (current_user_role() in ('admin', 'editor'));
create policy "items admin physical delete" on inventory_items for delete using (false);

create policy "batches readable" on inventory_batches for select using (auth.role() = 'authenticated' and deleted_at is null);
create policy "batches editor insert" on inventory_batches for insert with check (current_user_role() in ('admin', 'editor'));
create policy "batches editor update" on inventory_batches for update using (current_user_role() in ('admin', 'editor')) with check (current_user_role() in ('admin', 'editor'));
create policy "batches admin delete" on inventory_batches for delete using (false);

create policy "movements readable" on stock_movements for select using (auth.role() = 'authenticated');
create policy "movements editor insert" on stock_movements for insert with check (current_user_role() in ('admin', 'editor'));

create policy "audit readable" on audit_logs for select using (current_user_role() = 'admin');
create policy "audit insert" on audit_logs for insert with check (current_user_role() in ('admin', 'editor'));
