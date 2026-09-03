import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import { SectionSkeleton } from '../../components/Skeleton'
import { usePanelData } from '../../context/PanelDataContext'

export default function Conectados() {
  const { jurados, cargandoInicial } = usePanelData()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Actividad"
        title="Jurados conectados"
        description="Estado en vivo de los jurados: quién está en sesión y quién activó su cuenta."
      />

      {cargandoInicial ? (
        <SectionSkeleton rows={4} />
      ) : (
        <Section
          titulo="Estado de los jurados"
          descripcion="En sesión y activación de cuenta"
          completado={jurados.length > 0}
        >
        {jurados.length === 0 ? (
          <p className="text-sm text-navy-400/80">Sin jurados registrados todavía.</p>
        ) : (
          <ul className="space-y-2">
            {jurados.map((j) => (
              <li key={j.id} className="fila-panel text-sm">
                <span className="font-mono text-xs font-bold text-gold-300">{j.codigo}</span>
                <span className="flex-1 truncate text-left text-white">{j.nombre}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {j.en_sesion && <span className="chip chip-ok">● En sesión</span>}
                  <span className={`chip ${j.activado ? 'chip-ok' : 'chip-muted'}`}>
                    {j.activado ? '✔ Activado' : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        </Section>
      )}
    </div>
  )
}