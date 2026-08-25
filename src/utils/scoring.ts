export interface PuntajeDetalle {
  puntaje: number
}

export function calcularTotal(detalles: PuntajeDetalle[]): number {
  const total = detalles.reduce((suma, detalle) => suma + detalle.puntaje, 0)
  return redondear(total)
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
