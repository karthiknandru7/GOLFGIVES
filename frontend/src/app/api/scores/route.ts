// ============================================================
// API ROUTE: POST /api/scores
// Add a new score (server-side validation)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json()
  const score     = parseInt(body.score)
  const played_at = body.played_at as string

  if (isNaN(score) || score < 1 || score > 45) {
    return NextResponse.json({ error: 'Score must be between 1 and 45.' }, { status: 400 })
  }

  if (!played_at) {
    return NextResponse.json({ error: 'Date is required.' }, { status: 400 })
  }

  // Check active subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (sub?.status !== 'active') {
    return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
  }

  // Insert (the DB trigger will handle rolling-5 automatically)
  const { data, error } = await supabaseAdmin
    .from('scores')
    .insert({ user_id: user.id, score, played_at })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
