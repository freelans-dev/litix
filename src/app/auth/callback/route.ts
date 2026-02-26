import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Handle invite: create tenant_members record if metadata present
      if (type === 'invite') {
        const meta = data.user.user_metadata
        const tenantId = meta?.tenant_id as string | undefined
        const role = (meta?.invited_role as string | undefined) ?? 'member'

        if (tenantId) {
          const serviceClient = createServiceClient()
          const validRole = (['admin', 'member', 'viewer'] as const).includes(
            role as 'admin' | 'member' | 'viewer'
          )
            ? (role as 'admin' | 'member' | 'viewer')
            : ('member' as const)
          await serviceClient
            .from('tenant_members')
            .upsert(
              { tenant_id: tenantId, user_id: data.user.id, role: validRole, is_active: true },
              { onConflict: 'tenant_id,user_id' }
            )
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
