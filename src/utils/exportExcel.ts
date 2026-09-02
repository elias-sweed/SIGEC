import type { Candidata, Evaluacion, EvaluacionDetalle, Jurado, Criterio } from '../types/database'
import { calcularPromedioJurados, calcularTotales } from './scoring'

interface FilaExcel {
  [col: string]: string | number | null
}

/** Escapa un valor para usarlo en una celda XML de SpreadsheetML. */
function xml(valor: string | number | null): string {
  if (valor === null || valor === undefined) return ''
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Convierte una fila de datos en una fila <Row> del XML, con el tipo adecuado por celda. */
function filaXml(fila: FilaExcel): string {
  const celdas = Object.values(fila)
    .map((valor) => {
      if (valor === null || valor === undefined) {
        return `<Cell ss:StyleID="si"><Data ss:Type="String"></Data></Cell>`
      }
      const esNumero = typeof valor === 'number'
      const tipo = esNumero ? 'Number' : 'String'
      const contenido = esNumero ? String(valor) : xml(valor)
      return `<Cell ss:StyleID="${esNumero ? 'num' : 'si'}"><Data ss:Type="${tipo}">${contenido}</Data></Cell>`
    })
    .join('')
  return `<Row>${celdas}</Row>`
}

function hojaXml(
  titulo: string,
  cabeceras: (string | number | null)[],
  filas: FilaExcel[],
): string {
  const header = cabeceras
    .map((h) => `<Cell ss:StyleID="cab"><Data ss:Type="String">${xml(h ?? '')}</Data></Cell>`)
    .join('')
  const filasHtml = filas.map((f) => filaXml(f)).join('')
  return `
    <Worksheet ss:Name="${xml(titulo)}">
      <Table>
        <Column ss:AutoFitWidth="1"/>
        <Row ss:StyleID="cab">${header}</Row>
        ${filasHtml}
      </Table>
    </Worksheet>`
}

/** Genera y descarga un archivo .xls (Excel XML) con varias hojas. */
export function descargarExcel(
  nombreArchivo: string,
  hojas: { titulo: string; cabeceras: (string | number | null)[]; filas: FilaExcel[] }[],
): void {
  const cuerpo = hojas.map((h) => hojaXml(h.titulo, h.cabeceras, h.filas)).join('')
  const xmlDoc = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="cab">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F3B73" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="gold"><Font ss:Bold="1" ss:Color="#7A5C00"/></Style>
    <Style ss:ID="si"><Alignment ss:Vertical="Center"/></Style>
    <Style ss:ID="num"><NumberFormat ss:Format="0.00"/></Style>
  </Styles>
  <Worksheet ss:Name="Info">
    <Table>
      <Row><Cell ss:StyleID="cab"><Data ss:Type="String">SIGEC - Sistema Integral de Gestión y Evaluación del Certamen</Data></Cell></Row>
    </Table>
  </Worksheet>
  ${cuerpo}
</Workbook>`

  const blob = new Blob([xmlDoc], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${nombreArchivo}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exporta el resultado completo del certamen (ranking + evaluaciones por jurado)
 * a un archivo .xls que Excel abre con varias hojas.
 */
export function exportarResultadosExcel(params: {
  eventoNombre: string
  etapa: string
  candidatas: Candidata[]
  jurados: Jurado[]
  criterios: Criterio[]
  evaluaciones: Evaluacion[]
  detalles: EvaluacionDetalle[]
}): void {
  const { eventoNombre, etapa, candidatas, jurados, criterios, evaluaciones, detalles } = params

  const desempateIds = new Set(criterios.filter((c) => c.es_desempate).map((c) => c.id))

  const etiqueta = (c: Criterio) => `${c.orden}. ${c.nombre}`

  // → Hoja 1: Ranking
  const filasRanking = candidatas
    .map((c) => {
      const evalsC = evaluaciones.filter(
        (e) => e.candidata_id === c.id && e.estado === 'completada' && !e.es_ensayo,
      )
      const bases = evalsC.map((ev) => {
        const detsEv = detalles
          .filter((d) => d.evaluacion_id === ev.id)
          .map((d) => ({ criterio_id: d.criterio_id, puntaje: Number(d.puntaje) }))
        return calcularTotales(detsEv, desempateIds).base
      })
      const desempates = evalsC.map((ev) => {
        const detsEv = detalles.filter((d) => d.evaluacion_id === ev.id)
        return calcularTotales(detsEv, desempateIds).desempate
      })
      return {
        candidata: c,
        promedio: calcularPromedioJurados(bases),
        desempate: calcularPromedioJurados(desempates),
        respondidas: evalsC.length,
      }
    })
    .sort((a, b) => b.promedio - a.promedio || b.desempate - a.desempate)
    .map((r, i) => ({
      '#': i + 1,
      Candidata: r.candidata.nombre,
      Grado: r.candidata.grado,
      Seccion: r.candidata.seccion,
      Promedio: r.promedio,
      Desempate: r.desempate,
      Respondidas: r.respondidas,
    }))

  // → Hoja 2: Evaluaciones por jurado (una fila por jurado × candidata)
  const filasEvaluaciones: FilaExcel[] = []
  for (const j of jurados) {
    for (const c of candidatas) {
      const ev = evaluaciones.find(
        (e) => e.jurado_id === j.id && e.candidata_id === c.id && !e.es_ensayo,
      )
      if (!ev) continue
      const detsEv = detalles.filter((d) => d.evaluacion_id === ev.id)
      const fila: FilaExcel = {
        Jurado: `${j.codigo} - ${j.nombre}`,
        Candidata: c.nombre,
        Grado: c.grado,
        Seccion: c.seccion,
        Base_100: calcularTotales(detsEv, desempateIds).base,
        Desempate: calcularTotales(detsEv, desempateIds).desempate,
        Estado: ev.estado,
      }
      criterios.forEach((cr) => {
        const d = detsEv.find((x) => x.criterio_id === cr.id)
        fila[etiqueta(cr)] = d ? Number(d.puntaje) : null
      })
      filasEvaluaciones.push(fila)
    }
  }

  // → Hoja 3: Resumen
  const filasResumen: FilaExcel[] = [
    { Campo: 'Evento', Valor: eventoNombre },
    { Campo: 'Etapa', Valor: etapa },
    { Campo: 'Candidatas', Valor: candidatas.length },
    { Campo: 'Jurados', Valor: jurados.length },
    { Campo: 'Criterios', Valor: criterios.length },
    { Campo: 'Evaluaciones completadas', Valor: evaluaciones.filter((e) => !e.es_ensayo && e.estado === 'completada').length },
    { Campo: 'Fecha de exportación', Valor: new Date().toLocaleString('es-PE') },
  ]

  const cabRanking: (string | number | null)[] = ['#', 'Candidata', 'Grado', 'Sección', 'Promedio', 'Desempate', 'Respondidas']
  const cabEvaluaciones: (string | number | null)[] = ['Jurado', 'Candidata', 'Grado', 'Sección', 'Base / 100', 'Desempate', 'Estado', ...criterios.map(etiqueta)]

  descargarExcel(`Resultados_${eventoNombre}_${etapa}`, [
    { titulo: 'Ranking', cabeceras: cabRanking, filas: filasRanking },
    { titulo: 'Evaluaciones por jurado', cabeceras: cabEvaluaciones, filas: filasEvaluaciones },
    { titulo: 'Resumen', cabeceras: ['Campo', 'Valor'], filas: filasResumen },
  ])
}
