-- SIGEC · Motor de evaluación dinámico (Fase 03)
-- Cada fila representa un criterio calificado dentro de una evaluación.
-- El límite superior del puntaje depende de criterios.puntaje_maximo (otra tabla),
-- por lo que no puede expresarse en un CHECK: se valida en la aplicación
-- mediante validarPuntaje() (src/utils/scoring.ts).

create table public.evaluacion_detalles (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones (id) on delete cascade,
  criterio_id uuid not null references public.criterios (id),
  puntaje numeric(5, 2) not null check (puntaje >= 0),
  created_at timestamptz not null default now(),
  unique (evaluacion_id, criterio_id)
);

create index evaluacion_detalles_evaluacion_idx on public.evaluacion_detalles (evaluacion_id);
create index evaluacion_detalles_criterio_idx on public.evaluacion_detalles (criterio_id);
