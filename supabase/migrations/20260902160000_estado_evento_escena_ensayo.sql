-- Control de escenas de la pantalla pública y modo ensayo
-- pantalla_escena: 'inicio' | 'evaluacion' | 'esperando' | 'resultados'
-- modo_ensayo: cuando está activo, las nuevas evaluaciones se marcan como simuladas

alter table public.estado_evento
  add column if not exists pantalla_escena text not null default 'inicio';

alter table public.estado_evento
  add column if not exists modo_ensayo boolean not null default false;