export const PESO_INTERACCION = 10

export interface ConteoVotos {
  candidata_id: string
  votos: number
}

export interface InteraccionCalculada {
  puntos: Record<string, number>
  votos: Record<string, number>
  maxVotos: number
}

export function calcularPuntosInteraccion(
  conteo: ConteoVotos[],
  peso: number = PESO_INTERACCION,
): InteraccionCalculada {
  const votos: Record<string, number> = {}
  let maxVotos = 0
  for (const c of conteo) {
    votos[c.candidata_id] = c.votos
    if (c.votos > maxVotos) maxVotos = c.votos
  }

  const puntos: Record<string, number> = {}
  if (maxVotos > 0) {
    for (const [candidataId, n] of Object.entries(votos)) {
      puntos[candidataId] = Math.round(peso * (n / maxVotos) * 100) / 100
    }
  }
  return { puntos, votos, maxVotos }
}