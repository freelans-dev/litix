/**
 * Litix Auth Hook — Supabase Edge Function
 *
 * Injeta tenant_id, role e member_id no JWT após login.
 * Configurar em: Supabase Dashboard → Auth → Hooks → Custom Access Token
 *
 * Deploy: supabase functions deploy auth-hook --no-verify-jwt
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  const payload = await req.json()
  const { user_id } = payload

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: membership, error } = await supabase
    .from('tenant_members')
    .select('tenant_id, role, id')
    .eq('user_id', user_id)
    .eq('is_active', true)
    .single()

  if (error || !membership) {
    return new Response(
      JSON.stringify({ error: 'No active membership found' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      app_metadata: {
        tenant_id: membership.tenant_id,
        role:      membership.role,
        member_id: membership.id,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
