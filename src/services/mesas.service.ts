import { getSupabase } from '../lib/supabase'
import { generarCodigoMesa } from '../utils/codigos'
import { logError } from '../utils/devlog'

export interface MesaCobro {
  id: string
  evento_id: string
  nombre: string
  codigo: string
  habilitada: boolean
  created_at: string
}

export interface MesaSesion {
  id: string
  nombre: string
  eventoId: string
  codigo: string
}

export interface PagoMesa {
  id: string
  votante_id: string
  email: string | null
  monto: number
  numero_operacion: string
  estado: 'pendiente' | 'verificado' | 'rechazado'
  verificado_por: string | null
  mesa_verifico_id: string | null
  created_at: string
}

const KEY_SESION_MESA = 'sigec-mesa-sesion'

/** Lista las mesas de cobro del evento (panel admin). */
export async function listarMesas(eventoId: string): Promise<MesaCobro[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('mesas_cobro')
    .select('*')
    .eq('evento_id', eventoId)
    .order('created_at')

  if (error) {
    logError('mesas.listar', error.message)
    return []
  }
  return (data ?? []) as MesaCobro[]
}

/** Crea una mesa con un código único (regenerando si colisiona). */
export async function crearMesa(eventoId: string, nombre: string): Promise<MesaCobro> {
  const supabase = getSupabase()
  const nombreLimpio = nombre.trim() || 'Cobrador'

  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigoMesa()
    const { data, error } = await supabase
      .from('mesas_cobro')
      .insert({ evento_id: eventoId, nombre: nombreLimpio, codigo })
      .select('*')
      .single()
    if (error) {
      if (error.code === '23505') continue
      logError('mesas.crear', error.message)
      throw new Error(error.message)
    }
    return data as MesaCobro
  }
  throw new Error('No se pudo generar un código único para la mesa.')
}

export async function actualizarMesa(
  id: string,
  cambios: Partial<Pick<MesaCobro, 'nombre' | 'habilitada' | 'codigo'>>,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('mesas_cobro').update(cambios).eq('id', id)
  if (error) {
    logError('mesas.actualizar', error.message)
    throw new Error(error.message)
  }
}

/** Genera un código nuevo único para la mesa (el anterior deja de servir). */
export async function regenerarCodigoMesa(id: string, otrasMesas: MesaCobro[]): Promise<MesaCobro> {
  const supabase = getSupabase()
  for (let intento = 0; intento < 10; intento++) {
    const codigo = generarCodigoMesa()
    if (otrasMesas.some((m) => m.codigo === codigo)) continue
    const { data, error } = await supabase
      .from('mesas_cobro')
      .update({ codigo })
      .eq('id', id)
      .select('*')
      .single()
    if (error) {
      if (error.code === '23505') continue
      logError('mesas.regenerar', error.message)
      throw new Error(error.message)
    }
    return data as MesaCobro
  }
  throw new Error('No se pudo generar un código único para la mesa.')
}

export async function eliminarMesa(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('mesas_cobro').delete().eq('id', id)
  if (error) {
    logError('mesas.eliminar', error.message)
    throw new Error(error.message)
  }
}

/** Login de la mesa por código (función server-side). */
export async function obtenerMesaPorCodigo(codigo: string): Promise<MesaSesion | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('mesa_obtener', { p_codigo: codigo.trim() })
  if (error) {
    logError('mesas.obtener', error.message)
    return null
  }
  if (!data) return null
  const raw = data as { id: string; nombre: string; evento_id: string; codigo: string }
  return { id: raw.id, nombre: raw.nombre, eventoId: raw.evento_id, codigo: raw.codigo }
}

/** Pagos del evento de la mesa (pendientes y recientes). */
export async function listarPagosMesa(codigo: string): Promise<PagoMesa[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('mesa_listar_pagos', { p_codigo_mesa: codigo })
  if (error) {
    logError('mesas.listarPagos', error.message)
    return []
  }
  return (data ?? []) as PagoMesa[]
}

/** Aprueba un pago desde la mesa (validado por código de mesa). */
export async function aprobarPagoMesa(pagoId: string, codigo: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('votacion_aprobar_pago_mesa', {
    p_pago_id: pagoId,
    p_codigo_mesa: codigo,
  })
  if (error) {
    logError('mesas.aprobar', error.message)
    throw new Error(error.message)
  }
}

export async function rechazarPagoMesa(pagoId: string, codigo: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('votacion_rechazar_pago_mesa', {
    p_pago_id: pagoId,
    p_codigo_mesa: codigo,
  })
  if (error) {
    logError('mesas.rechazar', error.message)
    throw new Error(error.message)
  }
}

/* ─── Sesión local de la mesa ────────────────────────────────────────── */

export function guardarSesionMesa(sesion: MesaSesion): void {
  try {
    window.localStorage.setItem(KEY_SESION_MESA, JSON.stringify(sesion))
  } catch {
    /* sin almacenamiento */
  }
}

export function leerSesionMesa(): MesaSesion | null {
  try {
    const crudo = window.localStorage.getItem(KEY_SESION_MESA)
    if (!crudo) return null
    const datos = JSON.parse(crudo) as MesaSesion
    if (!datos.id || !datos.codigo) return null
    return datos
  } catch {
    return null
  }
}

export function limpiarSesionMesa(): void {
  try {
    window.localStorage.removeItem(KEY_SESION_MESA)
  } catch {
    /* sin almacenamiento */
  }
}