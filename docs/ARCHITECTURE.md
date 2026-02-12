# 1. Project Overview

La Torre es un juego web de progresion vertical por pisos. Cada piso contiene un desafio/puzzle y el jugador avanza solo si responde correctamente. El estado principal de progreso es el piso actual alcanzado.

Modos de uso:

- Anonimo: puede jugar, pero no persiste progreso.
- Registrado: progreso persistido en Supabase asociado a su cuenta.

Concepto core:

- El usuario intenta el piso actual.
- Si acierta, avanza al siguiente piso.
- Si falla, entra en cooldown antes de reintentar.

Ranking:

- Orden principal por `current_floor DESC`.
- Desempate por `current_floor_reached_at ASC` (quien llego antes gana el empate).

# 2. Security Model

Modelo server-authoritative:

- El cliente nunca decide progreso final.
- El cliente envia respuesta; el servidor valida y aplica avance.

Por que soluciones en `private`:

- Las respuestas no deben ser legibles por clientes.
- `private.floor_solutions` no es accesible por `anon` ni `authenticated`.

Por que progresion solo via `submit_answer()`:

- Evita manipulacion directa de `profiles.current_floor`.
- Permite validacion atomica con lock, cooldown, release checks y logging.

RLS overview:

- `profiles`: privacidad por usuario (lectura e insercion de su propia fila).
- `floors`: lectura publica solo de pisos activos y liberados.
- `attempts`: lectura/insercion solo del propio usuario autenticado.

Por que `profiles` es privado:

- Contiene estado sensible de cuenta/progreso.
- El ranking no se expone leyendo `profiles` directamente.

Por que leaderboard solo por RPC:

- `get_leaderboard(limit, offset)` expone solo columnas seguras.
- Aplica orden oficial y clamp al maximo piso activo liberado.

# 3. Database Model

## `public.badges`

Define hitos de insignias por piso minimo (`min_floor`). Se usa para recalcular `badge_id` al avanzar.

Relaciones:

- `profiles.badge_id -> badges.id`

## `public.profiles`

Perfil del jugador autenticado (1:1 con `auth.users`):

- `id` UUID PK (FK a `auth.users.id`)
- `username` unico
- `avatar_id` cosmetico permitido
- `badge_id` insignia actual
- `current_floor` progreso
- `current_floor_reached_at` timestamp para desempate en ranking
- `cooldown_floor`, `cooldown_until` estado de cooldown

## `public.floors`

Catalogo de pisos y contenido renderizable:

- `floor_number` PK
- `type` enum (`text`, `single_choice`, `image_question`, `interaction`)
- `payload` JSONB publico
- `release_at` bloqueo temporal por fecha
- `is_active` habilitacion operativa

## `private.floor_solutions`

Soluciones privadas por piso:

- `floor_number` PK/FK a `public.floors`
- `answer_hash`
- `answer_salt`
- `validator` JSONB (metadatos de validacion)
- `version`

No se expone al cliente.

## `public.attempts`

Bitacora de intentos:

- `user_id` FK a `profiles.id`
- `floor_number` FK a `floors.floor_number`
- `submitted_answer` JSONB
- `result` enum (`success`, `fail`, bloqueos)
- `attempted_at`
- `cooldown_until` (si aplica)
- `meta` JSONB

# 4. Progression Flow

1. Usuario envia respuesta.
2. Cliente llama RPC `submit_answer(floor, answer)`.
3. RPC obtiene `auth.uid()` y bloquea fila de perfil con `FOR UPDATE`.
4. Verifica que el piso enviado coincide con `current_floor`.
5. Verifica cooldown (`cooldown_floor`, `cooldown_until`).
6. Verifica release (`floors.release_at`, `is_active`).
7. Carga solucion privada y valida respuesta canonica.
8. Registra intento en `public.attempts`.
9. Si acierta:
   - incrementa `current_floor`
   - actualiza `current_floor_reached_at`
   - recalcula `badge_id` con `compute_badge_id()`
   - limpia cooldown
10. Si falla:
   - fija `cooldown_floor`
   - fija `cooldown_until` (ej. 24h)
11. Retorna resultado estructurado (`success`, `new_floor` o `reason`, `cooldown_until`).

# 5. Leaderboard Logic

El ranking se expone por RPC `get_leaderboard(limit, offset)` con solo:

- `username`
- `avatar_id`
- `badge_id`
- `current_floor`
- `current_floor_reached_at`

Orden oficial:

- `current_floor DESC`
- `current_floor_reached_at ASC`

Hardening:

- El piso retornado se clampa a `min(profile.current_floor, max_active_released_floor)`.
- Evita exponer progreso por encima del contenido activo/liberado.

# 6. Cooldown Model

Campos:

- `cooldown_floor`: piso al que aplica el bloqueo.
- `cooldown_until`: timestamp limite para reintento.

Reglas:

- Si el usuario falla en su piso actual, se establece cooldown.
- Si intenta durante cooldown, se rechaza y se loguea intento bloqueado.
- Si acierta, se limpia cooldown.

# 7. Future Extensions

## Advanced puzzle types

Placeholder para validadores especializados por tipo, versionado de validadores y canonicalizacion por puzzle.

## Anti-cheat rate limiting

Placeholder para rate limiting por usuario/IP en Edge Functions, deteccion de patrones y auditoria extendida.

## Seasonal resets

Placeholder para temporadas, snapshots de ranking y recompensas por temporada.

## Admin tools

Placeholder para panel/admin RPCs de carga de pisos, versionado de soluciones, activacion y schedule de releases.
