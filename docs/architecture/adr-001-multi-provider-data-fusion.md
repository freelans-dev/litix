# ADR-001: Multi-Provider Data Fusion via Progressive Cascade

**Status:** Aceito
**Data:** 2026-02-24
**Autor:** Aria (Architect Agent / AIOS)
**Contexto:** Litix SaaS -- Plataforma de Monitoramento Processual Multi-Provider
**Supersede:** Nenhum (decisao original)
**Relacionados:** ADR-006 (Webhook Delivery com DLQ), ADR-007 (Vercel KV para Caching)

---

## 1. Contexto e Problema

### 1.1 O Problema Fundamental

Nenhum provider individual de dados processuais no Brasil retorna 100% das informacoes de um processo judicial. Cada provider tem cobertura parcial, com lacunas diferentes:

| Provider | Custo | Tribunal | Area | Classe | Juiz | Valor | Partes c/ doc | Movimentacoes | Status | Fase | Anexos |
|----------|-------|----------|------|--------|------|-------|---------------|---------------|--------|------|--------|
| **DataJud** | Gratuito | Sim | Parcial | Sim | Nao | Sim | Parcial | Sim | Nao | Nao | Nao |
| **Codilo** | Pago | Parcial | Sim | Sim | Sim | Sim | Sim | Sim (rico) | Sim (inferido) | Sim (inferido) | Nao |
| **Judit** | Pago | Sim | Sim | Sim | Sim | Sim | Sim | Sim (rico) | Sim | Sim | Sim |
| **Escavador** | Pago | Sim | Sim | Sim | Parcial* | Sim | Sim | Sim | Sim (predito) | Nao | Nao |
| **Predictus** | Pago | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Sim | Nao | Nao |

*Escavador retorna `orgao_julgador` (vara), nao o nome do juiz.*

**DataJud** e a API publica do CNJ. E gratuita e cobre todos os 92 tribunais do pais, mas nao retorna `juiz`, `status`, nem `fase` do processo. **Codilo** cobre tribunais estaduais com dados ricos (incluindo juiz e inferencia de status/fase a partir de movimentacoes). **Judit** e o provider mais completo -- retorna todos os campos incluindo anexos -- mas e async com polling e tem custo por consulta.

O desafio: como orquestrar consultas a multiplos providers para maximizar completude dos dados mantendo o custo sob controle?

### 1.2 Requisitos Derivados

1. **Maximizar completude** -- O `completeness_score` do processo deve ser o mais alto possivel.
2. **Minimizar custo** -- Usar providers pagos apenas quando necessario.
3. **Transparencia de fonte** -- O usuario e o sistema devem saber quais providers contribuiram para cada registro.
4. **Auditoria** -- Dados brutos de cada provider devem ser preservados para debug e compliance.
5. **Webhook com dados unificados** -- O payload de webhook entregue ao cliente deve conter os dados ja fundidos, nao de um provider individual.

### 1.3 Estado Atual do Codigo

O pacote `packages/providers/` ja implementa:

- **5 providers** com interface uniforme (`ILegalDataProvider`) em `src/providers/`
- **OrchestratorService** (`src/services/orchestrator.service.ts`) com estrategias `race`, `fallback`, `primary-only`
- **MergeService** (`src/services/merge.service.ts`) com merge pairwise baseado em completeness score
- **Circuit breakers** por provider para resiliencia
- **Modelo unificado** `ProcessoUnificado` com campo `origem` e `mergedFrom`

O problema: a implementacao atual usa estrategia `race` (consulta paralela a todos) com merge de apenas 2 resultados. Isso tem dois problemas:
1. Consulta providers pagos desnecessariamente quando DataJud ja tem dados suficientes.
2. Descarta resultados do 3o, 4o e 5o provider mesmo quando retornam dados complementares.

---

## 2. Decisao

### 2.1 Estrategia: Cascata Progressiva com Merge Cumulativo

