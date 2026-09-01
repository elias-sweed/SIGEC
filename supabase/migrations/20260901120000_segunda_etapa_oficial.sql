-- 20260901120000_segunda_etapa_oficial.sql
-- Segunda etapa: criterios oficiales (7) con indicadores y reglamento completo.

-- Criterios oficiales de la SEGUNDA ETAPA (18/09/26) según las bases.
-- Porte y elegancia 15 · Seguridad escénica 15 · Expresión corporal 10 · Claridad 15 ·
-- Análisis y argumentación 20 · Expresión oral 15 · Barra 10 · TOTAL 100
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('SEGUNDA ETAPA 18/09/26', 'Porte y elegancia en traje de gala', 15, 1,
    'Postura, presencia escénica, elegancia y manera de lucir el traje durante el recorrido.'),
  ('SEGUNDA ETAPA 18/09/26', 'Seguridad y desenvolvimiento escénico', 15, 2,
    'Confianza, naturalidad, dominio del escenario y actitud durante la pasarela.'),
  ('SEGUNDA ETAPA 18/09/26', 'Expresión corporal y comunicación no verbal', 10, 3,
    'Manejo de gestos, mirada, postura y movimientos acordes con la presentación.'),
  ('SEGUNDA ETAPA 18/09/26', 'Claridad y coherencia de la respuesta', 15, 4,
    'Expresa sus ideas de manera ordenada, comprensible y directamente relacionada con la pregunta formulada.'),
  ('SEGUNDA ETAPA 18/09/26', 'Capacidad de análisis y argumentación', 20, 5,
    'Fundamenta su opinión, demuestra criterio propio, reflexión y capacidad para sustentar sus ideas.'),
  ('SEGUNDA ETAPA 18/09/26', 'Expresión oral y seguridad en la respuesta', 15, 6,
    'Fluidez, dicción, tono de voz, seguridad y espontaneidad al responder.'),
  ('SEGUNDA ETAPA 18/09/26', 'Participación de la barra', 10, 7,
    'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- Reglamento de la SEGUNDA ETAPA.
insert into public.reglamento_etapa (etapa, contenido) values (
  'SEGUNDA ETAPA 18/09/26',
  E'Las diez (10) candidatas finalistas, clasificadas en la primera etapa, participarán en la ceremonia de Elección y Coronación de Señorita Jiménez Pimentel 2026, desarrollando las siguientes presentaciones:\n\n1. Apertura y coreografía de presentación\nLas candidatas participarán en una coreografía grupal de apertura, en la que demostrarán coordinación, desenvolvimiento, expresión corporal, seguridad y actitud escénica.\n\n2. Desfile en ropa sport\nCada candidata realizará un desfile en ropa sport de libre elección, manteniendo una presentación apropiada para el contexto educativo. Se valorará la seguridad, naturalidad, desenvolvimiento y actitud durante la pasarela.\n\n3. Presentación de talentos\nLas candidatas realizarán una presentación individual de talento, mediante la cual podrán demostrar sus habilidades, creatividad, expresión artística y desenvolvimiento escénico.\nLa presentación será de libre elección, pudiendo considerar disciplinas como canto, baile, declamación, actuación, ejecución de instrumentos musicales, dibujo o pintura, expresión corporal, demostración de habilidades u otras manifestaciones artísticas y culturales.\nCada candidata dispondrá de un tiempo máximo de 3 minutos para realizar su presentación.\nLa participación deberá caracterizarse por su originalidad y pertinencia.\n\nAspectos a evaluar del talento:\n- Evidencia habilidad y preparación en la disciplina seleccionada.\n- Presenta su talento de manera auténtica, innovadora y atractiva.\n- Demuestra seguridad, naturalidad, expresividad y adecuado manejo del escenario.\n- Logra captar y mantener la atención del público y del jurado.\n- Desarrolla su presentación de manera ordenada y dentro del tiempo (3 min. máx.) establecido.\n\n4. Desfile en traje de gala\nLas candidatas realizarán su presentación en traje de gala, demostrando elegancia, seguridad, porte, desenvolvimiento y dominio escénico.\n\nRonda de pregunta final\nCada candidata responderá una pregunta formulada por el Jurado Calificador. Se evaluará la capacidad de análisis y reflexión, coherencia y claridad de las ideas, argumentación, seguridad, fluidez y expresión oral.\nTemas de la ronda de preguntas:\n- Bullying y ciberacoso\n- Salud mental en la adolescencia\n- Uso responsable de la tecnología\n- Violencia en la sociedad y cultura de paz\n- Ciudadanía activa y compromiso social\n- Liderazgo femenino e igualdad\n- Gestión de residuos y reciclaje\n- Estereotipos y autoaceptación\n- Toma de decisiones y proyecto de vida\n\n5. ELECCIÓN Y CORONACIÓN\nConcluidas las presentaciones, el Jurado Calificador procederá a realizar la evaluación final y deliberación correspondiente, de acuerdo con los criterios y puntajes establecidos en las presentes bases.\nComo resultado de la evaluación se otorgarán los siguientes títulos:\n- Señorita Jiménez Pimentel – Aniversario 2026\n- Señorita Simpatía 2026\n- Señorita Primavera 2026\n\nAsimismo, se otorgará un reconocimiento especial a la candidata que obtenga la mayor interacción en la publicación oficial del certamen realizada a través de la página institucional, de acuerdo con las condiciones y el periodo establecidos por la Comisión Organizadora.\n\n6. PREMIOS\nMiss Aniversario 2026: S/ 1 000.00 + premio sorpresa.\nMiss Simpatía 2026: S/ 500.00 + premio sorpresa.\nMiss Primavera 2026: S/ 500.00 + premio sorpresa.\n\nDISPOSICIONES FINALES\nTodos los aspectos, situaciones o circunstancias relacionados con el desarrollo del certamen que no se encuentren contemplados expresamente en las presentes bases serán evaluados y resueltos, según corresponda, por el Jurado Calificador y la Comisión Organizadora, procurando en todo momento garantizar la transparencia, equidad y adecuado desarrollo del evento.'
) on conflict (etapa) do update
  set contenido  = excluded.contenido,
      updated_at = now();