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

export interface ConfigVotacion {
  id: string
  evento_id: string
  habilitada: boolean
  voto_gratis_por_dispositivo: number
  votos_por_pago: number
  monto_por_pago: number
  mensaje_bloqueo: string | null
  mensaje_exito: string | null
  yape_numero: string | null
  yape_qr_url: string | null
  updated_at: string
}

export interface ResultadoRegistroVotante {
  votante: Votante
  yaRegistrado: boolean
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

export interface ConteoVotosCandidata {
  candidata_id: string
  total: number
  gratis: number
  pagados: number
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
    mensaje_bloqueo: null,
    mensaje_exito: null,
    yape_numero: '',
    yape_qr_url: '',
    updated_at: '',
  }
}

/** Busca al votante de ESTE dispositivo en el evento (por huella o token). */
async function votanteActual(eventoId: string): Promise<Votante | null> {
  const supabase = getSupabase()
  const huella = await generarHuellaDispositivo()
  const token = generarTokenDispositivo()

  const { data, error } = await supabase
    .from('votantes')
    .select('*')
    .eq('evento_id', eventoId)
    .or(`huella.eq.${huella},token.eq.${token}`)
    .maybeSingle()

  if (error) logError('votacion.votanteActual', error.message)
  return (data ?? null) as Votante | null
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
 * Registra al votante (primer voto gratis): genera huella + token del
 * dispositivo y lo da de alta si aún no existe en este evento. Si la huella
 * o el token ya existen, devuelve el votante existente (segundo voto bloqueado).
 */
export async function registrarVotante(input: {
  eventoId: string
  email: string
}): Promise<ResultadoRegistroVotante> {
  const supabase = getSupabase()
  const email = input.email.trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Ingresa un correo válido para registrar tu voto.')
  }

  const huella = await generarHuellaDispositivo()
  const token = generarTokenDispositivo()

  logConsulta('votacion: registrar votante', { eventoId: input.eventoId, email, huella: huella.slice(0, 12) })

  const { data: existente } = await supabase
    .from('votantes')
    .select('*')
    .eq('evento_id', input.eventoId)
    .or(`huella.eq.${huella},token.eq.${token}`)
    .maybeSingle()

  if (existente) {
    logConsulta('votacion: huella ya registrada (segundo voto bloqueado)')
    return { votante: existente as Votante, yaRegistrado: true }
  }

  const ip = await obtenerIPPublica()

  // Bloqueo por IP: solo 1 voto gratis por (evento + red/IP pública). Captura
  // el caso de copiar el link a otro celular en la misma red/WiFi: como el
  // segundo votante tiene el mismo IP, su voto gratis queda bloqueado y solo
  // se desbloquea pagando exactamente el monto configurado. (La huella de
  // dispositivo ya bloquea al mismo celular aunque use VPN o modo incógnito.)
  if (ip !== 'ip:desconocida') {
    const { data: mismaRed } = await supabase
      .from('votantes')
      .select('id')
      .eq('evento_id', input.eventoId)
      .eq('ip', ip)
      .maybeSingle()
    if (mismaRed) {
      throw new Error(
        'Esta red ya registró su voto gratis en este evento. Para votar de nuevo Yapea exactamente el monto indicado desde este dispositivo.',
      )
    }
  }

  const { data, error } = await supabase
    .from('votantes')
    .insert({
      evento_id: input.eventoId,
      email,
      huella,
      ip,
      token,
    })
    .select('*')
    .single()

  if (error) {
    // Colisión por otra pestaña/ventana: recupera el registro que ya existía.
    if (error.code === '23505') {
      const { data: repetido } = await supabase
        .from('votantes')
        .select('*')
        .eq('evento_id', input.eventoId)
        .eq('token', token)
        .maybeSingle()
      if (repetido) return { votante: repetido as Votante, yaRegistrado: true }
    }
    logError('votacion.registrarVotante', error.message)
    throw error
  }

  return { votante: data as Votante, yaRegistrado: false }
}

/** Total de votos pagados verificados (otorgados) para este votante. */
async function pagosOtorgados(votanteId: string): Promise<number> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('pagos_yape')
    .select('votos_otorgados')
    .eq('votante_id', votanteId)
    .eq('estado', 'verificado')

  if (error) {
    logError('votacion.pagosOtorgados', error.message)
    return 0
  }
  return (data ?? []).reduce((s, p) => s + (Number(p.votos_otorgados) || 0), 0)
}

/**
 * Emite un voto del dispositivo actual.
 *  - 'gratis': solo si config.habilitada y quedan votos gratis.
 *  - 'pago':   solo si quedan votos pagados verificados sin usar.
 * Requiere que el votante ya esté registrado (primer voto gratis primero).
 */
