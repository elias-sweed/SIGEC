const isDev = import.meta.env.DEV

export function logConsulta(mensaje: string, datos?: unknown) {
  if (!isDev) return
  console.groupCollapsed(`🔍 ${mensaje}`)
  if (datos !== undefined) console.log('Datos:', datos)
  console.groupEnd()
}

export function logFilas(tabla: string, filas: unknown[]) {
  if (!isDev) return
  console.groupCollapsed(`📋 ${tabla} → ${filas.length} fila(s)`)
  console.table(filas)
  console.groupEnd()
}

export function logError(origen: string, mensaje: string) {
  if (!isDev) return
  console.group(`❌ Error en ${origen}`)
  console.error(mensaje)
  console.groupEnd()
}
