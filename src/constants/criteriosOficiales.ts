export interface CriterioOficial {
  nombre: string
  puntaje_maximo: number
}

export const CRITERIOS_OFICIALES: Record<string, CriterioOficial[]> = {
  'PRIMERA ETAPA 04/09/26': [
    { nombre: 'Presentación', puntaje_maximo: 30 },
    { nombre: 'Coreografía', puntaje_maximo: 40 },
    { nombre: 'Ronda de preguntas', puntaje_maximo: 30 },
  ],
  'SEGUNDA ETAPA 18/09/26': [
    { nombre: 'Técnica de ejecución', puntaje_maximo: 40 },
    { nombre: 'Interpretación artística', puntaje_maximo: 30 },
    { nombre: 'Presencia escénica', puntaje_maximo: 30 },
  ],
}

export const ETAPAS = ['PRIMERA ETAPA 04/09/26', 'SEGUNDA ETAPA 18/09/26'] as const