Substituir a estrategia `race` por uma **cascata progressiva** que consulta providers na seguinte ordem fixa, avancando para o proximo apenas quando a completude e insuficiente:

```
DataJud (gratuito) --> Codilo (pago, estaduais) --> Judit (pago, completo)
```

Regras de progressao:

1. **Sempre comecar pelo DataJud** -- E gratuito e cobre todos os tribunais.
2. **Se DataJud nao retornou nada** (processo nao encontrado) -- Tentar Codilo.
3. **Se o resultado atual tem pouca informacao** (completeness < threshold) -- Complementar com o proximo provider da cascata.
4. **O merge e cumulativo** -- Cada provider adiciona dados aos campos vazios do resultado acumulado.
5. **Parar quando o threshold de completude for atingido** ou quando todos os providers da cascata forem consultados.

### 2.2 Threshold de Completude

O `completenessScore` e calculado sobre 14 campos do `ProcessoUnificado`:

```typescript
// Campos avaliados (peso igual):
const fields = [
  cnj,              // 1.  Numero CNJ
  area,             // 2.  Area juridica
  nome,             // 3.  Classe processual
  dataDistribuicao, // 4.  Data de distribuicao
  instancia,        // 5.  Grau (1a, 2a, 3a instancia)
  tribunal,         // 6.  Dados do tribunal
  assuntos.length,  // 7.  Assuntos (ao menos 1)
  juiz,             // 8.  Nome do juiz
  situacao,         // 9.  Status (ativo, finalizado, etc.)
  fase,             // 10. Fase processual
  valor,            // 11. Valor da causa
  partes.length,    // 12. Partes (ao menos 1)
  movimentacoes.length, // 13. Movimentacoes (ao menos 1)
  anexos.length,    // 14. Anexos (ao menos 1)
];
completenessScore = filledFields / totalFields;
```

**Thresholds de decisao:**

| Score | Classificacao | Acao |
|-------|---------------|------|
| 0.00 | Nenhum dado | Avancar para proximo provider |
| 0.01 -- 0.64 | Informacao insuficiente | Avancar para proximo provider |
| 0.65 -- 0.84 | Informacao aceitavel | Avancar se houver provider disponivel na cascata* |
| >= 0.85 | Informacao completa | Parar -- resultado satisfatorio |

*Na faixa 0.65--0.84, o sistema avanca apenas se o proximo provider na cascata estiver saudavel (circuit breaker closed) e o campo `juiz` ou `situacao` estiver vazio (campos de alto valor que DataJud nao preenche).

Esses thresholds sao configuraveis via variavel de ambiente:

```
MERGE_COMPLETENESS_THRESHOLD=0.65
MERGE_COMPLETENESS_TARGET=0.85
```

---

## 3. Provider Priority Cascade

### 3.1 Cascata Primaria (V1)

```
Etapa 1: DataJud   -- Gratuito, dados basicos, todos os tribunais
           |
           v
     completeness >= 0.85?  ──YES──> DONE
           |
           NO
           v
Etapa 2: Codilo    -- Pago, tribunais estaduais, juiz + status inferido
           |
           v
     completeness >= 0.85?  ──YES──> DONE
           |
           NO
           v
Etapa 3: Judit     -- Pago, mais completo, async com polling
           |
           v
         DONE (melhor resultado possivel)
```

### 3.2 Justificativa da Ordem

| Posicao | Provider | Razao |
|---------|----------|-------|
| 1o | DataJud | Gratuito. Sempre consultar primeiro para minimizar custo. Cobre CNJ, tribunal, classe, valor, partes, movimentacoes. |
| 2o | Codilo | Custo intermediario. Forte em tribunais estaduais. Complementa DataJud com juiz, status (inferido de movimentacoes), fase, e detalhes de cover (capa do processo). |
| 3o | Judit | Custo mais alto. Provider mais completo. Unico que retorna anexos. Usado como ultimo recurso para preencher campos restantes. |

