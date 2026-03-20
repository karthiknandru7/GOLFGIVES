'use client'
// ============================================================
// RESET PASSWORD PAGE — Supabase redirects here after link click
// ============================================================
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [validLink, setValidLink] = useState(false)

  useEffect(() => {
    // Supabase sets the session from URL hash on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidLink(!!session)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }

    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--gold)', display: 'block', marginBottom: 8 }}>
            GolfGives
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Set new password</h1>
        </div>

        <div className="card">
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, marginBottom: 8 }}>Password updated!</h2>
              <p style={{ color: 'var(--cream-dim)', fontSize: 14 }}>Redirecting you to your dashboard…</p>
            </div>
          ) : !validLink ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--cream-dim)', marginBottom: 20 }}>
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/auth/forgot-password" className="btn btn--primary">Request new link</Link>
            </div>
          ) : (
            <>
              {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm new password</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn--primary" type="submit" disabled={loading}>
                  {loading ? 'Updating…' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
