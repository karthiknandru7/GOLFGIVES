// ============================================================
// API ROUTE: POST /api/admin/send-draw-emails
// Admin-only: sends draw result emails to all active subscribers
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { sendDrawResultEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { draw_id } = await req.json()
  if (!draw_id) return NextResponse.json({ error: 'draw_id required' }, { status: 400 })

  // Get the draw
  const { data: draw } = await supabaseAdmin
    .from('draws')
    .select('*')
    .eq('id', draw_id)
    .single()

  if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 })

  // Get all active subscribers with their scores and emails
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('status', 'active')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ data: { sent: 0 } })
  }

  const userIds = subs.map(s => s.user_id)

  // Get profiles + scores for all subscribers
  const [{ data: profiles }, { data: entries }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, email, full_name').in('id', userIds),
    supabaseAdmin.from('draw_entries').select('user_id, numbers, match_count').eq('draw_id', draw_id),
  ])

  const entryMap: Record<string, { numbers: number[]; match_count: number }> = {}
  for (const e of (entries ?? [])) {
    entryMap[e.user_id] = { numbers: e.numbers, match_count: e.match_count }
  }

  let sent = 0
  for (const p of (profiles ?? [])) {
    const entry = entryMap[p.id]
    const ok = await sendDrawResultEmail(
      p.email,
      p.full_name ?? 'Golfer',
      draw.draw_month,
      draw.winning_numbers,
      entry?.numbers ?? [],
      entry?.match_count ?? 0
    )
    if (ok) sent++
  }

  return NextResponse.json({ data: { sent, total: profiles?.length ?? 0 } })
}
