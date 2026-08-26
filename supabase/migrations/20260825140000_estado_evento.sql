-- SIGEC · Fuente de verdad para la candidata activa (Fase 04)
-- Reemplaza localStorage: el Panel Maestro escribe aquí y todos
-- los demás componentes leen desde Supabase.
-- Solo debe existir un registro por evento.

create table public.estado_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references public.eventos (id),
  candidata_actual_id uuid references public.candidatas (id),
  estado text not null default 'inactivo',
  updated_at timestamptz not null default now()
);

create index estado_evento_evento_idx on public.estado_evento (evento_id);
