-- 20260917010000_jurados_evento.sql
-- Cada evento tendrá SUS PROPIOS jurados (la Final con jurados nuevos).
-- Pegar en Supabase → SQL Editor → Run (después de candidatas_evento).

-- 1) Columna evento_id en jurados
alter table public.jurados
  add column if not exists evento_id uuid references public.eventos (id) on delete cascade;

-- 2) Los jurados existentes (sin evento) se asignan al evento más antiguo
--    (la PRIMERA etapa); la Final queda con lista propia vacía.
update public.jurados
  set evento_id = (select id from public.eventos order by created_at asc limit 1)
  where evento_id is null;

-- 3) Índice para consultas por evento
create index if not exists jurados_evento_idx on public.jurados (evento_id);