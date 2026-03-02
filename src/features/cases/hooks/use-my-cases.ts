'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTenantContext } from '@/hooks/use-tenant-context'

export function useMyCases() {
  const { context } = useTenantContext()
  const [caseIds, setCaseIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!context?.memberId) return
    const supabase = createClient()
    supabase
      .from('case_members')
      .select('case_id')
      .eq('member_id', context.memberId)
      .then(({ data }) => {
        setCaseIds(data?.map(r => r.case_id) ?? [])
        setLoading(false)
      })
  }, [context?.memberId])

  return { caseIds, loading }
}
