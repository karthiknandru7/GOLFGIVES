import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

async function getCharities() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('charities')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
  return data ?? []
}

export default async function HomePage() {
  const charities = await getCharities()

  return (
    <main>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 40px', borderBottom: '1px solid rgba(201,168,76,0.12)',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,31,26,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gold)' }}>
          GolfGives
        </span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/charities" className="btn btn--ghost btn--sm">Charities</Link>
          <Link href="/auth/login" className="btn btn--outline btn--sm">Sign In</Link>
          <Link href="/auth/register" className="btn btn--primary btn--sm">Subscribe</Link>
        </div>
      </nav>

      <section style={{
        minHeight: '88vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '80px 40px',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(30,61,51,0.8) 0%, transparent 70%)',
      }}>
        <p style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--gold)', marginBottom: 20,
        }}>
          Play golf · Win prizes · Change lives
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(42px, 7vw, 80px)',
          color: 'var(--white)', maxWidth: 760,
          lineHeight: 1.1, marginBottom: 28,
        }}>
          Every round you play<br />
          <span style={{ color: 'var(--gold)' }}>funds a cause you love.</span>
        </h1>
        <p style={{
          color: 'var(--cream-dim)', fontSize: 18, maxWidth: 520,
          marginBottom: 48, lineHeight: 1.7,
        }}>
          Enter your Stableford scores each month, compete in our prize draw,
          and a portion of every subscription goes directly to charity.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/auth/register" className="btn btn--primary btn--lg">
            Start for ₹10/month
          </Link>
          <Link href="#how-it-works" className="btn btn--ghost btn--lg">
            See how it works
          </Link>
        </div>

        <div style={{
          display: 'flex', gap: 48, marginTop: 72,
          borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 40,
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {[
            { value: '₹10', label: 'per month' },
            { value: '10%+', label: 'goes to charity' },
            { value: '3 tiers', label: 'of prizes each draw' },
            { value: 'Monthly', label: 'draw cadence' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--gold)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--cream-dim)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
          The process
        </p>
        <h2 style={{ fontSize: 40, marginBottom: 60 }}>How GolfGives works</h2>
        <div className="grid-3">
          {[
            { n: '01', title: 'Subscribe', body: 'Choose monthly or yearly. Pick your charity and how much of your fee goes to them — minimum 10%.' },
            { n: '02', title: 'Enter your scores', body: 'After each round, log your Stableford score. Your latest 5 scores form your draw entry for the month.' },
            { n: '03', title: 'Win & give', body: 'Monthly draws match your 5 scores against the winning numbers. 3, 4, or 5 matches wins a prize.' },
          ].map(step => (
            <div key={step.n} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <span style={{
                position: 'absolute', top: 20, right: 20,
                fontFamily: 'var(--font-display)', fontSize: 56, color: 'rgba(201,168,76,0.08)', lineHeight: 1,
              }}>{step.n}</span>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: 20,
              }}>{step.n}</div>
              <h3 style={{ fontSize: 22, marginBottom: 12 }}>{step.title}</h3>
              <p style={{ color: 'var(--cream-dim)', lineHeight: 1.7 }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: '80px 40px', background: 'var(--forest-mid)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 40, marginBottom: 16 }}>Prize pool breakdown</h2>
          <p style={{ color: 'var(--cream-dim)', marginBottom: 56 }}>Every active subscription contributes to the monthly prize pool.</p>
          <div className="grid-3">
            {[
              { match: '5 numbers', pct: '40%', label: 'Jackpot', sub: 'Rolls over if unclaimed', highlight: true },
              { match: '4 numbers', pct: '35%', label: 'Second tier', sub: 'Split among all winners', highlight: false },
              { match: '3 numbers', pct: '25%', label: 'Third tier', sub: 'Split among all winners', highlight: false },
            ].map(tier => (
              <div key={tier.match} className="stat-card" style={tier.highlight ? { borderColor: 'rgba(201,168,76,0.4)' } : {}}>
                <div style={{ fontSize: 13, color: 'var(--cream-dim)', marginBottom: 4 }}>{tier.match} matched</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, color: 'var(--gold)' }}>{tier.pct}</div>
                <div style={{ fontWeight: 600, marginTop: 6, marginBottom: 4 }}>{tier.label}</div>
                <div style={{ fontSize: 12, color: 'var(--cream-dim)' }}>{tier.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {charities.length > 0 && (
        <section style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 40, marginBottom: 48 }}>Choose your cause</h2>
          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {charities.map((c: any) => (
              <div key={c.id} className="card" style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: 'var(--gold)',
                }}>♡</div>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.name}</div>
                {c.description && <p style={{ fontSize: 13, color: 'var(--cream-dim)', lineHeight: 1.6 }}>{c.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{
        padding: '100px 40px', textAlign: 'center',
        borderTop: '1px solid rgba(201,168,76,0.12)',
      }}>
        <h2 style={{ fontSize: 48, marginBottom: 20 }}>Ready to play with purpose?</h2>
        <p style={{ color: 'var(--cream-dim)', fontSize: 18, maxWidth: 480, margin: '0 auto 40px' }}>
          Join today. Cancel anytime. Your scores, your charity, your win.
        </p>
        <Link href="/auth/register" className="btn btn--primary btn--lg">
          Subscribe now — ₹10/month
        </Link>
      </section>

      <footer style={{
        padding: '40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)',
        color: 'var(--cream-dim)', fontSize: 13,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', marginRight: 12 }}>GolfGives</span>
        © {new Date().getFullYear()} · Play. Win. Give.
      </footer>
    </main>
  )
}