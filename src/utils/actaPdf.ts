import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { calcularPromedioJurados, calcularTotales } from './scoring'
import type { Candidata, Criterio, Evaluacion, EvaluacionDetalle, Jurado } from '../types/database'

interface ActaParams {
  eventoNombre: string
  etapa: string
  fecha: Date
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
  logoUrl?: string
}

function cargarImagen(doc: jsPDF, url: string, x: number, y: number, w: number, h: number): void {
  try {
    doc.addImage(url, 'PNG', x, y, w, h)
  } catch {
    /* logo no disponible — continuar sin él */
  }
}

export async function generarActaOficial(params: ActaParams): Promise<void> {
  const {
    eventoNombre,
    etapa,
    fecha,
    candidatas,
    jurados,
    criterios,
    evaluaciones,
    detalles,
    logoUrl,
  } = params

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 15

  // Logo (opcional)
  if (logoUrl) {
    try {
      const resp = await fetch(logoUrl)
      const blob = await resp.blob()
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      cargarImagen(doc, dataUrl, 15, y, 20, 20)
    } catch {
      /* sin logo */
    }
  }

  // Encabezado
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('ACTA OFICIAL DE EVALUACIÓN', pageW / 2, y + 8, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(eventoNombre, pageW / 2, y + 15, { align: 'center' })
  doc.text(`Etapa: ${etapa}`, pageW / 2, y + 21, { align: 'center' })

  const fechaStr = fecha.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Fecha: ${fechaStr}`, pageW / 2, y + 27, { align: 'center' })

  y += 35

  // Línea separadora
  doc.setDrawColor(200)
  doc.line(15, y, pageW - 15, y)
  y += 8

  // Jurados que participaron
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Jurados evaluadores:', 15, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const juradosTexto = jurados.map((j) => `${j.codigo} — ${j.nombre}`).join('    ')
  const juradosLineas = doc.splitTextToSize(juradosTexto, pageW - 30)
  doc.text(juradosLineas, 15, y)
  y += juradosLineas.length * 5 + 6

  // Criterios de evaluación
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Criterios de evaluación:', 15, y)
  y += 6

  const desempateIds = new Set(criterios.filter((c) => c.es_desempate).map((c) => c.id))
  const criteriosBase = criterios.filter((c) => !c.es_desempate)
  const criteriosDesempate = criterios.filter((c) => c.es_desempate)

  const bodyCriterios = criteriosBase.map((c, i) => [
    String(i + 1),
    c.nombre,
    `${c.puntaje_maximo}`,
  ])
  if (criteriosDesempate.length > 0) {
    criteriosDesempate.forEach((c, i) => {
      bodyCriterios.push([`${criteriosBase.length + i + 1}`, `${c.nombre} (desempate)`, `${c.puntaje_maximo}`])
    })
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Criterio', 'Puntaje Máx.']],
    body: bodyCriterios,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 80] },
    margin: { left: 15, right: 15 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Ranking por candidata
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Resultados por candidata:', 15, y)
  y += 6

  const filas = candidatas.map((c) => {
    const evals = evaluaciones.filter(
      (ev) => ev.candidata_id === c.id && ev.estado === 'completada' && !ev.es_ensayo,
    )
    const porJurado = evals.map((ev) => {
      const dets = detalles
        .filter((d) => d.evaluacion_id === ev.id)
        .map((d) => ({ criterio_id: d.criterio_id, puntaje: Number(d.puntaje) }))
      return calcularTotales(dets, desempateIds)
    })
    const promedio = calcularPromedioJurados(porJurado.map((p) => p.base))
    const desempate = porJurado.reduce((s, p) => s + p.desempate, 0)
    return { candidata: c, promedio, desempate, juradosQueEvaluarion: evals.length }
  })

  filas.sort((a, b) => b.promedio - a.promedio || b.desempate - a.desempate)

  const bodyRanking = filas.map((f, i) => [
    String(i + 1),
    `${f.candidata.nombre} — ${f.candidata.grado}`,
    f.promedio.toFixed(2),
    f.desempate > 0 ? `+${f.desempate.toFixed(2)}` : '—',
    `${f.juradosQueEvaluarion}/${jurados.length}`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['Puesto', 'Candidata', 'Promedio', 'Desempate', 'Jurados']],
    body: bodyRanking,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [60, 60, 80] },
    margin: { left: 15, right: 15 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Ganadora
  if (filas.length > 0) {
    const ganadora = filas[0]
    doc.setFillColor(240, 215, 130)
    doc.roundedRect(15, y, pageW - 30, 18, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(40, 40, 40)
    doc.text(
      `Ganadora: ${ganadora.candidata.nombre} — ${ganadora.candidata.grado}  (Promedio: ${ganadora.promedio.toFixed(2)})`,
      pageW / 2,
      y + 11,
      { align: 'center' },
    )
    doc.setTextColor(0)
    y += 25
  }

  // Firmas
  y = Math.max(y + 10, doc.internal.pageSize.getHeight() - 35)
  doc.setDrawColor(100)
  doc.line(25, y, 90, y)
  doc.line(pageW - 90, y, pageW - 25, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Jurado Presidente', 57.5, y + 5, { align: 'center' })
  doc.text('Organización del Certamen', pageW - 57.5, y + 5, { align: 'center' })

  // Pie
  doc.setFontSize(7)
  doc.setTextColor(150)
  doc.text(
    `Generado automáticamente por SIGEC — ${new Date().toLocaleTimeString('es-PE')}`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' },
  )

  doc.save(`Acta_${eventoNombre.replace(/\s+/g, '_')}_${etapa.replace(/\s+/g, '_')}.pdf`)
}