export async function emitirVoto(input: {
  eventoId: string
  candidataId: string
  tipo: TipoVoto
}): Promise<ResultadoVoto> {
  const supabase = getSupabase()
  const config = await consultarConfiguracion(input.eventoId)

  if (!config.habilitada) {
    throw new Error('La votación pública está desactivada en este momento.')
  }

  const votante = await votanteActual(input.eventoId)
  if (!votante) {
    throw new Error('Regístrate con tu correo para poder votar.')
  }

  logConsulta(`votacion: emitir voto tipo=${input.tipo}`, {
    votante: votante.id,
    candidata: input.candidataId,
  })

  let nuevoGratis = votante.votos_gratis_usados
  let nuevoPagados = votante.votos_pagados

  if (input.tipo === 'gratis') {
    if (nuevoGratis >= config.voto_gratis_por_dispositivo) {
      throw new Error('Ya usaste tu voto gratis. Desbloquea más votos para seguir participando.')
    }
    nuevoGratis += 1
  } else {
    const otorgados = await pagosOtorgados(votante.id)
    if (votante.votos_pagados >= otorgados) {
      throw new Error('No tienes votos pagados disponibles. Registra un pago Yape y espera la verificación.')
    }
    nuevoPagados += 1
  }

  const { data, error } = await supabase
    .from('votos_publico')
    .insert({
      evento_id: input.eventoId,
      candidata_id: input.candidataId,
      votante_id: votante.id,
      tipo: input.tipo,
    })
    .select('*')
    .single()

  if (error) {
    logError('votacion.emitirVoto', error.message)
    throw error
  }

  const update: { votos_gratis_usados?: number; votos_pagados?: number } = {}
  if (input.tipo === 'gratis') update.votos_gratis_usados = nuevoGratis
  else update.votos_pagados = nuevoPagados
  const { error: errUpd } = await supabase.from('votantes').update(update).eq('id', votante.id)
  if (errUpd) logError('votacion.actualizar votante', errUpd.message)

  const otorgados = await pagosOtorgados(votante.id)
  const gratisRestantes = Math.max(0, config.voto_gratis_por_dispositivo - nuevoGratis)
  const pagosDisponibles = Math.max(0, otorgados - nuevoPagados)

  return {
    voto: data as VotoPublico,
    gratisRestantes,
    pagosDisponibles,
    bloqueado: gratisRestantes <= 0 && pagosDisponibles <= 0,
  }
}

/** Estado completo del votante de este dispositivo en el evento. */
export async function consultarEstadoVotante(eventoId: string): Promise<EstadoVotante> {
  const config = await consultarConfiguracion(eventoId)
  const votante = await votanteActual(eventoId)

  if (!votante) {
    return { votante: null, registrado: false, votosEmitidos: 0, gratisRestantes: config.voto_gratis_por_dispositivo, pagosDisponibles: 0, bloqueado: false, config }
  }

  const supabase = getSupabase()
  const { count } = await supabase
    .from('votos_publico')
    .select('*', { count: 'exact', head: true })
    .eq('votante_id', votante.id)

  const otorgados = await pagosOtorgados(votante.id)
  const gratisRestantes = Math.max(0, config.voto_gratis_por_dispositivo - votante.votos_gratis_usados)
  const pagosDisponibles = Math.max(0, otorgados - votante.votos_pagados)

  return {
    votante,
    registrado: true,
    votosEmitidos: count ?? 0,
    gratisRestantes,
    pagosDisponibles,
    bloqueado: gratisRestantes <= 0 && pagosDisponibles <= 0,
    config,
  }
}

/** Registra la intención de pago Yape del votante (queda pendiente de verificación). */
export async function registrarPagoYape(input: {
  votanteId: string
  eventoId: string
  monto: number
  numeroOperacion: string
}): Promise<PagoYape> {
  const supabase = getSupabase()

  if (!input.numeroOperacion.trim()) {
    throw new Error('Ingresa el número de operación de tu pago Yape.')
  }
  if (!(input.monto > 0)) {
    throw new Error('El monto del pago no es válido.')
  }

  // Validación estricta del monto: el pago desbloquea votos SOLO si se Yapeó
  // exactamente el monto configurado (S/ 2.00). Un Yape de 0.10 o cualquier
  // otro valor no deja continuar: ese abono no vale y el voto no se libera.
  const config = await consultarConfiguracion(input.eventoId)
  const coincide = Math.abs(input.monto - config.monto_por_pago) < 0.005
  const requiereMonto = config.monto_por_pago > 0
  if (requiereMonto && !coincide) {
    throw new Error(
      `El monto debe ser exactamente S/ ${config.monto_por_pago.toFixed(2)}. Si Yapeaste otro monto, ese abono no desbloquea votos: vuelve a Yapear exactamente S/ ${config.monto_por_pago.toFixed(2)} para poder seguir votando.`,
    )
  }

  logConsulta('votacion: registrar pago Yape', {
    votante: input.votanteId,
    numero: input.numeroOperacion,
    monto: input.monto,
  })

  const { data, error } = await supabase
    .from('pagos_yape')
    .insert({
      votante_id: input.votanteId,
      evento_id: input.eventoId,
      monto: input.monto,
      numero_operacion: input.numeroOperacion.trim(),
    })
    .select('*')
    .single()

  if (error) {
    logError('votacion.registrarPagoYape', error.message)
    throw error
  }
  return data as PagoYape
}

/** Conteo de votos públicos por candidata (categoría aparte de la evaluación de jurados). */
export async function contarVotosPublicos(eventoId: string): Promise<ConteoVotosCandidata[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('votos_publico')
    .select('candidata_id, tipo')
    .eq('evento_id', eventoId)

  if (error) {
    logError('votacion.contarVotos', error.message)
    return []
  }

  const porCandidata = new Map<string, ConteoVotosCandidata>()
  for (const v of (data ?? []) as Array<{ candidata_id: string; tipo: string }>) {
    const actual: ConteoVotosCandidata = porCandidata.get(v.candidata_id) ?? {
      candidata_id: v.candidata_id,
      total: 0,
      gratis: 0,
      pagados: 0,
    }
    actual.total += 1
    if (v.tipo === 'pago') actual.pagados += 1
    else actual.gratis += 1
    porCandidata.set(v.candidata_id, actual)
  }

  return [...porCandidata.values()].sort((a, b) => b.total - a.total)
}