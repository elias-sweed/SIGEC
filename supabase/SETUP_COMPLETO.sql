-- =============================================
-- SIGEC — SETUP COMPLETO DE BASE DE DATOS
-- Pegar TODO en: Supabase → SQL Editor → "New query" → Run
-- =============================================

-- 1. Tablas base
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  etapa text not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table if not exists public.candidatas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grado text not null,
  seccion text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.jurados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.criterios (
  id uuid primary key default gen_random_uuid(),
  etapa text not null,
  nombre text not null,
  puntaje_maximo numeric(5, 2) not null check (puntaje_maximo > 0),
  indicadores text,
  es_desempate boolean not null default false,
  orden integer not null check (orden > 0),
  unique (etapa, orden)
);

create table if not exists public.reglamento_etapa (
  id uuid primary key default gen_random_uuid(),
  etapa text not null unique,
  contenido text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  candidata_id uuid not null references public.candidatas (id) on delete cascade,
  jurado_id uuid not null references public.jurados (id) on delete cascade,
  estado text not null default 'pendiente',
  es_ensayo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, candidata_id, jurado_id)
);

-- 2. Detalles de evaluación (puntajes por criterio)
create table if not exists public.evaluacion_detalles (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones (id) on delete cascade,
  criterio_id uuid not null references public.criterios (id),
  puntaje numeric(5, 2) not null check (puntaje >= 0),
  created_at timestamptz not null default now(),
  unique (evaluacion_id, criterio_id)
);

-- 3. Estado del evento (candidata activa)
create table if not exists public.estado_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references public.eventos (id),
  candidata_actual_id uuid references public.candidatas (id),
  estado text not null default 'inactivo',
  pantalla_escena text not null default 'inicio',
  modo_ensayo boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 4. Índices
create index if not exists evaluaciones_evento_idx on public.evaluaciones (evento_id);
create index if not exists evaluaciones_candidata_idx on public.evaluaciones (candidata_id);
create index if not exists evaluaciones_jurado_idx on public.evaluaciones (jurado_id);
create index if not exists criterios_etapa_idx on public.criterios (etapa);
create index if not exists evaluacion_detalles_evaluacion_idx on public.evaluacion_detalles (evaluacion_id);
create index if not exists evaluacion_detalles_criterio_idx on public.evaluacion_detalles (criterio_id);
create index if not exists estado_evento_evento_idx on public.estado_evento (evento_id);

-- 5. Desactivar RLS (desarrollo)
alter table public.eventos             disable row level security;
alter table public.candidatas          disable row level security;
alter table public.jurados             disable row level security;
alter table public.criterios           disable row level security;
alter table public.evaluaciones        disable row level security;
alter table public.evaluacion_detalles disable row level security;
alter table public.estado_evento       disable row level security;

-- 6. Columnas de jurado para sesión y activación por QR
alter table public.jurados add column if not exists en_sesion boolean not null default false;
alter table public.jurados add column if not exists activado boolean not null default false;
alter table public.jurados add column if not exists email_interno text;
alter table public.jurados add column if not exists auth_uid uuid;
alter table public.jurados add column if not exists token_acceso text;

-- Índice único en token_acceso (QW-03): garantiza que un QR no se duplique
create unique index if not exists jurados_token_acceso_idx
  on public.jurados (token_acceso);

-- 6b. Indicadores de criterios
alter table public.criterios add column if not exists indicadores text;

-- 6c. updated_at automático en evaluaciones (corrige error 400 del update)
alter table public.evaluaciones add column if not exists updated_at timestamptz not null default now();
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists evaluaciones_touch_updated_at on public.evaluaciones;
create trigger evaluaciones_touch_updated_at
  before update on public.evaluaciones
  for each row
  execute function public.touch_updated_at();

-- 7. Tabla de auditoría
create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario text not null,
  accion text not null,
  descripcion text,
  created_at timestamptz not null default now()
);
create index if not exists auditoria_created_at_idx on public.auditoria (created_at desc);
alter table public.auditoria disable row level security;

-- =============================================
-- SIGEC — POLÍTICAS RLS PARA DESARROLLO
-- Las tablas clave (p. ej. auth.users) usan Supabase Auth con
-- correo interno jur-XXX@gmail.com (dominio con MX válido).
-- La tabla public.jurados registra activado/email_interno/auth_uid.
-- =============================================