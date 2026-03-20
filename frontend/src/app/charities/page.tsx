'use client'
// ============================================================
// PUBLIC CHARITIES PAGE — Directory with search + filter
// ============================================================
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Charity } from '@/types'

export default function CharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    supabase
      .from('charities')
      .select('*, events:charity_events(*)')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .then(({ data }) => {
        setCharities(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = charities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const featured  = filtered.filter(c => c.is_featured)
  const rest      = filtered.filter(c => !c.is_featured)

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.12)',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,31,26,0.95)', backdropFilter: 'blur(12px)',
      }}>
        <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>
          GolfGives
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/auth/login"    className="btn btn--ghost btn--sm">Sign in</Link>
          <Link href="/auth/register" className="btn btn--primary btn--sm">Subscribe</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 40px' }}>
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
            Choose your cause
          </p>
          <h1 style={{ fontSize: 44, marginBottom: 20 }}>Our charity partners</h1>
          <p style={{ color: 'var(--cream-dim)', fontSize: 17, maxWidth: 540, lineHeight: 1.7, marginBottom: 32 }}>
            A portion of every subscription goes directly to the charity you choose. Browse our verified partners below.
          </p>

          {/* Search */}
          <input
            className="form-input"
            type="text"
            placeholder="Search charities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {/* Featured spotlight */}
        {featured.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, color: 'var(--gold)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>★</span> Featured charity
            </h2>
            {featured.map(c => (
              <div key={c.id} className="card" style={{
                borderColor: 'rgba(201,168,76,0.3)',
                background: 'rgba(201,168,76,0.04)',
                display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(201,168,76,0.12)', border: '2px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, color: 'var(--gold)',
                }}>♡</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h3 style={{ fontSize: 24, marginBottom: 8 }}>{c.name}</h3>
                  {c.description && <p style={{ color: 'var(--cream-dim)', lineHeight: 1.7, marginBottom: 16 }}>{c.description}</p>}
                  {c.website_url && (
                    <a href={c.website_url} target="_blank" className="btn btn--outline btn--sm">
                      Visit website →
                    </a>
                  )}
                </div>

                {/* Upcoming events */}
                {(c.events ?? []).length > 0 && (
                  <div style={{ minWidth: 220 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--cream-dim)', marginBottom: 12 }}>
                      Upcoming events
                    </div>
                    {(c.events ?? []).slice(0, 3).map((ev: any) => (
                      <div key={ev.id} style={{
                        padding: '10px 14px', background: 'rgba(255,255,255,0.04)',
                        borderRadius: 8, marginBottom: 8, border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{ev.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--cream-dim)', marginTop: 2 }}>
                          {new Date(ev.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {ev.location && ` · ${ev.location}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All charities grid */}
        {rest.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 20, color: 'var(--cream-dim)' }}>All charities</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {rest.map(c => (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: 'var(--gold)',
                    }}>♡</div>
                    <h3 style={{ fontSize: 17 }}>{c.name}</h3>
                  </div>
                  {c.description && (
                    <p style={{ color: 'var(--cream-dim)', fontSize: 14, lineHeight: 1.6 }}>{c.description}</p>
                  )}
                  {(c.events ?? []).length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
                      {(c.events ?? []).length} upcoming event{(c.events ?? []).length > 1 ? 's' : ''}
                    </div>
                  )}
                  {c.website_url && (
                    <a href={c.website_url} target="_blank" style={{ fontSize: 13, color: 'var(--gold)' }}>
                      Visit website →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--cream-dim)' }}>
            No charities match your search.
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop: 80, padding: '48px', textAlign: 'center',
          border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16,
          background: 'rgba(201,168,76,0.03)',
        }}>
          <h2 style={{ fontSize: 32, marginBottom: 12 }}>Ready to make a difference?</h2>
          <p style={{ color: 'var(--cream-dim)', marginBottom: 28 }}>
            Subscribe and start supporting your chosen charity today.
          </p>
          <Link href="/auth/register" className="btn btn--primary btn--lg">
            Start for £10/month
          </Link>
        </div>
      </div>
    </div>
  )
}
