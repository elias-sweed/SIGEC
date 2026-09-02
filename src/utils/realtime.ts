import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { logError } from './devlog'

/**
 * Suscribe a cambios en vivo de las tablas relevantes del certamen y ejecuta
 * `onChange` cuando ocurren. Solo se usa en las tablas que aportan valor:
 * estado_evento, evaluaciones y jurados. No se hace polling.
 */
export function useRealtime(tablas: string[], onChange: () => void): void {
  useEffect(() => {
    if (tablas.length === 0) return
    let canales: RealtimeChannel[] = []
    let activo = true

    try {
      const supabase = getSupabase()
      canales = tablas.map((tabla) =>
        supabase
          .channel(`realtime-${tabla}-${Math.random().toString(36).slice(2, 8)}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tabla },
            () => {
              if (activo) onChange()
            },
          )
          .subscribe(),
      )
    } catch (err) {
      logError('useRealtime subscribe', err instanceof Error ? err.message : String(err))
    }

    return () => {
      activo = false
      const supabase = getSupabase()
      canales.forEach((c) => {
        try {
          supabase.removeChannel(c)
        } catch {
          /* canal ya removido */
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablas.join(','), onChange])
}
