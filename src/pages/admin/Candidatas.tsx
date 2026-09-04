import { useMemo, useRef, useState } from 'react'
import PanelHeader from '../../components/admin/PanelHeader'
import Section from '../../components/admin/Section'
import {
  IconoCheck,
  IconoLapiz,
  IconoPapelera,
  IconoDescargar,
  IconoImportar,
} from '../../components/admin/Iconos'
import { usePanelData } from '../../context/PanelDataContext'
import { getSupabase } from '../../lib/supabase'
import { logConsulta, logError } from '../../utils/devlog'
import { descargarExcel } from '../../utils/exportExcel'
import type { Candidata } from '../../types/database'

const GRADOS = ['1', '2', '3', '4', '5']
const SECCIONES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']

function valido(grado: string, seccion: string): boolean {
  return GRADOS.includes(grado) && SECCIONES.includes(seccion)
}

/** Sube la foto de una candidata al bucket "candidatas" y devuelve su URL pública. */
async function subirFotoCandidata(file: File): Promise<string | null> {
  try {
    const supabase = getSupabase()
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const path = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('candidatas')
      .upload(path, file, { upsert: true })
    if (upErr) {
      logError('subir foto candidata', upErr.message)
      return null
    }
    const { data } = supabase.storage.from('candidatas').getPublicUrl(path)
    return data.publicUrl
  } catch (err) {
    logError('subir foto candidata', err instanceof Error ? err.message : String(err))
    return null
  }
}

function SelectorImagen({
  etiqueta,
  actual,
  onCambio,
}: {
  etiqueta: string
  actual?: string | null
  onCambio: (file: File | null) => void
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mostrar = preview ?? actual ?? null

  return (
    <div className="flex items-center gap-3">
      {mostrar ? (
        <img
          src={mostrar}
          alt="Vista previa de la foto"
          className="h-16 w-16 rounded-full border-2 border-gold-500/40 object-cover shadow-lg"
        />
      ) : (
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-dashed border-white/20 bg-navy-700/40 text-2xl font-bold text-navy-400">
          +
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            if (f) setPreview(URL.createObjectURL(f))
            onCambio(f)
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-ghost flex items-center gap-1.5"
        >
          {mostrar ? 'Cambiar foto' : etiqueta}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => {
              setPreview(null)
              onCambio(null)
            }}
            className="text-left text-[11px] font-semibold text-red-400 hover:text-red-300"
          >
            Quitar foto nueva
          </button>
        )}
      </div>
    </div>
  )
}

