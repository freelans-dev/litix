'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check } from 'lucide-react'

export function MarkReadButton({ alertId }: { alertId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMarkRead() {
    setLoading(true)
    try {
      await fetch(`/api/v1/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkRead}
      disabled={loading}
      className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
      title="Marcar como lido"
    >
      <Check size={14} />
    </button>
  )
}