### 3.3 Providers Reserva (V2) -- Escavador e Predictus

**Escavador** e **Predictus** nao participam da cascata primaria no V1. Eles serao ativados em cenarios futuros:

| Provider | Cenario de Ativacao (V2) | Valor Agregado |
|----------|--------------------------|----------------|
| **Escavador** | Busca por CPF/CNPJ (agregacao cross-tribunal); enriquecimento quando DataJud + Codilo + Judit falham | Dados agregados, status predito, envolvidos com OAB detalhada |
| **Predictus** | Planos Pro/Enterprise com analytics habilitado; quando o cliente solicita dados preditivos | `statusPredictus`, grau de risco, duracao estimada, classificacao CNJ dos assuntos |

Para V2, a cascata pode ser estendida:

```
DataJud --> Codilo --> Judit --> Escavador (fallback) --> Predictus (enriquecimento)
```

A interface `ILegalDataProvider` e o pattern de circuit breakers ja suportam essa extensao sem alteracao arquitetural.

---

## 4. Algoritmo de Merge Cumulativo (Field-Level)

### 4.1 Principio Geral

O merge e **cumulativo e aditivo**: cada provider na cascata preenche campos que ainda estao vazios no resultado acumulado. Campos ja preenchidos por um provider anterior NAO sao sobrescritos, exceto em casos especificos documentados na secao 4.3.

```
resultado = {}
para cada provider na cascata:
    dados = consultar(provider)
    resultado = mergeCumulativo(resultado, dados)
    if completeness(resultado) >= target: break
return resultado
```

### 4.2 Matriz de Prioridade por Campo

Esta tabela define, para cada campo do `monitored_cases`, qual provider tipicamente o preenche e a cadeia de fallback:

| Campo | Provider Primario | Fallback 1 | Fallback 2 | Regra Especial |
|-------|-------------------|------------|------------|----------------|
| `cnj` | DataJud | Codilo | Judit | Valor canonico; nunca sobrescrever |
| `tribunal_sigla` | DataJud | Codilo | Judit | DataJud extrai do index; Codilo pode ter vazio |
| `tribunal_nome` | DataJud | Codilo | Judit | -- |
| `comarca` | Codilo | Judit | DataJud | DataJud raramente tem; Codilo via `jurisdiction` |
| `vara` | DataJud | Codilo | Judit | DataJud via `orgaoJulgador`; Codilo via `origin` |
| `area` | DataJud | Codilo | Judit | Inferido do assunto principal em todos |
| `classe` | DataJud | Codilo | Judit | DataJud via `classe.nome`; Codilo strips codigo TPU |
| `assunto_principal` | DataJud | Codilo | Judit | Primeiro assunto com `principal: true` |
| `juiz` | **Codilo** | Judit | -- | **DataJud NAO retorna juiz.** Este campo e a razao principal para consultar Codilo. |
| `valor_causa` | DataJud | Codilo | Judit | DataJud via `valorCausa.valor`; Codilo faz parse de string |
| `data_distribuicao` | DataJud | Codilo | Judit | DataJud via `dataAjuizamento` |
| `status` | **Codilo** | Judit | -- | **DataJud NAO retorna status.** Codilo infere de movimentacoes recentes. |
| `fase` | **Codilo** | Judit | -- | **DataJud NAO retorna fase.** Codilo infere de movimentacoes recentes. |
| `nivel_sigilo` | DataJud | Judit | -- | DataJud via `nivelSigilo`; Codilo nao retorna |
| `partes_json` | DataJud | Codilo | Judit | Union-merge com dedup por `nome+documento` |
| `movimentacoes` | DataJud | Codilo | Judit | Union-merge com dedup por `data+descricao` |
| `completeness_score` | Calculado | -- | -- | Recalculado apos cada etapa de merge |

### 4.3 Regras de Sobrescrita (Excecoes)

Em tres cenarios especificos, um campo ja preenchido PODE ser sobrescrito:

