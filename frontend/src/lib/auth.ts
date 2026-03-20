// ============================================================
// AUTH HELPERS
// ============================================================
import { supabase } from './supabase'
import type { Profile } from '@/types'

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const session = await getSession()
  if (!session) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { session: data.session, error }
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
  return { user: data.user, error }
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function requireAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role === 'admin'
}
