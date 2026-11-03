-- Phase A: close privilege-escalation holes while staying compatible with the live client.

-- Role helpers. SECURITY DEFINER so policies on profiles don't recurse through profiles RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (is_admin = true or is_arbiter = true));
$$;

-- Server-side FCA ids (clients used to pick random ones, which could collide).
create sequence if not exists public.fca_id_seq start 1001;

create or replace function public.generate_fca_id()
returns text language plpgsql security definer set search_path = public as $$
declare candidate text;
begin
  loop
    candidate := 'FCA-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.fca_id_seq')::text, 4, '0');
    exit when not exists (select 1 from public.profiles where fca_id = candidate);
  end loop;
  return candidate;
end $$;

-- Invite redemptions (audit trail + one redemption per member per invite).
create table if not exists public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invite_links(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.invite_role not null,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, profile_id)
);
alter table public.invite_redemptions enable row level security;
drop policy if exists "Admins can view invite redemptions" on public.invite_redemptions;
create policy "Admins can view invite redemptions" on public.invite_redemptions
  for select to authenticated using (public.is_admin());

-- Profiles: API callers can no longer grant themselves roles, approval, ratings or titles.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Service role, edge functions and SECURITY DEFINER functions run as other roles and are trusted.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.fca_id := public.generate_fca_id();
    new.is_admin := false;
    new.is_arbiter := false;
    new.is_immortal := false;
    new.status := 'PENDING';
    new.earned_title := 'NONE';
    new.invited_by := null;
    new.created_at := now();
    new.blitz_elo := 1200; new.rapid_elo := 1200; new.bullet_elo := 1200; new.classical_elo := 1200;
    new.peak_blitz_elo := 1200; new.peak_rapid_elo := 1200; new.peak_bullet_elo := 1200; new.peak_classical_elo := 1200;
    new.blitz_games := 0; new.rapid_games := 0; new.bullet_games := 0; new.classical_games := 0;
    new.lichess_username := null;
    new.chesscom_username := null;
    return new;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  new.is_immortal := old.is_immortal;

  if public.is_admin() then
    return new;
  end if;

  new.fca_id := old.fca_id;
  new.is_admin := old.is_admin;
  new.is_arbiter := old.is_arbiter;
  new.status := old.status;
  new.earned_title := old.earned_title;
  new.invited_by := old.invited_by;
  new.blitz_elo := old.blitz_elo; new.rapid_elo := old.rapid_elo;
  new.bullet_elo := old.bullet_elo; new.classical_elo := old.classical_elo;
  new.peak_blitz_elo := old.peak_blitz_elo; new.peak_rapid_elo := old.peak_rapid_elo;
  new.peak_bullet_elo := old.peak_bullet_elo; new.peak_classical_elo := old.peak_classical_elo;
  new.blitz_games := old.blitz_games; new.rapid_games := old.rapid_games;
  new.bullet_games := old.bullet_games; new.classical_games := old.classical_games;
  return new;
end $$;

drop trigger if exists protect_profile_fields_trg on public.profiles;
create trigger protect_profile_fields_trg
  before insert or update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Signup trigger: never trust role/status from client metadata; validate invite tokens server-side.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_invite public.invite_links%rowtype;
  v_status public.player_status := 'PENDING';
  v_is_admin boolean := false;
  v_is_arbiter boolean := false;
  v_ref uuid;
  v_token text := nullif(btrim(meta->>'invite_token'), '');
  v_ref_code text := nullif(btrim(meta->>'ref'), '');
  v_lichess text := nullif(btrim(meta->>'lichess_username'), '');
  v_chesscom text := nullif(btrim(meta->>'chesscom_username'), '');
  v_gender text := upper(coalesce(meta->>'gender', ''));
