// ============================================================
// API ROUTE: GET /api/admin/analytics
// Admin-only: aggregate stats for the dashboard
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
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

  // Run all analytics queries in parallel
  const [
    { count: totalUsers },
    { count: activeSubscribers },
    { data: subs },
    { data: winners },
    { data: draws },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('subscriptions').select('amount_pence, charity_percentage, plan').eq('status', 'active'),
    supabaseAdmin.from('winners').select('prize_amount, status'),
    supabaseAdmin.from('draws').select('jackpot_amount, status').eq('status', 'published'),
  ])

  // Calculate total prize pool from active subscriptions
  const totalRevenuePence = (subs ?? []).reduce((sum, s) => {
    const monthly = s.plan === 'yearly' ? s.amount_pence / 12 : s.amount_pence
    return sum + monthly
  }, 0)

  const totalCharityContribution = (subs ?? []).reduce((sum, s) => {
    const monthly = s.plan === 'yearly' ? s.amount_pence / 12 : s.amount_pence
    return sum + (monthly * s.charity_percentage) / 100
  }, 0)

  const totalPrizesPaid = (winners ?? [])
    .filter(w => w.status === 'paid')
    .reduce((sum, w) => sum + w.prize_amount, 0)

  const pendingWinners = (winners ?? []).filter(w => w.status === 'pending').length

  return NextResponse.json({
    data: {
      totalUsers,
      activeSubscribers,
      totalRevenuePence:          Math.round(totalRevenuePence),
      totalCharityContributionPence: Math.round(totalCharityContribution),
      totalPrizesPaid,
      pendingWinners,
      totalDraws:  (draws ?? []).length,
    },
  })
}
