'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(80),
  url: z.string().url('URL inválida. Use https://...'),
})

type FormData = z.infer<typeof schema>

const AVAILABLE_EVENTS = [
  { id: 'process.movement', label: 'Nova movimentação' },
  { id: 'process.deadline', label: 'Prazo se aproximando' },
  { id: 'process.status', label: 'Mudança de status' },
]

export function CreateWebhookForm({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['process.movement'])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function toggleEvent(id: string) {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  async function onSubmit(data: FormData) {
    if (selectedEvents.length === 0) {
      toast.error('Selecione ao menos um tipo de evento')
      return
    }

    setLoading(true)

    const res = await fetch('/api/v1/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, events: selectedEvents }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao criar webhook')
      setLoading(false)
      return
    }

    toast.success('Webhook criado com sucesso!')
    reset()
    setSelectedEvents(['process.movement'])
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            placeholder="Ex: Notificação Astrea"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">URL do endpoint</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://meu-sistema.com/webhook"
            {...register('url')}
          />
          {errors.url && (
            <p className="text-xs text-destructive">{errors.url.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Eventos</Label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_EVENTS.map((evt) => {
            const active = selectedEvents.includes(evt.id)
            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => toggleEvent(evt.id)}
                className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {evt.label}
              </button>
            )
          })}
        </div>
      </div>

      <Button type="submit" disabled={loading} size="sm" className="gap-1.5">
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Plus size={14} />
        )}
        Criar webhook
      </Button>
    </form>
  )
}
