// ============================================================
// 404 NOT FOUND PAGE
// ============================================================
import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 100, color: 'rgba(201,168,76,0.15)', lineHeight: 1, marginBottom: 24 }}>
        404
      </div>
      <h1 style={{ fontSize: 32, marginBottom: 12 }}>Page not found</h1>
      <p style={{ color: 'var(--cream-dim)', fontSize: 16, marginBottom: 36, maxWidth: 400, lineHeight: 1.7 }}>
        The page you're looking for doesn't exist, or you may not have permission to view it.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/" className="btn btn--primary">Go home</Link>
        <Link href="/dashboard" className="btn btn--ghost">Dashboard</Link>
      </div>
    </div>
  )
}
