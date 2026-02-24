'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function UpgradeButton({ plan }: { plan: 'solo' | 'escritorio' | 'pro' }) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)

    const res = await fetch('/api/v1/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao iniciar checkout')
      setLoading(false)
      return
    }

    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <Button size="sm" onClick={handleUpgrade} disabled={loading} className="gap-1.5 shrink-0">
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          Fazer upgrade
          <ArrowRight size={14} />
        </>
      )}
    </Button>
  )
}
