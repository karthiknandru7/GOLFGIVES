'use client'
// ============================================================
// REGISTER — 3-step: account → plan → charity → Stripe Checkout
// ============================================================
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { Charity } from '@/types'

type Step = 'account' | 'plan' | 'charity'

const PLANS = [
  { key: 'monthly', label: 'Monthly', price: '£10', sub: 'per month · billed monthly', pence: 1000 },
  { key: 'yearly',  label: 'Yearly',  price: '£100', sub: 'per year · 2 months free', pence: 10000 },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep]             = useState<Step>('account')
  const [charities, setCharities]   = useState<Charity[]>([])
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [plan, setPlan]             = useState<'monthly' | 'yearly'>('monthly')
  const [charityId, setCharityId]   = useState('')
  const [charityPct, setCharityPct] = useState(10)

  useEffect(() => {
    supabase.from('charities').select('*').eq('is_active', true)
      .then(({ data }) => { if (data) setCharities(data) })
  }, [])

  async function handleFinalSubmit() {
    setError('')
    setLoading(true)

    // 1. Create Supabase auth user
    const { user, error: authError } = await signUp(email, password, fullName)
    if (authError || !user) {
      setError(authError?.message ?? 'Signup failed. Please try again.')
      setLoading(false)
      return
    }

    // 2. Send welcome email via server-side API route
    //    (RESEND_API_KEY is server-only — cannot call email lib directly in browser)
    fetch('/api/auth/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName }),
    }).catch(() => {}) // fire-and-forget, non-blocking

    // 3. Get session token
    const { data: { session } } = await supabase.auth.getSession()

    // 4. Create Stripe Checkout session
    const res = await fetch('/api/subscriptions/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        plan,
        charity_id:         charityId || null,
        charity_percentage: charityPct,
      }),
    })

    const { url, error: checkoutError } = await res.json()

    if (checkoutError || !url) {
      // Stripe not configured yet — still let user reach dashboard
      setError('Payment setup unavailable. You can manage billing in account settings.')
      setLoading(false)
      router.push('/dashboard')
      return
    }

    // 5. Redirect to Stripe hosted checkout
    window.location.href = url
  }

  const stepIndex = { account: 0, plan: 1, charity: 2 }[step]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Logo + step indicator */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)', display: 'block', marginBottom: 16 }}>
            GolfGives
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {(['account', 'plan', 'charity'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  background: stepIndex === i ? 'var(--gold)' : stepIndex > i ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)',
                  color: stepIndex === i ? 'var(--forest)' : 'var(--cream-dim)',
                }}>{stepIndex > i ? '✓' : i + 1}</div>
                <span style={{ fontSize: 12, color: stepIndex === i ? 'var(--gold)' : 'var(--cream-dim)', textTransform: 'capitalize' }}>{s}</span>
                {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}

          {/* STEP 1: Account details */}
          {step === 'account' && (
            <form onSubmit={e => { e.preventDefault(); setStep('plan') }}
              style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 22 }}>Create your account</h2>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" type="text" placeholder="Jane Smith"
                  value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" placeholder="jane@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min. 8 characters"
                  value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
              </div>
              <button className="btn btn--primary" type="submit">Continue →</button>
            </form>
          )}

          {/* STEP 2: Plan selection */}
          {step === 'plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 22 }}>Choose your plan</h2>
              {PLANS.map(p => (
                <div key={p.key} onClick={() => setPlan(p.key as any)} style={{
                  padding: '20px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  border: `2px solid ${plan === p.key ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                  background: plan === p.key ? 'rgba(201,168,76,0.06)' : 'transparent',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{p.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--cream-dim)', marginTop: 2 }}>{p.sub}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color: 'var(--gold)' }}>{p.price}</div>
                  </div>
                </div>
              ))}
              <button className="btn btn--primary" onClick={() => setStep('charity')}>Continue →</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setStep('account')}>← Back</button>
            </div>
          )}

          {/* STEP 3: Charity selection */}
          {step === 'charity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 22 }}>Choose your charity</h2>
              <p style={{ fontSize: 14, color: 'var(--cream-dim)' }}>
                Minimum 10% of your subscription goes to your chosen charity every month.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {charities.map(c => (
                  <div key={c.id} onClick={() => setCharityId(c.id)} style={{
                    padding: '14px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: `2px solid ${charityId === c.id ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                    background: charityId === c.id ? 'rgba(201,168,76,0.06)' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12, color: 'var(--cream-dim)', marginTop: 4 }}>{c.description}</div>}
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">My contribution: {charityPct}%</label>
                <input type="range" min={10} max={100} step={5} value={charityPct}
                  onChange={e => setCharityPct(Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--cream-dim)' }}>
                  <span>10% minimum</span><span>100%</span>
                </div>
              </div>
              <button className="btn btn--primary" onClick={handleFinalSubmit} disabled={loading}>
                {loading ? 'Setting up your account…' : 'Subscribe & pay securely →'}
              </button>
              <p style={{ fontSize: 12, color: 'var(--cream-dim)', textAlign: 'center' }}>
                You'll be redirected to Stripe. Secure. Cancel anytime.
              </p>
              <button className="btn btn--ghost btn--sm" onClick={() => setStep('plan')}>← Back</button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--cream-dim)' }}>
          Already subscribed? <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
