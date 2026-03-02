import { NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/auth'
import { createTenantClient } from '@/lib/supabase/tenant'

// GET /api/v1/team/members
// Lista membros ativos + pendentes (accepted_at IS NULL)
// Retorna: { members: Member[], total: number }
export async function GET() {
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data, error } = await supabase
    .from('tenant_members')
    .select('id, role, is_active, invited_at, accepted_at, created_at, user_id')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = (data ?? []).map((m) => m.user_id).filter(Boolean)
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
    : { data: [] }

  const members = (data ?? []).map((m) => ({
    ...m,
    profile: profiles?.find((p) => p.id === m.user_id) ?? null,
    status: !m.is_active ? 'inactive' : m.accepted_at ? 'active' : 'pending',
  }))

  return NextResponse.json({ members, total: members.length })
}
