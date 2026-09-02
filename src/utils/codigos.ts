const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ALFABETO_LEN = ALFABETO.length

/**
 * Genera un fragmento aleatorio criptográficamente seguro usando
 * crypto.getRandomValues() (CSPRNG). Reemplaza a Math.random(), que es
 * predecible y no apto para tokens de acceso.
 */
function generarFragmento(longitud: number): string {
  const bytes = new Uint32Array(longitud)
  crypto.getRandomValues(bytes)
  let salida = ''
  for (let i = 0; i < longitud; i += 1) {
    // Se descarta el sesgo de módulo al truncar a múltiplos del tamaño del alfabeto.
    salida += ALFABETO[bytes[i] % ALFABETO_LEN]
  }
  return salida
}

/** Código de jurado aleatorio e impredecible: JUR-XXXXXXXX (sin caracteres ambiguos). */
export function generarCodigoJurado(): string {
  return `JUR-${generarFragmento(6)}`
}

/** Token largo y aleatorio para el enlace del QR (no revela el código del jurado). */
export function generarTokenAcceso(): string {
  return generarFragmento(32)
}
