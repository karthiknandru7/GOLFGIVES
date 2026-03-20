'use client'
// ============================================================
// USER DASHBOARD — All 5 modules + proof upload + billing portal
// ============================================================
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import type { Profile, Subscription, Score, Draw, Winner } from '@/types'

function DashboardContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const checkoutDone = searchParams.get('checkout') === 'success'

  const [profile, setProfile]           = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [scores, setScores]             = useState<Score[]>([])
  const [draws, setDraws]               = useState<Draw[]>([])
  const [winners, setWinners]           = useState<Winner[]>([])
  const [loading, setLoading]           = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  // Score form
  const [newScore, setNewScore]   = useState('')
  const [scoreDate, setScoreDate] = useState(new Date().toISOString().split('T')[0])
  const [scoreMsg, setScoreMsg]   = useState('')

  // Proof upload
  const [proofFile, setProofFile]         = useState<File | null>(null)
  const [proofWinnerId, setProofWinnerId] = useState('')
  const [proofMsg, setProofMsg]           = useState('')
  const [proofLoading, setProofLoading]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const uid = session.user.id

      const [
        { data: prof },
        { data: sub },
        { data: sc },
        { data: dr },
        { data: win },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('subscriptions').select('*, charity:charities(*)').eq('user_id', uid).single(),
        supabase.from('scores').select('*').eq('user_id', uid).order('played_at', { ascending: false }),
        supabase.from('draws').select('*').eq('status', 'published').order('draw_month', { ascending: false }).limit(6),
        supabase.from('winners').select('*, draw:draws(*)').eq('user_id', uid).order('created_at', { ascending: false }),
      ])

      setProfile(prof)
      setSubscription(sub)
      setScores(sc ?? [])
      setDraws(dr ?? [])
      setWinners(win ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleAddScore(e: React.FormEvent) {
    e.preventDefault()
    const val = parseInt(newScore)
    if (isNaN(val) || val < 1 || val > 45) {
      setScoreMsg('Score must be between 1 and 45.')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase.from('scores').insert({
      user_id: session.user.id, score: val, played_at: scoreDate,
    })
    if (error) { setScoreMsg(error.message); return }

    const { data } = await supabase
      .from('scores').select('*')
      .eq('user_id', session.user.id)
      .order('played_at', { ascending: false })
    setScores(data ?? [])
    setNewScore('')
    setScoreMsg('Score added!')
    setTimeout(() => setScoreMsg(''), 3000)
  }

  async function handleDeleteScore(id: string) {
    await supabase.from('scores').delete().eq('id', id)
    setScores(prev => prev.filter(s => s.id !== id))
  }

  async function handleProofUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!proofFile || !proofWinnerId) {
      setProofMsg('Please select a winner entry and a file.')
      return
    }
    setProofLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const form = new FormData()
    form.append('proof', proofFile)
    form.append('winner_id', proofWinnerId)

    const res = await fetch('/api/winners/proof', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: form,
    })
    const json = await res.json()
    setProofMsg(json.error ?? 'Proof uploaded! Admin will review your submission.')
    setProofLoading(false)
    setProofFile(null)
    setTimeout(() => setProofMsg(''), 5000)
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const { url, error } = await res.json()
    if (url) window.location.href = url
    else { alert(error ?? 'Could not open billing portal'); setPortalLoading(false) }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--cream-dim)' }}>Loading your dashboard…</p>
    </div>
  )

  const isActive    = subscription?.status === 'active'
  const isLapsed    = subscription?.status === 'lapsed'
  const pendingWins = winners.filter(w => w.status === 'pending' && !w.proof_url)

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, minHeight: '100vh', background: 'var(--forest-mid)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 0', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, flexShrink: 0,
      }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)',
          padding: '0 24px', marginBottom: 40, display: 'block',
        }}>GolfGives</Link>

        {[
          { href: '#subscription', label: 'Subscription' },
          { href: '#scores',       label: 'My Scores' },
          { href: '#charity',      label: 'My Charity' },
          { href: '#draws',        label: 'Draws' },
          { href: '#winnings',     label: 'Winnings' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{
            padding: '12px 24px', color: 'var(--cream-dim)',
            fontSize: 14, transition: 'all 0.15s', display: 'block',
          }}
            onMouseOver={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseOut={e  => (e.currentTarget.style.color = 'var(--cream-dim)')}
          >{link.label}</a>
        ))}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 24px' }} />

        <Link href="/settings" style={{
          padding: '12px 24px', color: 'var(--cream-dim)', fontSize: 14, display: 'block',
        }}>Account settings</Link>

        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <div style={{ fontSize: 13, color: 'var(--cream-dim)', marginBottom: 8 }}>
            {profile?.full_name || profile?.email}
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => { signOut(); router.push('/') }}
            style={{ width: '100%' }}
          >Sign out</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto' }}>

        {/* Checkout success banner */}
        {checkoutDone && (
          <div className="alert alert--success" style={{ marginBottom: 28, fontSize: 15 }}>
            🎉 Subscription activated! Welcome to GolfGives. Start logging your scores below.
          </div>
        )}

        {/* Lapsed subscription warning */}
        {isLapsed && (
          <div className="alert alert--error" style={{
            marginBottom: 28, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <span>⚠ Your payment failed and access is paused. Update your payment method to continue.</span>
            <button className="btn btn--danger btn--sm" onClick={openBillingPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening…' : 'Fix billing →'}
            </button>
          </div>
        )}

        <h1 style={{ fontSize: 32, marginBottom: 36 }}>
          Welcome, {profile?.full_name?.split(' ')[0] ?? 'Golfer'}
        </h1>

        {/* ════ MODULE 1 — SUBSCRIPTION ════ */}
        <section id="subscription" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>Subscription</h2>
          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-card__label">Status</div>
              <div style={{ marginTop: 8 }}>
                <span className={`badge badge--${isActive ? 'active' : isLapsed ? 'danger' : 'inactive'}`}>
                  {subscription?.status ?? 'No subscription'}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Plan</div>
              <div className="stat-card__value" style={{ fontSize: 22, textTransform: 'capitalize' }}>
                {subscription?.plan ?? '—'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Renewal date</div>
              <div className="stat-card__value" style={{ fontSize: 18 }}>
                {subscription?.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString('en-GB')
                  : '—'}
              </div>
            </div>
          </div>
          {subscription?.stripe_customer_id && (
            <button className="btn btn--ghost btn--sm" onClick={openBillingPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening…' : 'Manage billing / cancel →'}
            </button>
          )}
        </section>

        {/* ════ MODULE 2 — SCORES ════ */}
        <section id="scores" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>
            My Scores
            <span style={{ fontSize: 13, color: 'var(--cream-dim)', fontFamily: 'var(--font-body)', fontWeight: 400, marginLeft: 10 }}>
              latest 5 · Stableford 1–45
            </span>
          </h2>

          <div className="card" style={{ marginBottom: 16 }}>
            <form onSubmit={handleAddScore} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: '1 1 120px' }}>
                <label className="form-label">Score (1–45)</label>
                <input
                  className="form-input" type="number" min={1} max={45}
                  placeholder="e.g. 34" value={newScore}
                  onChange={e => setNewScore(e.target.value)} required
                />
              </div>
              <div className="form-group" style={{ flex: '1 1 160px' }}>
                <label className="form-label">Date played</label>
                <input
                  className="form-input" type="date"
                  value={scoreDate} onChange={e => setScoreDate(e.target.value)} required
                />
              </div>
              <button className="btn btn--primary" type="submit" style={{ flexShrink: 0 }}>
                Add score
              </button>
            </form>
            {scoreMsg && (
              <div className={`alert alert--${scoreMsg.includes('!') ? 'success' : 'error'}`} style={{ marginTop: 12 }}>
                {scoreMsg}
              </div>
            )}
          </div>

          {scores.length === 0
            ? <p style={{ color: 'var(--cream-dim)', fontSize: 14 }}>No scores yet. Add your first round above.</p>
            : (
              <div className="card card--dark">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Score</th><th>Date played</th><th></th></tr></thead>
                    <tbody>
                      {scores.map((s, i) => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--cream-dim)' }}>{i + 1}</td>
                          <td style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold)' }}>
                            {s.score}
                          </td>
                          <td>{new Date(s.played_at).toLocaleDateString('en-GB')}</td>
                          <td>
                            <button
                              className="btn btn--ghost btn--sm"
                              style={{ color: 'var(--danger)', borderColor: 'transparent' }}
                              onClick={() => handleDeleteScore(s.id)}
                            >Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginTop: 10 }}>
                  Adding a 6th score automatically replaces the oldest one.
                </p>
              </div>
            )
          }
        </section>

        {/* ════ MODULE 3 — CHARITY ════ */}
        <section id="charity" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>My Charity</h2>
          <div className="card" style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
          }}>
            {subscription?.charity ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'var(--gold)', flexShrink: 0,
                }}>♡</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{(subscription.charity as any).name}</div>
                  <div style={{ color: 'var(--cream-dim)', fontSize: 14, marginTop: 2 }}>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {subscription.charity_percentage}%
                    </span> of your subscription goes to this charity each month
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--cream-dim)' }}>No charity selected.</p>
            )}
            <Link href="/settings" className="btn btn--ghost btn--sm">Change charity →</Link>
          </div>
        </section>

        {/* ════ MODULE 4 — DRAWS ════ */}
        <section id="draws" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>Monthly Draws</h2>
          {draws.length === 0
            ? <p style={{ color: 'var(--cream-dim)', fontSize: 14 }}>No published draws yet. Check back soon.</p>
            : (
              <div className="card card--dark">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Month</th><th>Winning numbers</th><th>Jackpot</th></tr>
                    </thead>
                    <tbody>
                      {draws.map(d => (
                        <tr key={d.id}>
                          <td>
                            {new Date(d.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {d.winning_numbers.map(n => (
                                <span key={n} style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: 'rgba(201,168,76,0.15)',
                                  border: '1px solid rgba(201,168,76,0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 12, fontWeight: 600, color: 'var(--gold)',
                                }}>{n}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: 'var(--gold)' }}>£{d.jackpot_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </section>

        {/* ════ MODULE 5 — WINNINGS + PROOF UPLOAD ════ */}
        <section id="winnings" style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, marginBottom: 20 }}>My Winnings</h2>

          {winners.length === 0
            ? <p style={{ color: 'var(--cream-dim)', fontSize: 14 }}>No winnings yet — keep playing!</p>
            : (
              <div className="card card--dark" style={{ marginBottom: 20 }}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Draw</th><th>Match</th><th>Prize</th><th>Proof</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {winners.map(w => (
                        <tr key={w.id}>
                          <td>
                            {w.draw
                              ? new Date((w.draw as any).draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                              : '—'}
                          </td>
                          <td style={{ textTransform: 'capitalize' }}>{w.match_type.replace('_', ' ')}</td>
                          <td style={{ color: 'var(--gold)', fontWeight: 600 }}>£{w.prize_amount.toFixed(2)}</td>
                          <td>
                            {w.proof_url
                              ? <span style={{ color: 'var(--success)', fontSize: 13 }}>✓ Submitted</span>
                              : <span style={{ color: 'var(--cream-dim)', fontSize: 13 }}>Required</span>
                            }
                          </td>
                          <td>
                            <span className={`badge badge--${
                              w.status === 'paid'     ? 'active'   :
                              w.status === 'approved' ? 'info'     :
                              w.status === 'rejected' ? 'danger'   : 'pending'
                            }`}>{w.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }

          {/* Proof upload — shown only when there are unsubmitted pending wins */}
          {pendingWins.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(201,168,76,0.3)' }}>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>Submit your proof of scores</h3>
              <p style={{ color: 'var(--cream-dim)', fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
                To claim your prize, upload a screenshot of your scores from your golf club's system or scoring app.
                Admin will verify and process your payment within 3 business days.
              </p>
              <form onSubmit={handleProofUpload} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Which win are you claiming?</label>
                  <select
                    className="form-input form-select"
                    value={proofWinnerId}
                    onChange={e => setProofWinnerId(e.target.value)}
                    required
                  >
                    <option value="">— Select entry —</option>
                    {pendingWins.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.match_type.replace('_', ' ')} · £{w.prize_amount.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Score screenshot (JPG, PNG or PDF)</label>
                  <input
                    type="file" accept="image/*,application/pdf"
                    onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                    required
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--cream)', padding: '10px 12px',
                      width: '100%', fontSize: 14,
                    }}
                  />
                </div>
                {proofMsg && (
                  <div className={`alert alert--${proofMsg.includes('!') || proofMsg.includes('uploaded') ? 'success' : 'error'}`}>
                    {proofMsg}
                  </div>
                )}
                <button className="btn btn--primary" type="submit" disabled={proofLoading} style={{ alignSelf: 'flex-start' }}>
                  {proofLoading ? 'Uploading…' : 'Submit proof'}
                </button>
              </form>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--cream-dim)' }}>Loading…</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
