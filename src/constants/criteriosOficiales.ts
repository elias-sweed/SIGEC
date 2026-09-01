export interface CriterioOficial {
  nombre: string
  puntaje_maximo: number
  indicadores: string
}

export const CRITERIOS_OFICIALES: Record<string, CriterioOficial[]> = {
  'PRIMERA ETAPA 04/09/26': [
    {
      nombre: 'Presentación y porte',
      puntaje_maximo: 15,
      indicadores:
        'Presentación adecuada con el uniforme institucional; postura, seguridad, naturalidad y desenvolvimiento durante el desfile.',
    },
    {
      nombre: 'Desenvolvimiento en la coreografía, actitud y carisma',
      puntaje_maximo: 15,
      indicadores:
        'Coordinación, expresión corporal, seguridad, ritmo e integración con la presentación grupal.',
    },
    {
      nombre: 'Dominio del tema',
      puntaje_maximo: 25,
      indicadores:
        'Evidencia conocimiento y comprensión del tema planteado: bullying, ambiente, drogadicción o uso de recursos tecnológicos.',
    },
    {
      nombre: 'Capacidad de expresión y argumentación',
      puntaje_maximo: 25,
      indicadores:
        'Responde con claridad, coherencia y fluidez; fundamenta sus ideas y comunica un mensaje pertinente.',
    },
    {
      nombre: 'Actitud y carisma',
      puntaje_maximo: 10,
      indicadores:
        'Demuestra seguridad, respeto, espontaneidad, simpatía y capacidad para proyectarse positivamente ante el público.',
    },
    {
      nombre: 'Participación de la barra',
      puntaje_maximo: 10,
      indicadores:
        'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.',
    },
  ],
  'SEGUNDA ETAPA 18/09/26': [
    {
      nombre: 'Porte y elegancia en traje de gala',
      puntaje_maximo: 15,
      indicadores:
        'Postura, presencia escénica, elegancia y manera de lucir el traje durante el recorrido.',
    },
    {
      nombre: 'Seguridad y desenvolvimiento escénico',
      puntaje_maximo: 15,
      indicadores:
        'Confianza, naturalidad, dominio del escenario y actitud durante la pasarela.',
    },
    {
      nombre: 'Expresión corporal y comunicación no verbal',
      puntaje_maximo: 10,
      indicadores: 'Manejo de gestos, mirada, postura y movimientos acordes con la presentación.',
    },
    {
      nombre: 'Claridad y coherencia de la respuesta',
      puntaje_maximo: 15,
      indicadores:
        'Expresa sus ideas de manera ordenada, comprensible y directamente relacionada con la pregunta formulada.',
    },
    {
      nombre: 'Capacidad de análisis y argumentación',
      puntaje_maximo: 20,
      indicadores:
        'Fundamenta su opinión, demuestra criterio propio, reflexión y capacidad para sustentar sus ideas.',
    },
    {
      nombre: 'Expresión oral y seguridad en la respuesta',
      puntaje_maximo: 15,
      indicadores:
        'Fluidez, dicción, tono de voz, seguridad y espontaneidad al responder.',
    },
    {
      nombre: 'Participación de la barra',
      puntaje_maximo: 10,
      indicadores:
        'Organización, creatividad y entusiasmo de la barra, respetando las normas de convivencia.',
    },
  ],
}

export const ETAPAS = ['PRIMERA ETAPA 04/09/26', 'SEGUNDA ETAPA 18/09/26'] as const