1. **Multi-instancia detectada:** Se dois providers retornam instancias diferentes (ex: DataJud G1, Codilo G2), o merge promove os metadados da instancia superior e preserva a classe de origem. Isso ja esta implementado em `detectMultiInstancia()` no `merge.service.ts`.

2. **Partes com documento mais completo:** Se DataJud retorna uma parte sem documento e Codilo retorna a mesma parte (match por nome normalizado) com CPF/CNPJ, o documento e adicionado ao registro existente.

3. **Movimentacoes com conteudo enriquecido:** Se DataJud retorna uma movimentacao apenas com tipo/descricao e Codilo retorna a mesma movimentacao (match por data + descricao normalizada) com campo `conteudo` (texto completo da decisao), o `conteudo` e adicionado.

### 4.4 Deduplicacao de Arrays

As funcoes de deduplicacao ja existentes sao mantidas:

| Array | Chave Natural (dedup key) | Implementacao |
|-------|---------------------------|---------------|
| `partes` | `normalizeText(nome) + "\|" + (documento ?? "")` | `parteKey()` em `merge.service.ts` |
| `movimentacoes` | `data.toISOString().slice(0,10) + "\|" + normalizeText(descricao).slice(0,80)` | `movimentacaoKey()` em `merge.service.ts` |
| `assuntos` | `normalizeText(descricao)` | `mergeAssuntos()` em `merge.service.ts` |
| `anexos` | `data.toISOString().slice(0,10) + "\|" + normalizeText(nome)` | `anexoKey()` em `merge.service.ts` |

A funcao `normalizeText()` aplica: `toLowerCase() -> NFD normalize -> strip diacritics -> trim`.

---

## 5. Armazenamento: provider_data JSONB

### 5.1 Estrutura

O campo `provider_data` na tabela `monitored_cases` armazena snapshots brutos de cada provider consultado, alem de metadados de orquestracao:

```json
{
  "datajud": {
    "fetched_at": "2026-02-24T10:00:00Z",
    "request_id": "12345678901234567890",
    "raw": {
      "_index": "api_publica_tjsp",
      "_source": {
        "numeroProcesso": "12345678901234567890",
        "classe": { "codigo": 7, "nome": "Procedimento Comum Civel" },
        "assuntos": [{ "codigo": 10432, "nome": "Indenizacao por Dano Moral" }],
        "dataAjuizamento": "2024-03-15",
        "valorCausa": { "valor": 150000.00 },
        "movimentos": [ "..." ],
        "partes": [ "..." ]
      }
    }
  },
  "codilo": {
    "fetched_at": "2026-02-24T10:00:02Z",
    "request_id": "cod-abc-123",
    "raw": {
      "properties": { "cnj": "1234567-89.2024.8.26.0100", "class": "Procedimento Comum Civel" },
      "cover": [
        { "description": "Juiz", "value": "Dr. Fulano de Tal" },
        { "description": "Situacao", "value": "Em andamento" }
      ],
      "people": [ "..." ],
      "steps": [ "..." ]
    }
  },
  "_meta": {
    "strategy": "progressive_cascade",
    "cascade_order": ["datajud", "codilo"],
    "merged_from": ["datajud", "codilo"],
    "completeness_before_merge": { "datajud": 0.57, "codilo": 0.71 },
    "completeness_after_merge": 0.86,
    "total_duration_ms": 3420,
    "decided_at": "2026-02-24T10:00:03Z"
  }
}
```

### 5.2 Campos do `_meta`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `strategy` | string | Estrategia usada: `progressive_cascade`, `race`, `fallback`, `primary-only` |
| `cascade_order` | string[] | Ordem em que os providers foram consultados |
| `merged_from` | string[] | Providers que efetivamente contribuiram dados ao resultado final |
| `completeness_before_merge` | Record<string, number> | Score de completude individual de cada provider |
| `completeness_after_merge` | number | Score final apos merge cumulativo |
| `total_duration_ms` | number | Tempo total da orquestracao (todas as etapas) |
| `decided_at` | string (ISO) | Timestamp de quando o merge foi concluido |

