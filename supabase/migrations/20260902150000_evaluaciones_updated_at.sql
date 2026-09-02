-- evaluaciones.updated_at con actualización automática
-- Corrige el error 400 (PGRST204) al actualizar una evaluación existente:
-- JuradoEvaluacion.tsx ya no envía updated_at en el update; el trigger lo mantiene solo.

alter table public.evaluaciones
  add column if not exists updated_at timestamptz not null default now();

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