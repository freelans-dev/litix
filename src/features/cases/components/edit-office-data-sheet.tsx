'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Pencil, Search, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'

const SETORES = [
  'Contencioso', 'Consultivo', 'Trabalhista', 'Tributario',
  'Familia', 'Criminal', 'Empresarial', 'Outro',
]

const CONTINGENCIAS = [
  { value: 'ativa', label: 'Ativa' },
  { value: 'passiva', label: 'Passiva' },
]

const PROBABILIDADES = [
  { value: 'provavel', label: 'Provavel' },
  { value: 'possivel', label: 'Possivel' },
  { value: 'remota', label: 'Remota' },
]

const RISCOS = [
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
  { value: 'critico', label: 'Critico' },
]

const formSchema = z.object({
  relacionamento: z.string().max(200).optional(),
  responsavel: z.string().max(200).optional(),
  setor: z.string().max(100).optional(),
  contingencia: z.enum(['ativa', 'passiva', '']).optional(),
  probabilidade: z.enum(['provavel', 'possivel', 'remota', '']).optional(),
  risco: z.enum(['baixo', 'medio', 'alto', 'critico', '']).optional(),
  faixa: z.string().max(100).optional(),
  provisionamento: z.string().optional(),
  reserva: z.string().optional(),
  resultado: z.string().max(500).optional(),
  desfecho: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

type FormData = z.infer<typeof formSchema>

type Client = { id: string; name: string; documento?: string; tipo_pessoa?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CaseData = Record<string, any>

function parseCurrency(value: string): number | undefined {
  if (!value) return undefined
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? undefined : num
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null || value === 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function ClientCombobox({
  selectedId,
  selectedName,
  onSelect,
}: {
  selectedId: string | null
  selectedName: string
  onSelect: (id: string | null, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDocumento, setNewDocumento] = useState('')
  const [creating, setCreating] = useState(false)

  const searchClients = useCallback(async (q: string) => {
    if (q.length < 2) { setClients([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/clients?q=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const json = await res.json()
        setClients(json.data ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchClients(query), 300)
    return () => clearTimeout(timer)
  }, [query, searchClients])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { name: newName.trim() }
      if (newDocumento.trim()) body.documento = newDocumento.replace(/\D/g, '')

      const res = await fetch('/api/v1/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const client = await res.json()
        onSelect(client.id, client.name)
        setShowCreate(false)
        setShowDropdown(false)
        setNewName('')
        setNewDocumento('')
        toast.success('Cliente criado')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? 'Erro ao criar cliente')
      }
    } catch { toast.error('Erro de conexao') }
    setCreating(false)
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <span className="text-sm flex-1 truncate">{selectedName}</span>
        <button
          type="button"
          onClick={() => onSelect(null, '')}
          className="text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente por nome..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
          onFocus={() => setShowDropdown(true)}
          className="pl-9"
        />
      </div>
      {showDropdown && (query.length >= 2 || showCreate) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Buscando...</div>
          )}
          {!loading && clients.length === 0 && query.length >= 2 && !showCreate && (
            <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum cliente encontrado</div>
          )}
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => {
                onSelect(c.id, c.name)
                setQuery('')
                setShowDropdown(false)
              }}
            >
              <span className="font-medium">{c.name}</span>
              {c.documento && (
                <span className="text-xs text-muted-foreground ml-2">
                  {c.documento.length === 11 ? 'CPF' : 'CNPJ'}: {c.documento}
                </span>
              )}
            </button>
          ))}
          {!showCreate ? (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent transition-colors flex items-center gap-1.5 border-t"
              onClick={() => { setShowCreate(true); setNewName(query) }}
            >
              <Plus size={13} />
              Criar novo cliente
            </button>
          ) : (
            <div className="p-3 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Novo cliente</p>
              <Input
                placeholder="Nome"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="CPF ou CNPJ (opcional)"
                value={newDocumento}
                onChange={(e) => setNewDocumento(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={creating || !newName.trim()}
                  onClick={handleCreate}
                  className="gap-1"
                >
                  {creating && <Loader2 size={12} className="animate-spin" />}
                  Criar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function EditOfficeDataSheet({ caseData }: { caseData: CaseData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(caseData.client_id ?? null)
  const [selectedClientName, setSelectedClientName] = useState<string>(caseData.cliente ?? '')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      relacionamento: caseData.relacionamento ?? '',
      responsavel: caseData.responsavel ?? '',
      setor: caseData.setor ?? '',
      contingencia: caseData.contingencia ?? '',
      probabilidade: caseData.probabilidade ?? '',
      risco: caseData.risco ?? '',
      faixa: caseData.faixa ?? '',
      provisionamento: formatCurrency(caseData.provisionamento),
      reserva: formatCurrency(caseData.reserva),
      resultado: caseData.resultado ?? '',
      desfecho: caseData.desfecho ?? '',
      notes: caseData.notes ?? '',
    },
  })

  const notesValue = watch('notes') ?? ''

  async function onSubmit(data: FormData) {
    setSaving(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {}

    // Client selection
    if (selectedClientId !== (caseData.client_id ?? null)) {
      body.client_id = selectedClientId
    }

    if (data.relacionamento) body.relacionamento = data.relacionamento
    if (data.responsavel) body.responsavel = data.responsavel
    if (data.setor) body.setor = data.setor
    if (data.contingencia) body.contingencia = data.contingencia
    if (data.probabilidade) body.probabilidade = data.probabilidade
    if (data.risco) body.risco = data.risco
    if (data.faixa) body.faixa = data.faixa
    if (data.resultado) body.resultado = data.resultado
    if (data.desfecho) body.desfecho = data.desfecho
    if (data.notes !== undefined) body.notes = data.notes || null

    const prov = parseCurrency(data.provisionamento ?? '')
    if (prov !== undefined) body.provisionamento = prov

    const res = parseCurrency(data.reserva ?? '')
    if (res !== undefined) body.reserva = res

    if (Object.keys(body).length === 0) {
      toast.info('Nenhum campo alterado')
      setSaving(false)
      return
    }

    try {
      const response = await fetch(`/api/v1/cases/${caseData.cnj}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        toast.error(err.error ?? 'Erro ao salvar dados')
        setSaving(false)
        return
      }

      toast.success('Dados do escritorio atualizados')
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Erro de conexao. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil size={13} />
        Editar
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar dados do escritorio</SheetTitle>
            <SheetDescription>
              Preencha os campos internos do seu escritorio para este processo.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="px-4 space-y-6">
            {/* Secao: Cliente */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Cliente
              </legend>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <ClientCombobox
                  selectedId={selectedClientId}
                  selectedName={selectedClientName}
                  onSelect={(id, name) => {
                    setSelectedClientId(id)
                    setSelectedClientName(name)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relacionamento">Relacionamento</Label>
                <Input id="relacionamento" placeholder="Ex: Contrato mensal" {...register('relacionamento')} />
              </div>
            </fieldset>

            {/* Secao: Equipe */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Equipe
              </legend>
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsavel</Label>
                <Input id="responsavel" placeholder="Nome do advogado responsavel" {...register('responsavel')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setor">Setor</Label>
                <Select
                  value={watch('setor') ?? ''}
                  onValueChange={(val) => setValue('setor', val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {SETORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* Secao: Risco e Contingencia */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Risco e Contingencia
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Contingencia</Label>
                  <Select
                    value={watch('contingencia') ?? ''}
                    onValueChange={(val) => setValue('contingencia', val as FormData['contingencia'])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTINGENCIAS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select
                    value={watch('probabilidade') ?? ''}
                    onValueChange={(val) => setValue('probabilidade', val as FormData['probabilidade'])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBABILIDADES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Risco</Label>
                  <Select
                    value={watch('risco') ?? ''}
                    onValueChange={(val) => setValue('risco', val as FormData['risco'])}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {RISCOS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faixa">Faixa de valor</Label>
                  <Input id="faixa" placeholder="Ex: R$ 10k - R$ 50k" {...register('faixa')} />
                </div>
              </div>
            </fieldset>

            {/* Secao: Valores */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Valores
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="provisionamento">Provisionamento (R$)</Label>
                  <Input id="provisionamento" placeholder="50.000,00" {...register('provisionamento')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserva">Reserva (R$)</Label>
                  <Input id="reserva" placeholder="10.000,00" {...register('reserva')} />
                </div>
              </div>
            </fieldset>

            {/* Secao: Resultado */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Resultado
              </legend>
              <div className="space-y-2">
                <Label htmlFor="resultado">Resultado</Label>
                <Textarea id="resultado" rows={2} placeholder="Resumo do resultado..." {...register('resultado')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desfecho">Desfecho</Label>
                <Textarea id="desfecho" rows={2} placeholder="Desfecho do caso..." {...register('desfecho')} />
              </div>
            </fieldset>

            {/* Secao: Notas */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Notas
              </legend>
              <div className="space-y-2">
                <Label htmlFor="notes">Observacoes internas</Label>
                <Textarea
                  id="notes"
                  rows={4}
                  placeholder="Anotacoes internas sobre o processo..."
                  {...register('notes')}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {notesValue.length}/2000
                </p>
              </div>
            </fieldset>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={saving} className="w-full gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando...' : 'Salvar alteracoes'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
