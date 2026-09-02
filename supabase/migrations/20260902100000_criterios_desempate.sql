-- Criterios de desempate: no cuentan dentro de los 100 pts de la rúbrica base.
-- Se evalúan igual (0..puntaje_maximo), pero sus puntos se muestran aparte y solo
-- se usan para romper empates entre candidatas con el mismo total base.
alter table public.criterios add column if not exists es_desempate boolean not null default false;