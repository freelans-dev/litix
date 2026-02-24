# Litix -- Product Requirements Document (PRD)

**Produto:** Litix -- Plataforma SaaS de Monitoramento e Consulta Processual Multi-Provider
**Versao:** 1.0.0
**Data:** 2026-02-24
**Autor:** Morgan (PM Agent / AIOS)
**Status:** Draft

---

## Indice

1. [Visao Geral e Contexto](#1-visao-geral-e-contexto)
2. [Problema e Oportunidade](#2-problema-e-oportunidade)
3. [Usuarios e Personas](#3-usuarios-e-personas)
4. [Metricas de Sucesso](#4-metricas-de-sucesso)
5. [Requisitos Funcionais por Epic](#5-requisitos-funcionais-por-epic)
6. [Requisitos Nao-Funcionais](#6-requisitos-nao-funcionais)
7. [Fases de Construcao e Releases](#7-fases-de-construcao-e-releases)
8. [Mapa de Dependencias Tecnicas](#8-mapa-de-dependencias-tecnicas)
9. [Precificacao e Limites por Plano](#9-precificacao-e-limites-por-plano)
10. [Stack Tecnica](#10-stack-tecnica)
11. [Riscos e Mitigacoes](#11-riscos-e-mitigacoes)
12. [Fora de Escopo](#12-fora-de-escopo)
13. [Changelog](#13-changelog)

---

## 1. Visao Geral e Contexto

### 1.1 O que e o Litix

Litix e uma plataforma SaaS B2B de monitoramento e consulta processual para escritorios de advocacia no Brasil. O diferencial central e a **redundancia multi-provider**: o Litix consulta simultaneamente 5 fontes de dados processuais (DataJud, Codilo, Escavador, Judit, Predictus) com estrategias de orquestracao configuraveiss (race, fallback, primary-only), circuit breakers por provider, e entrega de eventos via webhook push.

### 1.2 Estado Atual do Projeto

O Litix possui um backend funcional em Node.js 18+ / TypeScript ESM / Express que ja implementa:

| Componente | Status | Descricao |
|---|---|---|
| 5 Providers integrados | Operacional | DataJud, Codilo, Escavador, Judit, Predictus |
| Orchestration strategies | Operacional | race, fallback, primary-only com circuit breakers |
| MergeService | Operacional | Unificacao de resultados multi-provider com completenessScore |
| Modelo `ProcessoUnificado` | Operacional | Schema unificado com provider attribution (`origem`, `mergedFrom`) |
| Monitoramento por CNJ | Operacional | Hash de movimentacoes para deteccao de mudancas |
| Monitoramento por CPF/CNPJ | Operacional | Varredura em todos os 92 tribunais DataJud |
| Webhook delivery | Operacional | Entrega para AppSheet via Google Apps Script |
| Busca por documento | Operacional | CPF, CNPJ, OAB, nome |
| Scheduler | Operacional | Recorrencia configuravel por processo monitorado |

**O que falta:** Frontend (dashboard), autenticacao multi-tenant, billing, API publica documentada, e todas as features de camada 2 e 3 listadas neste PRD.

### 1.3 Contexto de Mercado

- **TAM:** R$ 270-470M (monitoramento + consulta processual Brasil)
- **SAM:** R$ 50-90M (escritorios digitalmente alcancaveis, horizonte 3 anos)
- **SOM:** R$ 2-7M ARR (Y1-Y3, capturando 2-7% do SAM)
- **Concorrentes diretos:** Escavador (API + consumer), JusBrasil (consumer + B2B API)
- **Concorrentes indiretos:** Astrea/Aurum, Projuris/SAJ, Themis (gestao com monitoramento)
- **Janela de oportunidade:** Early Majority -- mercado em consolidacao mas sem lider claro no segmento API B2B multi-provider

*Referencia completa:* `docs/market-research.md`, `docs/competitive-analysis.md`

### 1.4 Diferenciais Competitivos

| # | Diferencial | Status | Nenhum concorrente oferece |
|---|---|---|---|
| 1 | Redundancia multi-provider (5 fontes simultaneas) | Construido | Correto |
| 2 | Webhook push delivery (vs polling) | Construido | Escavador faz parcialmente |
| 3 | Transparencia de fonte (provider attribution) | Construido | Correto |
| 4 | Escolha de provider pelo cliente | Construido | Correto |
| 5 | SLA contratual de cobertura | Planejado | Correto |

---

## 2. Problema e Oportunidade

### 2.1 Problema Principal

Escritorios de advocacia no Brasil perdem prazos processuais, gastam horas em consultas manuais a portais de tribunais, e nao possuem visibilidade integrada sobre seus processos. As solucoes existentes dependem de um unico provider de dados -- quando esse provider falha, o escritorio fica cego.

### 2.2 Dores do Cliente (por severidade)

| # | Dor | Severidade | Frequencia |
|---|---|---|---|
| 1 | Consulta manual em portais dos tribunais (PJe, ESAJ, etc) | Altissima | Diaria |
| 2 | Perda de prazos processuais por falha no monitoramento | Alta | Diaria |
| 3 | Ausencia de integracao entre monitoramento e software de gestao | Alta | Semanal |
| 4 | Dificuldade em gerenciar grande volume de processos com equipe enxuta | Alta | Diaria |
| 5 | Instabilidade de plataformas existentes (indisponibilidade de tribunais) | Media | Semanal |
| 6 | Falta de visibilidade analitica para relatorios a socios e clientes | Media | Semanal |
| 7 | Custo elevado ou opacidade de precificacao | Media | Pontual |

### 2.3 Proposta de Valor

> Litix e a camada de resiliencia para dados processuais. Cadastre sua OAB, e o Litix importa todos os seus processos de todos os tribunais, monitora cada movimentacao com redundancia de 5 providers, e entrega alertas em tempo real via webhook push -- sem que voce consulte um unico portal.

---

## 3. Usuarios e Personas

### 3.1 Modelo de Entidades

```
Admin Panel (Litix)         ->  Gerencia tenants, planos, billing, metricas
  |-- Tenant (escritorio)   ->  Dashboard com N usuarios
       |-- Usuarios         ->  Advogados do escritorio com perfil OAB
```

### 3.2 Persona Primaria: Dr. Rafael -- Socio de Escritorio

- **Perfil:** Socio de escritorio com 15 advogados em Sao Paulo
- **Area:** Direito trabalhista e civel
- **Volume:** 2.000 processos ativos em 12 tribunais
- **Dor:** Equipe de 2 estagiarios dedicados a consultar portais; ja perdeu prazo 2x no ultimo ano
- **Orcamento:** R$ 300-500/mes
- **Decisao:** 2-4 semanas com trial funcional

### 3.3 Persona Secundaria: Dra. Camila -- Advogada Autonoma

- **Perfil:** Advogada autonoma, previdenciario e trabalhista
- **Volume:** 80 processos ativos em 3 tribunais
- **Dor:** Consulta manual diaria, sem orcamento para ferramenta cara
- **Orcamento:** R$ 0-59/mes
- **Decisao:** Imediata se free tier resolver

### 3.4 Persona Terciaria: Lucas -- CTO de Legaltech

- **Perfil:** Desenvolvedor integrando dados processuais em produto proprio
- **Volume:** 50.000+ consultas/mes via API
- **Dor:** Depende de um unico provider, sem fallback, sem SLA
- **Orcamento:** R$ 599-5.000/mes (API usage)
- **Decisao:** Avaliacao tecnica de 1-2 semanas

### 3.5 Perfis de Usuario dentro do Tenant

| Perfil | Descricao | Permissoes |
|---|---|---|
| Owner | Socio que criou a conta | Tudo + billing + gerencia usuarios |
| Admin | Socio ou gestor | Tudo exceto billing |
| Member | Advogado associado | CRUD processos proprios + visualiza equipe |
| Viewer | Estagiario ou cliente | Somente leitura |

---

## 4. Metricas de Sucesso

### 4.1 Metricas de Produto (MVP)

| Metrica | Alvo MVP (M3) | Alvo V1 (M6) | Alvo V2 (M12) |
|---|---|---|---|
| Tenants ativos | 50 | 300 | 1.500 |
| Processos monitorados (total) | 5.000 | 50.000 | 500.000 |
| MRR | R$ 3.000 | R$ 30.000 | R$ 200.000 |
| Churn mensal | < 15% | < 10% | < 5% |
| NPS | > 30 | > 40 | > 50 |
| Uptime SLA efetivo | 99,0% | 99,5% | 99,9% |

### 4.2 Metricas Tecnicas

| Metrica | Alvo |
|---|---|
| Latencia media de consulta (P50) | < 3s |
| Latencia de consulta (P95) | < 8s |
| Tempo medio de deteccao de movimentacao | < 30min |
| Webhook delivery success rate | > 99% |
| Provider fallback success rate | > 95% |

---

## 5. Requisitos Funcionais por Epic

### Camada 1 -- Automatica (Zero Esforco)

---

### Epic 1: Fundacao Multi-Tenant e Autenticacao

**Objetivo:** Criar a infraestrutura base do SaaS com isolamento de dados por tenant, autenticacao, e roles.

**Prioridade:** MVP -- Bloqueante para todos os outros epics.

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 1.1 | Como admin do Litix, quero criar tenants (escritorios) para que cada escritorio tenha seus dados isolados. | AC1: Schema `tenants` com RLS habilitado. AC2: Toda tabela do sistema possui `tenant_id` com index. AC3: RLS policy garante que usuario so acessa dados do seu tenant. AC4: Teste confirma que usuario A nao acessa dados do tenant B. |
| 1.2 | Como advogado, quero me cadastrar e ser vinculado ao meu escritorio para acessar o dashboard. | AC1: Signup via Supabase Auth (email/senha). AC2: Auth Hook injeta `tenant_id` e `role` no JWT. AC3: Primeiro usuario de um tenant recebe role `owner`. AC4: Convite por email para novos membros do tenant. |
| 1.3 | Como owner, quero gerenciar os membros do meu escritorio para controlar quem acessa o que. | AC1: CRUD de membros com roles (owner, admin, member, viewer). AC2: Owner pode alterar role de qualquer membro. AC3: Admin pode adicionar/remover members e viewers. AC4: Viewer so tem permissao de leitura. |
| 1.4 | Como sistema, preciso de middleware de sessao e tenant para que toda request esteja contextualizada. | AC1: Middleware Next.js extrai `tenant_id` do JWT em toda request. AC2: Supabase client automaticamente filtrado por tenant via RLS. AC3: API routes rejeitam requests sem tenant valido (401). |

---

### Epic 2: Import Automatico por OAB

**Objetivo:** Advogado cadastra seu numero OAB e o Litix automaticamente descobre e importa todos os processos onde ele atua.

**Prioridade:** MVP -- Feature core diferenciadora.

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 2.1 | Como advogado, quero cadastrar meu numero OAB para que o Litix encontre todos os meus processos automaticamente. | AC1: Campo de OAB no onboarding (formato UF+numero validado). AC2: Ao salvar, dispara job de importacao em background. AC3: Feedback visual de progresso (0-100% dos tribunais varridos). AC4: Importacao usa estrategia `race` em DataJud + Judit + Escavador. |
| 2.2 | Como sistema, preciso orquestrar a busca por OAB em multiplos providers para maximizar cobertura. | AC1: Busca por OAB disparada em paralelo nos providers que suportam busca por documento. AC2: Resultados unificados via MergeService existente. AC3: Deduplicacao por CNJ (mesmo processo de providers diferentes unificado). AC4: Provider attribution preservado em cada resultado (`origem.provider`). AC5: Respeita limites do plano (max processos). |
| 2.3 | Como advogado, quero ver o resultado da importacao para saber quantos processos foram encontrados e onde. | AC1: Tela de resumo pos-importacao com total de processos por tribunal. AC2: Lista dos processos encontrados com dados basicos (CNJ, tribunal, partes). AC3: Opcao de remover processos que nao sao relevantes. AC4: Processos importados automaticamente entram em monitoramento. |
| 2.4 | Como owner de escritorio, quero que cada advogado cadastre sua OAB para termos visibilidade de todos os processos do escritorio. | AC1: Cada membro pode cadastrar ate N OABs (conforme perfil). AC2: Processos importados por OAB sao associados ao membro e ao tenant. AC3: Dashboard do tenant agrega processos de todos os membros. AC4: Deduplicacao cross-member (mesmo processo de 2 advogados do escritorio aparece uma vez). |

---

### Epic 3: Ficha Unica do Processo (Multi-Provider)

**Objetivo:** Visualizar dados completos de qualquer processo unificando informacoes de todos os providers em uma view unica.

**Prioridade:** MVP -- Entrega valor imediato.

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 3.1 | Como advogado, quero ver a ficha completa de um processo para ter todas as informacoes em um so lugar. | AC1: Tela de detalhe do processo com todos os campos do `ProcessoUnificado`. AC2: Dados estruturados: cabecalho (CNJ, tribunal, juiz, valor), partes, movimentacoes, assuntos. AC3: Timeline de movimentacoes em ordem cronologica reversa. AC4: Indicador visual de `completenessScore` (barra de completude). |
| 3.2 | Como advogado, quero ver de quais fontes os dados vieram para confiar na informacao. | AC1: Badge de provider em cada secao indicando fonte(s). AC2: Se dado veio de merge, indicar "Unificado de N fontes". AC3: Tooltip mostrando data de coleta por provider (`fetchedAt`). AC4: Botao "Atualizar agora" para forcar nova consulta multi-provider. |
| 3.3 | Como advogado, quero consultar um processo por CNJ mesmo que nao esteja na minha carteira para pesquisas avulsas. | AC1: Campo de busca por CNJ no dashboard. AC2: Consulta usa orchestrator existente com estrategia configuravel. AC3: Resultado exibido na ficha unica. AC4: Opcao de "Adicionar ao monitoramento" apos consulta. AC5: Consultas avulsas contabilizadas no limite do plano. |

---

### Epic 4: Monitoramento com Alertas

**Objetivo:** Detectar movimentacoes novas em processos monitorados e alertar o advogado em tempo real.

**Prioridade:** MVP -- Resolve a dor numero 2 (perda de prazo).

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 4.1 | Como advogado, quero que o Litix monitore meus processos automaticamente para ser alertado de novas movimentacoes. | AC1: Todo processo importado entra automaticamente em monitoramento. AC2: Scheduler verifica processos com recorrencia configuravel (padrao: 2x/dia). AC3: Deteccao de movimentacao nova via hash comparison (ja existente). AC4: Indicador de "ultima verificacao" por processo no dashboard. |
| 4.2 | Como advogado, quero receber alertas quando houver movimentacao nos meus processos para agir em tempo. | AC1: Notificacao in-app (badge + lista de alertas nao lidos). AC2: Alerta por email com resumo da movimentacao. AC3: Notificacao via webhook configuravel (para integracao). AC4: Conteudo do alerta: CNJ, tribunal, tipo movimentacao, data, resumo. |
| 4.3 | Como advogado, quero ver o historico de alertas para nao perder nenhuma movimentacao. | AC1: Pagina de alertas com filtros (lido/nao-lido, processo, periodo). AC2: Marcar como lido individualmente ou em lote. AC3: Link direto do alerta para ficha do processo. AC4: Contagem de alertas nao lidos no header do dashboard. |
| 4.4 | Como sistema, preciso garantir alta disponibilidade do monitoramento usando multi-provider. | AC1: Se provider primario falha, circuit breaker redireciona para fallback. AC2: Health check por provider visivel no admin panel. AC3: Logs de falha e fallback por ciclo de monitoramento. AC4: Metrica de "monitoramento efetivo" (% de processos verificados com sucesso por ciclo). |

---

### Epic 5: Webhook para Integracao

**Objetivo:** Permitir que escritorios recebam eventos processuais via webhook push em sistemas externos (Astrea, Projuris, planilhas, etc).

**Prioridade:** MVP -- Diferencial competitivo core.

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 5.1 | Como admin do escritorio, quero configurar endpoints de webhook para receber eventos no meu sistema. | AC1: CRUD de webhook endpoints no dashboard (URL, eventos, secret). AC2: Validacao de URL (HTTP/HTTPS, reachability test). AC3: Secret para assinatura HMAC dos payloads. AC4: Limite de endpoints por plano. |
| 5.2 | Como sistema, preciso entregar eventos via webhook com confiabilidade para que integradores confiem no Litix. | AC1: Delivery com retry exponential backoff (5 tentativas: 0s, 5s, 25s, 2min, 10min). AC2: Dead-letter queue para entregas esgotadas. AC3: Payload assinado com HMAC-SHA256 no header `X-Litix-Signature`. AC4: Timeout de delivery: 10s por tentativa. AC5: Log de delivery por evento (status, tentativas, latencia). |
| 5.3 | Como admin, quero ver o historico de entregas de webhook para debugar integracoes. | AC1: Painel de delivery logs por endpoint (ultimos 30 dias). AC2: Status por entrega: sucesso, falha, pendente, dead-letter. AC3: Visualizacao do payload enviado e response recebido. AC4: Botao "Reenviar" para entregas falhas. |

---

### Camada 2 -- Integracao (Elimina Retrabalho)

---

### Epic 6: Dashboard Multi-Advogado

**Objetivo:** Dashboard centralizado para escritorios com multiplos advogados, permitindo visao agregada e individual.

**Prioridade:** V1.0

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 6.1 | Como socio, quero ver todos os processos do escritorio em um dashboard unificado para ter visibilidade total. | AC1: Dashboard com lista paginada de todos os processos do tenant. AC2: Filtros por advogado, tribunal, area, status, periodo. AC3: Busca por CNJ, nome de parte, numero OAB. AC4: Contadores resumidos: total processos, ativos, com movimentacao recente. |
| 6.2 | Como socio, quero ver a carga de cada advogado para distribuir trabalho adequadamente. | AC1: Visao de carga por membro (processos ativos, movimentacoes pendentes). AC2: Ranking de advogados por volume de processos ativos. AC3: Filtro rapido para "processos sem responsavel". |
| 6.3 | Como advogado associado, quero ver apenas meus processos para focar no que e relevante para mim. | AC1: Toggle "Meus processos" vs "Todos do escritorio". AC2: Filtro padrao para o membro logado. AC3: Member ve seus processos + processos compartilhados. AC4: Viewer ve apenas processos explicitamente compartilhados. |

---

### Epic 7: Calculo Automatico de Prazos

**Objetivo:** Interpretar tipo de movimentacao e calcular prazo legal aplicavel por tipo de acao.

**Prioridade:** V1.1

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 7.1 | Como advogado, quero que o Litix calcule automaticamente os prazos a partir das movimentacoes para nao perder deadlines. | AC1: Engine de regras que mapeia tipo de movimentacao para prazo (dias uteis/corridos). AC2: Banco de regras configuravel por tipo de acao (civel, trabalhista, criminal, etc). AC3: Prazo exibido na ficha do processo junto a movimentacao. AC4: Contagem considera dias uteis, feriados nacionais e do tribunal. |
| 7.2 | Como advogado, quero receber alertas de prazos proximos para priorizar acoes urgentes. | AC1: Alerta especifico "Prazo em X dias" no dashboard e email. AC2: Configuravel: alertar com 5, 3, 1 dia(s) de antecedencia. AC3: Painel de "Prazos da semana" com countdown visual. AC4: Diferenciacao visual de prazos fatais vs ordenarorios. |
| 7.3 | Como socio, quero ver um calendario de prazos do escritorio para planejamento. | AC1: Visao de calendario mensal com prazos de todos os advogados. AC2: Filtro por advogado, tipo de prazo, area. AC3: Exportacao do calendario (iCal). |

---

### Epic 8: Exportacao Estruturada e Relatorios

**Objetivo:** Exportar dados processuais em formatos uteis e gerar relatorios automaticos.

**Prioridade:** V1.1

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 8.1 | Como advogado, quero exportar movimentacoes de um processo em CSV/PDF para anexar a peticoes ou enviar ao cliente. | AC1: Botao "Exportar" na ficha do processo. AC2: Formatos: CSV (dados tabulares), PDF (formatado para leitura). AC3: PDF inclui cabecalho com dados do processo e timeline de movimentacoes. AC4: Download imediato ou envio por email. |
| 8.2 | Como socio, quero receber um relatorio mensal automatico com resumo da atividade processual do escritorio. | AC1: Relatorio gerado automaticamente no dia 1 de cada mes. AC2: Conteudo: processos novos, movimentacoes, prazos cumpridos/vencidos, processos encerrados. AC3: Enviado por email para owners e admins. AC4: PDF com branding Litix e dados do escritorio. |
| 8.3 | Como advogado, quero gerar comunicados pre-preenchidos para enviar ao cliente. | AC1: Template de comunicacao selecionavel (atualizacao, citacao, sentenca). AC2: Dados do processo pre-preenchidos no template (CNJ, tribunal, movimentacao). AC3: Editavel antes de enviar. AC4: Envio por email direto da plataforma ou download. |

---

### Camada 3 -- Inteligencia (Premium)

---

### Epic 9: Portal do Cliente (Read-Only)

**Objetivo:** Link publico read-only para que o cliente do escritorio acompanhe seus processos.

**Prioridade:** V1.2

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 9.1 | Como advogado, quero gerar um link publico para que meu cliente acompanhe o processo sem me ligar toda semana. | AC1: Botao "Gerar link do cliente" na ficha do processo. AC2: URL unica com token de acesso (nao requer login). AC3: Configuravel: quais dados sao visiveis (movimentacoes sim, valores nao, etc). AC4: Link expiravel (padrao: 90 dias, renovavel). |
| 9.2 | Como cliente (cidadao), quero acompanhar meu processo em uma pagina simples para saber o que esta acontecendo. | AC1: Pagina publica responsive com dados do processo. AC2: Timeline de movimentacoes em linguagem acessivel. AC3: Status atual em destaque (ativo, aguardando sentenca, etc). AC4: Sem jargao tecnico excessivo. AC5: Sem necessidade de cadastro ou login. |

---

### Epic 10: Dashboard Analitico

**Objetivo:** Dashboards com metricas e analises sobre a carteira processual do escritorio.

**Prioridade:** V2.0

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 10.1 | Como socio, quero ver a distribuicao dos processos do escritorio por tribunal, vara, tipo e area para entender minha exposicao. | AC1: Graficos interativos: pizza (area), barras (tribunal), mapa de calor (comarca). AC2: Filtros por periodo, advogado, status. AC3: Drill-down de grafico para lista de processos. |
| 10.2 | Como socio, quero ver metricas de tempo medio de tramitacao e taxa de encerramento para medir eficiencia. | AC1: Tempo medio de tramitacao por tipo de acao e tribunal. AC2: Taxa de encerramento mensal/trimestral. AC3: Comparativo historico (mes atual vs anterior). AC4: Benchmark anonimizado contra media da plataforma (quando houver volume suficiente). |
| 10.3 | Como socio, quero receber alertas inteligentes sobre anomalias para agir proativamente. | AC1: Alerta "Processo parado ha X dias" (threshold configuravel). AC2: Alerta "Juiz substituto designado" (mudanca de magistrado). AC3: Alerta "Publicacao no DJE com nome/CPF do cliente". AC4: Alertas categorizados por severidade (informativo, atencao, urgente). |

---

### Epic 11: API Publica Documentada

**Objetivo:** API REST publica com autenticacao por API key, rate limiting, e documentacao OpenAPI para integradores.

**Prioridade:** V1.0 (estrutura basica no MVP, documentacao completa no V1)

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 11.1 | Como integrador, quero autenticar via API key para acessar os dados do meu tenant programaticamente. | AC1: Geracao de API keys no dashboard (CRUD). AC2: API key vinculada a tenant + permissoes. AC3: Autenticacao via header `Authorization: Bearer <api-key>`. AC4: Rate limiting por plano (vide secao 9). |
| 11.2 | Como integrador, quero consultar processos por CNJ ou documento via API REST para integrar no meu sistema. | AC1: `GET /api/v1/processes/:cnj` -- consulta por CNJ. AC2: `GET /api/v1/processes/search?oab=XX12345` -- busca por documento. AC3: `GET /api/v1/processes` -- lista processos do tenant (paginado). AC4: Query params para strategy, providers, enableMerge. AC5: Response segue schema `ProcessoUnificado` com provider attribution. |
| 11.3 | Como integrador, quero consultar a documentacao da API para implementar a integracao rapidamente. | AC1: Documentacao OpenAPI 3.1 publicada em `/api/docs`. AC2: Playground interativo (Swagger UI ou similar). AC3: Exemplos de request/response para cada endpoint. AC4: Guia de quickstart com curl e SDK snippets. |

---

### Epic 12: Billing e Enforcement de Planos (Stripe)

**Objetivo:** Integracao com Stripe para cobranca recorrente e enforcement de limites por plano.

**Prioridade:** MVP (basico para lancamento) -- V1.0 (completo)

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 12.1 | Como owner, quero assinar um plano para desbloquear funcionalidades premium. | AC1: Pagina de planos com comparativo de features. AC2: Checkout via Stripe (cartao de credito). AC3: Ativacao imediata do plano apos confirmacao de pagamento. AC4: Stripe Customer vinculado ao tenant. |
| 12.2 | Como sistema, preciso enforcar limites por plano para garantir sustentabilidade. | AC1: Tabela `plan_limits` com max_cases, max_users, api_rate_limit, webhook_endpoints. AC2: Middleware verifica limites antes de operacoes (adicionar processo, criar usuario, etc). AC3: Resposta amigavel quando limite atingido: "Voce atingiu o limite de X processos. Atualize seu plano para continuar." AC4: Soft-limit warning em 80% e hard-limit block em 100%. |
| 12.3 | Como owner, quero gerenciar minha assinatura para fazer upgrade, downgrade ou cancelar. | AC1: Portal de billing acessivel no dashboard (via Stripe Customer Portal). AC2: Upgrade prorrateado (cobra diferenca). AC3: Downgrade efetivo no proximo ciclo. AC4: Cancelamento com grace period (dados retidos 30 dias). |

---

### Epic 13: Admin Panel (Operacoes Litix)

**Objetivo:** Painel interno para a equipe Litix gerenciar tenants, monitorar saude do sistema, e resolver problemas.

**Prioridade:** V1.0

**User Stories:**

| ID | Story | Acceptance Criteria |
|---|---|---|
| 13.1 | Como operador Litix, quero ver o status de todos os tenants para monitorar a saude da plataforma. | AC1: Lista de tenants com plano, processos, ultimo acesso. AC2: Filtros por plano, status, periodo de criacao. AC3: Metricas agregadas: total tenants, MRR, churn. |
| 13.2 | Como operador Litix, quero ver o health de cada provider para detectar problemas rapidamente. | AC1: Dashboard de health por provider (uptime, latencia, erros). AC2: Historico de circuit breaker events. AC3: Alertas automaticos quando provider entra em circuit-open. |
| 13.3 | Como operador Litix, quero gerenciar planos e limites para ajustar a oferta comercial. | AC1: CRUD de planos com limites. AC2: Alteracoes refletem imediatamente nos tenants afetados. AC3: Audit log de alteracoes. |

---

## 6. Requisitos Nao-Funcionais

### 6.1 Performance

| Requisito | Especificacao |
|---|---|
| NFR1: Latencia de consulta por CNJ | P50 < 3s, P95 < 8s, P99 < 15s |
| NFR2: Latencia de busca por OAB (importacao) | < 60s para varredura completa (92 tribunais DataJud) |
| NFR3: Throughput de monitoramento | Processar 100.000 processos/ciclo com recorrencia de 12h |
| NFR4: Webhook delivery latency | < 5s entre deteccao de movimentacao e primeiro delivery attempt |
| NFR5: Dashboard page load | < 2s (LCP) com ISR e caching |

### 6.2 Confiabilidade e Resiliencia (Diferencial Competitivo)

| Requisito | Especificacao |
|---|---|
| NFR6: Uptime da plataforma | 99,5% (medido mensalmente, excluindo manutencao programada) |
| NFR7: Redundancia multi-provider | Se 1 provider falha, sistema continua operando com os demais (fallback automatico) |
| NFR8: Circuit breaker | Provider com > 50% de falhas em janela de 5min entra em circuit-open por 30s |
| NFR9: Webhook retry | 5 tentativas com exponential backoff; dead-letter queue apos esgotamento |
| NFR10: Recovery time | < 5min para recuperacao automatica apos falha de provider |

### 6.3 Seguranca e Compliance

| Requisito | Especificacao |
|---|---|
| NFR11: Isolamento de dados | RLS (Row Level Security) no PostgreSQL; usuario nunca acessa dados de outro tenant |
| NFR12: Autenticacao | Supabase Auth com JWT; API keys para acesso programatico |
| NFR13: LGPD compliance | Privacy-by-design: dados pessoais acessiveis apenas por usuarios autorizados; DPA com clientes enterprise; politica de retencao e exclusao |
| NFR14: Criptografia | TLS 1.3 em transito; AES-256 para dados sensiveis em repouso (API keys, secrets) |
| NFR15: Audit trail | Log de todas as operacoes senssiveis (login, consulta, exportacao, alteracao de dados) |

### 6.4 Escalabilidade

| Requisito | Especificacao |
|---|---|
| NFR16: Escalabilidade horizontal | Arquitetura stateless no frontend (Vercel); workers escalaveis (Trigger.dev) |
| NFR17: Database scaling path | Supabase Free -> Pro ($25/mes) -> Compute addon -> AWS RDS (quando custo > $500/mes) |
| NFR18: Rate limiting | Por plano: Free 60 req/min, Solo 120, Escritorio 300, Pro 1000, Enterprise custom |
| NFR19: Caching | Vercel KV para resultados de consulta (TTL 5min), limites de plano (TTL 1h), sessao (TTL 15min) |

### 6.5 Transparencia de Fonte (Diferencial Competitivo)

| Requisito | Especificacao |
|---|---|
| NFR20: Provider attribution | Toda resposta de consulta inclui `origem.provider` indicando qual(is) provider(s) contribuiram |
| NFR21: Merge transparency | Quando resultado e merge de N providers, `mergedFrom[]` lista todas as origens com timestamp |
| NFR22: Completeness scoring | `completenessScore` (0-100) calculado com base em campos preenchidos e numero de fontes |

### 6.6 SLA Contratual (Diferencial Competitivo)

| Requisito | Especificacao |
|---|---|
| NFR23: SLA de cobertura | 90%+ dos tribunais cobertos (medido como % de consultas com resultado > 0 providers) |
| NFR24: SLA de disponibilidade | Publicar status page publica com uptime por provider |
| NFR25: Compensacao | Creditos em caso de violacao de SLA para planos Pro e Enterprise |

---

## 7. Fases de Construcao e Releases

### Fase 0: Migrar Backend Existente (Fundacao)

**Duracao estimada:** 3-4 semanas
**Objetivo:** Adaptar o backend existente (Express/Node.js) para funcionar como camada de servicos do novo SaaS (Next.js + Supabase).

| Entregavel | Epic | Descricao |
|---|---|---|
| Schema multi-tenant | Epic 1 | Tabelas tenants, tenant_members, monitored_cases, plan_limits com RLS |
| Auth Supabase | Epic 1 | Signup/login, Auth Hook para tenant_id no JWT, RBAC |
| Repository Pattern | Epic 1 | Interfaces de repositorio para desacoplar da implementacao de storage |
| Migrar providers | -- | Adaptar providers existentes para usar repository pattern e tenant context |

### Fase 1: MVP (Lancamento Fechado)

**Duracao estimada:** 6-8 semanas (apos Fase 0)
**Objetivo:** Produto minimamente viavel para 50 escritorios early-adopters.

| Entregavel | Epic | Prioridade |
|---|---|---|
| Import por OAB | Epic 2 | MUST |
| Ficha unica do processo | Epic 3 | MUST |
| Monitoramento com alertas | Epic 4 | MUST |
| Webhook delivery | Epic 5 | MUST |
| Billing basico (Free + Solo) | Epic 12 | MUST |
| API basica (consulta por CNJ) | Epic 11 | SHOULD |

**Criterio de sucesso MVP:** 50 tenants ativos, < 15% churn, NPS > 30.

### Fase 2: V1.0 (Lancamento Publico)

**Duracao estimada:** 6-8 semanas (apos MVP)
**Objetivo:** Produto completo para escritorios com multiplos advogados.

| Entregavel | Epic | Prioridade |
|---|---|---|
| Dashboard multi-advogado | Epic 6 | MUST |
| API publica documentada (OpenAPI) | Epic 11 | MUST |
| Billing completo (todos os planos) | Epic 12 | MUST |
| Admin panel | Epic 13 | MUST |

### Fase 3: V1.1 (Produtividade)

**Duracao estimada:** 4-6 semanas
**Objetivo:** Features que eliminam retrabalho e aumentam retencao.

| Entregavel | Epic | Prioridade |
|---|---|---|
| Calculo automatico de prazos | Epic 7 | SHOULD |
| Exportacao CSV/PDF | Epic 8 | SHOULD |
| Relatorio mensal automatico | Epic 8 | COULD |
| Template de comunicacao | Epic 8 | COULD |

### Fase 4: V1.2 (Expansao)

**Duracao estimada:** 4-6 semanas
**Objetivo:** Features que expandem o alcance do produto (portal do cliente) e adicionam monetizacao premium.

| Entregavel | Epic | Prioridade |
|---|---|---|
| Portal do cliente (read-only) | Epic 9 | SHOULD |
| Alertas inteligentes basicos | Epic 10 (parcial) | COULD |

### Fase 5: V2.0 (Inteligencia)

**Duracao estimada:** 8-12 semanas
**Objetivo:** Camada analitica e jurimetria basica como diferencial premium.

| Entregavel | Epic | Prioridade |
|---|---|---|
| Dashboard analitico completo | Epic 10 | COULD |
| Jurimetria basica (distribuicao, tempo medio) | Epic 10 | COULD |
| Alertas inteligentes avancados | Epic 10 | COULD |

---

## 8. Mapa de Dependencias Tecnicas

```
                    Epic 1: Fundacao Multi-Tenant
                    (schema, auth, RLS, middleware)
                              |
              +---------------+---------------+
              |               |               |
         Epic 2          Epic 3          Epic 12
     Import OAB     Ficha Unica     Billing Stripe
              |               |               |
              +-------+-------+               |
                      |                       |
                 Epic 4                       |
            Monitoramento                     |
                 Alertas                      |
                      |                       |
                      +-------+-------+-------+
                              |
                         Epic 5
                    Webhook Delivery
                              |
              +---------------+---------------+
              |               |               |
         Epic 6          Epic 11         Epic 13
     Dashboard         API Publica     Admin Panel
     Multi-Adv         Documentada
              |               |
              +-------+-------+
                      |
              +-------+-------+
              |               |
         Epic 7          Epic 8
     Calc Prazos     Exportacao
                          |
                     Epic 9
                  Portal Cliente
                          |
                     Epic 10
                  Dashboard Analitico
```

### Dependencias Criticas

| Epic | Depende De | Natureza da Dependencia |
|---|---|---|
| Epic 2 (Import OAB) | Epic 1 | Precisa de tenant context e auth para associar processos |
| Epic 3 (Ficha Unica) | Epic 1 | Precisa de RLS para filtrar processos por tenant |
| Epic 4 (Monitoramento) | Epic 2, Epic 3 | Processos precisam estar importados e visiveis |
| Epic 5 (Webhook) | Epic 4 | Eventos de monitoramento disparam webhooks |
| Epic 6 (Dashboard Multi) | Epic 1, Epic 3 | Precisa de roles e ficha do processo |
| Epic 7 (Prazos) | Epic 4 | Precisa de movimentacoes monitoradas para calcular prazos |
| Epic 8 (Exportacao) | Epic 3 | Precisa de dados do processo para exportar |
| Epic 9 (Portal Cliente) | Epic 3 | Precisa de ficha do processo para exibir publicamente |
| Epic 10 (Analytics) | Epic 6 | Precisa de dados agregados do dashboard multi-advogado |
| Epic 11 (API) | Epic 1 | Precisa de API keys vinculadas a tenant |
| Epic 12 (Billing) | Epic 1 | Precisa de tenant para vincular Stripe Customer |
| Epic 13 (Admin) | Epic 1, Epic 12 | Precisa de dados de tenant e billing |

---

## 9. Precificacao e Limites por Plano

| Plano | Preco Mensal | Processos | Usuarios | API Rate Limit | Webhooks | Features Exclusivas |
|---|---|---|---|---|---|---|
| **Free** | R$ 0 | 10 | 1 | 60 req/min | 0 | Consulta + monitoramento basico |
| **Solo** | R$ 59 | 200 | 1 | 120 req/min | 1 | + Import OAB + prazos + alertas email |
| **Escritorio** | R$ 249 | 1.000 | 10 | 300 req/min | 5 | + Multi-advogado + relatorios + webhook |
| **Pro** | R$ 599 | 5.000 | 30 | 1.000 req/min | 20 | + Analytics + portal cliente + API completa |
| **Enterprise** | Custom | Ilimitado | Ilimitado | Custom | Ilimitado | + SLA contratual + suporte dedicado |

### Implementacao Tecnica (Supabase)

```sql
CREATE TABLE plan_limits (
  plan TEXT PRIMARY KEY,
  max_cases INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  api_rate_limit INTEGER NOT NULL,
  webhook_endpoints INTEGER NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'
);

INSERT INTO plan_limits VALUES
  ('free',        10,    1,    60,   0, '{"import_oab": false, "alerts_email": false}'),
  ('solo',        200,   1,    120,  1, '{"import_oab": true, "alerts_email": true}'),
  ('escritorio',  1000,  10,   300,  5, '{"import_oab": true, "alerts_email": true, "multi_member": true, "reports": true}'),
  ('pro',         5000,  30,   1000, 20, '{"import_oab": true, "alerts_email": true, "multi_member": true, "reports": true, "analytics": true, "client_portal": true, "api_full": true}'),
  ('enterprise',  -1,    -1,   -1,   -1, '{"all": true}');
```

---

## 10. Stack Tecnica

### 10.1 Arquitetura de Referencia

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 | SSR, ISR, DX excelente, ecossistema Vercel |
| Auth | Supabase Auth + Auth Hook (Edge Function) | JWT com tenant_id e role injetados |
| Database | Supabase PostgreSQL + RLS multi-tenant | Isolamento sem custo de infra separada |
| Background Jobs | Trigger.dev + Supabase pg_cron | Jobs longos (importacao, monitoramento) |
| Billing | Stripe | Padrao de mercado, webhooks robustos |
| Caching | Vercel KV (Upstash Redis) | Cache de sessao, consultas, rate limits |
| Deploy | Vercel | Deploy automatico, edge network, integra com Next.js |
| Observability | Pino (logs) + Vercel Analytics + Supabase Dashboard | Custo zero ate escala |

### 10.2 Repositorio Existente (o que migrar)

| Componente Atual | Destino | Acao |
|---|---|---|
| `src/providers/*` (5 providers) | `packages/providers/` ou `src/lib/providers/` | Migrar para usar repository pattern + tenant context |
| `src/services/orchestrator.service.ts` | `src/lib/services/orchestrator.ts` | Adaptar para Next.js API routes |
| `src/services/merge.service.ts` | `src/lib/services/merge.ts` | Reutilizar como esta |
| `src/services/monitor.service.ts` | Trigger.dev job | Migrar para job asssincrono |
| `src/services/webhook-dispatcher.service.ts` | Trigger.dev job | Migrar para job com retry |
| `src/models/*` | `src/types/` | Manter tipos, adicionar Zod schemas |

### 10.3 Padroes de Codigo

| Padrao | Especificacao |
|---|---|
| Imports | Absolutos (`@/lib/...`, `@/components/...`); nunca relativos |
| Nomenclatura | Arquivos kebab-case, componentes PascalCase, hooks `use*` |
| Validacao | Zod para todas as fronteiras (API input, form data, env vars) |
| Error handling | Try/catch com logging estruturado via Pino |
| Repository pattern | Interface -> implementacao; troca de backend sem mudar business logic |

### 10.4 Migration Path

```
Fase 0: Supabase Free ($0)
  -> ate ~200 tenants, 5GB bandwidth

Fase 1-2: Supabase Pro ($25/mes)
  -> ate ~2.000 tenants, 250GB bandwidth, 100GB storage

Fase 3+: Supabase Pro + Compute Addon
  -> ate ~10.000 tenants

Futuro: AWS (RDS + ECS/Lambda)
  -> quando custo Supabase > $500/mes ou necessidade de read replicas BR
```

---

## 11. Riscos e Mitigacoes

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|---|
| R1 | Tribunal bloqueia scraping de um provider | Media | Alto | DataJud API publica como base; 5 providers com fallback automatico |
| R2 | JusBrasil lanca produto B2B multi-provider | Media | Alto | First-mover advantage; focar em segmento nao priorizado por JusBrasil (escritorios medios); transparencia de fonte como diferencial |
| R3 | LGPD restringe tratamento de dados de partes processuais | Baixa-Media | Alto | Privacy-by-design desde dia 1; Art. 7o VI (exercicio de direitos); DPA com clientes enterprise; consulta juridica especializada |
| R4 | Custo de manutencao de cobertura de 92 tribunais | Alta | Medio | Priorizar tribunais de maior volume (TJSP, TJRJ, TJMG, TRT2); monitorar custo/beneficio por tribunal; DataJud como fallback universal |
| R5 | Price war com Escavador (que ja esta integrado como provider) | Media | Medio | Competir em SLA e qualidade, nao preco; Escavador e provider do Litix (reforcar narrativa de "acima do provider") |
| R6 | Supabase Free/Pro insuficiente para escala | Media | Medio | Repository Pattern permite migrar para AWS sem mudar business logic; monitoring de metricas de consumo |
| R7 | Complexidade de calculo de prazos por tipo de acao | Alta | Baixo | Lancamento iterativo: comecar com prazos genericos CPC; expandir por area; aceitar 80% de acuracia no V1 |
| R8 | Churn alto no Free tier sem conversao para pago | Media | Medio | Limite de 10 processos no Free cria friction natural; onboarding otimizado para demonstrar valor antes do limite |

---

## 12. Fora de Escopo

Os itens abaixo estao explicitamente **fora do escopo** deste PRD e serao avaliados em versoes futuras:

| Item | Razao | Quando Reavaliar |
|---|---|---|
| App mobile nativo (iOS/Android) | Dashboard web responsive e suficiente para MVP-V1; custo de manter 2 plataformas | V2.0+ |
| IA generativa (analise de peticoes, sumarizacao) | Complexidade alta, nao e dor primaria dos clientes | V2.0+ |
| Jurimetria preditiva (probabilidade de exito) | Requer volume massivo de dados historicos; Predictus ja oferece | V3.0+ |
| Integracao direta com PJe/ESAJ (peticao eletronica) | Fora do core (monitoramento); complexidade tecnica altissima | V3.0+ |
| Marketplace de templates juridicos | Nao e core do produto; distrai do foco | Nao planejado |
| White-label para outros SaaS | Prematura; foco em marca propria primeiro | V2.0+ se demanda |
| Suporte a processos internacionais | Mercado brasileiro ja e grande o suficiente | Nao planejado |

---

## 13. Changelog

| Versao | Data | Descricao | Autor |
|---|---|---|---|
| 1.0.0 | 2026-02-24 | PRD inicial completo | Morgan (PM Agent) |

---

*Documento gerado por Morgan (PM Agent / AIOS) com base em pesquisa de mercado (Atlas), analise competitiva (Atlas), e recomendacoes de arquitetura produzidas para o projeto Litix.*

*Proximos passos recomendados:*
1. *Revisao e aprovacao do PRD pelo stakeholder*
2. *@architect para definir arquitetura detalhada (schema completo, API contracts)*
3. *@sm para quebrar epics em stories detalhadas com acceptance criteria granulares*
4. *@dev para iniciar Fase 0 (migrar backend existente para Supabase + Next.js)*
