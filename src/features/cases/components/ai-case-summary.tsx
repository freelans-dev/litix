'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AiCaseSummaryProps {
  cnj: string
}

export function AiCaseSummary({ cnj }: AiCaseSummaryProps) {
  const [timeline, setTimeline] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/cases/${cnj}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'timeline' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao gerar resumo')
      }
      const data = await res.json()
      setTimeline(data.timeline)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  if (timeline) {
    return (
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles size={15} className="text-blue-500" />
            Resumo Inteligente
          </h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Gerado por IA
          </span>
        </div>
        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
          {timeline}
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
          onClick={handleGenerate}
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