### 5.3 Regras de Retencao

- `provider_data` e armazenado integralmente no INSERT/UPDATE.
- Nao ha TTL automatico. Dados brutos sao preservados indefinidamente para auditoria.
- Em escala futura (>500k cases), considerar mover `raw` para storage externo (S3/Supabase Storage) e manter apenas referencia no JSONB.

---

## 6. Webhook Payload: Dados Unificados

### 6.1 Principio

O payload de webhook entregue ao cliente **sempre** contem os dados unificados (pos-merge), nunca dados brutos de um provider individual. O cliente recebe a visao mais completa possivel do processo.

### 6.2 Estrutura do Payload

```json
{
  "event": "new_movement",
  "delivery_id": "uuid",
  "timestamp": "2026-02-24T14:05:00Z",
  "data": {
    "case": {
      "cnj": "1234567-89.2024.8.26.0100",
      "tribunal": "TJSP",
      "area": "civel",
      "classe": "Procedimento Comum Civel",
      "juiz": "Dr. Fulano de Tal",
      "valor_causa": 150000.00,
      "status": "ativo",
      "fase": "inicial",
      "completeness_score": 0.86,
      "partes": [
        {
          "nome": "MARIA DA SILVA",
          "documento": "***456789**",
          "lado": "autor",
          "advogados": [{ "nome": "Dr. Rafael Silva", "oab": "SP123456" }]
        }
      ]
    },
    "movement": {
      "date": "2026-02-24",
      "type": "despacho",
      "description": "Designada audiencia de conciliacao para 15/03/2026",
      "code": "11010"
    },
    "provider_info": {
      "merged_from": ["datajud", "codilo"],
      "completeness_score": 0.86
    }
  }
}
```

### 6.3 Campo `provider_info`

O campo `provider_info` no payload indica ao consumidor do webhook:

- `merged_from` -- Quais providers contribuiram para os dados deste case. Isso permite ao cliente saber a profundidade da informacao.
- `completeness_score` -- Score de 0.0 a 1.0 indicando quao completos sao os dados.

O campo `provider_info` NAO inclui dados brutos nem detalhes internos de orquestracao. Esses dados existem apenas no `provider_data` JSONB interno.

### 6.4 Headers de Assinatura

Conforme ADR-006, todo webhook delivery inclui:

```
X-Litix-Signature: t=1708786800,v1=5257a869e4a2...
X-Litix-Timestamp: 1708786800
X-Litix-Event: new_movement
X-Litix-Delivery-Id: uuid
```

A assinatura e HMAC-SHA256 sobre `timestamp.payload` usando o `secret` do endpoint.

---

## 7. Diagrama de Sequencia: Cascata Progressiva

### 7.1 Fluxo Completo (Consulta por CNJ)

