-- =============================================================
-- Dijital Miras — Kapalı devre sosyal medya + sohbet
-- Tüm tablolar dm_ önekiyle izole edilir. RLS her tabloda açıktır.
-- Bu dosyayı Supabase SQL Editor'da çalıştırın veya `supabase db push` ile uygulayın.
-- =============================================================

-- Yardımcı (security definer) fonksiyonlar için özel şema (Data API'ye AÇIK DEĞİL)
create schema if not exists app_private;

-- =============================================================
-- TABLOLAR
-- =============================================================

create table if not exists public.dm_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  friend_code text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_connections (
  id bigint generated always as identity primary key,
  requester uuid not null references public.dm_profiles (id) on delete cascade,
  addressee uuid not null references public.dm_profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);

create table if not exists public.dm_posts (
  id bigint generated always as identity primary key,
  author uuid not null references public.dm_profiles (id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_post_reactions (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.dm_posts (id) on delete cascade,
  user_id uuid not null references public.dm_profiles (id) on delete cascade,
  type text not null default 'like',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.dm_post_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.dm_posts (id) on delete cascade,
  author uuid not null references public.dm_profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  sender uuid not null references public.dm_profiles (id) on delete cascade,
  recipient uuid not null references public.dm_profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.dm_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.dm_profiles (id) on delete cascade,
  actor uuid references public.dm_profiles (id) on delete set null,
  type text not null check (type in ('friend_request', 'friend_accept', 'reaction', 'comment', 'message')),
  entity_id bigint,
  content text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists dm_connections_addressee_idx on public.dm_connections (addressee, status);
create index if not exists dm_connections_requester_idx on public.dm_connections (requester, status);
create index if not exists dm_posts_author_idx on public.dm_posts (author, created_at desc);
create index if not exists dm_messages_pair_idx on public.dm_messages (sender, recipient, created_at);
create index if not exists dm_messages_recipient_idx on public.dm_messages (recipient, created_at);
create index if not exists dm_notifications_user_idx on public.dm_notifications (user_id, created_at desc);

-- =============================================================
-- YARDIMCI FONKSİYONLAR (özel şema, security definer)
-- =============================================================

create or replace function app_private.dm_are_connected(uid1 uuid, uid2 uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.dm_connections c
    where c.status = 'accepted'
      and (
        (c.requester = uid1 and c.addressee = uid2) or
        (c.requester = uid2 and c.addressee = uid1)
      )
  );
$$;

create or replace function app_private.dm_can_view_post(p_post_id bigint)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.dm_posts p
    where p.id = p_post_id
      and (
        p.author = auth.uid()
        or app_private.dm_are_connected(p.author, auth.uid())
      )
  );
$$;

create or replace function app_private.dm_notify(
  p_user uuid,
  p_actor uuid,
  p_type text,
  p_entity bigint,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  insert into public.dm_notifications (user_id, actor, type, entity_id, content)
  values (p_user, p_actor, p_type, p_entity, p_content);
end;
$$;

-- =============================================================
-- BİLDİRİM TETİKLEYİCİLERİ
-- =============================================================

create or replace function app_private.dm_on_connection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform app_private.dm_notify(new.addressee, new.requester, 'friend_request', new.id, null);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status <> 'accepted' then
    perform app_private.dm_notify(new.requester, new.addressee, 'friend_accept', new.id, null);
  end if;
  return new;
end;
$$;

drop trigger if exists dm_connections_notify on public.dm_connections;
create trigger dm_connections_notify
  after insert or update on public.dm_connections
  for each row execute function app_private.dm_on_connection_change();

create or replace function app_private.dm_on_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  select author into v_author from public.dm_posts where id = new.post_id;
  perform app_private.dm_notify(v_author, new.user_id, 'reaction', new.post_id, null);
  return new;
end;
$$;

drop trigger if exists dm_reactions_notify on public.dm_post_reactions;
create trigger dm_reactions_notify
  after insert on public.dm_post_reactions
  for each row execute function app_private.dm_on_reaction();

create or replace function app_private.dm_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author uuid;
begin
  select author into v_author from public.dm_posts where id = new.post_id;
  perform app_private.dm_notify(v_author, new.author, 'comment', new.post_id, new.content);
  return new;
end;
$$;

drop trigger if exists dm_comments_notify on public.dm_post_comments;
create trigger dm_comments_notify
  after insert on public.dm_post_comments
  for each row execute function app_private.dm_on_comment();

create or replace function app_private.dm_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app_private.dm_notify(new.recipient, new.sender, 'message', new.id, new.content);
  return new;
end;
$$;

drop trigger if exists dm_messages_notify on public.dm_messages;
create trigger dm_messages_notify
  after insert on public.dm_messages
  for each row execute function app_private.dm_on_message();

-- =============================================================
-- YENİ KULLANICI -> OTOMATİK PROFİL
-- =============================================================

create or replace function app_private.dm_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_display text;
  v_code text;
begin
  v_display := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if v_username = '' then
    v_username := 'user';
  end if;
  -- benzersizlik
  if exists (select 1 from public.dm_profiles where username = v_username) then
    v_username := v_username || '_' || substr(md5(new.id::text), 1, 4);
  end if;
  v_code := upper(substr(md5(new.id::text || clock_timestamp()::text), 1, 8));

  insert into public.dm_profiles (id, username, display_name, friend_code)
  values (new.id, v_username, v_display, v_code)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists dm_on_auth_user_created on auth.users;
create trigger dm_on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.dm_handle_new_user();

-- =============================================================
-- RLS
-- =============================================================

alter table public.dm_profiles enable row level security;
alter table public.dm_connections enable row level security;
alter table public.dm_posts enable row level security;
alter table public.dm_post_reactions enable row level security;
alter table public.dm_post_comments enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_notifications enable row level security;

-- Profiller: kimlik doğrulanmış herkes keşif için görebilir; yalnızca kendini düzenler
drop policy if exists dm_profiles_select on public.dm_profiles;
create policy dm_profiles_select on public.dm_profiles
  for select to authenticated using (true);

drop policy if exists dm_profiles_insert on public.dm_profiles;
create policy dm_profiles_insert on public.dm_profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists dm_profiles_update on public.dm_profiles;
create policy dm_profiles_update on public.dm_profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Bağlantılar
drop policy if exists dm_connections_select on public.dm_connections;
create policy dm_connections_select on public.dm_connections
  for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists dm_connections_insert on public.dm_connections;
create policy dm_connections_insert on public.dm_connections
  for insert to authenticated
  with check (requester = auth.uid() and requester <> addressee);

drop policy if exists dm_connections_update on public.dm_connections;
create policy dm_connections_update on public.dm_connections
  for update to authenticated
  using (requester = auth.uid() or addressee = auth.uid())
  with check (requester = auth.uid() or addressee = auth.uid());

drop policy if exists dm_connections_delete on public.dm_connections;
create policy dm_connections_delete on public.dm_connections
  for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

-- Gönderiler
drop policy if exists dm_posts_select on public.dm_posts;
create policy dm_posts_select on public.dm_posts
  for select to authenticated
  using (author = auth.uid() or app_private.dm_are_connected(author, auth.uid()));

drop policy if exists dm_posts_insert on public.dm_posts;
create policy dm_posts_insert on public.dm_posts
  for insert to authenticated with check (author = auth.uid());

drop policy if exists dm_posts_delete on public.dm_posts;
create policy dm_posts_delete on public.dm_posts
  for delete to authenticated using (author = auth.uid());

-- Tepkiler
drop policy if exists dm_reactions_select on public.dm_post_reactions;
create policy dm_reactions_select on public.dm_post_reactions
  for select to authenticated using (app_private.dm_can_view_post(post_id));

drop policy if exists dm_reactions_insert on public.dm_post_reactions;
create policy dm_reactions_insert on public.dm_post_reactions
  for insert to authenticated
  with check (user_id = auth.uid() and app_private.dm_can_view_post(post_id));

drop policy if exists dm_reactions_delete on public.dm_post_reactions;
create policy dm_reactions_delete on public.dm_post_reactions
  for delete to authenticated using (user_id = auth.uid());

-- Yorumlar
drop policy if exists dm_comments_select on public.dm_post_comments;
create policy dm_comments_select on public.dm_post_comments
  for select to authenticated using (app_private.dm_can_view_post(post_id));

drop policy if exists dm_comments_insert on public.dm_post_comments;
create policy dm_comments_insert on public.dm_post_comments
  for insert to authenticated
  with check (author = auth.uid() and app_private.dm_can_view_post(post_id));

drop policy if exists dm_comments_delete on public.dm_post_comments;
create policy dm_comments_delete on public.dm_post_comments
  for delete to authenticated using (author = auth.uid());

-- Mesajlar
drop policy if exists dm_messages_select on public.dm_messages;
create policy dm_messages_select on public.dm_messages
  for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());

drop policy if exists dm_messages_insert on public.dm_messages;
create policy dm_messages_insert on public.dm_messages
  for insert to authenticated
  with check (sender = auth.uid() and app_private.dm_are_connected(sender, recipient));

drop policy if exists dm_messages_update on public.dm_messages;
create policy dm_messages_update on public.dm_messages
  for update to authenticated
  using (recipient = auth.uid()) with check (recipient = auth.uid());

-- Bildirimler (insert yalnızca trigger/security-definer ile)
drop policy if exists dm_notifications_select on public.dm_notifications;
create policy dm_notifications_select on public.dm_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists dm_notifications_update on public.dm_notifications;
create policy dm_notifications_update on public.dm_notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists dm_notifications_delete on public.dm_notifications;
create policy dm_notifications_delete on public.dm_notifications
  for delete to authenticated using (user_id = auth.uid());

-- =============================================================
-- REALTIME
-- =============================================================

alter table public.dm_messages replica identity full;
alter table public.dm_notifications replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_notifications'
  ) then
    alter publication supabase_realtime add table public.dm_notifications;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_posts'
  ) then
    alter publication supabase_realtime add table public.dm_posts;
  end if;
end $$;

-- =============================================================
-- STORAGE (gönderi görselleri + avatarlar)
-- =============================================================

insert into storage.buckets (id, name, public)
values ('dm-social', 'dm-social', true)
on conflict (id) do nothing;

drop policy if exists dm_storage_read on storage.objects;
create policy dm_storage_read on storage.objects
  for select to authenticated using (bucket_id = 'dm-social');

drop policy if exists dm_storage_insert on storage.objects;
create policy dm_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dm-social'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists dm_storage_delete on storage.objects;
create policy dm_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dm-social'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
