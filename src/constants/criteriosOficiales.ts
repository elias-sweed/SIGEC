export interface CriterioOficial {
  nombre: string
  puntaje_maximo: number
  indicadores: string
}

export const CRITERIOS_OFICIALES: Record<string, CriterioOficial[]> = {
  'ETAPA 1 · COREOGRAFÍA': [
    {
      nombre: 'Coordinación',
      puntaje_maximo: 20,
      indicadores:
        'Ejecuta los movimientos de la coreografía con sincronización y ritmo junto al grupo, sin fallas evidentes.',
    },
    {
      nombre: 'Desenvolvimiento',
      puntaje_maximo: 20,
      indicadores:
        'Se desplaza con soltura por el escenario, domina los espacios y mantiene la línea de la figura durante la presentación.',
    },
    {
      nombre: 'Expresión corporal',
      puntaje_maximo: 20,
      indicadores:
        'Comunica con el cuerpo y la gestualidad; los movimientos transmiten la intención de la coreografía.',
    },
    {
      nombre: 'Seguridad',
      puntaje_maximo: 20,
      indicadores:
        'Demuestra confianza y control en cada paso, sin titubeos, manteniendo la naturalidad durante toda la apertura.',
    },
    {
      nombre: 'Actitud escénica',
      puntaje_maximo: 20,
      indicadores:
        'Proyecta energía, carisma y presencia ante el público y el jurado durante la coreografía grupal.',
    },
  ],
  'ETAPA 2 · TALENTO': [
    {
      nombre: 'Dominio y demostración del talento',
      puntaje_maximo: 20,
      indicadores: 'Evidencia habilidad y preparación en la disciplina seleccionada.',
    },
    {
      nombre: 'Creatividad y originalidad',
      puntaje_maximo: 20,
      indicadores: 'Presenta su talento de manera auténtica, innovadora y atractiva.',
    },
    {
      nombre: 'Expresión y desenvolvimiento escénico',
      puntaje_maximo: 20,
      indicadores:
        'Demuestra seguridad, naturalidad, expresividad y adecuado manejo del escenario.',
    },
    {
      nombre: 'Impacto de la presentación',
      puntaje_maximo: 20,
      indicadores: 'Logra captar y mantener la atención del público y del jurado.',
    },
    {
      nombre: 'Organización y cumplimiento del tiempo',
      puntaje_maximo: 20,
      indicadores:
        'Desarrolla su presentación de manera ordenada y dentro del tiempo (2.30 min. máx.) establecido.',
    },
  ],
  'ETAPA 3 · GALA Y PREGUNTAS': [
    {
      nombre: 'Porte y elegancia en traje de gala',
      puntaje_maximo: 15,
      indicadores:
        'Postura, presencia escénica, elegancia y manera de lucir el traje durante el recorrido.',
    },
    {
      nombre: 'Seguridad y desenvolvimiento escénico',
      puntaje_maximo: 10,
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

// Las 3 únicas etapas de la Gran Final: grupal (coreografía), individual (talento)
// y gala con preguntas.
export const ETAPAS = [
  'ETAPA 1 · COREOGRAFÍA',
  'ETAPA 2 · TALENTO',
  'ETAPA 3 · GALA Y PREGUNTAS',
] as const