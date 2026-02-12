-- La Torre - Supabase schema (idempotent, deploy-from-scratch)

-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists citext;
create extension if not exists pgcrypto;

-- =========================================================
-- Enums
-- =========================================================
do $$
begin
  create type public.puzzle_type as enum ('text', 'single_choice', 'image_question', 'interaction');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.attempt_result as enum ('success', 'fail', 'blocked_cooldown', 'blocked_release', 'blocked_not_current');
exception
  when duplicate_object then null;
end
$$;

-- =========================================================
-- Badges
-- =========================================================
create table if not exists public.badges (
  id smallint primary key,
  name text not null unique,
  min_floor integer not null unique check (min_floor >= 1)
);

insert into public.badges (id, name, min_floor)
values
  (1, 'Novice', 1),
  (2, 'Bronze', 25),
  (3, 'Silver', 50),
  (4, 'Gold', 75),
  (5, 'Master', 100)
on conflict (id) do update
set
  name = excluded.name,
  min_floor = excluded.min_floor;

create or replace function public.compute_badge_id(p_floor integer)
returns smallint
language sql
stable
as $$
  select b.id
  from public.badges b
  where b.min_floor <= p_floor
  order by b.min_floor desc
  limit 1
$$;

-- =========================================================
-- Profiles
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique
    check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  avatar_id smallint not null default 1 check (avatar_id between 1 and 64),
  badge_id smallint not null default 1 references public.badges(id),
  current_floor integer not null default 1 check (current_floor >= 1),
  current_floor_reached_at timestamptz not null default now(),
  cooldown_floor integer null check (cooldown_floor is null or cooldown_floor >= 1),
  cooldown_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_ranking
  on public.profiles (current_floor desc, current_floor_reached_at asc);

create index if not exists idx_profiles_username
  on public.profiles (username);

