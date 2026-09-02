export interface PuntajeDetalle {
  criterio_id: string
  puntaje: number
}

export function calcularTotal(detalles: PuntajeDetalle[]): number {
  const total = detalles.reduce((suma, detalle) => suma + detalle.puntaje, 0)
  return redondear(total)
}

export function calcularTotales(
  detalles: PuntajeDetalle[],
  desempateIds: ReadonlySet<string>,
): { base: number; desempate: number } {
  let base = 0
  let desempate = 0
  for (const detalle of detalles) {
    if (desempateIds.has(detalle.criterio_id)) desempate += detalle.puntaje
    else base += detalle.puntaje
  }
  return { base: redondear(base), desempate: redondear(desempate) }
}

export function calcularPromedioJurados(totales: number[]): number {
  if (totales.length === 0) return 0
  const promedio = totales.reduce((suma, total) => suma + total, 0) / totales.length
  return redondear(promedio)
}

export function validarPuntaje(puntaje: number, puntajeMaximo: number): boolean {
  return Number.isFinite(puntaje) && puntaje >= 0 && puntaje <= puntajeMaximo
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100
}
