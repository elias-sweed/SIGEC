import { getSupabase } from '../lib/supabase'
import { logConsulta, logError } from '../utils/devlog'
import { generarHuellaDispositivo, generarTokenDispositivo, obtenerIPPublica } from '../utils/fingerprint'

export interface Votante {
  id: string
  evento_id: string
  email: string
  huella: string
  ip: string
  token: string
  votos_gratis_usados: number
  votos_pagados: number
  created_at: string
  updated_at: string
}

export interface VotoPublico {
  id: string
  evento_id: string
  candidata_id: string
  votante_id: string
  tipo: 'gratis' | 'pago'
  created_at: string
}

export interface PagoYape {
  id: string
  votante_id: string
  evento_id: string
  monto: number
  numero_operacion: string
  estado: 'pendiente' | 'verificado' | 'rechazado'
  votos_otorgados: number
  verificado_por: string | null
  notas: string | null
  created_at: string
  updated_at: string
}

export interface PagoConVotante extends PagoYape {
  votantes: { email: string; votos_pagados: number } | null
}

export interface ConfigVotacion {
  id: string
  evento_id: string
  habilitada: boolean
  voto_gratis_por_dispositivo: number
  votos_por_pago: number
  monto_por_pago: number
  auto_verificar_pagos: boolean
  mensaje_bloqueo: string | null
  mensaje_exito: string | null
  yape_numero: string | null
  yape_qr_url: string | null
  updated_at: string
}

export interface EstadoVotante {
  votante: Votante | null
  registrado: boolean
  votosEmitidos: number
  gratisRestantes: number
  pagosDisponibles: number
  bloqueado: boolean
  config: ConfigVotacion
}

export interface ResultadoVoto {
  voto: VotoPublico
  gratisRestantes: number
  pagosDisponibles: number
  bloqueado: boolean
}

export type TipoVoto = 'gratis' | 'pago'

function configPorDefecto(eventoId: string): ConfigVotacion {
  return {
    id: '',
    evento_id: eventoId,
    habilitada: false,
    voto_gratis_por_dispositivo: 1,
    votos_por_pago: 1,
    monto_por_pago: 2,
    auto_verificar_pagos: true,
    mensaje_bloqueo: null,
    mensaje_exito: null,
    yape_numero: '',
    yape_qr_url: '',
    updated_at: '',
  }
}

/** Datos del dispositivo: huella (Canvas+WebGL) y token persistente. */
async function datosDispositivo(): Promise<{ huella: string; token: string }> {
  return {
    huella: await generarHuellaDispositivo(),
    token: generarTokenDispositivo(),
  }
}

/** Configuración de votación del evento (si no existe, devuelve la por defecto). */
export async function consultarConfiguracion(eventoId: string | null): Promise<ConfigVotacion> {
  if (!eventoId) return configPorDefecto('')
  const supabase = getSupabase()

  logConsulta('votacion: consultar configuración', eventoId)
  const { data, error } = await supabase
    .from('config_votacion')
    .select('*')
    .eq('evento_id', eventoId)
    .maybeSingle()

  if (error) {
    logError('votacion.config', error.message)
    return configPorDefecto(eventoId)
  }
  return (data ?? configPorDefecto(eventoId)) as ConfigVotacion
}

/**
 * Emite un voto del dispositivo actual. Toda la validación ocurre en el
 * servidor (función Postgres `votacion_emitir`), por lo que no se puede
 * burlar editando el estado del navegador.
 *  - 'gratis': registra al votante (correo) si es su primer voto.
 *  - 'pago':   registra el número de operación Yape y consume un voto pagado.
 */
