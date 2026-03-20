import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = req.cookies.get('sb-mwafomgycrdyschdgcwp-auth-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  try {
    const parsed = JSON.parse(token)
    const accessToken = parsed?.access_token
    if (!accessToken) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user } } = await supabase.auth.getUser(accessToken)
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}