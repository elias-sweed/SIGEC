-- 20260901110000_criterios_indicadores_reglamento.sql
-- Primera etapa: criterios oficiales con indicadores y texto de reglamento.
-- (1) Columna indicadores en criterios.
-- (2) Tabla reglamento_etapa para el texto de disposiciones por etapa.

alter table public.criterios
  add column if not exists indicadores text;

create table if not exists public.reglamento_etapa (
  id uuid primary key default gen_random_uuid(),
  etapa text not null unique,
  contenido text not null,
  updated_at timestamptz not null default now()
);

-- Criterios oficiales de la PRIMERA ETAPA (04/09/26) según reglamento.
-- Presentación y porte 15 · Coreografía 15 · Dominio del tema 25 ·
-- Expresión y argumentación 25 · Actitud y carisma 10 · Barra 10 · Total 100.
insert into public.criterios (etapa, nombre, puntaje_maximo, orden, indicadores) values
  ('PRIMERA ETAPA 04/09/26', 'Presentación y porte', 15, 1,
    'Presentación adecuada con el uniforme institucional; postura, seguridad, naturalidad y desenvolvimiento durante el desfile.'),
  ('PRIMERA ETAPA 04/09/26', 'Desenvolvimiento en la coreografía, actitud y carisma', 15, 2,
    'Coordinación, expresión corporal, seguridad, ritmo e integración con la presentación grupal.'),
  ('PRIMERA ETAPA 04/09/26', 'Dominio del tema', 25, 3,
    'Evidencia conocimiento y comprensión del tema planteado: bullying, ambiente, drogadicción o uso de recursos tecnológicos.'),
  ('PRIMERA ETAPA 04/09/26', 'Capacidad de expresión y argumentación', 25, 4,
    'Responde con claridad, coherencia y fluidez; fundamenta sus ideas y comunica un mensaje pertinente.'),
  ('PRIMERA ETAPA 04/09/26', 'Actitud y carisma', 10, 5,
    'Demuestra seguridad, respeto, espontaneidad, simpatía y capacidad para proyectarse positivamente ante el público.'),
  ('PRIMERA ETAPA 04/09/26', 'Participación de la barra', 10, 6,
    'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.')
on conflict (etapa, orden) do update
  set nombre         = excluded.nombre,
      puntaje_maximo = excluded.puntaje_maximo,
      indicadores    = excluded.indicadores;

-- Reglamento de la PRIMERA ETAPA.
insert into public.reglamento_etapa (etapa, contenido) values (
  'PRIMERA ETAPA 04/09/26',
  E'En esta primera etapa, las candidatas participarán en una presentación grupal, desfile y ronda de preguntas, de acuerdo con las siguientes disposiciones:\n\n1. Coreografía de presentación: Las candidatas participarán en una coreografía grupal previamente coordinada por la Comisión Organizadora, demostrando coordinación, desenvolvimiento, expresión corporal, entusiasmo y seguridad escénica.\n\n2. Desfile en uniforme institucional: Las candidatas realizarán su presentación y desfile vistiendo exclusivamente el uniforme de gala de la Institución Educativa Emblemática Jiménez Pimentel, portándolo correctamente y demostrando elegancia, seguridad e identidad institucional.\n\n3. Ronda de preguntas: Cada candidata responderá una pregunta formulada por la Comisión Organizadora, relacionada con uno de los siguientes ejes temáticos:\n- 1° Grado: Prevención del bullying y ciberacoso / promoción de una convivencia respetuosa.\n- 2° Grado: Cuidado y conservación del medio ambiente / Cuidado de espacios y áreas verdes.\n- 3° Grado: Prevención del consumo de drogas / Violencia y cultura de paz.\n- 4° Grado: Uso responsable de los recursos tecnológicos y las redes sociales / Toma de decisiones y proyecto de vida.\n- 5° Grado: Igualdad de derechos entre hombres y mujeres – Corrupción y ética.\n\n4. Preparación de las candidatas: Los cuatro ejes temáticos serán comunicados previamente a las participantes con la finalidad de que puedan informarse, reflexionar y prepararse. La pregunta específica que corresponderá a cada candidata será determinada durante el desarrollo del certamen.\n\n5. Evaluación de la ronda de preguntas: El jurado calificador valorará la claridad y coherencia de la respuesta, capacidad de reflexión, argumentación, seguridad, fluidez y expresión oral de cada candidata.\n\n6. Participación de las barras: Cada sección podrá organizar una barra para acompañar y alentar a su candidata. Se valorará la creatividad, organización, entusiasmo y respeto, evitando expresiones ofensivas, actitudes discriminatorias o acciones que interfieran con la participación de las demás candidatas. El puntaje obtenido por la barra se sumará al puntaje de su candidata.\n\n7. Clasificación a la etapa final: Al término de esta primera etapa, clasificarán las diez (10) candidatas que obtengan el mayor puntaje, considerando la selección de dos (02) representantes por cada grado. Los resultados serán determinados de acuerdo con el puntaje otorgado por el jurado calificador y el puntaje correspondiente a la participación de las barras.'
) on conflict (etapa) do update
  set contenido   = excluded.contenido,
      updated_at  = now();