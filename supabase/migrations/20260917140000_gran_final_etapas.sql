-- 20260917140000_gran_final_etapas.sql
-- Organización de criterios por BLOQUES dentro del evento.
--
-- Importante: las "etapas" siguen siendo SOLO 2 (PRIMERA ETAPA 04/09/26 y
-- SEGUNDA ETAPA 18/09/26). Las 3 rondas de la Gran Final (coreografía, talento
-- y gala + preguntas) NO son eventos: son bloques de criterios del evento final.

-- 1 · Columna bloque. Los criterios existentes quedan en el bloque 'General'.
alter table public.criterios
  add column if not exists bloque text not null default 'General';

-- 2 · Un criterio se identifica por (etapa, bloque, orden): los bloques reutilizan
--     el mismo orden 1..n dentro de su etapa.
alter table public.criterios drop constraint if exists criterios_etapa_orden_key;
create unique index if not exists criterios_etapa_bloque_orden_idx
  on public.criterios (etapa, bloque, orden);

-- 3 · Limpieza de criterios/reglamentos creados por una versión previa que trataba
--     las rondas como etapas (nombres "ETAPA n · ...").
delete from public.criterios
  where etapa in ('ETAPA 1 · COREOGRAFÍA', 'ETAPA 2 · TALENTO', 'ETAPA 3 · GALA Y PREGUNTAS');
delete from public.reglamento_etapa
  where etapa in ('ETAPA 1 · COREOGRAFÍA', 'ETAPA 2 · TALENTO', 'ETAPA 3 · GALA Y PREGUNTAS');

-- 4 · Los criterios actuales de la SEGUNDA ETAPA corresponden al desfile de gala
--     y la ronda de preguntas: pasan a ser el bloque 'Gala y preguntas'.
update public.criterios
  set bloque = 'Gala y preguntas'
  where etapa = 'SEGUNDA ETAPA 18/09/26' and bloque = 'General';

-- 5 · Bloque "Gala y preguntas" (15 + 15 + 10 + 15 + 20 + 15 + 10 = 100)
insert into public.criterios (etapa, bloque, nombre, puntaje_maximo, orden, indicadores) values
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Porte y elegancia en traje de gala', 15, 1,
    'Postura, presencia escénica, elegancia y manera de lucir el traje durante el recorrido.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Seguridad y desenvolvimiento escénico', 15, 2,
    'Confianza, naturalidad, dominio del escenario y actitud durante la pasarela.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Expresión corporal y comunicación no verbal', 10, 3,
    'Manejo de gestos, mirada, postura y movimientos acordes con la presentación.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Claridad y coherencia de la respuesta', 15, 4,
    'Expresa sus ideas de manera ordenada, comprensible y directamente relacionada con la pregunta formulada.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Capacidad de análisis y argumentación', 20, 5,
    'Fundamenta su opinión, demuestra criterio propio, reflexión y capacidad para sustentar sus ideas.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Expresión oral y seguridad en la respuesta', 15, 6,
    'Fluidez, dicción, tono de voz, seguridad y espontaneidad al responder.'),
  ('SEGUNDA ETAPA 18/09/26', 'Gala y preguntas', 'Participación de la barra', 10, 7,
    'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.')
on conflict (etapa, bloque, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- 6 · Bloque "Coreografía" (ronda grupal de apertura · 5 × 20 = 100)
insert into public.criterios (etapa, bloque, nombre, puntaje_maximo, orden, indicadores) values
  ('SEGUNDA ETAPA 18/09/26', 'Coreografía', 'Coordinación', 20, 1,
    'Ejecuta los movimientos de la coreografía con sincronización y ritmo junto al grupo, sin fallas evidentes.'),
  ('SEGUNDA ETAPA 18/09/26', 'Coreografía', 'Desenvolvimiento', 20, 2,
    'Se desplaza con soltura por el escenario, domina los espacios y mantiene la línea de la figura durante la presentación.'),
  ('SEGUNDA ETAPA 18/09/26', 'Coreografía', 'Expresión corporal', 20, 3,
    'Comunica con el cuerpo y la gestualidad; los movimientos transmiten la intención de la coreografía.'),
  ('SEGUNDA ETAPA 18/09/26', 'Coreografía', 'Seguridad', 20, 4,
    'Demuestra confianza y control en cada paso, sin titubeos, manteniendo la naturalidad durante toda la apertura.'),
  ('SEGUNDA ETAPA 18/09/26', 'Coreografía', 'Actitud escénica', 20, 5,
    'Proyecta energía, carisma y presencia ante el público y el jurado durante la coreografía grupal.')
on conflict (etapa, bloque, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- 7 · Bloque "Talento" (ronda individual · 5 × 20 = 100)
insert into public.criterios (etapa, bloque, nombre, puntaje_maximo, orden, indicadores) values
  ('SEGUNDA ETAPA 18/09/26', 'Talento', 'Dominio y demostración del talento', 20, 1,
    'Evidencia habilidad y preparación en la disciplina seleccionada.'),
  ('SEGUNDA ETAPA 18/09/26', 'Talento', 'Creatividad y originalidad', 20, 2,
    'Presenta su talento de manera auténtica, innovadora y atractiva.'),
  ('SEGUNDA ETAPA 18/09/26', 'Talento', 'Expresión y desenvolvimiento escénico', 20, 3,
    'Demuestra seguridad, naturalidad, expresividad y adecuado manejo del escenario.'),
  ('SEGUNDA ETAPA 18/09/26', 'Talento', 'Impacto de la presentación', 20, 4,
    'Logra captar y mantener la atención del público y del jurado.'),
  ('SEGUNDA ETAPA 18/09/26', 'Talento', 'Organización y cumplimiento del tiempo', 20, 5,
    'Desarrolla su presentación de manera ordenada y dentro del tiempo (2 min. máx.) establecido.')
on conflict (etapa, bloque, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;
