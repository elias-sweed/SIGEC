import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Copia .env.example como .env y completa los valores.',
      )
    }
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
