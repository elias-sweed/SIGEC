export interface CriterioOficial {
  nombre: string
  puntaje_maximo: number
}

export const CRITERIOS_OFICIALES: Record<string, CriterioOficial[]> = {
  preliminar: [
    { nombre: 'Técnica de ejecución', puntaje_maximo: 30 },
    { nombre: 'Interpretación artística', puntaje_maximo: 30 },
    { nombre: 'Coreografía', puntaje_maximo: 25 },
    { nombre: 'Presencia escénica', puntaje_maximo: 15 },
  ],
  eliminatoria: [
    { nombre: 'Técnica de ejecución', puntaje_maximo: 30 },
    { nombre: 'Interpretación artística', puntaje_maximo: 30 },
    { nombre: 'Coreografía', puntaje_maximo: 25 },
    { nombre: 'Presencia escénica', puntaje_maximo: 15 },
  ],
  semifinal: [
    { nombre: 'Técnica de ejecución', puntaje_maximo: 35 },
    { nombre: 'Interpretación artística', puntaje_maximo: 30 },
    { nombre: 'Coreografía', puntaje_maximo: 20 },
    { nombre: 'Presencia escénica', puntaje_maximo: 15 },
  ],
  final: [
    { nombre: 'Técnica de ejecución', puntaje_maximo: 40 },
    { nombre: 'Interpretación artística', puntaje_maximo: 30 },
    { nombre: 'Coreografía', puntaje_maximo: 20 },
    { nombre: 'Presencia escénica', puntaje_maximo: 10 },
  ],
}

export const ETAPAS = ['preliminar', 'eliminatoria', 'semifinal', 'final'] as const