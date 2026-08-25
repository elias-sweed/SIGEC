-- SIGEC · Datos de ejemplo (Fase 02)
-- No se aplica automáticamente: ejecutarlo manualmente en el SQL Editor
-- de Supabase o con `supabase db reset` (aplica migraciones + este seed).

insert into public.eventos (id, nombre, etapa, estado) values
  ('11111111-1111-4111-8111-000000000001', 'Gran Final Nacional 2026', 'final', 'activo');

insert into public.candidatas (id, nombre, grado, seccion) values
  ('22222222-2222-4222-8222-000000000001', 'Valentina Ríos', '5°', 'A'),
  ('22222222-2222-4222-8222-000000000002', 'Camila Andrade', '6°', 'B'),
  ('22222222-2222-4222-8222-000000000003', 'Renata Solís', '6°', 'A');

insert into public.jurados (id, nombre, codigo) values
  ('33333333-3333-4333-8333-000000000001', 'María Fernanda López', 'JUR-001'),
  ('33333333-3333-4333-8333-000000000002', 'Carlos Eduardo Mendoza', 'JUR-002'),
  ('33333333-3333-4333-8333-000000000003', 'Ana Lucía Herrera', 'JUR-003'),
  ('33333333-3333-4333-8333-000000000004', 'Jorge Alberto Ramírez', 'JUR-004'),
  ('33333333-3333-4333-8333-000000000005', 'Patricia Isabel Vega', 'JUR-005');

insert into public.criterios (etapa, nombre, puntaje_maximo, orden) values
  ('final', 'Técnica de ejecución', 40, 1),
  ('final', 'Interpretación artística', 30, 2),
  ('final', 'Coreografía', 20, 3),
  ('final', 'Presencia escénica', 10, 4);
