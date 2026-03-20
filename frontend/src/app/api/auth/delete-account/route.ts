// ============================================================
// API ROUTE: POST /api/auth/delete-account
// Deletes the authenticated user's account server-side
// (Requires service role key — cannot be done in the browser)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify the user is who they say they are
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await anonClient.auth.getUser(token)
  if (error || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Delete the user via admin client (cascades to all related rows via DB constraints)
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
