import Link from 'next/link'
import { createTenantClient } from '@/lib/supabase/tenant'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/movement-classifier'
import { Badge } from '@/components/ui/badge'
import { Bell, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MovementListProps {
  caseId: string
  tenantId: string
  userId: string
  activeCategory?: string
  caseSlug: string
  lastCheckedAt: string | null
}

const VISIBLE_CATEGORIES = ['sentenca', 'decisao', 'despacho', 'peticao', 'recurso', 'audiencia']
const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS).filter((k) => k !== 'todos')

export async function MovementList({
  caseId,
  tenantId,
  userId,
  activeCategory,
  caseSlug,
  lastCheckedAt,
}: MovementListProps) {
  const supabase = await createTenantClient(tenantId, userId)

  // Try with category column; fall back to without if migration 009 not applied
  let movements: Array<{
    id: string
    movement_date: string
    description: string
    type: string | null
    category?: string | null
  }> | null = null
  let hasCategory = true

  {
    let query = supabase
      .from('case_movements')
      .select('id, movement_date, description, type, category')
      .eq('case_id', caseId)
      .order('movement_date', { ascending: false })
      .limit(50)

    if (activeCategory && activeCategory !== 'todos') {
      query = query.eq('category', activeCategory)
    }

    const result = await query
    if (result.error) {
      hasCategory = false
      const fallback = await supabase
        .from('case_movements')
        .select('id, movement_date, description, type')
        .eq('case_id', caseId)
        .order('movement_date', { ascending: false })
        .limit(50)
      movements = fallback.data
    } else {
      movements = result.data
    }
  }

  // Get category counts for the pills (only if column exists)
  const countMap: Record<string, number> = {}
  let total = 0
  if (hasCategory) {
    const { data: categoryCounts } = await supabase
      .from('case_movements')
      .select('category')
      .eq('case_id', caseId)

    if (categoryCounts) {
      for (const row of categoryCounts) {
        const cat = row.category ?? 'outros'
        countMap[cat] = (countMap[cat] ?? 0) + 1
        total++
      }
    }
  } else {
    // Count total without category breakdown
    const { count } = await supabase
      .from('case_movements')
      .select('id', { count: 'exact', head: true })
      .eq('case_id', caseId)
    total = count ?? 0
  }

  const hiddenCategories = ALL_CATEGORIES.filter(
    (k) => !VISIBLE_CATEGORIES.includes(k) && (countMap[k] ?? 0) > 0
  )
  const current = activeCategory ?? 'todos'

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Bell size={16} />
          Historico de movimentacoes
          {total > 0 && (
            <Badge variant="secondary" className="ml-1">{total}</Badge>
          )}
        </h2>
      </div>

      {/* Filter pills */}
      {total > 0 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <FilterPill
            href={`/dashboard/cases/${caseSlug}`}
            label="Todas"
            count={total}
            active={current === 'todos'}
          />
          {VISIBLE_CATEGORIES.map((cat) => {
            const count = countMap[cat] ?? 0
            if (count === 0) return null
            return (
              <FilterPill
                key={cat}
                href={`/dashboard/cases/${caseSlug}?category=${cat}`}
                label={CATEGORY_LABELS[cat] ?? cat}
                count={count}
                active={current === cat}
              />
            )
          })}
          {hiddenCategories.length > 0 && (
            <div className="relative group">
              <button
                type="button"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors
                  ${hiddenCategories.includes(current)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
              >
                +{hiddenCategories.length} mais
                <ChevronDown size={12} />
              </button>
              <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:flex flex-col bg-popover border rounded-lg shadow-lg p-1 min-w-[140px]">
                {hiddenCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/dashboard/cases/${caseSlug}?category=${cat}`}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      current === cat
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat} ({countMap[cat] ?? 0})
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movement items */}
      {movements && movements.length > 0 ? (
        <div className="space-y-2">
          {movements.map((mov) => {
            const cat = mov.category ?? 'outros'
            const colorClass = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.outros
            return (
              <div key={mov.id} className="rounded-lg border bg-card px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide ${colorClass}`}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    </div>
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
            )
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <Bell size={28} className="text-muted-foreground/30 mx-auto mb-3" />
          {activeCategory && activeCategory !== 'todos' ? (
            <>
              <p className="font-medium">Nenhuma movimentacao de tipo &quot;{CATEGORY_LABELS[activeCategory] ?? activeCategory}&quot;</p>
              <p className="text-sm text-muted-foreground mt-1">
                <Link href={`/dashboard/cases/${caseSlug}`} className="text-primary hover:underline">
                  Ver todas as movimentacoes
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="font-medium">Nenhuma movimentacao registrada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                {lastCheckedAt
                  ? 'Aguarde — o Litix esta buscando as movimentacoes.'
                  : 'Clique em "Atualizar" para buscar os dados agora.'}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function FilterPill({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
      }`}
    >
      {label}
      <span className={`text-[10px] ${active ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
        {count}
      </span>
    </Link>
  )
}
