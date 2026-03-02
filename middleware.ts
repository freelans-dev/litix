import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Rotas de API públicas (sem autenticação)
const PUBLIC_API_ROUTES = ['/api/v1/auth/']

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // --- Rotas de API: /api/v1/** (exceto /api/v1/auth/**) ---
  if (pathname.startsWith('/api/v1/')) {
    const authHeader = request.headers.get('authorization')

    // API key auth: Bearer ltx_... — let through, resolved in getTenantContext
    if (authHeader?.startsWith('Bearer ltx_')) {
      return NextResponse.next()
    }

    const isPublicApi = PUBLIC_API_ROUTES.some((p) => pathname.startsWith(p))
    if (!isPublicApi && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // --- Dashboard: redireciona para login se não autenticado ---
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // --- Auth pages: redireciona para dashboard se já autenticado ---
  if (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup')) {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // --- Injeta headers com contexto do tenant (AC5) ---
  if (user) {
    const tenantId = user.app_metadata?.tenant_id as string | undefined
    const role = user.app_metadata?.role as string | undefined
    supabaseResponse.headers.set('x-tenant-id', tenantId ?? '')
    supabaseResponse.headers.set('x-user-role', role ?? '')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
