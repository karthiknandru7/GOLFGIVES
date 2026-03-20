// ============================================================
// API ROUTE: POST /api/draws/run
// Admin-only: generate winning numbers + calculate pools
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import {
  generateWinningNumbers,
  calculatePrizePool,
  countMatches,
  getMatchType,
} from '@/lib/draw-engine'

export async function POST(req: NextRequest) {
  // Authenticate
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Verify admin
  const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { draw_month, draw_mode } = await req.json()
  if (!draw_month) return NextResponse.json({ error: 'draw_month required' }, { status: 400 })

  // Get all active subscribers
  const { data: subs } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id, plan, amount_pence, charity_percentage')
    .eq('status', 'active')

  if (!subs || subs.length === 0) {
    return NextResponse.json({ error: 'No active subscribers found.' }, { status: 400 })
  }

  // Get previous jackpot rollover if any
  const { data: prevDraw } = await supabaseAdmin
    .from('draws')
    .select('jackpot_amount, jackpot_rolled')
    .eq('status', 'published')
    .eq('jackpot_rolled', true)
    .order('draw_month', { ascending: false })
    .limit(1)
    .single()

  const previousJackpot = prevDraw?.jackpot_amount ?? 0

  // Calculate prize pools
  const pools = calculatePrizePool(subs, previousJackpot)

  // Collect all scores for algorithmic mode
  let allScores: number[] = []
  if (draw_mode === 'algorithmic') {
    const userIds = subs.map(s => s.user_id)
    const { data: scoreRows } = await supabaseAdmin
      .from('scores')
      .select('score')
      .in('user_id', userIds)
    allScores = (scoreRows ?? []).map(r => r.score)
  }

  // Generate winning numbers
  const winningNumbers = generateWinningNumbers(draw_mode, allScores)

  // Create the draw record
  const { data: draw, error: drawError } = await supabaseAdmin
    .from('draws')
    .insert({
      draw_month,
      status:          'simulated',
      draw_mode,
      winning_numbers: winningNumbers,
      jackpot_amount:  pools.jackpot,
      pool_4match:     pools.fourMatch,
      pool_3match:     pools.threeMatch,
    })
    .select()
    .single()

  if (drawError) return NextResponse.json({ error: drawError.message }, { status: 500 })

  // Calculate each subscriber's match count and create draw entries
  const { data: allScoresFull } = await supabaseAdmin
    .from('scores')
    .select('user_id, score')
    .in('user_id', subs.map(s => s.user_id))

  const scoresByUser: Record<string, number[]> = {}
  for (const row of (allScoresFull ?? [])) {
    if (!scoresByUser[row.user_id]) scoresByUser[row.user_id] = []
    scoresByUser[row.user_id].push(row.score)
  }

  const entries = subs.map(sub => ({
    draw_id:     draw.id,
    user_id:     sub.user_id,
    numbers:     (scoresByUser[sub.user_id] ?? []).slice(0, 5),
    match_count: countMatches((scoresByUser[sub.user_id] ?? []).slice(0, 5), winningNumbers),
  }))

  await supabaseAdmin.from('draw_entries').insert(entries)

  // Identify winners and create winner records
  const winnerEntries = entries.filter(e => e.match_count >= 3)
  const fiveWinners   = winnerEntries.filter(e => e.match_count === 5)
  const fourWinners   = winnerEntries.filter(e => e.match_count === 4)
  const threeWinners  = winnerEntries.filter(e => e.match_count === 3)

  const buildWinners = (
    group: typeof winnerEntries,
    matchType: '5_match' | '4_match' | '3_match',
    pool: number
  ) => group.map(e => ({
    draw_id:     draw.id,
    user_id:     e.user_id,
    match_type:  matchType,
    prize_amount: group.length > 0 ? pool / group.length : 0,
  }))

  const allWinners = [
    ...buildWinners(fiveWinners,  '5_match', pools.jackpot),
    ...buildWinners(fourWinners,  '4_match', pools.fourMatch),
    ...buildWinners(threeWinners, '3_match', pools.threeMatch),
  ]

  if (allWinners.length > 0) {
    await supabaseAdmin.from('winners').insert(allWinners)
  }

  // Handle jackpot rollover
  if (fiveWinners.length === 0) {
    await supabaseAdmin.from('draws').update({ jackpot_rolled: true }).eq('id', draw.id)
  }

  return NextResponse.json({
    data: {
      draw,
      winning_numbers: winningNumbers,
      pools,
      winners_count: allWinners.length,
    },
  })
}
