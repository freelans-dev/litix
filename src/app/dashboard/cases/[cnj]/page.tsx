import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Badge } from '@/components/ui/badge'
import { MonitorToggle } from '@/features/cases/components/monitor-toggle'
import { RefreshButton } from '@/features/cases/components/refresh-button'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Scale,
  User,
  Users,
  Gavel,
  TrendingUp,
  MapPin,
  DollarSign,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ cnj: string }>
}): Promise<Metadata> {
  const { cnj } = await props.params
  return { title: `Processo ${formatCNJ(cnj)} — Litix` }
}

type Parte = { nome: string; lado: string; documento?: string; tipo_pessoa?: string }

export default async function CaseDetailPage(props: {
  params: Promise<{ cnj: string }>
}) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  const supabase = createServiceClient()

  const [{ data: caseData }, { data: movements }] = await Promise.all([
    supabase
      .from('monitored_cases')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .eq('cnj', cnj)
      .maybeSingle(),
    supabase
      .from('case_movements')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .order('movement_date', { ascending: false })
      .limit(50)
      .then(async (r) => {
        // Will be filtered by case_id after we have caseData
        return r
      }),
  ])

  if (!caseData) notFound()

  // Load movements scoped to this case
  const { data: caseMovements } = await supabase
    .from('case_movements')
    .select('*')
    .eq('case_id', caseData.id)
    .order('movement_date', { ascending: false })
    .limit(50)

  const partes = (caseData.partes_json as Parte[] | null) ?? []
  const autores = partes.filter((p) => ['autor', 'requerente', 'impetrante'].includes(p.lado))
  const reus = partes.filter((p) => ['réu', 'reu', 'requerido', 'impetrado'].includes(p.lado))
  const outros = partes.filter((p) => !['autor', 'requerente', 'impetrante', 'réu', 'reu', 'requerido', 'impetrado'].includes(p.lado))

  const statusColor: Record<string, string> = {
    ativo: 'bg-success/10 text-success border-success/30',
    finalizado: 'bg-muted text-muted-foreground border-border',
    arquivado: 'bg-muted text-muted-foreground border-border',
    suspenso: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    cancelado: 'bg-destructive/10 text-destructive border-destructive/30',
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/cases"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            Processos
          </Link>
          <h1 className="text-xl font-bold font-mono tracking-wide">
            {formatCNJ(caseData.cnj)}
          </h1>
          {caseData.nome && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">{caseData.nome}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {caseData.tribunal && (
              <Badge variant="outline" className="text-xs">{caseData.tribunal}</Badge>
            )}
            {caseData.area && (
              <Badge variant="outline" className="text-xs capitalize">{caseData.area}</Badge>
            )}
            {caseData.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[caseData.status] ?? statusColor.ativo}`}>
                {caseData.status.charAt(0).toUpperCase() + caseData.status.slice(1)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <RefreshButton caseId={caseData.id} cnj={caseData.cnj} />
          <MonitorToggle caseId={caseData.id} enabled={caseData.monitor_enabled} />
        </div>
      </div>

      {/* Info grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {caseData.juiz && (
          <InfoCard icon={<Gavel size={14} />} label="Juiz" value={caseData.juiz} />
        )}
        {caseData.assunto_principal && (
          <InfoCard icon={<Scale size={14} />} label="Assunto" value={caseData.assunto_principal} />
        )}
        {caseData.data_distribuicao && (
          <InfoCard
            icon={<Calendar size={14} />}
            label="Distribuição"
            value={format(new Date(caseData.data_distribuicao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          />
        )}
        {caseData.valor_causa && (
          <InfoCard
            icon={<DollarSign size={14} />}
            label="Valor da causa"
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caseData.valor_causa)}
          />
        )}
        {caseData.comarca && (
          <InfoCard icon={<MapPin size={14} />} label="Comarca" value={caseData.comarca} />
        )}
        <InfoCard
          icon={<Clock size={14} />}
          label="Última consulta"
          value={
            caseData.last_checked_at
              ? formatDistanceToNow(new Date(caseData.last_checked_at), { addSuffix: true, locale: ptBR })
              : 'Nunca consultado'
          }
        />
        <InfoCard
          icon={<FileText size={14} />}
          label="Provider"
          value={caseData.provider ?? 'Automático'}
        />
        <InfoCard
          icon={<Calendar size={14} />}
          label="Cadastrado em"
          value={format(new Date(caseData.created_at), "d MMM yyyy", { locale: ptBR })}
        />
      </div>

      {/* Monitoring status */}
      <div className={`rounded-lg border p-4 flex items-center gap-3 ${
        caseData.monitor_enabled ? 'border-success/30 bg-success/5' : 'border-border bg-muted/30'
      }`}>
        {caseData.monitor_enabled ? (
          <>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
            </span>
            <p className="text-sm">
              <span className="font-medium text-success">Monitoramento ativo.</span>{' '}
              <span className="text-muted-foreground">
                O Litix verifica este processo automaticamente e alertará em até 1 hora após movimentações.
              </span>
            </p>
          </>
        ) : (
          <>
            <BellOff size={16} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Monitoramento pausado. Ative para receber alertas automáticos.
            </p>
          </>
        )}
      </div>

      {/* Partes */}
      {partes.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users size={15} />
            Partes do processo
          </h2>

          {autores.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Polo Ativo
              </p>
              {autores.map((p, i) => <ParteItem key={i} parte={p} />)}
            </div>
          )}

          {reus.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Polo Passivo
              </p>
              {reus.map((p, i) => <ParteItem key={i} parte={p} />)}
            </div>
          )}

          {outros.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Outros
              </p>
              {outros.map((p, i) => <ParteItem key={i} parte={p} />)}
            </div>
          )}
        </div>
      )}

      {/* Movimentações */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell size={16} />
            Histórico de movimentações
            {caseMovements && caseMovements.length > 0 && (
              <Badge variant="secondary" className="ml-1">{caseMovements.length}</Badge>
            )}
          </h2>
        </div>

        {caseMovements && caseMovements.length > 0 ? (
          <div className="space-y-2">
            {caseMovements.map((mov) => (
              <div key={mov.id} className="rounded-lg border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">{mov.description}</p>
                    {mov.type && (
                      <p className="text-xs text-muted-foreground mt-0.5">{mov.type}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {format(new Date(mov.movement_date), "d MMM yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center">
            <Bell size={28} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-medium">Nenhuma movimentação registrada ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              {caseData.last_checked_at
                ? 'Aguarde — o Litix está buscando as movimentações.'
                : 'Clique em "Atualizar" para buscar os dados agora.'}
            </p>
          </div>
        )}
      </div>

      {/* Providers */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ExternalLink size={14} />
          Providers de dados
        </h2>
        <div className="flex flex-wrap gap-2">
          {['DataJud', 'Codilo', 'Escavador', 'Judit', 'Predictus'].map((p) => (
            <span
              key={p}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                caseData.provider === p.toLowerCase()
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {p}
              {caseData.provider === p.toLowerCase() && (
                <span className="ml-1 text-[10px]">(principal)</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

function ParteItem({ parte }: { parte: Parte }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b last:border-0">
      <User size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{parte.nome}</p>
        {parte.documento && (
          <p className="text-xs text-muted-foreground">
            {parte.documento.length === 11 ? 'CPF' : 'CNPJ'}: {parte.documento}
          </p>
        )}
      </div>
    </div>
  )
}
