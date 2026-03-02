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
