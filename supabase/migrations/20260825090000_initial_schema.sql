-- SIGEC · Esquema inicial (Fase 02)
-- Tablas base del certamen: eventos, candidatas, jurados, criterios y evaluaciones.
-- Sin autenticación ni RLS por ahora; se agregarán en fases posteriores.

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  etapa text not null,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now()
);

create table public.candidatas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grado text not null,
  seccion text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

create table public.jurados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  created_at timestamptz not null default now()
);

-- Criterios configurables por etapa: el puntaje máximo se define aquí,
-- nunca hardcodeado en el frontend.
create table public.criterios (
  id uuid primary key default gen_random_uuid(),
  etapa text not null,
  nombre text not null,
  puntaje_maximo numeric(5, 2) not null check (puntaje_maximo > 0),
  orden integer not null check (orden > 0),
  unique (etapa, orden)
);

-- Una evaluación = un jurado evalúa a una candidata en un evento.
-- Los puntajes por criterio se guardarán en otra fase.
create table public.evaluaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  candidata_id uuid not null references public.candidatas (id) on delete cascade,
  jurado_id uuid not null references public.jurados (id) on delete cascade,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  unique (evento_id, candidata_id, jurado_id)
);

create index evaluaciones_evento_idx on public.evaluaciones (evento_id);
create index evaluaciones_candidata_idx on public.evaluaciones (candidata_id);
create index evaluaciones_jurado_idx on public.evaluaciones (jurado_id);
create index criterios_etapa_idx on public.criterios (etapa);
