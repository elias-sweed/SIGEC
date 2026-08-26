-- SIGEC · Desactivar RLS para desarrollo
-- Esto permite lectura/escritura anónima sin autenticación.
-- Se reactivará cuando se implemente auth + políticas en fases posteriores.

alter table public.eventos            disable row level security;
alter table public.candidatas         disable row level security;
alter table public.jurados            disable row level security;
alter table public.criterios          disable row level security;
alter table public.evaluaciones       disable row level security;
alter table public.evaluacion_detalles disable row level security;
alter table public.estado_evento      disable row level security;