begin
  if v_token is not null then
    select * into v_invite from public.invite_links
     where token = v_token and is_active and expires_at > now() and used_count < max_uses
     for update;
    if found then
      v_status := 'APPROVED';
      v_is_admin := v_invite.role = 'ADMIN';
      v_is_arbiter := v_invite.role = 'ARBITER';
    end if;
  end if;

  if v_ref_code is not null then
    select id into v_ref from public.profiles
     where upper(fca_id) = upper(v_ref_code) or id::text = v_ref_code
     limit 1;
  end if;

  if v_lichess is not null and exists (select 1 from public.profiles where lower(lichess_username) = lower(v_lichess)) then
    v_lichess := null;
  end if;
  if v_chesscom is not null and exists (select 1 from public.profiles where lower(chesscom_username) = lower(v_chesscom)) then
    v_chesscom := null;
  end if;

  insert into public.profiles (
    id, fca_id, full_name, reg_number, department, faculty, phone, gender, is_alumni,
    lichess_username, chesscom_username, status, is_admin, is_arbiter, invited_by
  ) values (
    new.id,
    public.generate_fca_id(),
    left(coalesce(nullif(btrim(meta->>'full_name'), ''), split_part(new.email, '@', 1), 'Member'), 80),
    left(coalesce(nullif(btrim(meta->>'reg_number'), ''), 'N/A'), 40),
    left(coalesce(nullif(btrim(meta->>'department'), ''), 'N/A'), 120),
    left(coalesce(nullif(btrim(meta->>'faculty'), ''), 'N/A'), 120),
    left(nullif(btrim(meta->>'phone'), ''), 30),
    case when v_gender in ('MALE', 'FEMALE') then v_gender else null end,
    coalesce((meta->>'is_alumni')::boolean, false),
    v_lichess, v_chesscom, v_status, v_is_admin, v_is_arbiter, v_ref
  )
  on conflict (id) do nothing;

  if v_invite.id is not null then
    update public.invite_links set used_count = used_count + 1 where id = v_invite.id;
    insert into public.invite_redemptions (invite_id, profile_id, role)
    values (v_invite.id, new.id, v_invite.role)
    on conflict do nothing;
  end if;

  return new;
exception when others then
  -- Never block account creation: fall back to a minimal pending profile.
  begin
    insert into public.profiles (id, fca_id, full_name, reg_number, department, faculty)
    values (new.id, public.generate_fca_id(), coalesce(split_part(new.email, '@', 1), 'Member'), 'N/A', 'N/A', 'N/A')
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end $$;

