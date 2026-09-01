import { useState } from 'react'
import { urlActivacion, urlQR } from '../../services/jurado.service'
import { imprimirTarjetasAcceso } from '../../utils/impresion'
import type { Jurado } from '../../types/database'

export default function AccesosJurados({
  jurados,
  eventoNombre,
}: {
  jurados: Jurado[]
  eventoNombre: string
}) {
  const [mostrando, setMostrando] = useState(false)
  const [avisoPdf, setAvisoPdf] = useState<string | null>(null)

  const generarPdf = () => {
    if (jurados.length === 0) return
    imprimirTarjetasAcceso(eventoNombre, jurados)
    setAvisoPdf('Se abrió la vista de impresión. Elige "Guardar como PDF" como destino.')
  }

  return (
    <div className="panel-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-300">
          Accesos para jurados
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMostrando((v) => !v)}
            disabled={jurados.length === 0}
            className="btn-gold"
          >
            {mostrando ? 'Ocultar tarjetas' : 'Generar accesos para jurados'}
          </button>
          <button
            onClick={generarPdf}
            disabled={jurados.length === 0}
            className="btn-ghost"
          >
            Descargar PDF
          </button>
        </div>
      </div>

      {jurados.length === 0 && (
        <p className="mt-4 text-sm text-navy-400/80">Registra jurados primero para generar sus accesos.</p>
      )}

      {mostrando && jurados.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jurados.map((j) => (
            <div
              key={j.id}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-navy-900/50 p-4 text-center backdrop-blur-sm"
            >
              <p className="text-[10px] uppercase tracking-widest text-navy-400">Acceso del jurado</p>
              <p className="mt-1 truncate text-sm font-semibold text-white">{j.nombre}</p>
              <p className="font-mono text-sm font-bold text-gold-300">{j.codigo}</p>
              <img
                src={urlQR(j.token_acceso ?? j.codigo, 180)}
                alt={`QR de ${j.codigo}`}
                className="mt-3 h-44 w-44 rounded-xl bg-white object-contain p-1.5 shadow-lg shadow-black/40"
              />
              <p className="mt-2 break-all text-[10px] leading-relaxed text-navy-400">
                {urlActivacion(j.token_acceso ?? j.codigo)}
              </p>
              <span
                className={`chip mt-3 ${j.activado ? 'chip-ok' : 'chip-muted'}`}
              >
                {j.activado ? '✔ Activado' : 'Pendiente de activación'}
              </span>
            </div>
          ))}
        </div>
      )}

      {avisoPdf && (
        <p className="mt-4 rounded-xl bg-navy-800/50 px-3 py-2 text-xs text-navy-300">{avisoPdf}</p>
      )}
    </div>
  )
}