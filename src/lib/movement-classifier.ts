/**
 * Deterministic movement classifier for Brazilian legal proceedings.
 * Keyword-based regex matching — no AI, no cost.
 * Must stay in sync with supabase/migrations/009_movement_categories.sql
 */

const RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /sentença|sentenca/i, category: 'sentenca' },
  { pattern: /decisão|decisao|tutela|liminar/i, category: 'decisao' },
  { pattern: /despacho|conclusos/i, category: 'despacho' },
  { pattern: /citação|citacao|citado/i, category: 'citacao' },
  { pattern: /intimação|intimacao|intimado/i, category: 'intimacao' },
  { pattern: /petição|peticao|juntada/i, category: 'peticao' },
  { pattern: /recurso|apelação|apelacao|agravo|embargos/i, category: 'recurso' },
  { pattern: /audiência|audiencia|pauta/i, category: 'audiencia' },
  { pattern: /perícia|pericia|perito|laudo/i, category: 'pericia' },
  { pattern: /cumprimento|execução|execucao|penhora|bloqueio|arresto/i, category: 'cumprimento' },
  { pattern: /distribuição|distribuicao|redistribu/i, category: 'distribuicao' },
]

export function classifyMovement(type: string | null, description: string): string {
  const text = `${type ?? ''} ${description}`.toLowerCase()
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.category
  }
  return 'outros'
}

export const CATEGORY_LABELS: Record<string, string> = {
  todos: 'Todas',
  sentenca: 'Sentença',
  decisao: 'Decisão',
  despacho: 'Despacho',
  citacao: 'Citação',
  intimacao: 'Intimação',
  peticao: 'Petição',
  recurso: 'Recurso',
  audiencia: 'Audiência',
  pericia: 'Perícia',
  cumprimento: 'Cumprimento',
  distribuicao: 'Distribuição',
  outros: 'Outros',
}

export const CATEGORY_COLORS: Record<string, string> = {
  sentenca: 'bg-red-100 text-red-700 border-red-200',
  decisao: 'bg-orange-100 text-orange-700 border-orange-200',
  despacho: 'bg-blue-100 text-blue-700 border-blue-200',
  citacao: 'bg-violet-100 text-violet-700 border-violet-200',
  intimacao: 'bg-amber-100 text-amber-700 border-amber-200',
  peticao: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  recurso: 'bg-pink-100 text-pink-700 border-pink-200',
  audiencia: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  pericia: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  cumprimento: 'bg-rose-100 text-rose-700 border-rose-200',
  distribuicao: 'bg-teal-100 text-teal-700 border-teal-200',
  outros: 'bg-gray-100 text-gray-600 border-gray-200',
}
