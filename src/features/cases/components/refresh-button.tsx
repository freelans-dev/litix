'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface RefreshButtonProps {
  caseId: string
  cnj: string
}

export function RefreshButton({ caseId, cnj }: RefreshButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleRefresh() {
    startTransition(async () => {
      const res = await fetch(`/api/v1/cases/${caseId}/refresh`, {
        method: 'POST',
      })

      if (!res.ok) {
        toast.error('Erro ao consultar processo')
        return
      }

      toast.success('Consulta iniciada. Aguardando resultados...')
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isPending}
      className="gap-1.5"
    >
      <RefreshCw size={15} className={isPending ? 'animate-spin' : ''} />
      Consultar
    </Button>
  )
}
