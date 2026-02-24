'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)

  async function handleManage() {
    setLoading(true)

    const res = await fetch('/api/v1/billing/portal', { method: 'POST' })
    if (!res.ok) {
      toast.error('Erro ao abrir portal de assinatura')
      setLoading(false)
      return
    }

    const { url } = await res.json()
    window.location.href = url
  }

  return (
    <Button variant="outline" size="sm" onClick={handleManage} disabled={loading} className="gap-1.5 shrink-0">
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <ExternalLink size={14} />
      )}
      Gerenciar
    </Button>
  )
}
