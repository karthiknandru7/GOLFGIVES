'use client'
// ============================================================
// FORGOT PASSWORD PAGE
// ============================================================
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          <h1 style={{ fontSize: 22, fontWeight: 500 }}>Forgot password</h1>
        </div>

        <div className="card">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
              <h2 style={{ fontSize: 20, marginBottom: 12 }}>Check your email</h2>
              <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.7 }}>
                We've sent a password reset link to <strong style={{ color: 'var(--cream)' }}>{email}</strong>.
                Check your inbox and click the link to reset your password.
              </p>
              <Link href="/auth/login" className="btn btn--ghost btn--sm" style={{ marginTop: 24, display: 'inline-flex' }}>
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--cream-dim)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
              {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Email address</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button className="btn btn--primary" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--cream-dim)' }}>
          Remember it? <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
