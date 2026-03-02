'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AiCaseSummaryProps {
  cnj: string
}

interface CachedSummary {
  timeline: string
  generated_at: string
  is_stale?: boolean
  stale_reason?: 'new_movements' | 'expired' | null
  from_cache?: boolean
}

export function AiCaseSummary({ cnj }: AiCaseSummaryProps) {
  const [summary, setSummary] = useState<CachedSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load cached summary on mount
  useEffect(() => {
    async function loadCached() {
      try {
        const res = await fetch(`/api/v1/cases/${cnj}/ai-summary?type=timeline`)
        if (!res.ok) return
        const data = await res.json()
        if (data.cached && data.timeline) {
          setSummary({
            timeline: data.timeline,
            generated_at: data.generated_at,
            is_stale: data.is_stale,
            stale_reason: data.stale_reason,
            from_cache: true,
          })
        }
      } catch {
        // Silent fail — user can still generate manually
      } finally {
        setInitialLoading(false)
      }
    }
    loadCached()
  }, [cnj])

  const handleGenerate = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/cases/${cnj}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'timeline', force }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao gerar resumo')
      }
      const data = await res.json()
      setSummary({
        timeline: data.timeline,
        generated_at: data.generated_at,
        is_stale: false,
        stale_reason: null,
        from_cache: data.from_cache,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [cnj])

  if (initialLoading) {
    return (
      <div className="rounded-lg border border-dashed bg-card/50 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-sm">Carregando resumo...</span>
        </div>
      </div>
    )
  }

  if (summary) {
    const timeAgo = formatDistanceToNow(new Date(summary.generated_at), {
      addSuffix: true,
      locale: ptBR,
    })

    return (
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={15} className="text-blue-500" />
            Resumo Inteligente
          </h2>
          <div className="flex items-center gap-2">
            {summary.is_stale && (
              <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {summary.stale_reason === 'new_movements'
                  ? 'Novas movimentacoes'
                  : 'Resumo antigo'}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} />
              {timeAgo}
            </span>
          </div>
        </div>
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
          {summary.timeline}
        </div>
        <div className="flex items-center justify-between pt-1 border-t">
          <span className="text-[10px] text-muted-foreground">
            Gerado por IA
          </span>
          {summary.is_stale && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              className="h-7 text-xs gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw size={12} />
                  Atualizar resumo
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Gere um resumo inteligente deste processo com IA
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerate(false)}
          disabled={loading}
          className="gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Gerar resumo
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive mt-2">{error}</p>
      )}
    </div>
  )
}
