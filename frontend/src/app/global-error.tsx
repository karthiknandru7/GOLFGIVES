'use client'
// ============================================================
// GLOBAL ERROR BOUNDARY
// Catches unhandled errors in the React tree
// ============================================================
import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, background: '#0d1f1a', fontFamily: 'Georgia, serif', color: '#f5f0e8' }}>
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24,
        }}>
          <div style={{ fontSize: 56, color: 'rgba(224,82,82,0.3)', marginBottom: 24 }}>⚠</div>
          <h1 style={{ fontSize: 28, color: '#fff', marginBottom: 12 }}>Something went wrong</h1>
          <p style={{ color: '#c8c0b0', fontSize: 15, maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span style={{ display: 'block', fontSize: 12, marginTop: 8, opacity: 0.5 }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={reset}
              style={{
                background: '#c9a84c', color: '#0d1f1a', border: 'none',
                padding: '12px 24px', borderRadius: 6, fontSize: 14,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                background: 'transparent', color: '#c8c0b0',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '12px 24px', borderRadius: 6, fontSize: 14,
                cursor: 'pointer', textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
