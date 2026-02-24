'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const schema = z.object({
  oab_number: z
    .string()
    .min(3, 'Número OAB inválido')
    .regex(/^\d+$/, 'Apenas números'),
  oab_state: z.string().length(2, 'Selecione o estado'),
})

type FormData = z.infer<typeof schema>

export function OABImportForm({ plan }: { plan: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const isFree = plan === 'free'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)

    const res = await fetch('/api/v1/oab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao iniciar importação')
      setLoading(false)
      return
    }

    setDone(true)
    toast.success('Importação iniciada! Você receberá um email quando concluir.')
    setLoading(false)
  }

  if (isFree) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Importação por OAB disponível no plano Solo ou superior
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300/80 mt-1">
          Faça upgrade para importar todos os seus processos automaticamente.
        </p>
        <Button size="sm" variant="outline" className="mt-3" asChild>
          <Link href="/pricing">Ver planos</Link>
        </Button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-5 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Download size={18} className="text-success" />
        </div>
        <p className="font-medium">Importação iniciada com sucesso!</p>
        <p className="text-sm text-muted-foreground">
          Você receberá um email quando a importação estiver completa. Os processos
          aparecerão na lista conforme forem sendo cadastrados.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDone(false)}
          className="mt-2"
        >
          Importar outra OAB
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <Label htmlFor="oab_number">Número OAB</Label>
          <Input
            id="oab_number"
            placeholder="123456"
            className="font-mono"
            {...register('oab_number')}
          />
          {errors.oab_number && (
            <p className="text-xs text-destructive">{errors.oab_number.message}</p>
          )}
        </div>
        <div className="w-28 space-y-2">
          <Label htmlFor="oab_state">Estado</Label>
          <select
            id="oab_state"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register('oab_state')}
          >
            <option value="">UF</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          {errors.oab_state && (
            <p className="text-xs text-destructive">{errors.oab_state.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Iniciando importação...
          </>
        ) : (
          <>
            <Download size={15} />
            Importar processos da OAB
          </>
        )}
      </Button>
    </form>
  )
}
