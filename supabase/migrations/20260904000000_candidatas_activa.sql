-- SIGEC · Candidatas: deshabilitado suave
-- Permite retirar una candidata de la evaluación (ej. ya ganó) sin borrar
-- sus evaluaciones. Las evaluaciones existentes se conservan intactas.

alter table public.candidatas
  add column if not exists activa boolean not null default true;