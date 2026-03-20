'use client'
// ============================================================
// LOGIN PAGE — with forgot password link
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { session, error: authError } = await signIn(email, password)
    console.log('session:', session)
    console.log('error:', authError)  

    if (authError || !session) {
      setError(authError?.message ?? 'Invalid email or password.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    router.push('/dashboard')
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
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Welcome back</h1>
          <p style={{ color: 'var(--cream-dim)', fontSize: 14, marginTop: 6 }}>Sign in to your account</p>
        </div>

        <div className="card">
          {error && <div className="alert alert--error" style={{ marginBottom: 20 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: 'var(--gold)' }}>
                  Forgot password?
                </Link>
              </div>
              <input className="form-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <button className="btn btn--primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--cream-dim)' }}>
          No account?{' '}
          <Link href="/auth/register" style={{ color: 'var(--gold)' }}>Subscribe now</Link>
        </p>
      </div>
    </div>
  )
}
