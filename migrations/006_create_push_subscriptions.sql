-- Web push subscriptions for background notifications
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

-- Users can manage only their own subscription row
create policy if not exists "push_subscriptions_select_own"
  on public.push_subscriptions
  for select
  using (auth.role() in ('authenticated', 'service_role'));

create policy if not exists "push_subscriptions_upsert_own"
  on public.push_subscriptions
  for insert
  with check (auth.role() in ('authenticated', 'service_role'));

create policy if not exists "push_subscriptions_update_own"
  on public.push_subscriptions
  for update
  using (auth.role() in ('authenticated', 'service_role'))
  with check (auth.role() in ('authenticated', 'service_role'));

create policy if not exists "push_subscriptions_delete_own"
  on public.push_subscriptions
  for delete
  using (auth.role() in ('authenticated', 'service_role'));

create or replace function public.set_push_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscription_updated_at();
