'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function MarkAllReadButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleMarkAllRead() {
    setLoading(true)
    try {
      await fetch('/api/v1/alerts', {
        method: 'PATCH',
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkAllRead}
      disabled={loading}
    >
      <CheckCheck size={14} className="mr-1.5" />
      {loading ? 'Marcando...' : 'Marcar todos como lidos'}
    </Button>
  )
}
