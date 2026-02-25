'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Pencil } from 'lucide-react'
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
  'Contencioso',
  'Consultivo',
  'Trabalhista',
  'Tributario',
  'Familia',
  'Criminal',
  'Empresarial',
  'Outro',
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
  cliente: z.string().max(200).optional(),
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

export function EditOfficeDataSheet({ caseData }: { caseData: CaseData }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente: caseData.cliente ?? '',
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

    // Build PATCH body with only non-empty changed fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {}

    if (data.cliente) body.cliente = data.cliente
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
                <Label htmlFor="cliente">Nome do cliente</Label>
                <Input id="cliente" placeholder="Ex: Empresa ABC Ltda" {...register('cliente')} />
                {errors.cliente && (
                  <p className="text-xs text-destructive">{errors.cliente.message}</p>
                )}
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
                  <Input
                    id="provisionamento"
                    placeholder="50.000,00"
                    {...register('provisionamento')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reserva">Reserva (R$)</Label>
                  <Input
                    id="reserva"
                    placeholder="10.000,00"
                    {...register('reserva')}
                  />
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
