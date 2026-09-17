-- 20260917140000_gran_final_etapas.sql
-- Gran Final 18/09/26: las presentaciones de la ceremonia se evalúan en 4 rondas
-- con criterios propios según las bases:
--   1. COREOGRAFÍA      (5 criterios × 20 = 100)
--   2. TALENTO          (5 criterios × 20 = 100)
--   3. GALA Y PREGUNTAS (porte 15, seguridad 10, expresión 10, claridad 15, análisis 20, oral 15, barra 10 = 100)
--   4. FICHA FINAL      (5 criterios × 20 = 100) → se usa para determinar las ganadoras.

-- 1 · Coreografía (apertura)
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('GRAN FINAL · 1 · COREOGRAFÍA', 'Coordinación', 20, 1,
    'Ejecuta los movimientos de la coreografía con sincronización y ritmo junto al grupo, sin fallas evidentes.'),
  ('GRAN FINAL · 1 · COREOGRAFÍA', 'Desenvolvimiento', 20, 2,
    'Se desplaza con soltura por el escenario, domina los espacios y mantiene la línea de la figura durante la presentación.'),
  ('GRAN FINAL · 1 · COREOGRAFÍA', 'Expresión corporal', 20, 3,
    'Comunica con el cuerpo y la gestualidad; los movimientos transmiten la intención de la coreografía.'),
  ('GRAN FINAL · 1 · COREOGRAFÍA', 'Seguridad', 20, 4,
    'Demuestra confianza y control en cada paso, sin titubeos, manteniendo la naturalidad durante toda la apertura.'),
  ('GRAN FINAL · 1 · COREOGRAFÍA', 'Actitud escénica', 20, 5,
    'Proyecta energía, carisma y presencia ante el público y el jurado durante la coreografía grupal.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- 2 · Talento (individual, máx. 2 minutos)
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('GRAN FINAL · 2 · TALENTO', 'Dominio y demostración del talento', 20, 1,
    'Evidencia habilidad y preparación en la disciplina seleccionada.'),
  ('GRAN FINAL · 2 · TALENTO', 'Creatividad y originalidad', 20, 2,
    'Presenta su talento de manera auténtica, innovadora y atractiva.'),
  ('GRAN FINAL · 2 · TALENTO', 'Expresión y desenvolvimiento escénico', 20, 3,
    'Demuestra seguridad, naturalidad, expresividad y adecuado manejo del escenario.'),
  ('GRAN FINAL · 2 · TALENTO', 'Impacto de la presentación', 20, 4,
    'Logra captar y mantener la atención del público y del jurado.'),
  ('GRAN FINAL · 2 · TALENTO', 'Organización y cumplimiento del tiempo', 20, 5,
    'Desarrolla su presentación de manera ordenada y dentro del tiempo (2.30 min. máx.) establecido.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- 3 · Desfile en traje de gala + ronda de preguntas final
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Porte y elegancia en traje de gala', 15, 1,
    'Postura, presencia escénica, elegancia y manera de lucir el traje durante el recorrido.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Seguridad y desenvolvimiento escénico', 10, 2,
    'Confianza, naturalidad, dominio del escenario y actitud durante la pasarela.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Expresión corporal y comunicación no verbal', 10, 3,
    'Manejo de gestos, mirada, postura y movimientos acordes con la presentación.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Claridad y coherencia de la respuesta', 15, 4,
    'Expresa sus ideas de manera ordenada, comprensible y directamente relacionada con la pregunta formulada.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Capacidad de análisis y argumentación', 20, 5,
    'Fundamenta su opinión, demuestra criterio propio, reflexión y capacidad para sustentar sus ideas.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Expresión oral y seguridad en la respuesta', 15, 6,
    'Fluidez, dicción, tono de voz, seguridad y espontaneidad al responder.'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS', 'Participación de la barra', 10, 7,
    'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- 4 · Ficha de evaluación final (define a las ganadoras)
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('GRAN FINAL · FICHA FINAL', 'Coreografía y expresión escénica', 20, 1,
    'Coordinación, seguridad, expresión corporal, ritmo y desenvolvimiento.'),
  ('GRAN FINAL · FICHA FINAL', 'Desfile en ropa sport', 20, 2,
    'Naturalidad, seguridad, porte, desenvolvimiento y adecuación de la presentación al contexto escolar.'),
  ('GRAN FINAL · FICHA FINAL', 'Presentación de talento', 20, 3,
    'Evidencia habilidad y preparación en la disciplina seleccionada.'),
  ('GRAN FINAL · FICHA FINAL', 'Desfile en traje de gala', 20, 4,
    'Elegancia, postura, seguridad, desenvolvimiento y presencia escénica.'),
  ('GRAN FINAL · FICHA FINAL', 'Comunicación oral', 20, 5,
    'Claridad, fluidez, vocabulario apropiado, coherencia y seguridad al responder.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- Reglamentos breves por ronda.
-- La tabla reglamento_etapa viene de la migración 20260901110000; se crea aquí
-- (si no existe) para que este script sea autocontenible.
create table if not exists public.reglamento_etapa (
  id uuid primary key default gen_random_uuid(),
  etapa text not null unique,
  contenido text not null,
  updated_at timestamptz not null default now()
);

insert into public.reglamento_etapa (etapa, contenido) values
  ('GRAN FINAL · 1 · COREOGRAFÍA',
   E'Ronda de apertura de la Gran Final 18/09/26.\n\nLa candidata participa en la coreografía grupal de apertura. El jurado evalúa: coordinación, desenvolvimiento, expresión corporal, seguridad y actitud escénica. (5 criterios × 20 = 100 pts)'),
  ('GRAN FINAL · 2 · TALENTO',
   E'Ronda de talento (presentación individual).\n\nLa candidata realiza una presentación de libre elección (canto, baile, declamación, actuación, instrumentos, dibujo, expresión corporal, etc.). Tiempo máximo: 2 minutos. El jurado evalúa: dominio del talento, creatividad y originalidad, expresión y desenvolvimiento escénico, impacto de la presentación y organización del tiempo. (5 criterios × 20 = 100 pts)'),
  ('GRAN FINAL · 3 · GALA Y PREGUNTAS',
   E'Ronda de desfile en traje de gala + ronda de preguntas final.\n\nEl jurado evalúa: porte y elegancia en traje de gala (15), seguridad y desenvolvimiento escénico (10), expresión corporal y comunicación no verbal (10), claridad y coherencia de la respuesta (15), capacidad de análisis y argumentación (20), expresión oral y seguridad (15) y participación de la barra (10). TOTAL 100 pts.\n\nTemas de la ronda de preguntas: bullying y ciberacoso, salud mental en la adolescencia, uso responsable de la tecnología, violencia y cultura de paz, ciudadanía activa, liderazgo femenino e igualdad, gestión de residuos y reciclaje, estereotipos y autoaceptación, toma de decisiones y proyecto de vida.'),
  ('GRAN FINAL · FICHA FINAL',
   E'Ficha de evaluación final.\n\nEl jurado calificador emite la evaluación final y deliberación correspondiente. Se evalúa: coreografía y expresión escénica (20), desfile en ropa sport (20), presentación de talento (20), desfile en traje de gala (20) y comunicación oral (20). TOTAL 100 pts.\n\nComo resultado se otorgan los títulos: Señorita Jiménez Pimentel – Aniversario 2026, Señorita Simpatía 2026 y Señorita Primavera 2026, además del reconocimiento especial a la mayor interacción en la publicación oficial.')
on conflict (etapa) do update
  set contenido  = excluded.contenido,
      updated_at = now();