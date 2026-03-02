/**
 * AI-powered movement summarization and classification using Claude API.
 * Used in alert emails and case detail pages.
 * Fire-and-forget — never blocks the main flow.
 */

import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  if (!_client) {
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

interface MovementInput {
  movement_date: string
  description: string
  type?: string | null
}

interface MovementSummaryResult {
  summary: string
  classifications: Array<{
    movement_date: string
    category: string
    importance: 'alta' | 'media' | 'baixa'
    one_liner: string
  }>
}

/**
 * Summarizes a batch of movements and classifies each one.
 * Returns null if AI is not configured or fails.
 */
export async function summarizeMovements(
  movements: MovementInput[],
  context?: {
    cnj?: string
    tribunal?: string
    area?: string
    classe?: string
    assunto?: string
  }
): Promise<MovementSummaryResult | null> {
  const client = getClient()
  if (!client || movements.length === 0) return null

  const movementsList = movements
    .slice(0, 10)
    .map((m, i) => `${i + 1}. [${m.movement_date}] ${m.description}`)
    .join('\n')

  const contextStr = context
    ? `Processo: ${context.cnj ?? 'N/A'} | Tribunal: ${context.tribunal ?? 'N/A'} | Área: ${context.area ?? 'N/A'} | Classe: ${context.classe ?? 'N/A'} | Assunto: ${context.assunto ?? 'N/A'}`
    : ''

  const prompt = `Você é um assistente jurídico brasileiro especializado em análise de movimentações processuais.

${contextStr ? `Contexto do processo:\n${contextStr}\n` : ''}
Movimentações recentes:
${movementsList}

Responda em JSON com esta estrutura exata (sem markdown, sem backticks):
{
  "summary": "Resumo geral de 2-3 frases em linguagem simples explicando o que aconteceu no processo. Evite jargão desnecessário. Seja direto e informativo.",
  "classifications": [
    {
      "movement_date": "data da movimentação",
      "category": "uma de: sentenca | decisao | despacho | citacao | intimacao | peticao | recurso | audiencia | pericia | cumprimento | distribuicao | outros",
      "importance": "alta | media | baixa",
      "one_liner": "Frase curta de no máximo 15 palavras resumindo esta movimentação específica"
    }
  ]
}

Critérios de importância:
- alta: sentenças, decisões com impacto (tutela, bloqueio, penhora), audiências designadas
- media: despachos relevantes, intimações, petições das partes
- baixa: juntadas de documentos, certidões, atos ordinatórios

Retorne APENAS o JSON, sem texto antes ou depois.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim()) as MovementSummaryResult
    return parsed
  } catch (err) {
    console.error('[ai-summarizer] Failed to summarize movements:', err)
    return null
  }
}

/**
 * Generates an AI narrative analysis for a client's legal exposure score.
 */
export async function generateExposureAnalysis(
  scoreResult: {
    score: number
    level: string
    factors: Array<{ name: string; raw: number; detail: string }>
    summary: {
      total_cases: number
      active_cases: number
      total_valor_ativo: number
      cases_provavel: number
      cases_critico_alto: number
      cases_passiva: number
      cases_execucao: number
      areas: Record<string, number>
      max_valor: number
    }
  },
  clientName: string
): Promise<string | null> {
  const client = getClient()
  if (!client) return null

  const factorLines = scoreResult.factors
    .map((f) => `- ${f.name}: ${Math.round(f.raw)}/100 — ${f.detail}`)
    .join('\n')

  const areaLines = Object.entries(scoreResult.summary.areas)
    .map(([area, count]) => `${area}: ${count} caso(s)`)
    .join(', ')

  const valorFormatted = scoreResult.summary.total_valor_ativo.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
  })

  const prompt = `Voce e um advogado senior especializado em gestao de risco juridico empresarial.

Analise a carteira de processos do cliente "${clientName}" e forneca uma analise de risco objetiva.

Score de Exposicao: ${scoreResult.score}/100 (${scoreResult.level})

Fatores de risco calculados:
${factorLines}

Portfolio resumido:
- Total de processos: ${scoreResult.summary.total_cases} (${scoreResult.summary.active_cases} ativos)
- Valor total das causas ativas: R$ ${valorFormatted}
- Causas com probabilidade provavel: ${scoreResult.summary.cases_provavel}
- Causas de risco alto/critico: ${scoreResult.summary.cases_critico_alto}
- Causas passivas (reu): ${scoreResult.summary.cases_passiva}
- Causas em fase de execucao: ${scoreResult.summary.cases_execucao}
- Areas: ${areaLines || 'N/A'}

Escreva uma analise narrativa em 3-4 paragrafos curtos cobrindo:
1. Avaliacao geral do nivel de exposicao juridica
2. Principais fatores de risco identificados (cite numeros concretos)
3. Areas de maior preocupacao e por que
4. Recomendacoes praticas de gestao de risco

Use linguagem direta e objetiva. Evite jargao excessivo. Seja especifico com os numeros.
Retorne apenas o texto da analise, sem titulos ou formatacao markdown.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('[ai-summarizer] Failed to generate exposure analysis:', err)
    return null
  }
}

/**
 * Generates a complete case timeline summary from all movements.
 * Used on the case detail page.
 */
export async function generateCaseTimeline(
  movements: MovementInput[],
  context: {
    cnj: string
    tribunal?: string
    area?: string
    classe?: string
    assunto?: string
    partes?: string
    valor_causa?: string
    data_distribuicao?: string
  }
): Promise<string | null> {
  const client = getClient()
  if (!client || movements.length === 0) return null

  const movementsList = movements
    .slice(0, 30)
    .map((m, i) => `${i + 1}. [${m.movement_date}] ${m.description}`)
    .join('\n')

  const prompt = `Você é um assistente jurídico brasileiro. Analise as movimentações deste processo e gere um resumo executivo completo.

Dados do processo:
- CNJ: ${context.cnj}
- Tribunal: ${context.tribunal ?? 'N/A'}
- Área: ${context.area ?? 'N/A'}
- Classe: ${context.classe ?? 'N/A'}
- Assunto: ${context.assunto ?? 'N/A'}
- Partes: ${context.partes ?? 'N/A'}
- Valor da causa: ${context.valor_causa ?? 'N/A'}
- Distribuição: ${context.data_distribuicao ?? 'N/A'}

Movimentações (da mais recente para a mais antiga):
${movementsList}

Gere um resumo executivo do caso em 4-6 parágrafos curtos cobrindo:
1. Do que se trata o processo (partes, objeto, valor)
2. Marcos importantes (distribuição, citação, contestação, audiências, perícias)
3. Decisões relevantes (tutelas, liminares, sentenças)
4. Status atual e próximos passos prováveis

Use linguagem clara e objetiva. Evite jargão desnecessário. Formate datas como DD/MM/AAAA.
Retorne apenas o texto do resumo, sem títulos ou formatação markdown.`

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('[ai-summarizer] Failed to generate timeline:', err)
    return null
  }
}
