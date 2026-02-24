'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RadioTower, Radio } from 'lucide-react'
import { toast } from 'sonner'

interface MonitorToggleProps {
  caseId: string
  enabled: boolean
}

export function MonitorToggle({ caseId, enabled: initialEnabled }: MonitorToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/v1/cases/${caseId}/monitor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monitor_enabled: !enabled }),
      })

      if (!res.ok) {
        toast.error('Erro ao atualizar monitoramento')
        return
      }

      setEnabled((prev) => !prev)
      toast.success(enabled ? 'Monitoramento pausado' : 'Monitoramento ativado')
    })
  }

  return (
    <Button
      variant={enabled ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={isPending}
      className="gap-1.5"
    >
      {enabled ? (
        <>
          <RadioTower size={15} />
          Monitorando
        </>
      ) : (
        <>
          <Radio size={15} />
          Ativar
        </>
      )}
    </Button>
  )
}
