-- 20260903110000_jurados_candidata_actual.sql
-- Permite que la pantalla pública muestre, en tiempo real, a qué candidata está
-- evaluando cada jurado durante la evaluación en paralelo (cada jurado evalúa
-- libremente). Se guarda la candidata seleccionada por cada jurado en su propia
-- fila, en lugar de depender de un único candidata_actual_id global.

alter table public.jurados
  add column if not exists candidata_actual_id uuid
    references public.candidatas(id) on delete set null;

create index if not exists jurados_candidata_actual_idx
  on public.jurados (candidata_actual_id);
