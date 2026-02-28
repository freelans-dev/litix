import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/auth/verify-email',
  '/auth/reset-password',
  '/auth/new-password',
]
const AUTH_ROUTES = ['/auth/login', '/auth/signup']

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

const BLOCKED_PATHS = [
  '/.env', '/.git', '/wp-admin', '/wp-login', '/phpMyAdmin', '/phpmyadmin',
  '/xmlrpc.php', '/actuator', '/.svn', '/cgi-bin',
]

const MAX_PAYLOAD_BYTES = 1_048_576 // 1MB

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Block scanner/exploit paths
  if (BLOCKED_PATHS.some((p) => pathname.toLowerCase().startsWith(p))) {
    return new NextResponse(null, { status: 404 })
  }

  // Reject oversized payloads on API routes
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
  }

  // Allow public routes without auth check
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/v1/billing/webhook')) {
    return applySecurityHeaders(NextResponse.next())
  }

  const { supabaseResponse, user } = await updateSession(request)

  // Unauthenticated → redirect to login
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated + auth page → redirect to dashboard
  if (user && AUTH_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return applySecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