```
Client           API Route        Cache (KV)       Orchestrator        DataJud         Codilo          Judit
  |                  |                |                  |                 |               |               |
  |-- GET /api/v1/  |                |                  |                 |               |               |
  |   processes/     |                |                  |                 |               |               |
  |   {cnj}          |                |                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |-- Auth ------->|                  |                 |               |               |
  |                  |   + rate limit |                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |-- Cache get -->|                  |                 |               |               |
  |                  |   key=cnj:tid  |                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |   [CACHE HIT]  |                  |                 |               |               |
  |<-- 200 cached --|<-- return -----|                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |   [CACHE MISS] |                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |-- consultByCnj(cnj, strategy=progressive_cascade) |               |               |
  |                  |                |                  |                 |               |               |
  |                  |                |               [ETAPA 1: DataJud]  |               |               |
  |                  |                |                  |-- searchByCnj->|               |               |
  |                  |                |                  |   (gratuito)   |               |               |
  |                  |                |                  |<-- resultado --|               |               |
  |                  |                |                  |                 |               |               |
  |                  |                |                  |-- completeness = 0.57          |               |
  |                  |                |                  |   (falta juiz, status, fase)   |               |
  |                  |                |                  |   0.57 < 0.65 threshold        |               |
  |                  |                |                  |                 |               |               |
  |                  |                |               [ETAPA 2: Codilo]   |               |               |
  |                  |                |                  |-- searchByCnj--|-------------->|               |
  |                  |                |                  |   (pago)       |               |               |
  |                  |                |                  |<-- resultado --|---------------|               |
  |                  |                |                  |                 |               |               |
  |                  |                |                  |-- mergeCumulativo(acumulado, codilo)           |
  |                  |                |                  |   + juiz preenchido            |               |
  |                  |                |                  |   + status preenchido          |               |
  |                  |                |                  |   + fase preenchida            |               |
  |                  |                |                  |                 |               |               |
  |                  |                |                  |-- completeness = 0.86          |               |
  |                  |                |                  |   0.86 >= 0.85 target          |               |
  |                  |                |                  |   PARAR                        |               |
  |                  |                |                  |                 |               |               |
  |                  |<-- OrchestrationResult ----------|                 |               |               |
  |                  |   { processo, sources: [datajud, codilo],         |               |               |
  |                  |     merged: true, provider_data: {...} }          |               |               |
  |                  |                |                  |                 |               |               |
  |                  |-- Cache set -->|                  |                 |               |               |
  |                  |   TTL: 5min    |                  |                 |               |               |
  |                  |                |                  |                 |               |               |
  |                  |-- Upsert monitored_cases         |                 |               |               |
  |                  |   (dados unificados + provider_data JSONB)        |               |               |
  |                  |                |                  |                 |               |               |
  |<-- 200 + data --|                |                  |                 |               |               |
```

### 7.2 Cenario: DataJud Retorna Nada (Processo Nao Encontrado)

```
Orchestrator        DataJud         Codilo          Judit
     |                 |               |               |
  [ETAPA 1]            |               |               |
     |-- searchByCnj-->|               |               |
     |<-- null --------|               |               |
     |                 |               |               |
     |  completeness = 0.00            |               |
     |  0.00 < threshold               |               |
     |                 |               |               |
  [ETAPA 2]            |               |               |
     |-- searchByCnj--|--------------->|               |
     |<-- resultado --|----------------|               |
     |                 |               |               |
     |  completeness = 0.71            |               |
     |  0.71 >= 0.65 (aceitavel)       |               |
     |  MAS juiz preenchido e          |               |
     |  status preenchido              |               |
     |  0.71 < 0.85 target             |               |
     |                 |               |               |
  [ETAPA 3]            |               |               |
     |-- searchByCnj--|----------------|-------------->|
     |   (async+poll) |               |               |
     |<-- resultado --|----------------|---------------|
     |                 |               |               |
     |  mergeCumulativo(acumulado, judit)               |
     |  completeness = 0.93            |               |
     |  PARAR                          |               |
```

### 7.3 Cenario: Monitoramento Detecta Nova Movimentacao

