// ============================================================
// API ROUTE: POST /api/subscriptions/create-checkout
// Creates a Stripe Checkout session for new subscribers
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

// Price IDs — create these in your Stripe Dashboard first
// Products > Add product > Add price (recurring)
const PRICE_IDS: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly:  process.env.STRIPE_PRICE_YEARLY!,
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user } } = await anonClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { plan, charity_id, charity_percentage } = await req.json()

  if (!plan || !PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Get or create Stripe customer
  const { data: existingSub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  let customerId = existingSub?.stripe_customer_id

  if (!customerId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email!,
      name:  profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer:   customerId,
    mode:       'subscription',
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/auth/register?checkout=cancelled`,
    metadata: {
      supabase_user_id:   user.id,
      plan,
      charity_id:         charity_id ?? '',
      charity_percentage: String(charity_percentage ?? 10),
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    },
  })

  // Store customer ID immediately
  await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id:            user.id,
      stripe_customer_id: customerId,
      plan,
      status:             'inactive', // becomes active after webhook
      amount_pence:       plan === 'yearly' ? 10000 : 1000,
      charity_id:         charity_id ?? null,
      charity_percentage: charity_percentage ?? 10,
    }, { onConflict: 'user_id' })

  return NextResponse.json({ url: session.url })
}
