// ============================================================
// API ROUTE: POST /api/subscriptions/webhook
// Full Stripe webhook handler — all lifecycle events
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const userId           = session.metadata?.supabase_user_id
      const plan             = session.metadata?.plan
      const charityId        = session.metadata?.charity_id || null
      const charityPct       = parseInt(session.metadata?.charity_percentage ?? '10')
      const stripeSubId      = session.subscription as string
      const stripeCustomerId = session.customer as string

      if (!userId) break

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId)

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id:                userId,
          stripe_customer_id:     stripeCustomerId,
          stripe_subscription_id: stripeSubId,
          plan:                   plan ?? 'monthly',
          status:                 'active',
          amount_pence:           plan === 'yearly' ? 10000 : 1000,
          charity_id:             charityId,
          charity_percentage:     charityPct,
          current_period_start:   new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end:     new Date(stripeSub.current_period_end   * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({
          status:               mapStatus(sub.status),
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end:   new Date(sub.current_period_end   * 1000).toISOString(),
          updated_at:           new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'lapsed', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', invoice.customer as string)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.billing_reason === 'subscription_create') break
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('stripe_customer_id', invoice.customer as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}

function mapStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active:             'active',
    canceled:           'cancelled',
    past_due:           'lapsed',
    unpaid:             'lapsed',
    trialing:           'active',
    incomplete:         'inactive',
    incomplete_expired: 'inactive',
  }
  return map[stripeStatus] ?? 'inactive'
}
