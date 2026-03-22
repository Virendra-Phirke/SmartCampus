-- Allow browser clients using anon key (non-Supabase-auth sessions) to store push subscriptions
-- This project authenticates users with Clerk, so auth.role() is typically 'anon' for DB calls.

-- Safety: if this migration is run before 006, ensure relation exists.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_user_id_key
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_upsert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;

create policy "push_subscriptions_select_any_client"
  on public.push_subscriptions
  for select
  using (auth.role() in ('anon', 'authenticated', 'service_role'));

create policy "push_subscriptions_insert_any_client"
  on public.push_subscriptions
  for insert
  with check (auth.role() in ('anon', 'authenticated', 'service_role'));

create policy "push_subscriptions_update_any_client"
  on public.push_subscriptions
  for update
  using (auth.role() in ('anon', 'authenticated', 'service_role'))
  with check (auth.role() in ('anon', 'authenticated', 'service_role'));

create policy "push_subscriptions_delete_any_client"
  on public.push_subscriptions
  for delete
  using (auth.role() in ('anon', 'authenticated', 'service_role'));
