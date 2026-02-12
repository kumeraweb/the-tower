-- DEVELOPMENT ONLY:
-- Seed de pisos y soluciones de ejemplo para entorno local/testing.
-- No usar este archivo como fuente de verdad de produccion.

-- =========================================================
-- Sample floors 1..10
-- =========================================================
insert into public.floors (floor_number, type, payload, release_at, is_active)
select
  gs as floor_number,
  'text'::public.puzzle_type as type,
  jsonb_build_object(
    'prompt', format('Piso %s: escribe la clave correcta', gs),
    'input', 'text'
  ) as payload,
  now() as release_at,
  true as is_active
from generate_series(1, 10) gs
on conflict (floor_number) do update
set
  type = excluded.type,
  payload = excluded.payload,
  release_at = excluded.release_at,
  is_active = excluded.is_active,
  updated_at = now();

-- =========================================================
-- Matching private.floor_solutions (deterministic salts)
-- Answer format used in this seed: "clave_<floor_number>"
-- Hash formula: sha256(lower(trim(answer)) || ':' || salt)
-- =========================================================
with src as (
  select
    gs as floor_number,
    format('clave_%s', gs) as plain_answer,
    format('dev_salt_floor_%s', lpad(gs::text, 2, '0')) as salt
  from generate_series(1, 10) gs
)
insert into private.floor_solutions (
  floor_number,
  answer_hash,
  answer_salt,
  validator,
  version
)
select
  s.floor_number,
  encode(digest(lower(trim(s.plain_answer)) || ':' || s.salt, 'sha256'), 'hex') as answer_hash,
  s.salt as answer_salt,
  jsonb_build_object('canonical', 'lower_trim_text') as validator,
  1 as version
from src s
on conflict (floor_number) do update
set
  answer_hash = excluded.answer_hash,
  answer_salt = excluded.answer_salt,
  validator = excluded.validator,
  version = private.floor_solutions.version + 1,
  updated_at = now();

-- =========================================================
-- Example: explicit answer_hash computation for one text puzzle
-- =========================================================
-- Example answer: "clave_1"
-- Example salt:   "dev_salt_floor_01"
-- Expected computation:
select encode(digest(lower(trim('clave_1')) || ':' || 'dev_salt_floor_01', 'sha256'), 'hex') as example_hash;