```
pg_cron             Trigger.dev          DataJud       Codilo         Supabase DB      Webhook Endpoint
  |                     |                   |             |               |                  |
  |-- HTTP trigger ---->|                   |             |               |                  |
  |                     |                   |             |               |                  |
  |                     |-- Load cases -----|-------------|-------------->|                  |
  |                     |   WHERE monitoring_enabled      |               |                  |
  |                     |   AND last_checked < now()-freq |               |                  |
  |                     |                   |             |               |                  |
  |                     |  [Para cada case:]|             |               |                  |
  |                     |                   |             |               |                  |
  |                     |-- searchByCnj --->|             |               |                  |
  |                     |   (DataJud only)  |             |               |                  |
  |                     |<-- movimentacoes -|             |               |                  |
  |                     |                   |             |               |                  |
  |                     |-- hash(movs) vs last_movement_hash             |                  |
  |                     |                   |             |               |                  |
  |                     |   [HASH DIFERENTE = nova movimentacao]         |                  |
  |                     |                   |             |               |                  |
  |                     |-- Cascata progressiva para enriquecer:         |                  |
  |                     |   DataJud(ja tem) -> Codilo -> Judit           |                  |
  |                     |                   |             |               |                  |
  |                     |-- UPDATE case ----|-------------|-------------->|                  |
  |                     |   (dados unificados            |               |                  |
  |                     |    + provider_data              |               |                  |
  |                     |    + new hash)                  |               |                  |
  |                     |                   |             |               |                  |
  |                     |-- INSERT alert ---|-------------|-------------->|                  |
  |                     |                   |             |               |                  |
  |                     |-- Webhook delivery (dados UNIFICADOS) -------->|                  |
  |                     |   { case: {...merged...},      |               |                  |
  |                     |     movement: {...},            |               |                  |
  |                     |     provider_info: {            |               |                  |
  |                     |       merged_from: [datajud, codilo] } }       |                  |
  |                     |                   |             |               |                  |
  |                     |                   |             |               |-- POST payload ->|
  |                     |                   |             |               |   + HMAC sig     |
```

---

## 8. Impacto no Codigo Existente

### 8.1 Alteracoes Necessarias

| Arquivo | Tipo de Alteracao | Descricao |
|---------|-------------------|-----------|
| `services/orchestrator.service.ts` | **Refactor** | Adicionar estrategia `progressive_cascade` como nova opcao ao lado de `race`, `fallback`, `primary-only`. Implementar logica de cascata com thresholds. Mudar default de `race` para `progressive_cascade`. |
| `services/merge.service.ts` | **Extend** | Adicionar funcao `mergeCumulativo(acumulado, novo)` que faz merge unidirecional (novo preenche vazios do acumulado). A funcao `mergeProcessos` existente (bidirecional) permanece para backward compatibility. |
| `config/env.ts` | **Extend** | Adicionar `MERGE_COMPLETENESS_THRESHOLD` (default: 0.65), `MERGE_COMPLETENESS_TARGET` (default: 0.85), `CASCADE_ORDER` (default: `datajud,codilo,judit`). |
| `config/providers.config.ts` | **Extend** | Adicionar `cascadeConfig` com ordem e thresholds. |
| `models/processo-unificado.ts` | **Extend** | Garantir que `mergedFrom` suporte array de N origens (ja suporta). |

### 8.2 Backward Compatibility

As estrategias existentes (`race`, `fallback`, `primary-only`) permanecem funcionais e selecionaveis via `options.strategy`. A unica mudanca e o **default** que passa de `race` para `progressive_cascade`. Clientes da API que passam `strategy=race` explicitamente nao serao afetados.

---

## 9. Consequencias e Trade-offs

### 9.1 Beneficios

| Beneficio | Impacto |
|-----------|---------|
| **Reducao de custo** | DataJud e gratuito. A maioria das consultas (processos com dados basicos) nao precisara de Codilo/Judit. Estimativa: 40-60% das consultas resolvidas apenas com DataJud. |
| **Maior completude** | Merge cumulativo de ate 3 providers gera score medio de 0.85+ vs 0.57 (DataJud solo) ou 0.71 (qualquer provider individual). |
| **Transparencia** | `provider_data` JSONB permite auditoria completa. `merged_from` no webhook permite ao cliente saber a profundidade dos dados. |
| **Extensibilidade** | Adicionar Escavador/Predictus na cascata e uma mudanca de configuracao, nao de codigo. |
| **Resiliencia** | Se Codilo estiver fora (circuit breaker open), a cascata pula para Judit. Se Judit tambem falhar, retorna o que DataJud trouxe. |

### 9.2 Trade-offs

