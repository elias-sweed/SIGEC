import { useEffect, useMemo, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import {
  IconoCheck,
  IconoCopiar,
  IconoLapiz,
  IconoPapelera,
} from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import {
  actualizarMesa,
  crearMesa,
  eliminarMesa,
  listarMesas,
  regenerarCodigoMesa,
  type MesaCobro,
} from '../../services/mesas.service'
import { generarCodigoMesa } from '../../utils/codigos'
import { logError } from '../../utils/devlog'

export default function Mesas() {
  const { evento } = usePanelData()
  const eventoId = evento?.id ?? null

  const [mesas, setMesas] = useState<MesaCobro[]>([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [nombre, setNombre] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editandoNombre, setEditandoNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  const siguienteCodigo = useMemo(() => generarCodigoMesa(), [mesas.length])

  // Número fijo (1..N) según el orden actual, igual que en Candidatas/Jurados.
  const numeroPorId = useMemo(() => {
    const map = new Map<string, number>()
    mesas.forEach((j, i) => map.set(j.id, i + 1))
    return map
  }, [mesas])

  const cargar = async () => {
    if (!eventoId) return
    setCargandoLista(true)
    setError(null)
    try {
      const lista = await listarMesas(eventoId)
      setMesas(lista)
    } catch (err) {
      logError('Mesas.cargar', err instanceof Error ? err.message : String(err))
      setError('No se pudieron cargar las mesas de cobro.')
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => {
    void cargar()
  }, [eventoId])

  const copiar = async (codigo: string, id: string) => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(id)
      window.setTimeout(() => setCopiado(null), 1500)
    } catch {
      setError('No se pudo copiar el código.')
    }
  }

  const agregar = async () => {
    if (!eventoId) return
    if (!nombre.trim()) {
      setError('Ingresa el nombre de la mesa')
      return
    }
    setError(null)
    try {
      const mesa = await crearMesa(eventoId, nombre.trim())
      setNombre('')
      await cargar()
      await copiar(mesa.codigo, mesa.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const comenzarEdicion = (id: string, valor: string) => {
    setEditandoId(id)
    setEditandoNombre(valor)
  }

  const guardarEdicion = async (id: string) => {
    if (!editandoNombre.trim()) {
      setError('El nombre no puede estar vacío')
      return
    }
    setError(null)
    try {
      await actualizarMesa(id, { nombre: editandoNombre.trim() })
      setEditandoId(null)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const alternarActiva = async (mesa: MesaCobro) => {
    setError(null)
    try {
      await actualizarMesa(mesa.id, { habilitada: !mesa.habilitada })
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const regenerar = async (mesa: MesaCobro) => {
    if (!window.confirm(`¿Generar un código nuevo para «${mesa.nombre}»? El anterior dejará de funcionar.`)) return
    setError(null)
    try {
      const nueva = await regenerarCodigoMesa(mesa.id, mesas)
      await cargar()
      await copiar(nueva.codigo, nueva.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const eliminar = async (id: string) => {
    setError(null)
    try {
      await eliminarMesa(id)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Mesas de cobro"
        description={`Registra a los cobradores del evento seleccionado: ${evento?.nombre ?? '—'}. Cada uno abre ${window.location.origin}/mesa con su código para confirmar los pagos Yape en vivo.`}
      />

      <Section
        titulo="Registro de mesas de cobro"
        descripcion="Nombre y código automático. El código es la contraseña de acceso a /mesa."
        completado={mesas.length > 0}
      >
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <input
            placeholder="Nombre de la mesa (ej. Cobrador 1)"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void agregar()
            }}
            className="input-panel flex-1"
          />
          <div
            className="flex items-center rounded-xl border border-gold-500/30 bg-gold-500/10 px-3 font-mono text-xs font-bold tracking-widest text-gold-300"
            title="Código que se asignará a la mesa"
          >
            {siguienteCodigo}
          </div>
        </div>
        <button onClick={() => void agregar()} className="btn-gold mt-3 w-full">
          Agregar mesa de cobro
        </button>

        {cargandoLista ? (
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
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
          mesas.length > 0 && (
            <ul className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
              {mesas.map((j) => (
                <li key={j.id} className="fila-panel text-sm">
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
                    <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                      <span className="font-mono text-xs font-bold tracking-widest text-gold-400">
                        {j.codigo}
                      </span>
                      <span className="truncate text-white">{j.nombre}</span>
                      <span className={`chip ${j.habilitada ? 'chip-ok' : 'chip-muted'}`}>
                        {j.habilitada ? '● Activa' : 'Apagada'}
                      </span>
                    </span>
                  )}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => void copiar(j.codigo, j.id)}
                      title={copiado === j.id ? '¡Copiado!' : 'Copiar código'}
                      aria-label="Copiar código"
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        copiado === j.id
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-navy-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <IconoCopiar />
                    </button>
                    {editandoId !== j.id && (
                      <button
                        onClick={() => comenzarEdicion(j.id, j.nombre)}
                        title="Editar mesa"
                        aria-label="Editar mesa"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/10 text-gold-400 transition hover:bg-gold-500/25"
                      >
                        <IconoLapiz />
                      </button>
                    )}
                    <button
                      onClick={() => void alternarActiva(j)}
                      title={j.habilitada ? 'Apagar mesa' : 'Activar mesa'}
                      aria-label={j.habilitada ? 'Apagar mesa' : 'Activar mesa'}
                      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                        j.habilitada
                          ? 'bg-white/5 text-navy-200 hover:bg-amber-500/20 hover:text-amber-300'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25'
                      }`}
                    >
                      {j.habilitada ? '⏻' : '▶'}
                    </button>
                    <button
                      onClick={() => void regenerar(j)}
                      title="Nuevo código"
                      aria-label="Nuevo código"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-navy-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4.5 w-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                    <button
                      onClick={() => void eliminar(j.id)}
                      title="Eliminar mesa"
                      aria-label="Eliminar mesa"
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

        {!cargandoLista && mesas.length === 0 && (
          <p className="mt-4 text-sm text-navy-400/80">
            Todavía no hay mesas. Agrega "Cobrador 1", "Cobrador 2", etc. y entrega a cada uno su
            código para abrir la vista de cobro.
          </p>
        )}

        {eventoId && (
          <p className="mt-3 break-all text-[11px] text-navy-400">
            Los cobradores abren{' '}
            <a href="/mesa" className="text-gold-300 hover:text-gold-200">{window.location.origin}/mesa</a> y
            escriben su código para confirmar los Yapes en vivo.
          </p>
        )}
      </Section>
    </div>
  )
}