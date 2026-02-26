'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trash2, Pencil, Building2, User, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  tipo_pessoa: z.enum(['fisica', 'juridica']).optional(),
  documento: z
    .string()
    .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos)')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
})

type FormData = z.infer<typeof schema>

function ClientForm({
  defaultValues,
  onSave,
  onCancel,
  loading,
}: {
  defaultValues?: Partial<FormData>
  onSave: (data: FormData) => Promise<void>
  onCancel: () => void
  loading: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" placeholder="Nome do cliente" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tipo_pessoa">Tipo</Label>
          <select
            id="tipo_pessoa"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('tipo_pessoa')}
          >
            <option value="">Selecione</option>
            <option value="fisica">Pessoa Física</option>
            <option value="juridica">Pessoa Jurídica</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="documento">CPF / CNPJ</Label>
          <Input
            id="documento"
            placeholder="Somente números"
            className="font-mono"
            {...register('documento')}
          />
          {errors.documento && <p className="text-xs text-destructive">{errors.documento.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="contato@empresa.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" placeholder="(11) 99999-9999" {...register('phone')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Anotações internas..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          {...register('notes')}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ClientsPanel({
  initialClients,
  canEdit,
}: {
  initialClients: Client[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [clients, setClients] = useState(initialClients)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.documento ?? '').includes(search.replace(/\D/g, ''))
  )

  async function handleCreate(data: FormData) {
    setLoading(true)
    const body = {
      ...data,
      documento: data.documento ? data.documento.replace(/\D/g, '') : undefined,
    }
    const res = await fetch('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const created = await res.json()
      setClients(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setCreateOpen(false)
      toast.success('Cliente criado')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao criar cliente')
    }
    setLoading(false)
  }

  async function handleEdit(data: FormData) {
    if (!editClient) return
    setLoading(true)
    const body = {
      ...data,
      documento: data.documento ? data.documento.replace(/\D/g, '') : null,
    }
    const res = await fetch(`/api/v1/clients/${editClient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
      setEditClient(null)
      toast.success('Cliente atualizado')
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao atualizar cliente')
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este cliente? Os processos vinculados não serão afetados.')) return
    const res = await fetch(`/api/v1/clients/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setClients(prev => prev.filter(c => c.id !== id))
      toast.success('Cliente removido')
      router.refresh()
    } else {
      toast.error('Erro ao remover cliente')
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2 shrink-0">
            <Plus size={15} />
            Novo cliente
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center space-y-3">
          <Building2 size={36} className="mx-auto text-muted-foreground/40" />
          <div>
            <p className="font-medium">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? 'Tente outro termo de busca.'
                : 'Crie um cliente para vinculá-lo aos processos do escritório.'}
            </p>
          </div>
          {!search && canEdit && (
            <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
              <Plus size={14} />
              Criar primeiro cliente
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(client => (
            <div
              key={client.id}
              className="rounded-lg border bg-card p-4 flex items-center gap-4"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {client.tipo_pessoa === 'juridica'
                  ? <Building2 size={16} className="text-primary" />
                  : <User size={16} className="text-primary" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {client.name}
                  </Link>
                  {client.tipo_pessoa && (
                    <Badge variant="outline" className="text-xs">
                      {client.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {client.documento
                    ? `${client.documento.length === 11 ? 'CPF' : 'CNPJ'}: ${client.documento}`
                    : client.email ?? '—'}
                </p>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditClient(client)}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(client.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <ClientForm
            onSave={handleCreate}
            onCancel={() => setCreateOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={v => { if (!v) setEditClient(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editClient && (
            <ClientForm
              defaultValues={{
                name: editClient.name,
                tipo_pessoa: editClient.tipo_pessoa as 'fisica' | 'juridica' | undefined,
                documento: editClient.documento ?? '',
                email: editClient.email ?? '',
                phone: editClient.phone ?? '',
                notes: editClient.notes ?? '',
              }}
              onSave={handleEdit}
              onCancel={() => setEditClient(null)}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
