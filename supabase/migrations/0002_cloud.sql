-- Digital Legacy Pro Cloud — encrypted vault backup + dead-man email
-- Tables use dm_cloud_ prefix. RLS enabled. Storage bucket: dm-vaults

create table if not exists public.dm_cloud_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  deadman_enabled boolean not null default false,
  inactivity_days integer not null default 30
    check (inactivity_days >= 7 and inactivity_days <= 365),
  warning_days integer not null default 7
    check (warning_days >= 1 and warning_days <= 60),
  last_checkin_at timestamptz not null default now(),
  owner_email text,
  alert_emails text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'warning_sent', 'triggered')),
  last_warning_at timestamptz,
  last_triggered_at timestamptz,
  handoff_note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_vault_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  size_bytes bigint not null default 0,
  content_hash text,
  created_at timestamptz not null default now()
);

create index if not exists dm_vault_backups_user_idx
  on public.dm_vault_backups (user_id, created_at desc);

create index if not exists dm_cloud_settings_deadman_idx
  on public.dm_cloud_settings (deadman_enabled, status, last_checkin_at)
  where deadman_enabled = true;

alter table public.dm_cloud_settings enable row level security;
alter table public.dm_vault_backups enable row level security;

create policy "dm_cloud_settings_select_own"
  on public.dm_cloud_settings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dm_cloud_settings_insert_own"
  on public.dm_cloud_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dm_cloud_settings_update_own"
  on public.dm_cloud_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "dm_vault_backups_select_own"
  on public.dm_vault_backups for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dm_vault_backups_insert_own"
  on public.dm_vault_backups for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "dm_vault_backups_delete_own"
  on public.dm_vault_backups for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('dm-vaults', 'dm-vaults', false, 524288000)
on conflict (id) do update set public = false, file_size_limit = 524288000;

create policy "dm_vaults_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'dm-vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dm_vaults_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'dm-vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dm_vaults_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'dm-vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'dm-vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "dm_vaults_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'dm-vaults'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
