import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role client — bypasses RLS completely.
 *
 * ALLOWED uses:
 * - Stripe/billing webhooks (no user auth context)
 * - Cron jobs (src/app/api/v1/cron/)
 * - Background dispatchers (webhook-dispatcher, alert-generator)
 * - Auth fallback in getTenantContext() (src/lib/auth.ts)
 * - Supabase Admin API (auth.admin.inviteUserByEmail, etc.)
 *
 * FORBIDDEN uses:
 * - User-facing API routes → use createTenantClient() from @/lib/supabase/tenant
 * - Dashboard pages → use createClient() from @/lib/supabase/server
 */
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
