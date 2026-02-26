import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Badge } from '@/components/ui/badge'
import { MonitorToggle } from '@/features/cases/components/monitor-toggle'
import { RefreshButton } from '@/features/cases/components/refresh-button'
import { EditOfficeDataSheet } from '@/features/cases/components/edit-office-data-sheet'
import {
  ArrowLeft,
  Bell,
  BellOff,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Hash,
  Landmark,
  MapPin,
  Scale,
  Shield,
  User,
  Users,
  Gavel,
  DollarSign,
  Building2,
  AlertTriangle,
  BarChart3,
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

type Parte = {
  nome: string
  lado: string
  documento?: string
  tipo_pessoa?: string
  advogados?: Array<{ nome: string; oab?: string }>
}

export default async function CaseDetailPage(props: {
  params: Promise<{ cnj: string }>
}) {
  const { cnj } = await props.params
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  const { data: caseData } = await supabase
    .from('monitored_cases')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('cnj', cnj)
    .maybeSingle()

  if (!caseData) notFound()

  const { data: caseMovements } = await supabase
    .from('case_movements')
    .select('*')
    .eq('case_id', caseData.id)
    .order('movement_date', { ascending: false })
    .limit(50)

  // Fetch team members for the responsavel select
  const { data: teamMembers } = await supabase
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
  const memberUserIds = (teamMembers ?? []).map((m) => m.user_id)
  const { data: memberProfiles } = memberUserIds.length
    ? await supabase.from('profiles').select('id, full_name').in('id', memberUserIds)
    : { data: [] }
  const members = (memberProfiles ?? [])
    .filter((p) => p.full_name)
    .map((p) => ({ id: p.id, name: p.full_name! }))

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

  const completeness = typeof caseData.completeness === 'number' ? caseData.completeness : 0

  return (
    <div className="p-6 space-y-6 max-w-5xl">
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
          {caseData.nome_caso && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">{caseData.nome_caso}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {caseData.tribunal && (
              <Badge variant="outline" className="text-xs">{caseData.tribunal}</Badge>
            )}
            {caseData.area && (
              <Badge variant="outline" className="text-xs capitalize">{caseData.area}</Badge>
            )}
            {caseData.justica && (
              <Badge variant="outline" className="text-xs">{caseData.justica}</Badge>
            )}
            {caseData.instancia && (
              <Badge variant="outline" className="text-xs">{caseData.instancia}a Instancia</Badge>
            )}
            {caseData.fase && (
              <Badge variant="outline" className="text-xs capitalize">{caseData.fase}</Badge>
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

      {/* Completeness bar */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            <BarChart3 size={14} className="text-muted-foreground" />
            <span className="font-medium">Completude dos dados</span>
          </div>
          <span className="text-sm font-bold">{completeness.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              completeness >= 80 ? 'bg-success' : completeness >= 50 ? 'bg-amber-500' : 'bg-destructive'
            }`}
            style={{ width: `${Math.min(completeness, 100)}%` }}
          />
        </div>
        {caseData.dias_sem_mov != null && caseData.dias_sem_mov > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {caseData.dias_sem_mov} dias sem movimentacao
          </p>
        )}
      </div>

      {/* Dados processuais */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Scale size={15} />
          Dados processuais
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {caseData.classe && (
            <InfoCard icon={<FileText size={14} />} label="Classe" value={caseData.classe} />
          )}
          {caseData.assunto_principal && (
            <InfoCard icon={<Scale size={14} />} label="Assunto principal" value={caseData.assunto_principal} />
          )}
          {caseData.classificacao && (
            <InfoCard icon={<Hash size={14} />} label="Classificacao" value={caseData.classificacao} />
          )}
          {caseData.natureza && (
            <InfoCard icon={<FileText size={14} />} label="Natureza" value={caseData.natureza} />
          )}
          {caseData.juiz && (
            <InfoCard icon={<Gavel size={14} />} label="Juiz" value={caseData.juiz} />
          )}
          {caseData.data_distribuicao && (
            <InfoCard
              icon={<Calendar size={14} />}
              label="Distribuicao"
              value={format(new Date(caseData.data_distribuicao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            />
          )}
          {caseData.valor_causa != null && caseData.valor_causa > 0 && (
            <InfoCard
              icon={<DollarSign size={14} />}
              label="Valor da causa"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caseData.valor_causa)}
            />
          )}
          {caseData.sigilo != null && caseData.sigilo > 0 && (
            <InfoCard icon={<Shield size={14} />} label="Sigilo" value={`Nivel ${caseData.sigilo}`} />
          )}
          {caseData.autor_principal && (
            <InfoCard icon={<User size={14} />} label="Autor principal" value={caseData.autor_principal} />
          )}
          {caseData.reu_principal && (
            <InfoCard icon={<User size={14} />} label="Reu principal" value={caseData.reu_principal} />
          )}
        </div>
      </div>

      {/* Jurisdicao */}
      {(caseData.orgao || caseData.vara || caseData.foro || caseData.estado || caseData.cidade) && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Landmark size={15} />
            Jurisdicao e localizacao
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {caseData.orgao && (
              <InfoCard icon={<Building2 size={14} />} label="Orgao julgador" value={caseData.orgao} />
            )}
            {caseData.vara && (
              <InfoCard icon={<Gavel size={14} />} label="Vara" value={caseData.vara} />
            )}
            {caseData.foro && (
              <InfoCard icon={<MapPin size={14} />} label="Foro/Comarca" value={caseData.foro} />
            )}
            {caseData.estado && (
              <InfoCard icon={<MapPin size={14} />} label="Estado" value={caseData.estado} />
            )}
            {caseData.cidade && (
              <InfoCard icon={<MapPin size={14} />} label="Cidade" value={caseData.cidade} />
            )}
          </div>
        </div>
      )}

      {/* Ultimo andamento */}
      {caseData.ultimo_andamento && (
        <div className="rounded-lg border bg-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock size={15} />
              Ultimo andamento
            </h2>
            {caseData.ultimo_step_date && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(caseData.ultimo_step_date), "d MMM yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed">{caseData.ultimo_andamento}</p>
        </div>
      )}

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
                O Litix verifica este processo automaticamente e alerta em ate 1 hora apos movimentacoes.
              </span>
            </p>
          </>
        ) : (
          <>
            <BellOff size={16} className="text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Monitoramento pausado. Ative para receber alertas automaticos.
            </p>
          </>
        )}
      </div>

      {/* Dados do escritorio */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Briefcase size={15} />
            Dados do escritorio
          </h2>
          <EditOfficeDataSheet caseData={caseData} members={members} />
        </div>
        {(caseData.cliente || caseData.responsavel || caseData.contingencia || caseData.probabilidade || caseData.provisionamento) ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {caseData.cliente && (
              <InfoCard icon={<User size={14} />} label="Cliente" value={caseData.cliente} />
            )}
            {caseData.responsavel && (
              <InfoCard icon={<User size={14} />} label="Responsavel" value={caseData.responsavel} />
            )}
            {caseData.setor && (
              <InfoCard icon={<Building2 size={14} />} label="Setor" value={caseData.setor} />
            )}
            {caseData.contingencia && (
              <InfoCard icon={<AlertTriangle size={14} />} label="Contingencia" value={caseData.contingencia} />
            )}
            {caseData.probabilidade && (
              <InfoCard icon={<BarChart3 size={14} />} label="Probabilidade" value={caseData.probabilidade} />
            )}
            {caseData.risco && (
              <InfoCard icon={<AlertTriangle size={14} />} label="Risco" value={caseData.risco} />
            )}
            {caseData.faixa && (
              <InfoCard icon={<DollarSign size={14} />} label="Faixa de valor" value={caseData.faixa} />
            )}
            {caseData.resultado && (
              <InfoCard icon={<FileText size={14} />} label="Resultado" value={caseData.resultado} />
            )}
            {caseData.desfecho && (
              <InfoCard icon={<FileText size={14} />} label="Desfecho" value={caseData.desfecho} />
            )}
            {caseData.provisionamento != null && caseData.provisionamento > 0 && (
              <InfoCard
                icon={<DollarSign size={14} />}
                label="Provisionamento"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caseData.provisionamento)}
              />
            )}
            {caseData.reserva != null && caseData.reserva > 0 && (
              <InfoCard
                icon={<DollarSign size={14} />}
                label="Reserva"
                value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caseData.reserva)}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum dado preenchido. Clique em &quot;Editar&quot; para adicionar informacoes do escritorio.
          </p>
        )}
      </div>

      {/* Partes */}
      {partes.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users size={15} />
            Partes do processo
            <Badge variant="secondary" className="ml-1">{partes.length}</Badge>
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

      {/* Movimentacoes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Bell size={16} />
            Historico de movimentacoes
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
            <p className="font-medium">Nenhuma movimentacao registrada ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              {caseData.last_checked_at
                ? 'Aguarde — o Litix esta buscando as movimentacoes.'
                : 'Clique em "Atualizar" para buscar os dados agora.'}
            </p>
          </div>
        )}
      </div>

      {/* Metadados */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ExternalLink size={14} />
          Metadados e providers
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <InfoCard
            icon={<FileText size={14} />}
            label="Provider principal"
            value={caseData.provider ?? 'Automatico'}
          />
          <InfoCard
            icon={<Clock size={14} />}
            label="Ultima consulta"
            value={
              caseData.last_checked_at
                ? formatDistanceToNow(new Date(caseData.last_checked_at), { addSuffix: true, locale: ptBR })
                : 'Nunca consultado'
            }
          />
          <InfoCard
            icon={<Calendar size={14} />}
            label="Cadastrado em"
            value={format(new Date(caseData.created_at), "d MMM yyyy", { locale: ptBR })}
          />
          {caseData.movement_count != null && caseData.movement_count > 0 && (
            <InfoCard icon={<Hash size={14} />} label="Movimentacoes" value={String(caseData.movement_count)} />
          )}
          {caseData.request_id && (
            <InfoCard icon={<Hash size={14} />} label="Request ID" value={caseData.request_id} />
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {['DataJud', 'Codilo', 'Escavador', 'Judit', 'Predictus'].map((p) => {
            const mergedFrom = (caseData.merged_from as string[] | null) ?? []
            const isActive = caseData.provider === p.toLowerCase()
            const isMerged = mergedFrom.includes(p.toLowerCase())
            return (
              <span
                key={p}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : isMerged
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {p}
                {isActive && <span className="ml-1 text-[10px]">(principal)</span>}
                {isMerged && !isActive && <span className="ml-1 text-[10px]">(merge)</span>}
              </span>
            )
          })}
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
    <div className="py-2 border-b last:border-0">
      <div className="flex items-start gap-2">
        <User size={13} className="text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{parte.nome}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {parte.documento && (
              <p className="text-xs text-muted-foreground">
                {parte.documento.length === 11 ? 'CPF' : 'CNPJ'}: {parte.documento}
              </p>
            )}
            {parte.tipo_pessoa && (
              <p className="text-xs text-muted-foreground capitalize">{parte.tipo_pessoa}</p>
            )}
          </div>
        </div>
      </div>
      {parte.advogados && parte.advogados.length > 0 && (
        <div className="ml-5 mt-1 space-y-0.5">
          {parte.advogados.map((adv, j) => (
            <p key={j} className="text-xs text-muted-foreground">
              Adv. {adv.nome}{adv.oab ? ` (OAB: ${adv.oab})` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
