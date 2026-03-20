import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Singleton pattern — only one instance in the browser
const globalForSupabase = global as unknown as { supabase: ReturnType<typeof createClient> }

export const supabase = globalForSupabase.supabase ?? createClient(supabaseUrl, supabaseAnon)

if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnon,
  { auth: { autoRefreshToken: false, persistSession: false } }
)