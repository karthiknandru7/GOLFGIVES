// ============================================================
// EMAIL NOTIFICATIONS — using Resend (free tier: 3k/month)
// Install: npm install resend
// Get API key: resend.com → API Keys
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const FROM_EMAIL     = process.env.FROM_EMAIL ?? 'noreply@golfgives.com'
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'https://golfgives.com'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    return res.ok
  } catch {
    console.error('Email send failed')
    return false
  }
}

// Shared email wrapper HTML
function emailWrapper(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { margin:0; padding:0; background:#0d1f1a; font-family: Georgia, serif; color:#f5f0e8; }
        .wrap { max-width:560px; margin:0 auto; padding:40px 24px; }
        .logo { font-size:28px; color:#c9a84c; margin-bottom:32px; display:block; }
        .card { background:#142b24; border:1px solid rgba(201,168,76,0.2); border-radius:12px; padding:32px; margin-bottom:24px; }
        h1 { font-size:24px; color:#ffffff; margin:0 0 16px; line-height:1.2; }
        p  { font-size:15px; color:#c8c0b0; line-height:1.7; margin:0 0 16px; }
        .btn { display:inline-block; background:#c9a84c; color:#0d1f1a; padding:14px 28px; border-radius:6px; text-decoration:none; font-size:15px; font-weight:600; margin-top:8px; }
        .gold { color:#c9a84c; font-weight:600; }
        .nums { display:flex; gap:8px; margin:16px 0; }
        .num  { width:36px; height:36px; border-radius:50%; background:rgba(201,168,76,0.15); border:1px solid rgba(201,168,76,0.4); display:inline-flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#c9a84c; text-align:center; line-height:36px; }
        .footer { font-size:12px; color:rgba(200,192,176,0.5); text-align:center; padding-top:24px; }
        .divider { border:none; border-top:1px solid rgba(255,255,255,0.07); margin:24px 0; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <span class="logo">GolfGives</span>
        ${content}
        <p class="footer">© ${new Date().getFullYear()} GolfGives · Play. Win. Give.<br>
        You're receiving this because you're a GolfGives subscriber.</p>
      </div>
    </body>
    </html>
  `
}

// ── Welcome email after signup ──────────────────────────────
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const html = emailWrapper(`
    <div class="card">
      <h1>Welcome to GolfGives, ${name}! 🏌️</h1>
      <p>You're now part of a community where every round of golf makes a difference.</p>
      <hr class="divider">
      <p><span class="gold">What to do next:</span></p>
      <p>1. Log your Stableford scores after each round (range 1–45)<br>
         2. Your latest 5 scores form your monthly draw entry<br>
         3. Match 3, 4, or 5 numbers to win a prize<br>
         4. Your chosen charity receives a portion every month</p>
      <a href="${APP_URL}/dashboard" class="btn">Go to your dashboard →</a>
    </div>
  `)
  return sendEmail(to, 'Welcome to GolfGives — Play. Win. Give.', html)
}

// ── Draw published — notify all active subscribers ──────────
export async function sendDrawResultEmail(
  to: string,
  name: string,
  drawMonth: string,
  winningNumbers: number[],
  userNumbers: number[],
  matchCount: number
): Promise<boolean> {
  const monthLabel = new Date(drawMonth).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const winSet     = new Set(winningNumbers)

  const winNumsHtml = winningNumbers
    .map(n => `<span class="num">${n}</span>`)
    .join('')

  const userNumsHtml = userNumbers
    .map(n => `<span class="num" style="${winSet.has(n) ? 'background:rgba(201,168,76,0.35);border-color:#c9a84c' : ''}">${n}</span>`)
    .join('')

  const matchMsg =
    matchCount === 5 ? '🏆 5 numbers matched — JACKPOT WINNER!' :
    matchCount === 4 ? '🥇 4 numbers matched — Second tier winner!' :
    matchCount === 3 ? '🥈 3 numbers matched — Third tier winner!' :
    'Keep playing — next month is your month!'

  const html = emailWrapper(`
    <div class="card">
      <h1>${monthLabel} draw results are in!</h1>
      <p>The winning numbers for ${monthLabel}:</p>
      <div class="nums">${winNumsHtml}</div>
      <hr class="divider">
      <p>Your entry numbers <span style="font-size:12px;color:#c8c0b0">(gold = matched)</span>:</p>
      <div class="nums">${userNumsHtml}</div>
      <p><span class="gold">${matchMsg}</span></p>
      ${matchCount >= 3
        ? `<p>Head to your dashboard to upload your proof of scores to claim your prize.</p>
           <a href="${APP_URL}/dashboard#winnings" class="btn">Claim your prize →</a>`
        : `<a href="${APP_URL}/dashboard" class="btn">View draw results →</a>`
      }
    </div>
  `)

  return sendEmail(to, `GolfGives ${monthLabel} draw results — ${matchMsg}`, html)
}

// ── Winner verification approved ───────────────────────────
export async function sendWinnerApprovedEmail(
  to: string,
  name: string,
  prizeAmount: number,
  matchType: string
): Promise<boolean> {
  const matchLabel = matchType === '5_match' ? 'Jackpot (5 match)' :
                     matchType === '4_match' ? 'Second tier (4 match)' : 'Third tier (3 match)'

  const html = emailWrapper(`
    <div class="card">
      <h1>Your prize has been approved! 🎉</h1>
      <p>Congratulations <span class="gold">${name}</span> — your ${matchLabel} win has been verified.</p>
      <p style="font-size:32px; color:#c9a84c; font-weight:700; margin:20px 0;">£${prizeAmount.toFixed(2)}</p>
      <p>Your payment is being processed and will be sent to you shortly.</p>
      <a href="${APP_URL}/dashboard#winnings" class="btn">View your winnings →</a>
    </div>
  `)
  return sendEmail(to, 'Your GolfGives prize has been approved! 🎉', html)
}

// ── Winner payment sent ─────────────────────────────────────
export async function sendPaymentSentEmail(
  to: string,
  name: string,
  prizeAmount: number
): Promise<boolean> {
  const html = emailWrapper(`
    <div class="card">
      <h1>Your payment is on the way! 💸</h1>
      <p>Hi <span class="gold">${name}</span>, great news — your prize of <span class="gold">£${prizeAmount.toFixed(2)}</span> has been sent.</p>
      <p>Please allow 1–3 business days for the funds to arrive depending on your bank.</p>
      <p>Thank you for playing and giving with GolfGives.</p>
      <a href="${APP_URL}/dashboard" class="btn">Back to dashboard →</a>
    </div>
  `)
  return sendEmail(to, 'Your GolfGives payment has been sent!', html)
}

// ── Subscription lapsed warning ─────────────────────────────
export async function sendPaymentFailedEmail(to: string, name: string): Promise<boolean> {
  const html = emailWrapper(`
    <div class="card">
      <h1>Action needed — payment failed</h1>
      <p>Hi <span class="gold">${name}</span>, we weren't able to collect your GolfGives subscription payment.</p>
      <p>Your account has been paused. Update your payment method to restore access to draws and your dashboard.</p>
      <a href="${APP_URL}/api/subscriptions/portal" class="btn">Update payment method →</a>
    </div>
  `)
  return sendEmail(to, 'GolfGives — payment failed, action needed', html)
}

// ── Password reset ──────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<boolean> {
  const html = emailWrapper(`
    <div class="card">
      <h1>Reset your password</h1>
      <p>You requested a password reset for your GolfGives account. Click the button below to choose a new password.</p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <a href="${resetLink}" class="btn">Reset password →</a>
    </div>
  `)
  return sendEmail(to, 'GolfGives — reset your password', html)
}
