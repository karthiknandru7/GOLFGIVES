// ============================================================
// API ROUTE: POST /api/auth/send-welcome
// Called after signup — sends welcome email from the server
// (RESEND_API_KEY is server-only, never exposed to browser)
// ============================================================
import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email, full_name } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
  const ok = await sendWelcomeEmail(email, full_name ?? 'Golfer')
  return NextResponse.json({ ok })
}
