-- 20260917020000_votacion_publica.sql
-- VOTACIÓN PÚBLICA POR QR
-- Módulo 1 · Estructura de base de datos.
-- Pegar en Supabase → SQL Editor → Run.

-- Modelo:
--  · votantes          → primer voto GRATIS: correo + huella del dispositivo
--                        (Canvas/WebGL fingerprint) + IP + token.
--  · votos_publico     → cada voto emitido (tipo gratis|pago).
--  · pagos_yape        → desbloqueo de votos adicionales (verificación manual).
--  · config_votacion   → configuración por evento (activación, límites, montos).

-- ── 1. votantes ────────────────────────────────────────────────────────────
create table if not exists public.votantes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  email text not null,
  huella text not null,                 -- fingerprint hasheado (Canvas+WebGL) → anti-bypass
  ip text not null,
  token text not null,                  -- token de dispositivo (localStorage/sesión)
  votos_gratis_usados integer not null default 0,
  votos_pagados integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un dispositivo (huella/token) solo puede registrarse UNA vez por evento,
-- aunque cambie de correo (anti VPN / incógnito / email alternativo).
create unique index if not exists votantes_evento_huella_idx
  on public.votantes (evento_id, huella);
create unique index if not exists votantes_evento_token_idx
  on public.votantes (evento_id, token);
create index if not exists votantes_email_idx on public.votantes (email);
create index if not exists votantes_ip_idx on public.votantes (ip);

-- ── 2. votos_publico ───────────────────────────────────────────────────────
create table if not exists public.votos_publico (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  candidata_id uuid not null references public.candidatas (id) on delete cascade,
  votante_id uuid not null references public.votantes (id) on delete cascade,
  tipo text not null default 'gratis' check (tipo in ('gratis', 'pago')),
  created_at timestamptz not null default now()
);

create index if not exists votos_publico_evento_idx on public.votos_publico (evento_id);
create index if not exists votos_publico_evento_candidata_idx
  on public.votos_publico (evento_id, candidata_id);
create index if not exists votos_publico_votante_idx on public.votos_publico (votante_id);

-- ── 3. pagos_yape ──────────────────────────────────────────────────────────
create table if not exists public.pagos_yape (
  id uuid primary key default gen_random_uuid(),
  votante_id uuid not null references public.votantes (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  monto numeric(10, 2) not null check (monto > 0),
  numero_operacion text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'verificado', 'rechazado')),
  votos_otorgados integer not null default 0,
  verificado_por text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pagos_yape_votante_idx on public.pagos_yape (votante_id);
create index if not exists pagos_yape_evento_idx on public.pagos_yape (evento_id);
create index if not exists pagos_yape_estado_idx on public.pagos_yape (estado);

-- ── 4. config_votacion ────────────────────────────────────────────────────
create table if not exists public.config_votacion (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references public.eventos (id) on delete cascade,
  habilitada boolean not null default false,
  voto_gratis_por_dispositivo integer not null default 1,
  votos_por_pago integer not null default 1,
  monto_por_pago numeric(10, 2) not null default 3.00 check (monto_por_pago > 0),
  mensaje_bloqueo text,
  mensaje_exito text,
  updated_at timestamptz not null default now()
);

-- ── 5. updated_at automático (reutiliza touch_updated_at del proyecto) ─────
drop trigger if exists votantes_touch_updated_at on public.votantes;
create trigger votantes_touch_updated_at
  before update on public.votantes
  for each row
  execute function public.touch_updated_at();

drop trigger if exists pagos_yape_touch_updated_at on public.pagos_yape;
create trigger pagos_yape_touch_updated_at
  before update on public.pagos_yape
  for each row
  execute function public.touch_updated_at();

drop trigger if exists config_votacion_touch_updated_at on public.config_votacion;
create trigger config_votacion_touch_updated_at
  before update on public.config_votacion
  for each row
  execute function public.touch_updated_at();

-- ── 6. RLS desactivado (desarrollo) ───────────────────────────────────────
alter table public.votantes       disable row level security;
alter table public.votos_publico  disable row level security;
alter table public.pagos_yape     disable row level security;
alter table public.config_votacion disable row level security;