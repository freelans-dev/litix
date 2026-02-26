import { describe, it, expect } from 'vitest'
import { checkRole, requireRole } from '../auth'
import type { TenantContext } from '../auth'

function makeCtx(role: TenantContext['role']): TenantContext {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    memberId: 'member-1',
    role,
    plan: 'solo',
  }
}

describe('checkRole', () => {
  it('owner passes all role checks', () => {
    const ctx = makeCtx('owner')
    expect(checkRole(ctx, 'viewer')).toBeNull()
    expect(checkRole(ctx, 'member')).toBeNull()
    expect(checkRole(ctx, 'admin')).toBeNull()
    expect(checkRole(ctx, 'owner')).toBeNull()
  })

  it('admin passes admin, member, viewer', () => {
    const ctx = makeCtx('admin')
    expect(checkRole(ctx, 'viewer')).toBeNull()
    expect(checkRole(ctx, 'member')).toBeNull()
    expect(checkRole(ctx, 'admin')).toBeNull()
  })

  it('admin fails owner check', () => {
    const ctx = makeCtx('admin')
    const result = checkRole(ctx, 'owner')
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })

  it('member fails admin check', () => {
    const ctx = makeCtx('member')
    const result = checkRole(ctx, 'admin')
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })

  it('viewer fails member check', () => {
    const ctx = makeCtx('viewer')
    const result = checkRole(ctx, 'member')
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })

  it('viewer passes viewer check', () => {
    const ctx = makeCtx('viewer')
    expect(checkRole(ctx, 'viewer')).toBeNull()
  })
})

describe('requireRole', () => {
  it('does not throw when role is sufficient', () => {
    expect(() => requireRole(makeCtx('owner'), 'admin')).not.toThrow()
  })

  it('throws when role is insufficient', () => {
    expect(() => requireRole(makeCtx('viewer'), 'admin')).toThrow('Forbidden')
  })
})
