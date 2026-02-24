'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Eye, EyeOff, Copy } from 'lucide-react'
import type { Database } from '@/types/database'

type Endpoint = Database['public']['Tables']['webhook_endpoints']['Row']

interface WebhookListProps {
  endpoints: Endpoint[]
}

export function WebhookList({ endpoints: initial }: WebhookListProps) {
  const [endpoints, setEndpoints] = useState(initial)
  const [revealedId, setRevealedId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Remover este webhook? Esta ação não pode ser desfeita.')) return

    const res = await fetch(`/api/v1/webhooks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast.error('Erro ao remover webhook')
      return
    }

    setEndpoints((prev) => prev.filter((e) => e.id !== id))
    toast.success('Webhook removido')
  }

  async function handleToggle(endpoint: Endpoint) {
    const res = await fetch(`/api/v1/webhooks/${endpoint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !endpoint.is_active }),
    })

    if (!res.ok) {
      toast.error('Erro ao atualizar webhook')
      return
    }

    const updated = await res.json()
    setEndpoints((prev) => prev.map((e) => (e.id === endpoint.id ? updated : e)))
    toast.success(endpoint.is_active ? 'Webhook desativado' : 'Webhook ativado')
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret)
    toast.success('Secret copiado!')
  }

  const EVENT_LABELS: Record<string, string> = {
    'process.movement': 'Movimentação',
    'process.deadline': 'Prazo',
    'process.status': 'Status',
  }

  return (
    <div className="space-y-3">
      {endpoints.map((ep) => (
        <div key={ep.id} className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{ep.name}</span>
                <Badge variant={ep.is_active ? 'default' : 'secondary'} className="text-xs">
                  {ep.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {ep.url}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggle(ep)}
                className="text-xs"
              >
                {ep.is_active ? 'Pausar' : 'Ativar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(ep.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Events */}
          <div className="flex flex-wrap gap-1.5">
            {ep.events.map((evt) => (
              <Badge key={evt} variant="outline" className="text-xs">
                {EVENT_LABELS[evt] ?? evt}
              </Badge>
            ))}
          </div>

          {/* Secret */}
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50">
            <code className="text-xs font-mono flex-1 overflow-hidden">
              {revealedId === ep.id ? ep.secret : '•'.repeat(32)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setRevealedId(revealedId === ep.id ? null : ep.id)}
            >
              {revealedId === ep.id ? <EyeOff size={13} /> : <Eye size={13} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => copySecret(ep.secret)}
            >
              <Copy size={13} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
