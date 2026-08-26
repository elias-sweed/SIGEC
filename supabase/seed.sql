-- SIGEC · Datos de ejemplo (idempotente)
-- Se puede ejecutar múltiples veces sin errores.
-- Ejecutar en SQL Editor de Supabase o con `supabase db reset`.

-- Eventos
insert into public.eventos (id, nombre, etapa, estado) values
  ('11111111-1111-4111-8111-000000000001', 'Gran Final Nacional 2026', 'final', 'activo')
on conflict (id) do nothing;

-- Candidatas
insert into public.candidatas (id, nombre, grado, seccion) values
  ('22222222-2222-4222-8222-000000000001', 'Valentina Ríos', '5°', 'A'),
  ('22222222-2222-4222-8222-000000000002', 'Camila Andrade', '6°', 'B'),
  ('22222222-2222-4222-8222-000000000003', 'Renata Solís', '6°', 'A')
on conflict (id) do nothing;

-- Jurados
insert into public.jurados (id, nombre, codigo) values
  ('33333333-3333-4333-8333-000000000001', 'María Fernanda López', 'JUR-001'),
  ('33333333-3333-4333-8333-000000000002', 'Carlos Eduardo Mendoza', 'JUR-002'),
  ('33333333-3333-4333-8333-000000000003', 'Ana Lucía Herrera', 'JUR-003'),
  ('33333333-3333-4333-8333-000000000004', 'Jorge Alberto Ramírez', 'JUR-004'),
  ('33333333-3333-4333-8333-000000000005', 'Patricia Isabel Vega', 'JUR-005')
on conflict (id) do nothing;

-- Criterios (el constraint único real es etapa+orden, no el id)
insert into public.criterios (id, etapa, nombre, puntaje_maximo, orden) values
  ('55555555-5555-4555-8555-000000000001', 'final', 'Técnica de ejecución', 40, 1),
  ('55555555-5555-4555-8555-000000000002', 'final', 'Interpretación artística', 30, 2),
  ('55555555-5555-4555-8555-000000000003', 'final', 'Coreografía', 20, 3),
  ('55555555-5555-4555-8555-000000000004', 'final', 'Presencia escénica', 10, 4)
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo;

-- Evaluación de ejemplo
insert into public.evaluaciones (id, evento_id, candidata_id, jurado_id, estado) values
  ('44444444-4444-4444-8444-000000000001',
   '11111111-1111-4111-8111-000000000001',
   '22222222-2222-4222-8222-000000000001',
   '33333333-3333-4333-8333-000000000001',
   'en_proceso')
on conflict (evento_id, candidata_id, jurado_id) do nothing;

-- Detalles de la evaluación
insert into public.evaluacion_detalles (evaluacion_id, criterio_id, puntaje) values
  ('44444444-4444-4444-8444-000000000001', '55555555-5555-4555-8555-000000000001', 32.5),
  ('44444444-4444-4444-8444-000000000001', '55555555-5555-4555-8555-000000000002', 24),
  ('44444444-4444-4444-8444-000000000001', '55555555-5555-4555-8555-000000000003', 15),
  ('44444444-4444-4444-8444-000000000001', '55555555-5555-4555-8555-000000000004', 8)
on conflict (evaluacion_id, criterio_id) do update
  set puntaje = excluded.puntaje;

-- Estado del evento
insert into public.estado_evento (evento_id, candidata_actual_id, estado) values
  ('11111111-1111-4111-8111-000000000001', '22222222-2222-4222-8222-000000000001', 'activo')
on conflict (evento_id) do update
  set candidata_actual_id = excluded.candidata_actual_id,
      estado             = excluded.estado,
      updated_at         = now();
