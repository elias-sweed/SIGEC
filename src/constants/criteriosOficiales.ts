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
    { nombre: 'Técnica de ejecución', puntaje_maximo: 40, indicadores: 'Precisión, destreza y dominio técnico en la presentación final.' },
    { nombre: 'Interpretación artística', puntaje_maximo: 30, indicadores: 'Expresión, emotividad y comunicación del mensaje artístico.' },
    { nombre: 'Presencia escénica', puntaje_maximo: 30, indicadores: 'Carisma, seguridad y proyección frente al público durante la coronación.' },
  ],
}

export const ETAPAS = ['PRIMERA ETAPA 04/09/26', 'SEGUNDA ETAPA 18/09/26'] as const