-- Invite helpers: look up one token, or redeem it while signed in. The table itself is no longer public.
create or replace function public.get_invite(p_token text)
returns table (role public.invite_role, valid boolean, reason text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.role,
         (i.is_active and i.expires_at > now() and i.used_count < i.max_uses),
         case
           when not i.is_active then 'disabled'
           when i.expires_at <= now() then 'expired'
           when i.used_count >= i.max_uses then 'used'
         end,
         i.expires_at
    from public.invite_links i
   where i.token = p_token;
$$;

create or replace function public.redeem_invite(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invite_links%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sign in first to accept this invite.';
  end if;
  select * into v_invite from public.invite_links where token = p_token for update;
  if not found then raise exception 'This invite link is not valid.'; end if;
  if not v_invite.is_active then raise exception 'This invite link has been disabled.'; end if;
  if v_invite.expires_at <= now() then raise exception 'This invite link has expired.'; end if;
  if v_invite.used_count >= v_invite.max_uses then raise exception 'This invite link has already been used up.'; end if;
  if exists (select 1 from public.invite_redemptions where invite_id = v_invite.id and profile_id = v_uid) then
    raise exception 'You have already accepted this invite.';
  end if;

  update public.profiles
     set is_admin = is_admin or v_invite.role = 'ADMIN',
         is_arbiter = is_arbiter or v_invite.role = 'ARBITER',
         status = 'APPROVED'
   where id = v_uid;
  update public.invite_links set used_count = used_count + 1 where id = v_invite.id;
  insert into public.invite_redemptions (invite_id, profile_id, role) values (v_invite.id, v_uid, v_invite.role);
  return v_invite.role::text;
end $$;

-- Policies
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Allow update on games" on public.games;
drop policy if exists "Only admins/arbiters can insert games" on public.games;
drop policy if exists "Staff can insert games" on public.games;
drop policy if exists "Staff can update games" on public.games;
drop policy if exists "Staff can delete games" on public.games;
create policy "Staff can insert games" on public.games
  for insert to authenticated with check (public.is_staff());
create policy "Staff can update games" on public.games
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff can delete games" on public.games
  for delete to authenticated using (public.is_staff());

drop policy if exists "Anyone can read invite links by token" on public.invite_links;
drop policy if exists "Admins can manage invite links" on public.invite_links;
create policy "Admins can manage invite links" on public.invite_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Only admins/arbiters can manage tournaments" on public.tournaments;
drop policy if exists "Staff can manage tournaments" on public.tournaments;
create policy "Staff can manage tournaments" on public.tournaments
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Games: real Lichess ids, real played-at time, link to the event.
alter table public.games add column if not exists lichess_game_id text;
alter table public.games add column if not exists external_url text;
alter table public.games add column if not exists played_at timestamptz;
alter table public.games add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;
alter table public.games add column if not exists created_by uuid references public.profiles(id) on delete set null default auth.uid();
alter table public.games add column if not exists notes text;

update public.games
   set lichess_game_id = substring(event_name from '\[([A-Za-z0-9]{8,12})\]\s*$')
 where lichess_game_id is null and event_name ~ '\[[A-Za-z0-9]{8,12}\]\s*$';
update public.games
   set event_name = btrim(regexp_replace(regexp_replace(event_name, '\s*\[[A-Za-z0-9]{8,12}\]\s*$', ''), '\s{2,}', ' ', 'g'));
update public.games
   set external_url = 'https://lichess.org/' || lichess_game_id
 where lichess_game_id is not null and external_url is null;
update public.games set played_at = created_at where played_at is null;
alter table public.games alter column played_at set default now();
alter table public.games alter column played_at set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'games_lichess_game_id_key') then
    alter table public.games add constraint games_lichess_game_id_key unique (lichess_game_id);
  end if;
end $$;
create index if not exists games_played_at_idx on public.games (played_at);
create index if not exists games_white_player_idx on public.games (white_player_id);
create index if not exists games_black_player_idx on public.games (black_player_id);
create index if not exists games_tournament_idx on public.games (tournament_id);

create or replace function public.normalize_game_row()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.lichess_game_id is null and new.event_name ~ '\[[A-Za-z0-9]{8,12}\]\s*$' then
    new.lichess_game_id := substring(new.event_name from '\[([A-Za-z0-9]{8,12})\]\s*$');
  end if;
  if new.event_name is not null then
    new.event_name := btrim(regexp_replace(regexp_replace(new.event_name, '\s*\[[A-Za-z0-9]{8,12}\]\s*$', ''), '\s{2,}', ' ', 'g'));
  end if;
  if new.lichess_game_id is not null and new.external_url is null then
    new.external_url := 'https://lichess.org/' || new.lichess_game_id;
  end if;
  if new.played_at is null then
    new.played_at := coalesce(new.created_at, now());
  end if;
  return new;
end $$;

drop trigger if exists games_normalize_trg on public.games;
create trigger games_normalize_trg
  before insert or update on public.games
  for each row execute function public.normalize_game_row();

-- Storage: members can only write inside their own avatars/<uid>/ folder (was: anyone, even logged out).
drop policy if exists "Users can delete avatars" on storage.objects;
drop policy if exists "Users can update avatars" on storage.objects;
drop policy if exists "Users can upload avatars" on storage.objects;
drop policy if exists "Members upload own avatar" on storage.objects;
drop policy if exists "Members update own avatar" on storage.objects;
drop policy if exists "Members delete own avatar" on storage.objects;
create policy "Members upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "Members update own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "Members delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
 where id = 'avatars';

-- Tournaments: Lichess arena linkage + fields the client already tries to write.
alter table public.tournaments add column if not exists time_control text;
alter table public.tournaments add column if not exists lichess_arena_id text;
alter table public.tournaments add column if not exists ends_at timestamptz;
alter table public.tournaments add column if not exists nb_players int;
alter table public.tournaments add column if not exists lichess_status int;
alter table public.tournaments add column if not exists lichess_creator text;
alter table public.tournaments add column if not exists rating_cap int;
alter table public.tournaments add column if not exists synced_at timestamptz;
alter table public.tournaments alter column created_by set default auth.uid();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tournaments_lichess_arena_id_key') then
    alter table public.tournaments add constraint tournaments_lichess_arena_id_key unique (lichess_arena_id);
  end if;
end $$;
