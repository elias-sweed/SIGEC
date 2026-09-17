import { useCallback, useEffect, useState } from 'react'
import { usePanelData } from '../../context/PanelDataContext'
import {
  actualizarMesa,
  crearMesa,
  eliminarMesa,
  listarMesas,
  type MesaCobro,
} from '../../services/mesas.service'
import { registrarAccion } from '../../utils/auditLog'
import { logError } from '../../utils/devlog'

export default function MesasCobro() {
  const { evento } = usePanelData()
  const eventoId = evento?.id ?? null

  const [mesas, setMesas] = useState<MesaCobro[]>([])
  const [cargando, setCargando] = useState(true)
  const [operando, setOperando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nombreNueva, setNombreNueva] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!eventoId) {
      setCargando(false)
      return
    }
    setCargando(true)
    setError(null)
    try {
      const lista = await listarMesas(eventoId)
      setMesas(lista)
    } catch (err) {
      logError('MesasCobro.cargar', err instanceof Error ? err.message : String(err))
      setError('No se pudieron cargar las mesas de cobro.')
    } finally {
      setCargando(false)
    }
  }, [eventoId])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const copiarCodigo = async (mesa: MesaCobro) => {
    try {
      await navigator.clipboard.writeText(mesa.codigo)
      setCopiado(mesa.id)
      window.setTimeout(() => setCopiado(null), 1500)
    } catch {
      setError('No se pudo copiar el código.')
    }
  }

  const crear = async () => {
    if (!eventoId || operando) return
    setOperando('crear')
    setError(null)
    try {
      const mesa = await crearMesa(eventoId, nombreNueva.trim() || `Cobrador ${mesas.length + 1}`)
      setNombreNueva('')
      await cargar()
      await copiarCodigo(mesa)
      await registrarAccion('Operador', 'mesa_crear', `Mesa «${mesa.nombre}» creada (código ${mesa.codigo})`)
      alert(
        `Mesa «${mesa.nombre}» creada.\n\nCódigo de acceso: ${mesa.codigo}\n\nCópialo y dáselo al cobrador. La abre en:\n${window.location.origin}/mesa`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  const alternarHabilitada = async (mesa: MesaCobro) => {
    if (operando) return
    setOperando(mesa.id)
    setError(null)
    try {
      await actualizarMesa(mesa.id, { habilitada: !mesa.habilitada })
      await cargar()
      await registrarAccion(
        'Operador',
        'mesa_toggle',
        `Mesa «${mesa.nombre}» ${!mesa.habilitada ? 'habilitada' : 'deshabilitada'}`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  const regenerarCodigo = async (mesa: MesaCobro) => {
    if (operando) return
    if (!window.confirm(`¿Generar un código nuevo para «${mesa.nombre}»? El anterior dejará de funcionar.`)) return
    setOperando(mesa.id)
    setError(null)
    try {
      const lista = await listarMesas(eventoId ?? '')
      let codigo = ''
      let colision = true
      while (colision) {
        codigo = crypto.randomUUID().replace(/[-]/g, '').slice(0, 6).toUpperCase()
        colision = lista.some((m) => m.codigo === codigo)
      }
      if (!codigo) throw new Error('No se pudo generar el código.')
      await actualizarMesa(mesa.id, { codigo })
      await cargar()
      await registrarAccion('Operador', 'mesa_codigo', `Código regenerado para «${mesa.nombre}»`)
      await copiarCodigo({ ...mesa, codigo })
      alert(`Nuevo código de ${mesa.nombre}: ${codigo}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  const eliminar = async (mesa: MesaCobro) => {
    if (operando) return
    if (!window.confirm(`¿Eliminar la mesa «${mesa.nombre}»? No borra pagos, solo el acceso.`)) return
    setOperando(mesa.id)
    setError(null)
    try {
      await eliminarMesa(mesa.id)
      await cargar()
      await registrarAccion('Operador', 'mesa_eliminar', `Mesa «${mesa.nombre}» eliminada`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setOperando(null)
    }
  }

  if (!eventoId) return null

  return (
    <section className="panel-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
            Mesas de cobro
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">Cobradores para votos pagados</h3>
          <p className="mt-0.5 text-xs text-navy-300/80">
            Cada cobrador abre{' '}
            <span className="font-mono text-gold-300">{window.location.origin}/mesa</span> y confirma
            los Yapes en vivo viendo el comprobante del votante.
          </p>
        </div>
        <button onClick={() => void cargar()} disabled={cargando} className="btn-ghost shrink-0">
          {cargando ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      {/* Crear mesa */}
      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-white/10 bg-navy-800/40 p-4 sm:flex-row">
        <input
          type="text"
          value={nombreNueva}
          onChange={(e) => setNombreNueva(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void crear()
          }}
          placeholder={`Nombre de la mesa (ej. Cobrador 1)`}
          className="flex-1 rounded-xl border border-white/10 bg-navy-950 px-4 py-2.5 text-sm text-white outline-none transition focus:border-gold-500/60 placeholder:text-navy-500"
        />
        <button
          onClick={() => void crear()}
          disabled={operando === 'crear'}
          className="rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-400 disabled:opacity-50"
        >
          {operando === 'crear' ? 'Creando…' : '+ Crear mesa'}
        </button>
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-navy-400">Cargando mesas…</p>
      ) : mesas.length === 0 ? (
        <p className="mt-4 text-sm text-navy-400/80">
          Todavía no hay mesas. Crea "Cobrador 1", "Cobrador 2", etc. y entrega cada código al
          alumno encargado de esa mesa.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-widest text-navy-400">
                <th className="pb-2 pr-3 font-semibold">Mesa</th>
                <th className="pb-2 pr-3 font-semibold">Código</th>
                <th className="pb-2 pr-3 text-center font-semibold">Estado</th>
                <th className="pb-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => (
                <tr key={m.id} className="border-t border-white/10 transition-colors hover:bg-white/3">
                  <td className="py-3 pr-3 text-white">{m.nombre}</td>
                  <td className="py-3 pr-3">
                    <button
                      onClick={() => void copiarCodigo(m)}
                      className="rounded-lg bg-navy-800/70 px-2.5 py-1 font-mono text-xs font-bold tracking-widest text-gold-300 transition hover:bg-navy-700"
                      title="Copiar código"
                    >
                      {copiado === m.id ? '✓ Copiado' : m.codigo}
                    </button>
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        m.habilitada
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                          : 'bg-navy-700/40 text-navy-400 ring-1 ring-white/10'
                      }`}
                    >
                      {m.habilitada ? 'Activa' : 'Apagada'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => void alternarHabilitada(m)}
                        disabled={operando === m.id}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-navy-200 transition hover:bg-white/5 disabled:opacity-50"
                      >
                        {m.habilitada ? 'Apagar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => void regenerarCodigo(m)}
                        disabled={operando === m.id}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-navy-200 transition hover:bg-white/5 disabled:opacity-50"
                      >
                        Nuevo código
                      </button>
                      <button
                        onClick={() => void eliminar(m)}
                        disabled={operando === m.id}
                        className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] text-navy-400">
        El código es la contraseña de la mesa: solo quien lo tiene puede entren a{' '}
        <span className="font-mono">/mesa</span> y confirmar pagos. Si un cobrador termina su
        turno, dale "Nuevo código" para invalidar el anterior.
      </p>
    </section>
  )
}