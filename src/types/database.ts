export interface Evento {
  id: string
  nombre: string
  etapa: string
  estado: string
  created_at: string
}

export interface Candidata {
  id: string
  nombre: string
  grado: string
  seccion: string
  foto_url: string | null
  created_at: string
}

export interface Jurado {
  id: string
  nombre: string
  codigo: string
  en_sesion: boolean
  created_at: string
}

export interface Criterio {
  id: string
  etapa: string
  nombre: string
  puntaje_maximo: number
  orden: number
}

export interface Evaluacion {
  id: string
  evento_id: string
  candidata_id: string
  jurado_id: string
  estado: string
  created_at: string
}

export interface EvaluacionDetalle {
  id: string
  evaluacion_id: string
  criterio_id: string
  puntaje: number
  created_at: string
}

export interface EvaluacionConDetalles extends Evaluacion {
  evaluacion_detalles: EvaluacionDetalle[]
}