| Trade-off | Severidade | Mitigacao |
|-----------|-----------|-----------|
| **Latencia maior** que single-provider | Media | Cache em Vercel KV (TTL 5min) absorve consultas repetidas. Cascata para quando atinge target. P50 estimado: 2-3s (DataJud only); P95: 6-8s (DataJud + Codilo + Judit com polling). |
| **Complexidade de debug** | Baixa | `provider_data` JSONB preserva dados brutos de cada provider. Logs estruturados em cada etapa da cascata. |
| **Dependencia de DataJud** (API publica, SLA informal) | Media | Se DataJud cair, cascata avanca para Codilo imediatamente. Circuit breaker evita tentativas repetidas. DataJud historicamente tem uptime > 99%. |
| **Custo proporcional ao deficit de completude** | Baixa | Processos com dados basicos (sem necessidade de juiz/status) resolvem com DataJud gratuito. Custo pago proporcional a complexidade da necessidade. |
| **Merge cumulativo pode produzir dados inconsistentes entre providers** | Baixa | Campos ja preenchidos nao sao sobrescritos (exceto secao 4.3). Multi-instancia detectada e tratada. |
| **Escavador e Predictus subutilizados no V1** | Aceite consciente | Providers permanecem implementados e testaveis. Ativacao no V2 via configuracao. |

### 9.3 Metricas de Monitoramento

| Metrica | Descricao | Alvo |
|---------|-----------|------|
| `cascade_depth_avg` | Media de providers consultados por request | < 1.8 (maioria resolve com DataJud + Codilo) |
| `completeness_score_avg` | Score medio de completude pos-merge | > 0.80 |
| `datajud_only_rate` | % de consultas resolvidas so com DataJud | > 30% |
| `cost_per_query_avg` | Custo medio por consulta (R$) | < R$ 0.15 |
| `cascade_duration_p50` | Latencia P50 da cascata completa | < 3s |
| `cascade_duration_p95` | Latencia P95 da cascata completa | < 8s |
| `merge_conflict_rate` | % de merges com conflito de multi-instancia | Informativo |

---

## 10. Decisoes Relacionadas

| ADR | Relacao |
|-----|---------|
| ADR-006: Webhook Delivery com DLQ | Webhook payload usa dados unificados desta ADR |
| ADR-007: Vercel KV para Caching | Cache de resultados da cascata com TTL 5min |
| ADR-003: Trigger.dev para Background Jobs | Monitoramento periodico executa a cascata como Trigger.dev job |
| ADR-004: Repository Pattern | `CaseRepository.upsert()` persiste dados unificados + `provider_data` |

---

## 11. Referencias

### Codigo-fonte

- Orchestrator: `packages/providers/src/services/orchestrator.service.ts`
- Merge Service: `packages/providers/src/services/merge.service.ts`
- Provider Interface: `packages/providers/src/providers/provider.interface.ts`
- DataJud Mapper: `packages/providers/src/providers/datajud/datajud.mapper.ts`
- Codilo Mapper: `packages/providers/src/providers/codilo/codilo.mapper.ts`
- Judit Mapper: `packages/providers/src/providers/judit/judit.mapper.ts`
- Escavador Mapper: `packages/providers/src/providers/escavador/escavador.mapper.ts`
- Predictus Mapper: `packages/providers/src/providers/predictus/predictus.mapper.ts`
- Provider Config: `packages/providers/src/config/providers.config.ts`
- Environment Schema: `packages/providers/src/config/env.ts`
- Monitor Service: `packages/providers/src/services/monitor.service.ts`
- Webhook Dispatcher: `packages/providers/src/services/webhook-dispatcher.service.ts`

### Documentos

- PRD: `docs/litix-prd.md` (secoes 1.4, 5 Epic 3-4, 6 NFR)
- Arquitetura principal: `docs/litix-architecture.md` (secoes 7.3, 8.2)
- Schema DB: `docs/litix-architecture.md` secao 3.2 (tabelas `monitored_cases`, `case_movements`)
