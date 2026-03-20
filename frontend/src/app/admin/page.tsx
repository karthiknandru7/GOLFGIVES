'use client'
// ============================================================
// ADMIN DASHBOARD — Full control panel
// Tabs: Overview, Users, Draws, Charities, Winners, Score Editor
// ============================================================
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import type { Profile, Subscription, Draw, Winner, Charity, Score } from '@/types'

type Tab = 'overview' | 'users' | 'draws' | 'charities' | 'winners' | 'scores'

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab]                   = useState<Tab>('overview')
  const [loading, setLoading]           = useState(true)
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null)
  const [session, setSession]           = useState<any>(null)

  const [users, setUsers]         = useState<Profile[]>([])
  const [subs, setSubs]           = useState<Subscription[]>([])
  const [draws, setDraws]         = useState<Draw[]>([])
  const [winners, setWinners]     = useState<Winner[]>([])
  const [charities, setCharities] = useState<Charity[]>([])
  const [allScores, setAllScores] = useState<any[]>([])

  const [drawMonth, setDrawMonth]     = useState('')
  const [drawMode, setDrawMode]       = useState<'random' | 'algorithmic'>('random')
  const [drawMsg, setDrawMsg]         = useState('')
  const [drawLoading, setDrawLoading] = useState(false)

  const [charityName, setCharityName] = useState('')
  const [charityDesc, setCharityDesc] = useState('')
  const [charityMsg, setCharityMsg]   = useState('')

  const [editingScore, setEditingScore]       = useState<string | null>(null)
  const [editScoreVal, setEditScoreVal]       = useState('')
  const [editScoreDate, setEditScoreDate]     = useState('')
  const [scoreFilterUser, setScoreFilterUser] = useState('')

  const [emailDrawId, setEmailDrawId]   = useState('')
  const [emailMsg, setEmailMsg]         = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/auth/login'); return }
      setSession(s)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', s.user.id).single()
      if ((prof as any)?.role !== 'admin') { router.push('/dashboard'); return }
      setAdminProfile(prof)
      await loadAll(s)
      setLoading(false)
    }
    load()
  }, [router])

  async function loadAll(s?: any) {
    const [
      { data: us }, { data: su }, { data: dr },
      { data: wi }, { data: ch }, { data: sc },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, charity:charities(name), profile:profiles(full_name,email)').order('created_at', { ascending: false }),
      supabase.from('draws').select('*').order('draw_month', { ascending: false }),
      supabase.from('winners').select('*, profile:profiles(full_name,email), draw:draws(draw_month)').order('created_at', { ascending: false }),
      supabase.from('charities').select('*').order('name'),
      supabase.from('scores').select('*, profile:profiles(full_name,email)').order('played_at', { ascending: false }).limit(200),
    ])
    setUsers(us ?? [])
    setSubs(su ?? [])
    setDraws(dr ?? [])
    setWinners(wi ?? [])
    setCharities(ch ?? [])
    setAllScores(sc ?? [])
  }

  async function handleRunDraw() {
    if (!drawMonth) { setDrawMsg('Select a month first.'); return }
    setDrawLoading(true); setDrawMsg('Generating draw...')
    const res = await fetch('/api/draws/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ draw_month: drawMonth + '-01', draw_mode: drawMode }),
    })
    const json = await res.json()
    setDrawMsg(json.error ?? `Draw created! Numbers: ${json.data?.winning_numbers?.join(', ')}`)
    setDrawLoading(false)
    await loadAll()
  }

  async function handlePublishDraw(id: string) {
    await fetch('/api/draws/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ draw_id: id }),
    })
    await loadAll()
  }

  async function handleSendEmails(drawId: string) {
    setEmailLoading(true); setEmailMsg('Sending...')
    const res = await fetch('/api/admin/send-draw-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ draw_id: drawId }),
    })
    const json = await res.json()
    setEmailMsg(json.error ?? `Sent to ${json.data?.sent} of ${json.data?.total} subscribers.`)
    setEmailLoading(false)
  }

  async function handleUpdateWinner(id: string, status: 'approved' | 'rejected' | 'paid') {
    await supabase.from('winners').update({ status, ...(status === 'paid' ? { paid_at: new Date().toISOString() } : {}) }).eq('id', id)
    setWinners(prev => prev.map(w => w.id === id ? { ...w, status } : w))
  }

  async function handleAddCharity(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('charities').insert({ name: charityName, description: charityDesc, is_active: true })
    if (error) { setCharityMsg(error.message); return }
    setCharityMsg('Charity added!'); setCharityName(''); setCharityDesc('')
    await loadAll(); setTimeout(() => setCharityMsg(''), 3000)
  }

  async function handleSaveScore(scoreId: string) {
    const val = parseInt(editScoreVal)
    if (isNaN(val) || val < 1 || val > 45) { alert('Score must be 1–45'); return }
    await fetch('/api/admin/scores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ score_id: scoreId, score: val, played_at: editScoreDate }),
    })
    setEditingScore(null); await loadAll()
  }

  async function handleDeleteScore(scoreId: string) {
    if (!confirm('Delete this score?')) return
    await fetch('/api/admin/scores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ score_id: scoreId }),
    })
    await loadAll()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--cream-dim)' }}>Loading admin...</p>
    </div>
  )

  const activeSubs  = subs.filter(s => s.status === 'active').length
  const totalWon    = winners.reduce((a, w) => a + w.prize_amount, 0)
  const pendingVeri = winners.filter(w => w.status === 'pending').length
  const filteredScores = scoreFilterUser
    ? allScores.filter(s => (s.profile as any)?.email?.toLowerCase().includes(scoreFilterUser.toLowerCase()) || (s.profile as any)?.full_name?.toLowerCase().includes(scoreFilterUser.toLowerCase()))
    : allScores

  const NAV_TABS: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'users',     label: `Users (${users.length})` },
    { key: 'draws',     label: `Draws (${draws.length})` },
    { key: 'charities', label: `Charities (${charities.length})` },
    { key: 'winners',   label: `Winners${pendingVeri > 0 ? ` (${pendingVeri})` : ''}` },
    { key: 'scores',    label: 'Score editor' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <aside style={{ width: 240, background: 'var(--forest-mid)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '32px 0', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, minHeight: '100vh' }}>
        <div style={{ padding: '0 24px', marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold)' }}>GolfGives</div>
          <div style={{ fontSize: 11, color: 'var(--cream-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Admin Panel</div>
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />
        {NAV_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            background: tab === t.key ? 'rgba(201,168,76,0.1)' : 'transparent',
            border: 'none', padding: '12px 24px', textAlign: 'left', cursor: 'pointer',
            color: tab === t.key ? 'var(--gold)' : 'var(--cream-dim)', fontSize: 14,
            borderLeft: `3px solid ${tab === t.key ? 'var(--gold)' : 'transparent'}`,
          }}>{t.label}</button>
        ))}
        <div style={{ marginTop: 'auto', padding: '0 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--cream-dim)', marginBottom: 8 }}>{adminProfile?.email}</div>
          <button className="btn btn--ghost btn--sm" onClick={() => { signOut(); router.push('/') }} style={{ width: '100%' }}>Sign out</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '40px 48px', overflow: 'auto' }}>

        {tab === 'overview' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 32 }}>Overview</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 16, marginBottom: 40 }}>
              {[
                { label: 'Total users',        value: users.length, sub: 'registered' },
                { label: 'Active subscribers', value: activeSubs, sub: 'paying now' },
                { label: 'Est. monthly rev.',  value: `£${(activeSubs * 10).toLocaleString()}`, sub: '' },
                { label: 'Total draws',        value: draws.length, sub: 'all time' },
                { label: 'Total prizes paid',  value: `£${totalWon.toFixed(0)}`, sub: 'all time' },
                { label: 'Pending review',     value: pendingVeri, sub: 'winners' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-card__label">{s.label}</div>
                  <div className="stat-card__value">{s.value}</div>
                  {s.sub && <div className="stat-card__sub">{s.sub}</div>}
                </div>
              ))}
            </div>
            <div className="card">
              <h2 style={{ fontSize: 18, marginBottom: 16 }}>Pending winner verifications</h2>
              {winners.filter(w => w.status === 'pending').length === 0
                ? <p style={{ color: 'var(--cream-dim)', fontSize: 14 }}>No pending verifications.</p>
                : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>User</th><th>Match</th><th>Prize</th><th>Proof</th><th>Action</th></tr></thead>
                      <tbody>
                        {winners.filter(w => w.status === 'pending').slice(0, 6).map(w => (
                          <tr key={w.id}>
                            <td>{(w as any).profile?.full_name ?? (w as any).profile?.email ?? '—'}</td>
                            <td style={{ textTransform: 'capitalize' }}>{w.match_type.replace('_', ' ')}</td>
                            <td style={{ color: 'var(--gold)' }}>£{w.prize_amount.toFixed(2)}</td>
                            <td>{w.proof_url ? <a href={w.proof_url} target="_blank" className="btn btn--ghost btn--sm">View</a> : '—'}</td>
                            <td style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn--primary btn--sm" onClick={() => handleUpdateWinner(w.id, 'approved')}>Approve</button>
                              <button className="btn btn--danger btn--sm" onClick={() => handleUpdateWinner(w.id, 'rejected')}>Reject</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 32 }}>Users</h1>
            <div className="card card--dark">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Sub status</th><th>Plan</th></tr></thead>
                  <tbody>
                    {users.map(u => {
                      const sub = subs.find(s => s.user_id === u.id)
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 500 }}>{u.full_name ?? '—'}</td>
                          <td style={{ color: 'var(--cream-dim)', fontSize: 13 }}>{u.email}</td>
                          <td><span className={`badge badge--${u.role === 'admin' ? 'info' : 'active'}`}>{u.role}</span></td>
                          <td style={{ color: 'var(--cream-dim)' }}>{new Date(u.created_at).toLocaleDateString('en-GB')}</td>
                          <td>{sub ? <span className={`badge badge--${sub.status === 'active' ? 'active' : sub.status === 'lapsed' ? 'danger' : 'inactive'}`}>{sub.status}</span> : '—'}</td>
                          <td style={{ color: 'var(--cream-dim)', textTransform: 'capitalize' }}>{sub?.plan ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'draws' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 32 }}>Draw Management</h1>
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 20 }}>Generate new draw</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1 1 160px' }}>
                  <label className="form-label">Month</label>
                  <input className="form-input" type="month" value={drawMonth} onChange={e => setDrawMonth(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: '1 1 180px' }}>
                  <label className="form-label">Mode</label>
                  <select className="form-input form-select" value={drawMode} onChange={e => setDrawMode(e.target.value as any)}>
                    <option value="random">Random</option>
                    <option value="algorithmic">Algorithmic (weighted)</option>
                  </select>
                </div>
                <button className="btn btn--primary" onClick={handleRunDraw} disabled={drawLoading} style={{ flexShrink: 0 }}>
                  {drawLoading ? 'Generating...' : 'Generate draw'}
                </button>
              </div>
              {drawMsg && <div className={`alert alert--${drawMsg.includes('error') || drawMsg.includes('No active') ? 'error' : 'success'}`} style={{ marginTop: 12 }}>{drawMsg}</div>}
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 16 }}>Send result emails to subscribers</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1 1 220px' }}>
                  <label className="form-label">Select published draw</label>
                  <select className="form-input form-select" value={emailDrawId} onChange={e => setEmailDrawId(e.target.value)}>
                    <option value="">— Choose draw —</option>
                    {draws.filter(d => d.status === 'published').map(d => (
                      <option key={d.id} value={d.id}>{new Date(d.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn--primary" onClick={() => emailDrawId && handleSendEmails(emailDrawId)}
                  disabled={!emailDrawId || emailLoading} style={{ flexShrink: 0 }}>
                  {emailLoading ? 'Sending...' : 'Send emails'}
                </button>
              </div>
              {emailMsg && <div className="alert alert--info" style={{ marginTop: 12 }}>{emailMsg}</div>}
            </div>

            <div className="card card--dark">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Month</th><th>Mode</th><th>Numbers</th><th>Jackpot</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {draws.map(d => (
                      <tr key={d.id}>
                        <td>{new Date(d.draw_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</td>
                        <td style={{ color: 'var(--cream-dim)', textTransform: 'capitalize', fontSize: 13 }}>{d.draw_mode}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {d.winning_numbers.map(n => (
                              <span key={n} style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>{n}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: 'var(--gold)' }}>£{d.jackpot_amount.toFixed(2)}</td>
                        <td><span className={`badge badge--${d.status === 'published' ? 'active' : 'pending'}`}>{d.status}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {d.status !== 'published' && <button className="btn btn--primary btn--sm" onClick={() => handlePublishDraw(d.id)}>Publish</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'charities' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 32 }}>Charity Management</h1>
            <div className="card" style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 20 }}>Add new charity</h2>
              <form onSubmit={handleAddCharity} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '1 1 200px' }}>
                  <label className="form-label">Name</label>
                  <input className="form-input" type="text" placeholder="Charity name" value={charityName} onChange={e => setCharityName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ flex: '2 1 280px' }}>
                  <label className="form-label">Description</label>
                  <input className="form-input" type="text" placeholder="Short description" value={charityDesc} onChange={e => setCharityDesc(e.target.value)} />
                </div>
                <button className="btn btn--primary" type="submit" style={{ flexShrink: 0 }}>Add</button>
              </form>
              {charityMsg && <div className={`alert alert--${charityMsg.includes('!') ? 'success' : 'error'}`} style={{ marginTop: 12 }}>{charityMsg}</div>}
            </div>
            <div className="card card--dark">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Description</th><th>Featured</th><th>Active</th><th>Actions</th></tr></thead>
                  <tbody>
                    {charities.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 500 }}>{c.name}</td>
                        <td style={{ color: 'var(--cream-dim)', fontSize: 13 }}>{c.description?.slice(0, 55) ?? '—'}</td>
                        <td>{c.is_featured ? <span className="badge badge--info">Featured</span> : '—'}</td>
                        <td><span className={`badge badge--${c.is_active ? 'active' : 'inactive'}`}>{c.is_active ? 'Active' : 'Hidden'}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn--ghost btn--sm" onClick={() => { supabase.from('charities').update({ is_featured: !c.is_featured }).eq('id', c.id).then(() => loadAll()) }}>
                            {c.is_featured ? 'Unfeature' : 'Feature'}
                          </button>
                          <button className="btn btn--ghost btn--sm" style={{ color: c.is_active ? 'var(--danger)' : 'var(--success)' }}
                            onClick={() => { supabase.from('charities').update({ is_active: !c.is_active }).eq('id', c.id).then(() => loadAll()) }}>
                            {c.is_active ? 'Hide' : 'Show'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'winners' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 32 }}>Winner Verification & Payouts</h1>
            <div className="card card--dark">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Draw</th><th>Match</th><th>Prize</th><th>Proof</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {winners.map(w => (
                      <tr key={w.id}>
                        <td style={{ fontSize: 13 }}>{(w as any).profile?.full_name ?? (w as any).profile?.email ?? '—'}</td>
                        <td style={{ color: 'var(--cream-dim)', fontSize: 13 }}>{w.draw ? new Date((w.draw as any).draw_month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—'}</td>
                        <td style={{ textTransform: 'capitalize', fontSize: 13 }}>{w.match_type.replace('_', ' ')}</td>
                        <td style={{ color: 'var(--gold)', fontWeight: 600 }}>£{w.prize_amount.toFixed(2)}</td>
                        <td>{w.proof_url ? <a href={w.proof_url} target="_blank" className="btn btn--ghost btn--sm">View</a> : <span style={{ color: 'var(--cream-dim)', fontSize: 12 }}>None</span>}</td>
                        <td><span className={`badge badge--${w.status === 'paid' ? 'active' : w.status === 'approved' ? 'info' : w.status === 'rejected' ? 'danger' : 'pending'}`}>{w.status}</span></td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {w.status === 'pending' && (<><button className="btn btn--primary btn--sm" onClick={() => handleUpdateWinner(w.id, 'approved')}>Approve</button><button className="btn btn--danger btn--sm" onClick={() => handleUpdateWinner(w.id, 'rejected')}>Reject</button></>)}
                          {w.status === 'approved' && <button className="btn btn--primary btn--sm" onClick={() => handleUpdateWinner(w.id, 'paid')}>Mark paid</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'scores' && (
          <>
            <h1 style={{ fontSize: 30, marginBottom: 12 }}>Score Editor</h1>
            <p style={{ color: 'var(--cream-dim)', marginBottom: 24, fontSize: 14 }}>Edit or delete any subscriber's Stableford scores.</p>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">Filter by name or email</label>
                <input className="form-input" type="text" placeholder="Search user..." value={scoreFilterUser} onChange={e => setScoreFilterUser(e.target.value)} style={{ maxWidth: 320 }} />
              </div>
            </div>
            <div className="card card--dark">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>User</th><th>Score</th><th>Date played</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredScores.slice(0, 100).map((s: any) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 13, color: 'var(--cream-dim)' }}>{s.profile?.full_name ?? s.profile?.email ?? s.user_id.slice(0, 8)}</td>
                        <td>
                          {editingScore === s.id
                            ? <input className="form-input" type="number" min={1} max={45} value={editScoreVal} onChange={e => setEditScoreVal(e.target.value)} style={{ width: 80, padding: '4px 8px' }} />
                            : <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--gold)' }}>{s.score}</span>
                          }
                        </td>
                        <td>
                          {editingScore === s.id
                            ? <input className="form-input" type="date" value={editScoreDate} onChange={e => setEditScoreDate(e.target.value)} style={{ padding: '4px 8px' }} />
                            : new Date(s.played_at).toLocaleDateString('en-GB')
                          }
                        </td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          {editingScore === s.id ? (
                            <><button className="btn btn--primary btn--sm" onClick={() => handleSaveScore(s.id)}>Save</button><button className="btn btn--ghost btn--sm" onClick={() => setEditingScore(null)}>Cancel</button></>
                          ) : (
                            <><button className="btn btn--ghost btn--sm" onClick={() => { setEditingScore(s.id); setEditScoreVal(String(s.score)); setEditScoreDate(s.played_at) }}>Edit</button><button className="btn btn--ghost btn--sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteScore(s.id)}>Delete</button></>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredScores.length > 100 && <p style={{ fontSize: 12, color: 'var(--cream-dim)', marginTop: 12 }}>Showing 100 of {filteredScores.length}. Use the filter above.</p>}
            </div>
          </>
        )}

      </main>
    </div>
  )
}