export default function Candidatas() {
  const { candidatas, cargandoInicial, recargar } = usePanelData()

  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState(GRADOS[0])
  const [seccion, setSeccion] = useState(SECCIONES[0])
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editando, setEditando] = useState({ nombre: '', grado: GRADOS[0], seccion: SECCIONES[0] })
  const [error, setError] = useState<string | null>(null)
  const [mensajeImport, setMensajeImport] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null)
  const [fotoEdicion, setFotoEdicion] = useState<File | null>(null)
  const inputArchivo = useRef<HTMLInputElement>(null)

  // Orden global estable: grado (numérico) → sección → nombre
  const ordenGlobal = useMemo(
    () =>
      [...candidatas].sort((a, b) => {
        const gA = parseInt(a.grado, 10) || 0
        const gB = parseInt(b.grado, 10) || 0
        if (gA !== gB) return gA - gB
        if (a.seccion !== b.seccion) return a.seccion.localeCompare(b.seccion)
        return a.nombre.localeCompare(b.nombre, 'es')
      }),
    [candidatas],
  )

  // Número fijo (1..N) según el orden global, para que no cambie con los filtros
  const numeroPorId = useMemo(() => {
    const map = new Map<string, number>()
    ordenGlobal.forEach((c, i) => map.set(c.id, i + 1))
    return map
  }, [ordenGlobal])

  const listado = useMemo(() => {
    if (!filtroGrado && !filtroSeccion) return ordenGlobal
    return ordenGlobal.filter(
      (c) => (!filtroGrado || c.grado === filtroGrado) && (!filtroSeccion || c.seccion === filtroSeccion),
    )
  }, [ordenGlobal, filtroGrado, filtroSeccion])

  const comenzarEdicion = (c: Candidata) => {
    setEditandoId(c.id)
    setEditando({ nombre: c.nombre, grado: c.grado, seccion: c.seccion })
    setFotoEdicion(null)
  }

  const guardarEdicion = async (id: string) => {
    const nombreOk = editando.nombre.trim()
    if (!nombreOk) {
      setError('El nombre es obligatorio')
      return
    }
    if (!valido(editando.grado, editando.seccion)) {
      setError('Selecciona un grado (1-5) y una sección (A-I) válidos')
      return
    }
    const supabase = getSupabase()
    let fotoUrl: string | null | undefined
    if (fotoEdicion) {
      const subida = await subirFotoCandidata(fotoEdicion)
      if (!subida) {
        setError('No se pudo subir la imagen. Verifica que el bucket "candidatas" exista y tenga política de escritura.')
        return
      }
      fotoUrl = subida
    }
    const { error } = await supabase
      .from('candidatas')
      .update({
        nombre: nombreOk,
        grado: editando.grado,
        seccion: editando.seccion,
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setEditandoId(null)
    setFotoEdicion(null)
    setError(null)
    await recargar()
  }

  const agregar = async () => {
    const nombreOk = nombre.trim()
    if (!nombreOk) {
      setError('El nombre es obligatorio')
      return
    }
    if (!valido(grado, seccion)) {
      setError('Selecciona un grado (1-5) y una sección (A-I) válidos')
      return
    }
    const supabase = getSupabase()
    logConsulta('Panel: agregar candidata')
    let fotoUrl: string | null = null
    if (fotoArchivo) {
      const subida = await subirFotoCandidata(fotoArchivo)
      if (!subida) {
        setError('No se pudo subir la imagen. Verifica que el bucket "candidatas" exista y tenga política de escritura.')
        return
      }
      fotoUrl = subida
    }
    const { error } = await supabase
      .from('candidatas')
      .insert({ nombre: nombreOk, grado, seccion, foto_url: fotoUrl })
    if (error) {
      logError('agregar candidata', error.message)
      setError(error.message)
      return
    }
    setNombre('')
    setFotoArchivo(null)
    setError(null)
    await recargar()
  }

  const eliminar = async (id: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.from('candidatas').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setError(null)
    await recargar()
  }

  // Descarga las candidatas actuales en un archivo .xls (Excel)
  const manejarDescargar = () => {
    if (ordenGlobal.length === 0) {
      setError('No hay candidatas para exportar todavía.')
      return
    }
    setError(null)
    setMensajeImport(null)
    logConsulta('Panel: exportar candidatas a Excel')
    descargarExcel(`Candidatas_${new Date().toISOString().slice(0, 10)}`, [
      {
        titulo: 'Candidatas',
        cabeceras: ['#', 'Nombre', 'Grado', 'Sección'],
        filas: ordenGlobal.map((c, i) => ({
          '#': i + 1,
          Nombre: c.nombre,
          Grado: c.grado,
          Sección: c.seccion,
        })),
      },
    ])
  }

  // Lee y agrega candidatas desde un archivo .xlsx/.xls (sin duplicar)
  const manejarImportar = async (file: File) => {
    setImportando(true)
    setMensajeImport(null)
    setError(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const libro = XLSX.read(buf, { type: 'array' })
      const hoja = libro.Sheets[libro.SheetNames[0]]
      if (!hoja) throw new Error('El archivo no contiene hojas.')
      const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' })

      const supabase = getSupabase()
      const { data: existentesData } = await supabase.from('candidatas').select('nombre, grado, seccion')
      const existentes: Candidata[] = (existentesData ?? []) as Candidata[]
      const claveExistente = new Set(
        existentes.map((c) => `${String(c.nombre).trim().toLowerCase()}|${c.grado}|${c.seccion}`),
      )

      const nuevos: { nombre: string; grado: string; seccion: string }[] = []
      const ignorados: string[] = []
      let invalidas = 0

      for (const f of filas) {
        const nombre = String(f.nombre ?? f.Nombre ?? '').trim()
        const grado = String(f.grado ?? f.Grado ?? '').trim()
        const seccion = String(f.seccion ?? f.Seccion ?? '').trim().toUpperCase()
        if (!nombre || !valido(grado, seccion)) {
          invalidas += 1
          continue
        }
        const clave = `${nombre.toLowerCase()}|${grado}|${seccion}`
        if (claveExistente.has(clave)) {
          ignorados.push(nombre)
          continue
        }
        claveExistente.add(clave)
        nuevos.push({ nombre, grado, seccion })
      }

      if (nuevos.length > 0) {
        const filasInsert = nuevos.map((n) => ({ nombre: n.nombre, grado: n.grado, seccion: n.seccion }))
        const { error } = await supabase.from('candidatas').insert(filasInsert)
        if (error) throw error
      }

      if (nuevos.length === 0 && invalidas > 0) {
        setMensajeImport(
          `No se importó ninguna fila (${invalidas} inválida${invalidas === 1 ? '' : 's'}). Verifica que las columnas sean "nombre", "grado" y "seccion".`,
        )
      } else {
        const partes: string[] = [`Se agregaron ${nuevos.length} candidata${nuevos.length === 1 ? '' : 's'}.`]
        if (ignorados.length > 0) partes.push(`${ignorados.length} duplicada${ignorados.length === 1 ? '' : 's'} omitida${ignorados.length === 1 ? '' : 's'}.`)
        if (invalidas > 0) partes.push(`${invalidas} fila${invalidas === 1 ? '' : 's'} inválida${invalidas === 1 ? '' : 's'}.`)
        setMensajeImport(partes.join(' '))
      }

      await recargar()
    } catch (err) {
      logError('importar candidatas', err instanceof Error ? err.message : String(err))
      setError(
        err instanceof Error
          ? `No se pudo importar: ${err.message}. El archivo debe ser .xlsx con columnas nombre, grado, seccion.`
          : 'No se pudo importar el archivo.',
      )
    } finally {
      setImportando(false)
      if (inputArchivo.current) inputArchivo.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PanelHeader
        eyebrow="Configuración"
        title="Candidatas"
        description={`${candidatas.length} participantes registradas. Ordenadas por grado y sección, con numeración del 1 al ${candidatas.length}.`}
      />

      <Section
        titulo="Registro de candidatas"
        descripcion="Nombre completo, grado (1-5) y sección (A-I)"
        completado={candidatas.length > 0}
      >
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_110px]">
          <input
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="input-panel"
          />
          <select
            value={grado}
            onChange={(e) => setGrado(e.target.value)}
            className="input-panel"
            title="Grado"
          >
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}° grado
              </option>
            ))}
          </select>
          <select
            value={seccion}
            onChange={(e) => setSeccion(e.target.value)}
            className="input-panel"
            title="Sección"
          >
            {SECCIONES.map((s) => (
              <option key={s} value={s}>
                Sección {s}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <SelectorImagen
            key={`add-${candidatas.length}`}
            etiqueta="Subir foto"
            actual={null}
            onCambio={setFotoArchivo}
          />
        </div>
        <button onClick={agregar} className="btn-gold mt-3 w-full">
          Agregar candidata
        </button>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={manejarDescargar} className="btn-ghost flex items-center gap-2">
            <IconoDescargar />
            Descargar listado
          </button>
          <button
            onClick={() => inputArchivo.current?.click()}
            className="btn-ghost flex items-center gap-2"
            disabled={importando}
          >
            <IconoImportar />
            {importando ? 'Importando…' : 'Importar (.xlsx)'}
          </button>
          <input
            ref={inputArchivo}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void manejarImportar(f)
            }}
          />
          <span className="text-[11px] text-navy-400">
            Importa un Excel con columnas: nombre, grado (1-5), sección (A-I)
          </span>
        </div>

        {mensajeImport && (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {mensajeImport}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-navy-400">
            Filtrar
          </p>
          <select
            value={filtroGrado}
            onChange={(e) => setFiltroGrado(e.target.value)}
            className="input-panel w-auto"
            title="Filtrar por grado"
          >
            <option value="">Todos los grados</option>
            {GRADOS.map((g) => (
              <option key={g} value={g}>
                {g}° grado
              </option>
            ))}
          </select>
          <select
            value={filtroSeccion}
            onChange={(e) => setFiltroSeccion(e.target.value)}
            className="input-panel w-auto"
            title="Filtrar por sección"
          >
            <option value="">Todas las secciones</option>
            {SECCIONES.map((s) => (
              <option key={s} value={s}>
                Sección {s}
              </option>
            ))}
          </select>
          {(filtroGrado || filtroSeccion) && (
            <button
              onClick={() => {
                setFiltroGrado('')
                setFiltroSeccion('')
              }}
              className="btn-ghost"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {cargandoInicial ? (
          <div className="mt-4 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="fila-panel">
                <div className="h-3 w-8 rounded skeleton bg-white/10" />
                <div className="h-3 flex-1 skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
                <div className="h-8 w-8 rounded-lg skeleton bg-white/10" />
              </div>
            ))}
          </div>
        ) : listado.length > 0 ? (
          <ul className="mt-4 max-h-80 space-y-1.5 overflow-y-auto">
            {listado.map((c) => (
              <li key={c.id} className="fila-panel text-sm">
                <span className="grid h-7 w-9 shrink-0 place-items-center rounded-lg bg-gold-500/15 font-mono text-xs font-bold text-gold-300 ring-1 ring-gold-500/25">
                  {numeroPorId.get(c.id)}
                </span>
                {editandoId === c.id ? (
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={editando.nombre}
                        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                        className="flex-1 rounded-lg border border-gold-500/40 bg-navy-800 px-2 py-1 text-sm text-white"
                      />
                      <select
                        value={editando.grado}
                        onChange={(e) => setEditando({ ...editando, grado: e.target.value })}
                        className="w-20 rounded-lg border border-gold-500/40 bg-navy-800 px-1 py-1 text-sm text-white"
                      >
                        {GRADOS.map((g) => (
                          <option key={g} value={g}>
                            {g}°
                          </option>
                        ))}
                      </select>
                      <select
                        value={editando.seccion}
                        onChange={(e) => setEditando({ ...editando, seccion: e.target.value })}
                        className="w-20 rounded-lg border border-gold-500/40 bg-navy-800 px-1 py-1 text-sm text-white"
                      >
                        {SECCIONES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => guardarEdicion(c.id)}
                        title="Guardar"
                        aria-label="Guardar"
                        className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400 transition hover:bg-emerald-500/25"
                      >
                        <IconoCheck />
                      </button>
                    </div>
                    <SelectorImagen
                      key={c.id}
                      etiqueta="Subir foto"
                      actual={c.foto_url}
                      onCambio={setFotoEdicion}
                    />
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-white">
                    {c.foto_url && (
                      <img
                        src={c.foto_url}
                        alt=""
                        className="mr-2 inline h-6 w-6 rounded-full object-cover align-middle ring-1 ring-white/15"
                      />
                    )}
                    <span className="font-semibold">{c.nombre}</span>
                    <span className="text-navy-400">
                      {' '}· {c.grado}° · Sección {c.seccion}
                    </span>
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {editandoId !== c.id && (
                    <button
                      onClick={() => comenzarEdicion(c)}
                      title="Editar candidata"
                      aria-label="Editar candidata"
                      className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/10 text-gold-400 transition hover:bg-gold-500/25"
                    >
                      <IconoLapiz />
                    </button>
                  )}
                  <button
                    onClick={() => eliminar(c.id)}
                    title="Eliminar candidata"
                    aria-label="Eliminar candidata"
                    className="grid h-8 w-8 place-items-center rounded-lg bg-red-500/10 text-red-400 transition hover:bg-red-500/25"
                  >
                    <IconoPapelera />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-navy-400/80">Sin candidatas registradas todavía.</p>
        )}
      </Section>
    </div>
  )
}
