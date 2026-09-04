import { useMemo, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import {
  IconoCheck,
  IconoLapiz,
  IconoPapelera,
} from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { generarCodigoJurado, generarTokenAcceso } from '../../utils/codigos'
import { logConsulta, logError } from '../../utils/devlog'

export default function Jurados() {
  const { jurados, cargandoInicial, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [error, setError] = useState<string | null>(null)

  const comenzarEdicion = (id: string, valor: string) => {
    setEditandoId(id)
    setEditandoNombre(valor)
  }

  const guardarEdicion = async (id: string) => {
    if (!editandoNombre.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }
    const supabase = getSupabase()
    const { error } = await supabase
      .from('jurados')
      .update({ nombre: editandoNombre.trim() })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setEditandoId(null)
    setError(null)
    await recargar()
  }

  const siguienteCodigo = useMemo(() => generarCodigoJurado(), [jurados])

  // Número fijo (1..N) según el orden actual de jurados, igual que en Candidatas
  const numeroPorId = useMemo(() => {
    const map = new Map<string, number>()
    jurados.forEach((j, i) => map.set(j.id, i + 1))
    return map
  }, [jurados])

  const agregar = async () => {
    if (!nombre.trim()) {
      setError('Ingresa el nombre del jurado')
      return
    }
    const supabase = getSupabase()
    logConsulta(`Panel: agregar jurado con código ${siguienteCodigo}`)
    const { error } = await supabase.from('jurados').insert({
      nombre: nombre.trim(),
      codigo: siguienteCodigo,
      token_acceso: generarTokenAcceso(),
    })
    if (error) {
      logError('agregar jurado', error.message)
      setError(error.message)
      return
    }
    setNombre('')
    setError(null)
    await recargar()
  }

  const eliminar = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('jurados').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    await recargar()
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Jurados"
        description="Registra a los jurados. Cada uno recibe un código único y aleatorio que usarás en su QR de acceso."
      />

      <Section
        titulo="Registro de jurados"
        descripcion="Nombre y código automático"
        completado={jurados.length > 0}
      >
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <input
            placeholder="Nombre del jurado"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-panel flex-1"
          />
          <div className="flex items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 text-xs font-bold text-gold-300">
            {siguienteCodigo}
          </div>
        </div>
        <button
          onClick={agregar}
          className="btn-gold mt-3 w-full"
        >
          Agregar jurado
        </button>

        {cargandoInicial ? (
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fila-panel">
                <div className="h-3 w-12 rounded skeleton bg-white/10" />
                <div className="h-3 flex-1 skeleton bg-white/10" />
                <div className="h-5 w-20 rounded-full skeleton bg-white/10" />
                <div className="flex gap-1.5">
                  <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
                  <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          jurados.length > 0 && (
            <ul className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
            {jurados.map((j) => (
              <li
                key={j.id}
                className="fila-panel text-sm"
              >
                <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-gold-500/15 font-mono text-xs font-bold text-gold-300 ring-1 ring-gold-500/25">
                  {numeroPorId.get(j.id)}
                </span>
                {editandoId === j.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      value={editandoNombre}
                      onChange={(e) => setEditandoNombre(e.target.value)}
                      className="flex-1 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                    />
                    <button
                      onClick={() => guardarEdicion(j.id)}
                      title="Guardar"
                      aria-label="Guardar"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 transition hover:bg-emerald-500/25"
                    >
                      <IconoCheck />
                    </button>
                  </div>
                ) : (
                  <span className="truncate">
                    <span className="font-mono text-xs font-bold text-gold-400">{j.codigo}</span>
                    <span className="ml-2 text-white">{j.nombre}</span>
                    <span
                      className={`chip ${j.activado ? 'chip-ok' : 'chip-muted'}`}
                    >
                      {j.activado ? '✔ Activado' : 'Pendiente'}
                    </span>
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {editandoId !== j.id && (
                    <button
                      onClick={() => comenzarEdicion(j.id, j.nombre)}
                      title="Editar jurado"
                      aria-label="Editar jurado"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/10 text-gold-400 transition hover:bg-gold-500/25"
                    >
                      <IconoLapiz />
                    </button>
                  )}
                  <button
                    onClick={() => eliminar(j.id)}
                    title="Eliminar jurado"
                    aria-label="Eliminar jurado"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/25"
                  >
                    <IconoPapelera />
                  </button>
                </div>
              </li>
            ))}
            </ul>
          )
        )}
      </Section>
    </div>
  )
}