export async function emitirVoto(input: {
  eventoId: string
  candidataId: string
  tipo: TipoVoto
  email?: string
  numeroOperacion?: string
}): Promise<ResultadoVoto> {
  const supabase = getSupabase()
  const { huella, token } = await datosDispositivo()

  const ip = input.tipo === 'gratis' ? await obtenerIPPublica() : 'ip:desconocida'

  logConsulta(`votacion: emitir voto tipo=${input.tipo}`, {
    candidata: input.candidataId,
    huella: huella.slice(0, 12),
  })

  const { data, error } = await supabase.rpc('votacion_emitir', {
    p_evento_id: input.eventoId,
    p_candidata_id: input.candidataId,
    p_huella: huella,
    p_token: token,
    p_tipo: input.tipo,
    p_email: input.email ?? null,
    p_numero_operacion: input.numeroOperacion ?? null,
    p_ip: ip,
  })

  if (error) {
    logError('votacion.emitirVoto', error.message)
    throw new Error(error.message)
  }

  const raw = data as {
    voto: VotoPublico
    gratisRestantes: number
    pagosDisponibles: number
    bloqueado: boolean
  }

  return {
    voto: raw.voto,
    gratisRestantes: raw.gratisRestantes,
    pagosDisponibles: raw.pagosDisponibles,
    bloqueado: raw.bloqueado,
  }
}

/** Estado completo del votante de este dispositivo en el evento. */
export async function consultarEstadoVotante(eventoId: string): Promise<EstadoVotante> {
  const config = await consultarConfiguracion(eventoId)

  if (!eventoId) {
    return {
      votante: null,
      registrado: false,
      votosEmitidos: 0,
      gratisRestantes: config.voto_gratis_por_dispositivo,
      pagosDisponibles: 0,
      bloqueado: false,
      config,
    }
  }

  const supabase = getSupabase()
  const { huella, token } = await datosDispositivo()

  const { data, error } = await supabase.rpc('votacion_estado', {
    p_evento_id: eventoId,
    p_huella: huella,
    p_token: token,
  })

  if (error) {
    logError('votacion.estado', error.message)
    return {
      votante: null,
      registrado: false,
      votosEmitidos: 0,
      gratisRestantes: config.voto_gratis_por_dispositivo,
      pagosDisponibles: 0,
      bloqueado: false,
      config,
    }
  }

  const raw = data as {
    votante?: Votante
    registrado: boolean
    votosEmitidos: number
    gratisRestantes: number
    pagosDisponibles: number
    bloqueado: boolean
  }

  return {
    votante: raw.votante ?? null,
    registrado: raw.registrado,
    votosEmitidos: raw.votosEmitidos,
    gratisRestantes: raw.gratisRestantes,
    pagosDisponibles: raw.pagosDisponibles,
    bloqueado: raw.bloqueado,
    config,
  }
}

/** Lista los pagos Yape del evento con el correo del votante (panel admin). */
export async function listarPagosVotacion(eventoId: string): Promise<PagoConVotante[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pagos_yape')
    .select('*, votantes(email, votos_pagados)')
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    logError('votacion.listarPagos', error.message)
    return []
  }
  return (data ?? []) as PagoConVotante[]
}

/** Aprueba un pago pendiente y le otorga los votos configurados. */
export async function aprobarPagoYape(pagoId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('votacion_aprobar_pago', { p_pago_id: pagoId })
  if (error) {
    logError('votacion.aprobarPago', error.message)
    throw new Error(error.message)
  }
}

/** Rechaza un pago y le quita los votos otorgados. */
export async function rechazarPagoYape(pagoId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('votacion_rechazar_pago', { p_pago_id: pagoId })
  if (error) {
    logError('votacion.rechazarPago', error.message)
    throw new Error(error.message)
  }
}

/** Activa/desactiva la votación pública del evento (solo admin). */
export async function actualizarConfigVotacion(
  eventoId: string,
  cambios: Partial<Pick<ConfigVotacion, 'habilitada' | 'auto_verificar_pagos' | 'monto_por_pago' | 'votos_por_pago' | 'yape_numero' | 'yape_qr_url'>>,
): Promise<void> {
  const supabase = getSupabase()
  const { data: existente } = await supabase
    .from('config_votacion')
    .select('id')
    .eq('evento_id', eventoId)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase
      .from('config_votacion')
      .update(cambios)
      .eq('evento_id', eventoId)
    if (error) {
      logError('votacion.actualizarConfig', error.message)
      throw new Error(error.message)
    }
    return
  }

  const { error } = await supabase
    .from('config_votacion')
    .insert({ evento_id: eventoId, ...cambios })
  if (error) {
    logError('votacion.crearConfig', error.message)
    throw new Error(error.message)
  }
}
