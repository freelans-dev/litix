'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Search, ArrowLeft, FileText, UserSearch } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentSearchForm } from '@/features/cases/components/document-search-form'

const schema = z.object({
  cnj: z
    .string()
    .min(20, 'Digite o número CNJ completo')
    .regex(
      /[\d]{7}-[\d]{2}\.[\d]{4}\.[\d]\.[\d]{2}\.[\d]{4}|[\d]{20}/,
      'Formato inválido. Exemplo: 0000001-12.2023.8.26.0001'
    ),
  tribunal: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const providers = ['DataJud', 'Codilo', 'Escavador', 'Judit', 'Predictus']

export default function CaseSearchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)

    // Normalize CNJ — strip non-digits then format
    const digits = data.cnj.replace(/\D/g, '')

    const res = await fetch('/api/v1/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnj: digits, tribunal: data.tribunal }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error ?? 'Erro ao cadastrar processo')
      setLoading(false)
      return
    }

    const { cnj } = await res.json()
    toast.success('Processo cadastrado e monitoramento ativado!')
    router.push(`/dashboard/cases/${cnj}`)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/cases"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          Processos
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Adicionar processos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre processos por número CNJ ou busque todos os processos de um CPF/CNPJ.
        </p>
      </div>

      <Tabs defaultValue="cnj" className="space-y-5">
        <TabsList>
          <TabsTrigger value="cnj" className="gap-1.5">
            <FileText size={14} />
            Por CNJ
          </TabsTrigger>
          <TabsTrigger value="documento" className="gap-1.5">
            <UserSearch size={14} />
            Por CPF/CNPJ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cnj" className="space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="cnj">Número do processo (CNJ)</Label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="cnj"
                  className="pl-9 font-mono cnj"
                  placeholder="0000001-12.2023.8.26.0001"
                  autoFocus
                  {...register('cnj')}
                />
              </div>
              {errors.cnj && (
                <p className="text-xs text-destructive">{errors.cnj.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Formato: NNNNNNN-DD.AAAA.J.TT.OOOO (com ou sem pontuação)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribunal">
                Tribunal <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="tribunal"
                placeholder="Ex: TJSP, TRT15, STJ..."
                {...register('tribunal')}
              />
              <p className="text-xs text-muted-foreground">
                Se informado, o Litix priorizará os providers deste tribunal.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <FileText size={15} className="mr-2" />
                  Cadastrar e monitorar
                </>
              )}
            </Button>
          </form>

          {/* Providers info */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Providers consultados automaticamente</h3>
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <Badge key={p} variant="outline" className="text-xs">
                  {p}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ao cadastrar um processo, o Litix consulta todos os providers em paralelo, unifica os
              dados e ativa o monitoramento automático. Você será alertado por email e no dashboard
              quando houver novas movimentações.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="documento" className="space-y-5">
          <DocumentSearchForm plan="solo" />

          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Como funciona</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Digite o CPF de uma pessoa física ou CNPJ de uma empresa. O Litix buscará todos os
              processos onde essa pessoa ou empresa aparece como parte (autor, réu ou interessado).
              Todos os processos encontrados serão importados com monitoramento ativo.
            </p>
          </div>

          {/* OAB import tip */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText size={15} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">É advogado?</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cadastre seu número de OAB para importar todos os seus processos automaticamente.
              </p>
              <Link
                href="/dashboard/settings/profile"
                className="text-sm text-primary font-medium mt-1.5 inline-block hover:underline"
              >
                Importar pela OAB →
              </Link>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