-- =========================================================
-- Floors
-- =========================================================
create table if not exists public.floors (
  floor_number integer primary key check (floor_number >= 1),
  type public.puzzle_type not null,
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  release_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_floors_release
  on public.floors (release_at);

create index if not exists idx_floors_active_release
  on public.floors (is_active, release_at);

-- =========================================================
-- Private solutions
-- =========================================================
create schema if not exists private;

create table if not exists private.floor_solutions (
  floor_number integer primary key references public.floors(floor_number) on delete cascade,
  answer_hash text not null,
  answer_salt text not null,
  validator jsonb not null default '{}'::jsonb
    check (jsonb_typeof(validator) = 'object'),
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Attempts
-- =========================================================
create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  floor_number integer not null references public.floors(floor_number) on delete restrict,
  submitted_answer jsonb not null default '{}'::jsonb,
  result public.attempt_result not null,
  attempted_at timestamptz not null default now(),
  cooldown_until timestamptz null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_attempts_user_time
  on public.attempts (user_id, attempted_at desc);

create index if not exists idx_attempts_user_floor_time
  on public.attempts (user_id, floor_number, attempted_at desc);

create index if not exists idx_attempts_failed
  on public.attempts (user_id, floor_number, attempted_at desc)
  where result = 'fail';

-- =========================================================
-- updated_at helper + triggers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_floors_updated_at on public.floors;
create trigger trg_floors_updated_at
before update on public.floors
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS policies
-- =========================================================
alter table public.profiles enable row level security;
alter table public.floors enable row level security;
alter table public.attempts enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists floors_read_released on public.floors;
create policy floors_read_released
on public.floors for select
to anon, authenticated
using (is_active = true and release_at <= now());

drop policy if exists attempts_select_own on public.attempts;
create policy attempts_select_own
on public.attempts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists attempts_insert_own on public.attempts;
create policy attempts_insert_own
on public.attempts for insert
to authenticated
with check (user_id = auth.uid());

-- Lock progression columns from direct client updates.
revoke update (current_floor, badge_id, current_floor_reached_at, cooldown_floor, cooldown_until)
on public.profiles from anon, authenticated;

-- No generic profile updates from clients.
revoke update on public.profiles from anon, authenticated;

-- Private schema/table lockdown.
revoke all on schema private from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

-- =========================================================
-- RPC: submit_answer (server-authoritative progression)
-- =========================================================
create or replace function public.submit_answer(p_floor integer, p_answer jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_uid uuid;
  v_profile public.profiles%rowtype;
  v_floor public.floors%rowtype;
  v_solution private.floor_solutions%rowtype;
  v_now timestamptz := now();
  v_ok boolean := false;
  v_cooldown interval := interval '24 hours';
  v_new_floor integer;
  v_submitted text;
  v_hash text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('success', false, 'reason', 'unauthenticated');
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'profile_not_found');
  end if;

  if p_floor <> v_profile.current_floor then
    insert into public.attempts (user_id, floor_number, submitted_answer, result, attempted_at)
    values (v_uid, p_floor, coalesce(p_answer, '{}'::jsonb), 'blocked_not_current', v_now);
    return jsonb_build_object('success', false, 'reason', 'not_current_floor');
  end if;

  if v_profile.cooldown_floor = p_floor
     and v_profile.cooldown_until is not null
     and v_profile.cooldown_until > v_now then
    insert into public.attempts (user_id, floor_number, submitted_answer, result, attempted_at, cooldown_until)
    values (v_uid, p_floor, coalesce(p_answer, '{}'::jsonb), 'blocked_cooldown', v_now, v_profile.cooldown_until);
    return jsonb_build_object('success', false, 'reason', 'cooldown', 'cooldown_until', v_profile.cooldown_until);
  end if;

  select *
  into v_floor
  from public.floors
  where floor_number = p_floor
    and is_active = true;

  if not found or v_floor.release_at > v_now then
    insert into public.attempts (user_id, floor_number, submitted_answer, result, attempted_at)
    values (v_uid, p_floor, coalesce(p_answer, '{}'::jsonb), 'blocked_release', v_now);
    return jsonb_build_object('success', false, 'reason', 'not_released');
  end if;

  select *
  into v_solution
  from private.floor_solutions
  where floor_number = p_floor;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'solution_not_configured');
  end if;

  v_submitted := lower(trim(coalesce(p_answer ->> 'value', '')));
  v_hash := encode(digest(v_submitted || ':' || v_solution.answer_salt, 'sha256'), 'hex');
  v_ok := (v_hash = v_solution.answer_hash);

  if v_ok then
    v_new_floor := v_profile.current_floor + 1;

    update public.profiles
    set current_floor = v_new_floor,
        current_floor_reached_at = v_now,
        badge_id = coalesce(public.compute_badge_id(v_new_floor), badge_id),
        cooldown_floor = null,
        cooldown_until = null
    where id = v_uid;

    insert into public.attempts (user_id, floor_number, submitted_answer, result, attempted_at)
    values (v_uid, p_floor, coalesce(p_answer, '{}'::jsonb), 'success', v_now);

    return jsonb_build_object('success', true, 'new_floor', v_new_floor);
  else
    update public.profiles
    set cooldown_floor = p_floor,
        cooldown_until = v_now + v_cooldown
    where id = v_uid;

    insert into public.attempts (user_id, floor_number, submitted_answer, result, attempted_at, cooldown_until)
    values (v_uid, p_floor, coalesce(p_answer, '{}'::jsonb), 'fail', v_now, v_now + v_cooldown);

    return jsonb_build_object('success', false, 'reason', 'wrong_answer', 'cooldown_until', v_now + v_cooldown);
  end if;
end;
$$;

revoke all on function public.submit_answer(integer, jsonb) from public;
grant execute on function public.submit_answer(integer, jsonb) to authenticated;

-- =========================================================
-- RPC: get_leaderboard (safe public projection + clamp)
-- =========================================================
create or replace function public.get_leaderboard(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  username text,
  avatar_id smallint,
  badge_id smallint,
  current_floor integer,
  current_floor_reached_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with max_floor as (
    select coalesce(max(f.floor_number), 1) as v
    from public.floors f
    where f.is_active = true
      and f.release_at <= now()
  ),
  ranked as (
    select
      p.username::text as username,
      p.avatar_id,
      p.badge_id,
      least(p.current_floor, mf.v)::integer as current_floor,
      p.current_floor_reached_at
    from public.profiles p
    cross join max_floor mf
  )
  select
    r.username,
    r.avatar_id,
    r.badge_id,
    r.current_floor,
    r.current_floor_reached_at
  from ranked r
  order by r.current_floor desc, r.current_floor_reached_at asc
  limit least(greatest(coalesce(p_limit, 50), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_leaderboard(integer, integer) from public;
grant execute on function public.get_leaderboard(integer, integer) to anon, authenticated;

-- =========================================================
-- RPC: update_avatar (cosmetic-only update)
-- =========================================================
create or replace function public.update_avatar(p_avatar_id smallint)
returns table (
  avatar_id smallint,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated';
  end if;

  if p_avatar_id is null or p_avatar_id < 1 or p_avatar_id > 64 then
    raise exception 'invalid_avatar_id';
  end if;

  update public.profiles
  set avatar_id = p_avatar_id
  where id = v_uid;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return query
  select p.avatar_id, p.updated_at
  from public.profiles p
  where p.id = v_uid;
end;
$$;

revoke all on function public.update_avatar(smallint) from public;
grant execute on function public.update_avatar(smallint) to authenticated;

-- =========================================================
-- Profile bootstrap trigger on auth.users
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_raw_username text;
  v_base_username text;
  v_candidate text;
  v_avatar smallint := 1;
  v_suffix integer := 0;
  v_inserted uuid;
begin
  v_raw_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');

  if v_raw_username is not null then
    v_base_username := lower(regexp_replace(v_raw_username, '[^a-zA-Z0-9_]', '', 'g'));
  end if;

  if v_base_username is null or v_base_username !~ '^[a-z0-9_]{3,24}$' then
    v_base_username := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  if (new.raw_user_meta_data ->> 'avatar_id') ~ '^\d+$' then
    v_avatar := (new.raw_user_meta_data ->> 'avatar_id')::smallint;
  end if;

  if v_avatar < 1 or v_avatar > 64 then
    v_avatar := 1;
  end if;

  loop
    if v_suffix = 0 then
      v_candidate := v_base_username;
    else
      v_candidate := left(v_base_username, greatest(1, 24 - length(v_suffix::text) - 1)) || '_' || v_suffix::text;
    end if;

    insert into public.profiles (
      id,
      username,
      avatar_id,
      badge_id,
      current_floor,
      current_floor_reached_at
    )
    values (
      new.id,
      v_candidate,
      v_avatar,
      coalesce(public.compute_badge_id(1), 1),
      1,
      now()
    )
    on conflict (username) do nothing
    returning id into v_inserted;

    exit when v_inserted is not null;

    v_suffix := v_suffix + 1;
    if v_suffix > 200 then
      raise exception 'Could not allocate unique username for user %', new.id;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================
-- Backfill missing profiles for existing auth.users
-- =========================================================
do $$
declare
  r record;
  v_base text;
  v_candidate text;
  v_suffix integer;
  v_done boolean;
begin
  for r in
    select u.id
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    v_base := 'player_' || substr(replace(r.id::text, '-', ''), 1, 8);
    v_suffix := 0;
    v_done := false;

    while not v_done loop
      if v_suffix = 0 then
        v_candidate := v_base;
      else
        v_candidate := left(v_base, greatest(1, 24 - length(v_suffix::text) - 1)) || '_' || v_suffix::text;
      end if;

      begin
        insert into public.profiles (
          id,
          username,
          avatar_id,
          badge_id,
          current_floor,
          current_floor_reached_at
        )
        values (
          r.id,
          v_candidate,
          1,
          coalesce(public.compute_badge_id(1), 1),
          1,
          now()
        );
        v_done := true;
      exception
        when unique_violation then
          v_suffix := v_suffix + 1;
          if v_suffix > 200 then
            raise exception 'Backfill failed to allocate username for user %', r.id;
          end if;
      end;
    end loop;
  end loop;
end
$$;
