'use client'
// ============================================================
// ACCOUNT SETTINGS — name, password, charity, billing
// ============================================================
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import type { Profile, Subscription, Charity } from '@/types'

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile]       = useState<Profile | null>(null)
  const [sub, setSub]               = useState<Subscription | null>(null)
  const [charities, setCharities]   = useState<Charity[]>([])
  const [loading, setLoading]       = useState(true)

  const [fullName, setFullName]     = useState('')
  const [nameMsg, setNameMsg]       = useState('')

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [pwdMsg, setPwdMsg]         = useState('')

  const [charityId, setCharityId]   = useState('')
  const [charityPct, setCharityPct] = useState(10)
  const [charityMsg, setCharityMsg] = useState('')

  const [portalLoading, setPortalLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }

      const [{ data: prof }, { data: s }, { data: ch }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('subscriptions').select('*, charity:charities(*)').eq('user_id', session.user.id).single(),
        supabase.from('charities').select('*').eq('is_active', true).order('name'),
      ])
      setProfile(prof)
      setSub(s)
      setCharities(ch ?? [])
      setFullName(prof?.full_name ?? '')
      setCharityId(s?.charity_id ?? '')
      setCharityPct(s?.charity_percentage ?? 10)
      setLoading(false)
    }
    load()
  }, [router])

  async function updateName(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile!.id)
    setNameMsg(error ? error.message : 'Name updated!')
    setTimeout(() => setNameMsg(''), 3000)
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 8) { setPwdMsg('Password must be at least 8 characters.'); return }
    // Re-verify current password first
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: profile!.email, password: currentPwd })
    if (signInErr) { setPwdMsg('Current password is incorrect.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdMsg(error ? error.message : 'Password updated!')
    setCurrentPwd(''); setNewPwd('')
    setTimeout(() => setPwdMsg(''), 4000)
  }

  async function updateCharity(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('subscriptions')
      .update({ charity_id: charityId || null, charity_percentage: charityPct })
      .eq('user_id', profile!.id)
    setCharityMsg(error ? error.message : 'Charity preference saved!')
    setTimeout(() => setCharityMsg(''), 3000)
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/subscriptions/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const { url, error } = await res.json()
    if (url) { window.location.href = url }
    else { alert(error ?? 'Could not open billing portal'); setPortalLoading(false) }
  }

  async function handleDeleteAccount() {
    // Call a server-side delete route — browser cannot call admin API
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    await signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--cream-dim)' }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, minHeight: '100vh', background: 'var(--forest-mid)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 0', display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, flexShrink: 0,
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)', padding: '0 24px', marginBottom: 32, display: 'block' }}>
          GolfGives
        </Link>
        {[
          { href: '/dashboard', label: '← Dashboard' },
          { href: '/settings',  label: 'Settings', active: true },
        ].map((l: any) => (
          <Link key={l.href} href={l.href} style={{
            padding: '12px 24px', fontSize: 14, display: 'block',
            color: l.active ? 'var(--gold)' : 'var(--cream-dim)',
            borderLeft: `3px solid ${l.active ? 'var(--gold)' : 'transparent'}`,
            background: l.active ? 'rgba(201,168,76,0.06)' : 'transparent',
          }}>{l.label}</Link>
        ))}
        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <div style={{ fontSize: 13, color: 'var(--cream-dim)', marginBottom: 8 }}>
            {profile?.full_name || profile?.email}
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => { signOut(); router.push('/') }} style={{ width: '100%' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '40px 48px', maxWidth: 680 }}>
        <h1 style={{ fontSize: 30, marginBottom: 40 }}>Account settings</h1>

        {/* Profile name */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Profile</h2>
          <div className="card">
            <form onSubmit={updateName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={profile?.email ?? ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                <span style={{ fontSize: 12, color: 'var(--cream-dim)' }}>Email cannot be changed</span>
              </div>
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
              </div>
              {nameMsg && <div className={`alert alert--${nameMsg.includes('!') ? 'success' : 'error'}`}>{nameMsg}</div>}
              <button className="btn btn--primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save name</button>
            </form>
          </div>
        </section>

        {/* Password */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Change password</h2>
          <div className="card">
            <form onSubmit={updatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Current password</label>
                <input className="form-input" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input className="form-input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
              </div>
              {pwdMsg && <div className={`alert alert--${pwdMsg.includes('!') ? 'success' : 'error'}`}>{pwdMsg}</div>}
              <button className="btn btn--primary" type="submit" style={{ alignSelf: 'flex-start' }}>Update password</button>
            </form>
          </div>
        </section>

        {/* Charity */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Charity preference</h2>
          <div className="card">
            <form onSubmit={updateCharity} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Your charity</label>
                <select className="form-input form-select" value={charityId} onChange={e => setCharityId(e.target.value)}>
                  <option value="">— Select a charity —</option>
                  {charities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Contribution: {charityPct}% of subscription</label>
                <input type="range" min={10} max={100} step={5} value={charityPct}
                  onChange={e => setCharityPct(Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--cream-dim)' }}>
                  <span>10% minimum</span><span>100%</span>
                </div>
              </div>
              {charityMsg && <div className={`alert alert--${charityMsg.includes('!') ? 'success' : 'error'}`}>{charityMsg}</div>}
              <button className="btn btn--primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save charity</button>
            </form>
          </div>
        </section>

        {/* Billing */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Subscription & billing</h2>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, textTransform: 'capitalize' }}>
                  {sub?.plan ?? 'No'} plan
                  {' · '}
                  <span className={`badge badge--${sub?.status === 'active' ? 'active' : 'inactive'}`}>
                    {sub?.status ?? 'None'}
                  </span>
                </div>
                {sub?.current_period_end && (
                  <div style={{ fontSize: 13, color: 'var(--cream-dim)' }}>
                    Renews {new Date(sub.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
              </div>
              <button className="btn btn--outline" onClick={openBillingPortal} disabled={portalLoading}>
                {portalLoading ? 'Opening…' : 'Manage billing →'}
              </button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--cream-dim)', lineHeight: 1.6 }}>
              Change plan, update payment method, download invoices, or cancel via the Stripe billing portal.
            </p>
          </div>
        </section>

        {/* Danger zone */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(224,82,82,0.3)', color: 'var(--danger)' }}>
            Danger zone
          </h2>
          <div className="card" style={{ borderColor: 'rgba(224,82,82,0.2)' }}>
            <p style={{ color: 'var(--cream-dim)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
              Deleting your account is permanent and cannot be undone. All your scores, draw history, and winnings records will be removed.
            </p>
            {!deleteConfirm ? (
              <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(true)}>
                Delete my account
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, color: 'var(--danger)' }}>Are you sure? This cannot be undone.</span>
                <button className="btn btn--danger btn--sm" onClick={handleDeleteAccount}>Yes, delete permanently</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
