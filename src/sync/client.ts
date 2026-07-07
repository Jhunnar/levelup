import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ---- Credenciales de Supabase guardadas en el dispositivo (no en el repo) ----

const URL_KEY = 'levelup.sync.url'
const ANON_KEY = 'levelup.sync.key'

export interface Creds {
  url: string
  key: string
}

export function getCreds(): Creds | null {
  const url = localStorage.getItem(URL_KEY)
  const key = localStorage.getItem(ANON_KEY)
  if (!url || !key) return null
  return { url, key }
}

export function saveCreds(creds: Creds): void {
  localStorage.setItem(URL_KEY, creds.url.trim().replace(/\/+$/, ''))
  localStorage.setItem(ANON_KEY, creds.key.trim())
  cached = null
}

export function clearCreds(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(ANON_KEY)
  cached = null
}

export function isConfigured(): boolean {
  return getCreds() !== null
}

let cached: { creds: Creds; client: SupabaseClient } | null = null

export function getClient(): SupabaseClient | null {
  const creds = getCreds()
  if (!creds) return null
  if (cached && cached.creds.url === creds.url && cached.creds.key === creds.key) {
    return cached.client
  }
  const client = createClient(creds.url, creds.key, {
    auth: { persistSession: false },
  })
  cached = { creds, client }
  return client
}
