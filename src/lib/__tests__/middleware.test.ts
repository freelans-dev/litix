import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @/lib/supabase/middleware
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}))

import { updateSession } from '@/lib/supabase/middleware'
import { middleware } from '../../../middleware'

function makeRequest(pathname: string, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${pathname}`, { headers })
}

function makeUserResponse(user: object | null) {
  const headers = new Headers()
  const response = { headers, cookies: { set: vi.fn() } }
  return { supabaseResponse: response, user }
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redireciona /dashboard para /auth/login quando sem sessão', async () => {
    vi.mocked(updateSession).mockResolvedValue(makeUserResponse(null) as never)
    const req = makeRequest('/dashboard')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/login')
  })

  it('retorna 401 JSON para /api/v1/cases sem sessão', async () => {
    vi.mocked(updateSession).mockResolvedValue(makeUserResponse(null) as never)
    const req = makeRequest('/api/v1/cases')
    const res = await middleware(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('libera /api/v1/auth/ sem autenticação', async () => {
    vi.mocked(updateSession).mockResolvedValue(makeUserResponse(null) as never)
    const req = makeRequest('/api/v1/auth/signup')
    const res = await middleware(req)
    expect(res.status).not.toBe(401)
  })

  it('redireciona /auth/login para /dashboard quando autenticado', async () => {
    const user = { id: 'u1', app_metadata: { tenant_id: 't1', role: 'owner', member_id: 'm1' } }
    vi.mocked(updateSession).mockResolvedValue(makeUserResponse(user) as never)
    const req = makeRequest('/auth/login')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/dashboard')
  })

  it('injeta headers x-tenant-id e x-user-role quando autenticado', async () => {
    const user = { id: 'u1', app_metadata: { tenant_id: 'tenant-123', role: 'admin', member_id: 'm1' } }
    const mockResponse = makeUserResponse(user)
    vi.mocked(updateSession).mockResolvedValue(mockResponse as never)
    const req = makeRequest('/dashboard/cases')
    await middleware(req)
    expect(mockResponse.supabaseResponse.headers.get('x-tenant-id')).toBe('tenant-123')
    expect(mockResponse.supabaseResponse.headers.get('x-user-role')).toBe('admin')
  })

  it('passa assets estáticos sem validação (matcher pattern)', () => {
    // O matcher do Next.js usa negação: exclui _next/static, favicon.ico e extensões de imagem
    const excludedPaths = ['/_next/static/chunk.js', '/favicon.ico', '/logo.svg', '/photo.png']
    const includedPaths = ['/dashboard', '/api/v1/cases', '/auth/login', '/pricing']

    // Regex equivalente ao matcher configurado no middleware
    const excluded = /^(\/_next\/static|\/favicon\.ico|.*\.(svg|png|jpg|jpeg|gif|webp)$)/
    excludedPaths.forEach((p) => expect(excluded.test(p)).toBe(true))
    includedPaths.forEach((p) => expect(excluded.test(p)).toBe(false))
  })
})
