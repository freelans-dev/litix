import type { Metadata } from 'next'
import Link from 'next/link'
import { createTenantClient } from '@/lib/supabase/tenant'
import { getTenantContext } from '@/lib/auth'
import { formatCNJ } from '@/lib/crypto'
import { Button } from '@/components/ui/button'
import { Plus, Search, Radio, RadioTower, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CaseMembersAvatars } from '@/features/cases/components/case-members-avatars'

export const metadata: Metadata = { title: 'Processos' }

// Local type for case_members row with role (until DB types are regenerated)
interface CaseMemberRow {
  member_id: string
  role: string
}

export default async function CasesPage(props: {
  searchParams: Promise<{ q?: string; monitor?: string; mine?: string }>
}) {
  const searchParams = await props.searchParams
  const ctx = await getTenantContext()
  const supabase = await createTenantClient(ctx.tenantId, ctx.userId)

  // Handle mine=true filter: fetch IDs of cases linked to current member
  let myCaseIds: string[] | null = null
  if (searchParams.mine === 'true') {
    const { data: myLinks } = await supabase
      .from('case_members')
      .select('case_id')
      .eq('member_id', ctx.memberId)
    myCaseIds = myLinks?.map(l => l.case_id) ?? []
  }

  // Build base query with case_members join for avatars
  let query = supabase
    .from('monitored_cases')
    .select('*, case_members(member_id, role)')
    .eq('tenant_id', ctx.tenantId)
    .order('created_at', { ascending: false })

  if (searchParams.q) {
    query = query.ilike('cnj', `%${searchParams.q.replace(/\D/g, '')}%`)
  }
  if (searchParams.monitor === 'true') {
    query = query.eq('monitor_enabled', true)
  }
  if (myCaseIds !== null) {
    if (myCaseIds.length > 0) {
      query = query.in('id', myCaseIds)
    } else {
      // Member has no linked cases — skip DB query, return empty
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Processos</h1>
              <p className="text-sm text-muted-foreground mt-0.5">0 processos cadastrados</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/cases/search">
                <Plus size={16} className="mr-1.5" />
                Adicionar
              </Link>
            </Button>
          </div>
          <FilterBar searchParams={searchParams} />
          <EmptyState searchParams={searchParams} isMineFilter />
        </div>
      )
    }
  }

  const { data: cases } = await query.limit(50)
  const count = cases?.length ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Processos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {count} processo{count !== 1 ? 's' : ''} cadastrado{count !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/cases/search">
            <Plus size={16} className="mr-1.5" />
            Adicionar
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <FilterBar searchParams={searchParams} />

      {/* Table */}
      {cases && cases.length > 0 ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Processo (CNJ)
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                  Cliente
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden lg:table-cell">
                  Tribunal
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Monitoramento
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">
                  Responsáveis
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">
                  Última consulta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cases.map((c) => {
                // case_members comes as array from join; type-cast since DB types lack role
                const members = (c.case_members ?? []) as unknown as CaseMemberRow[]
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/cases/${c.cnj}`}
                        className="font-mono text-xs text-foreground hover:text-primary transition-colors cnj"
                      >
                        {formatCNJ(c.cnj)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">
                      {c.cliente ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {c.tribunal ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {c.monitor_enabled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                          </span>
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Radio size={12} />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <CaseMembersAvatars members={members} maxVisible={3} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {c.last_checked_at
                        ? formatDistanceToNow(new Date(c.last_checked_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : 'Nunca'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState searchParams={searchParams} />
      )}
    </div>
  )
}

function FilterBar({
  searchParams,
}: {
  searchParams: { q?: string; monitor?: string; mine?: string }
}) {
  const isAll = !searchParams.monitor && !searchParams.mine
  const isMonitor = searchParams.monitor === 'true'
  const isMine = searchParams.mine === 'true'

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <form className="relative flex-1 min-w-48 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Buscar por CNJ..."
          className="w-full h-9 pl-9 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cnj"
        />
      </form>
      <div className="flex gap-2">
        <Link
          href="/dashboard/cases"
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
            isAll
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          Todos
        </Link>
        <Link
          href="/dashboard/cases?monitor=true"
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
            isMonitor
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <RadioTower size={13} />
          Monitorados
        </Link>
        <Link
          href="/dashboard/cases?mine=true"
          className={`text-sm px-3 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
            isMine
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <User size={13} />
          Meus processos
        </Link>
      </div>
    </div>
  )
}

function EmptyState({
  searchParams,
  isMineFilter = false,
}: {
  searchParams: { q?: string; monitor?: string; mine?: string }
  isMineFilter?: boolean
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-12 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
        <Search size={24} className="text-muted-foreground/40" />
      </div>
      <div>
        <p className="font-medium">
          {searchParams.q
            ? `Nenhum resultado para "${searchParams.q}"`
            : isMineFilter
            ? 'Nenhum processo vinculado a você'
            : 'Nenhum processo ainda'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {searchParams.q
            ? 'Verifique o número CNJ e tente novamente.'
            : isMineFilter
            ? 'Importe processos pelo seu OAB para vinculá-los automaticamente.'
            : 'Cadastre seu OAB para importar automaticamente, ou adicione um processo pelo número CNJ.'}
        </p>
      </div>
      {!searchParams.q && (
        <div className="flex gap-2 justify-center flex-wrap pt-1">
          <Button asChild size="sm">
            <Link href="/dashboard/cases/search">
              <Plus size={14} className="mr-1.5" />
              Buscar por CNJ
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/dashboard/settings/profile">Cadastrar OAB</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
