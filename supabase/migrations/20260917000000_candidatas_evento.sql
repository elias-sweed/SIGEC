-- 20260917000000_candidatas_evento.sql
-- Cada evento tendrá SU PROPIA lista de candidatas.
-- Pegar en Supabase → SQL Editor → Run.

-- 1) Columna evento_id en candidatas
alter table public.candidatas
  add column if not exists evento_id uuid references public.eventos (id) on delete cascade;

-- 2) Las candidatas existentes (sin evento) se asignan al evento más antiguo
--    (la PRIMERA etapa), de modo que el Evento 1 conserva sus 45 y la Final
--    queda con lista propia (vacía hasta registrar a las finalistas).
update public.candidatas
  set evento_id = (select id from public.eventos order by created_at asc limit 1)
  where evento_id is null;

-- 3) Índice para consultas por evento
create index if not exists candidatas_evento_idx on public.candidatas (evento_id);