import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Usa createBrowserClient per sincronizzare sessione con cookies
// Questo permette al middleware server-side di leggere la sessione
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
