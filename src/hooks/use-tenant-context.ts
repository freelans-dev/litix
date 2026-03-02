'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface TenantContext {
  tenantId: string
  memberId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  userId: string
}

export function useTenantContext() {
  const [context, setContext] = useState<TenantContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.tenant_id) {
        setContext({
          tenantId: user.app_metadata.tenant_id as string,
          memberId: user.app_metadata.member_id as string,
          role: user.app_metadata.role as TenantContext['role'],
          userId: user.id,
        })
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (user?.app_metadata?.tenant_id) {
        setContext({
          tenantId: user.app_metadata.tenant_id as string,
          memberId: user.app_metadata.member_id as string,
          role: user.app_metadata.role as TenantContext['role'],
          userId: user.id,
        })
      } else {
        setContext(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return { context, loading }
}
