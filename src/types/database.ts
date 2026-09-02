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
  token_acceso: string | null
  en_sesion: boolean
  activado: boolean
  email_interno: string | null
  auth_uid: string | null
  created_at: string
}

export interface Criterio {
  id: string
  etapa: string
  nombre: string
  puntaje_maximo: number
  indicadores: string | null
  es_desempate: boolean
  orden: number
}

export interface ReglamentoEtapa {
  id: string
  etapa: string
  contenido: string
  updated_at: string
}

export interface Evaluacion {
  id: string
  evento_id: string
  candidata_id: string
  jurado_id: string
  estado: string
  es_ensayo: boolean
  created_at: string
  updated_at: string
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

export interface Auditoria {
  id: string
  usuario: string
  accion: string
  descripcion: string | null
  created_at: string
}
