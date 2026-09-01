const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generarFragmento(longitud: number): string {
  let salida = ''
  for (let i = 0; i < longitud; i += 1) {
    salida += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return salida
}

/** Código de jurado aleatorio e impredecible: JUR-XXXXXXXX (sin caracteres ambiguos). */
export function generarCodigoJurado(): string {
  return `JUR-${generarFragmento(6)}`
}
