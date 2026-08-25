import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Candidata, Evento } from '../types/database'

interface CertamenEstado {
  evento: Evento | null
  candidata: Candidata | null
}

interface CertamenContextValue extends CertamenEstado {
  setEvento: (evento: Evento | null) => void
  setCandidata: (candidata: Candidata | null) => void
}

const STORAGE_KEY = 'sigec-certamen'

const CertamenContext = createContext<CertamenContextValue | null>(null)

function leerEstado(): CertamenEstado {
  try {
    const crudo = window.localStorage.getItem(STORAGE_KEY)
    if (!crudo) return { evento: null, candidata: null }
    const datos = JSON.parse(crudo) as Partial<CertamenEstado>
    return { evento: datos.evento ?? null, candidata: datos.candidata ?? null }
  } catch {
    return { evento: null, candidata: null }
  }
}

export function CertamenProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<CertamenEstado>(leerEstado)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  }, [estado])

  const valor = useMemo<CertamenContextValue>(
    () => ({
      ...estado,
      setEvento: (evento) => setEstado((previo) => ({ ...previo, evento })),
      setCandidata: (candidata) => setEstado((previo) => ({ ...previo, candidata })),
    }),
    [estado],
  )

  return <CertamenContext.Provider value={valor}>{children}</CertamenContext.Provider>
}

export function useCertamen(): CertamenContextValue {
  const contexto = useContext(CertamenContext)
  if (!contexto) throw new Error('useCertamen debe usarse dentro de CertamenProvider.')
  return contexto
}
