import { useMemo, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { IconoCheck, IconoLapiz, IconoPapelera } from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { generarCodigoJurado, generarTokenAcceso } from '../../utils/codigos'
import { logConsulta, logError } from '../../utils/devlog'

export default function Jurados() {
  const { jurados, recargar } = usePanelData()

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
            className="flex-1 rounded-lg border border-white/10 bg-navy-800 px-3 py-2 text-sm text-white placeholder:text-navy-500"
          />
          <div className="flex items-center rounded-lg border border-gold-500/30 bg-gold-500/10 px-3 text-xs font-bold text-gold-400">
            {siguienteCodigo}
          </div>
        </div>
        <button
          onClick={agregar}
          className="mt-2 w-full rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
        >
          Agregar jurado
        </button>

        {jurados.length > 0 && (
          <ul className="mt-4 max-h-80 space-y-1 overflow-y-auto">
            {jurados.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2 text-sm"
              >
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
                      className={`ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        j.activado ? 'bg-emerald-500/15 text-emerald-400' : 'bg-navy-600/40 text-navy-400'
                      }`}
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
        )}
      </Section>
    </div>
  )
}