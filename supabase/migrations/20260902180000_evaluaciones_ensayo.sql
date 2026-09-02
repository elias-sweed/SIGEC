-- Marcar evaluaciones como ensayo (simulación) o oficiales
alter table public.evaluaciones
  add column if not exists es_ensayo boolean not null default false;