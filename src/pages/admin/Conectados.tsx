import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { usePanelData } from '../../context/PanelDataContext'

export default function Conectados() {
  const { jurados } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Jurados conectados"
        description="Estado en vivo de los jurados: quién está en sesión y quién activó su cuenta."
      />

      <Section
        titulo="Estado de los jurados"
        descripcion="En sesión y activación de cuenta"
        completado={jurados.length > 0}
      >
        {jurados.length === 0 ? (
          <p className="text-sm text-navy-500">Sin jurados registrados todavía.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {jurados.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-lg bg-navy-800/50 px-3 py-2.5 text-sm"
              >
                <span className="font-mono text-xs font-bold text-gold-400">{j.codigo}</span>
                <span className="flex-1 truncate px-3 text-left text-white">{j.nombre}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {j.en_sesion && (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      ● En sesión
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      j.activado ? 'bg-emerald-500/15 text-emerald-400' : 'bg-navy-600/40 text-navy-400'
                    }`}
                  >
                    {j.activado ? '✔ Activado' : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}