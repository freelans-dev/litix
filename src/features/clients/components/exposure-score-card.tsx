'use client'

import { useState, useEffect } from 'react'
import { Loader2, Sparkles, AlertTriangle, ShieldCheck, Shield, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ScoreFactor {
  name: string
  key: string
  weight: number
  raw: number
  weighted: number
  detail: string
}

interface ExposureScoreData {
  score: number
  level: 'baixo' | 'moderado' | 'alto' | 'critico'
  factors: ScoreFactor[]
  case_count: number
  narrative: string | null
}

const LEVEL_CONFIG = {
  baixo: {
    label: 'Baixo',
    color: '#16a34a',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-600',
    Icon: ShieldCheck,
  },
  moderado: {
    label: 'Moderado',
    color: '#f59e0b',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600',
    Icon: Shield,
  },
  alto: {
    label: 'Alto',
    color: '#f97316',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-600',
    Icon: ShieldAlert,
  },
  critico: {
    label: 'Critico',
    color: '#dc2626',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-600',
    Icon: AlertTriangle,
  },
} as const

function ScoreGauge({ score, level }: { score: number; level: keyof typeof LEVEL_CONFIG }) {
  const config = LEVEL_CONFIG[level]
  const fillDeg = (score / 100) * 180

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 140, height: 70, overflow: 'hidden' }}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `conic-gradient(
              from 180deg,
              ${config.color} 0deg,
              ${config.color} ${fillDeg}deg,
              #e2e8f0 ${fillDeg}deg,
              #e2e8f0 180deg,
              transparent 180deg
            )`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
        <div
          className="bg-card"
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            position: 'absolute',
            top: 20,
            left: 20,
          }}
        />
      </div>
      <div className="text-center -mt-1">
        <p className={`text-3xl font-bold tabular-nums ${config.text}`}>{score}</p>
        <p className="text-xs text-muted-foreground mt-0.5">de 100</p>
      </div>
      <Badge variant="outline" className={`text-xs ${config.bg} ${config.border} ${config.text}`}>
        <config.Icon size={11} className="mr-1" />
        Risco {config.label}
      </Badge>
    </div>
  )
}

function FactorBar({ factor }: { factor: ScoreFactor }) {
  const pct = Math.round(factor.raw)
  const barColor =
    pct > 75
      ? 'bg-red-500'
      : pct > 50
        ? 'bg-orange-500'
        : pct > 25
          ? 'bg-amber-500'
          : 'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{factor.name}</span>
        <span className="text-muted-foreground tabular-nums">{pct}/100</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{factor.detail}</p>
    </div>
  )
}

interface ExposureScoreCardProps {
  clientId: string
}

export function ExposureScoreCard({ clientId }: ExposureScoreCardProps) {
  const [data, setData] = useState<ExposureScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/clients/${clientId}/exposure-score`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Erro ao calcular score'))
      .finally(() => setLoading(false))
  }, [clientId])

  async function handleGenerateAI() {
    if (!data) return
    setAiLoading(true)
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/exposure-score?ai=true`)
      if (res.ok) {
        const updated = await res.json()
        setData((prev) => (prev ? { ...prev, narrative: updated.narrative } : prev))
      }
    } catch {
      // silent
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="flex justify-center">
            <div className="w-36 h-24 bg-muted rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-full bg-muted rounded animate-pulse" />
                <div className="h-1.5 w-full bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!data || data.case_count === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Shield size={24} className="mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum processo vinculado para calcular o score.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Shield size={14} />
          Score de Exposicao Juridica
        </h2>
        <span className="text-xs text-muted-foreground">{data.case_count} processos</span>
      </div>

      {/* Gauge + Factors */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="flex flex-col items-center justify-center">
          <ScoreGauge score={data.score} level={data.level} />
        </div>
        <div className="space-y-3">
          {data.factors.map((f) => (
            <FactorBar key={f.key} factor={f} />
          ))}
        </div>
      </div>

      {/* AI Narrative */}
      {data.narrative ? (
        <div className="space-y-2 pt-1 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1.5">
              <Sparkles size={12} className="text-blue-500" />
              Analise de Exposicao (IA)
            </span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Gerado por IA
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
            {data.narrative}
          </p>
        </div>
      ) : (
        <div className="border-t pt-3">
          <div className="flex items-center justify-between rounded-lg border border-dashed bg-card/50 p-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Gere uma analise narrativa com IA
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="gap-1.5 text-xs"
            >
              {aiLoading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Analisar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
