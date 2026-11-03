-- Phase F: run ONLY AFTER the new web app is deployed.
-- The old app reads profiles with select('*') and writes lichess/chess.com handles from the browser;
-- this migration ends both.

-- 1. Handles can only be set by verified linking (fca-api edge function) or by admins.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path = public as $$
begin
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
  new.lichess_username := old.lichess_username;
  new.chesscom_username := old.chesscom_username;
  new.blitz_elo := old.blitz_elo; new.rapid_elo := old.rapid_elo;
  new.bullet_elo := old.bullet_elo; new.classical_elo := old.classical_elo;
  new.peak_blitz_elo := old.peak_blitz_elo; new.peak_rapid_elo := old.peak_rapid_elo;
  new.peak_bullet_elo := old.peak_bullet_elo; new.peak_classical_elo := old.peak_classical_elo;
  new.blitz_games := old.blitz_games; new.rapid_games := old.rapid_games;
  new.bullet_games := old.bullet_games; new.classical_games := old.classical_games;
  return new;
end $$;

-- 2. Signup metadata can no longer claim a Lichess/Chess.com handle.
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

  insert into public.profiles (
    id, fca_id, full_name, reg_number, department, faculty, phone, gender, is_alumni,
    status, is_admin, is_arbiter, invited_by
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
    v_status, v_is_admin, v_is_arbiter, v_ref
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
  begin
    insert into public.profiles (id, fca_id, full_name, reg_number, department, faculty)
    values (new.id, public.generate_fca_id(), coalesce(split_part(new.email, '@', 1), 'Member'), 'N/A', 'N/A', 'N/A')
    on conflict (id) do nothing;
  exception when others then
    null;
  end;
  return new;
end $$;

-- 3. Phone and registration numbers stop being public. Admins read them via admin_members(),
--    members read their own via my_private_profile(). New profile columns need adding here.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, fca_id, full_name, department, faculty, gender, is_alumni, bio, avatar_url,
  lichess_username, chesscom_username, whatsapp_joined,
  blitz_elo, rapid_elo, bullet_elo, classical_elo,
  peak_blitz_elo, peak_rapid_elo, peak_bullet_elo, peak_classical_elo,
  blitz_games, rapid_games, bullet_games, classical_games,
  earned_title, is_immortal, is_admin, is_arbiter, status, invited_by, created_at
) on public.profiles to anon, authenticated;
