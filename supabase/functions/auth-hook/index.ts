/**
 * LITIX — Supabase Auth Hook (Edge Function)
 * Story: LITIX-1.2
 *
 * Injects tenant_id, role, member_id, plan into JWT custom claims.
 * Deploy: supabase functions deploy auth-hook --no-verify-jwt
 * Configure in: Supabase Dashboard > Authentication > Hooks > Custom Access Token
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AuthHookPayload {
  event: string
  session: {
    user: {
      id: string
      email: string
    }
  }
}

Deno.serve(async (req: Request) => {
  const payload = (await req.json()) as AuthHookPayload
  const userId = payload.session.user.id

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch member + tenant + subscription
  const { data: member } = await supabase
    .from('tenant_members')
    .select('id, role, tenant_id, tenants(plan)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!member) {
    // User exists but has no tenant yet (e.g., mid-signup)
    return Response.json({ session: payload.session })
  }

  const tenant = member.tenants as { plan: string } | null

  return Response.json({
    session: {
      ...payload.session,
      user: {
        ...payload.session.user,
        app_metadata: {
          ...payload.session.user,
          tenant_id: member.tenant_id,
          member_id: member.id,
          role: member.role,
          plan: tenant?.plan ?? 'free',
        },
      },
    },
  })
})
