# CLAUDE.md - Synkra AIOS ({{projectName}})

Este arquivo configura o comportamento do Claude Code ao trabalhar neste repositório.

---

## Constitution

O AIOS possui uma **Constitution formal** com princípios inegociáveis e gates automáticos.

**Documento completo:** `.aios-core/constitution.md`

**Princípios fundamentais:**

| Artigo | Princípio | Severidade |
|--------|-----------|------------|
| I | CLI First | NON-NEGOTIABLE |
| II | Agent Authority | NON-NEGOTIABLE |
| III | Story-Driven Development | MUST |
| IV | No Invention | MUST |
| V | Quality First | MUST |
| VI | Absolute Imports | SHOULD |

**Gates automáticos bloqueiam violações.** Consulte a Constitution para detalhes completos.

---

## Language Configuration

Language preference is handled by Claude Code's native `language` setting (v2.1.0+).
Configure in `~/.claude/settings.json` (global) or `.claude/settings.json` (project):

```json
{ "language": "portuguese" }
```

The installer writes this automatically during `npx aios-core install`. No language config in `core-config.yaml`.

---

## Premissa Arquitetural: CLI First

O Synkra AIOS segue uma hierarquia clara de prioridades que deve guiar **TODAS** as decisões:

```
CLI First → Observability Second → UI Third
```

| Camada | Prioridade | Descrição |
|--------|------------|-----------|
| **CLI** | Máxima | Onde a inteligência vive. Toda execução, decisões e automação. |
| **Observability** | Secundária | Observar e monitorar o que acontece no CLI em tempo real. |
| **UI** | Terciária | Gestão pontual e visualizações quando necessário. |

### Princípios Derivados

1. **A CLI é a fonte da verdade** - Dashboards apenas observam, nunca controlam
2. **Funcionalidades novas devem funcionar 100% via CLI** antes de ter qualquer UI
3. **A UI nunca deve ser requisito** para operação do sistema
4. **Observabilidade serve para entender** o que o CLI está fazendo, não para controlá-lo
5. **Ao decidir onde implementar algo**, sempre prefira CLI > Observability > UI

> **Referência formal:** Constitution Artigo I - CLI First (NON-NEGOTIABLE)

---

## Estrutura do Projeto

```
{{projectName}}/
├── .aios-core/              # Core do framework
│   ├── core/                # Módulos principais (orchestration, memory, etc.)
│   ├── data/                # Knowledge base, entity registry, technical preferences
│   ├── development/         # Agents, tasks, workflows, scripts, personas
│   └── product/             # Templates, checklists
├── .claude/
│   ├── commands/            # Comandos slash AIOS
│   │   └── AIOS/agents/     # Agentes Core (sincronizados do .aios-core)
│   ├── hooks/               # Hooks de governança
│   ├── rules/               # Regras de contexto
│   └── settings.local.json  # Configuração local de hooks
├── docs/
│   └── stories/             # Development stories (active/, completed/, epics/)
└── ...                      # Código do projeto
```

---

## Sistema de Agentes

O AIOS possui agentes organizados em grupos. Disponibilidade varia por IDE.

### Grupo 1 — Core AIOS (multi-IDE via ideSync)

Sincronizados de `.aios-core/development/agents/` para Claude Code, Codex, Gemini, Cursor.

| Agente | Persona | Escopo Principal |
|--------|---------|------------------|
| `@dev` | Dex | Implementação de código |
| `@qa` | Quinn | Testes e qualidade |
| `@architect` | Aria | Arquitetura e design técnico |
| `@pm` | Morgan | Product Management, PRD, epics |
| `@po` | Nova | Product Owner, backlog, stories |
| `@sm` | River | Scrum Master, sprints, criação de stories |
| `@analyst` | Alex | Pesquisa, análise de negócios |
| `@data-engineer` | Dara | Database design, migrations, schema |
| `@ux-design-expert` | Uma | UX/UI design |
| `@devops` | Gage | CI/CD, git push (EXCLUSIVO) |
| `@aios-master` | Pax | Orquestrador geral do framework |
| `@squad-creator` | — | Criação guiada de squads |

### Grupo 2 — Chiefs de Domínio (Claude Code only)

Agentes de orquestração especializados. Cada Chief coordena um grupo interno de especialistas usando sistema de **Tiers**: Tier 0 (diagnóstico obrigatório) → Tier 1-2 (execução) → validação final. **Nunca commitam ao git.**

> **Nota:** Chiefs são opcionais e instalados separadamente via `npx aios-core install --chiefs`.

| Agente | Domínio | Especialistas internos |
|--------|---------|----------------------|
| `@copy-chief` | Copywriting | 24 copywriters (Gary Halbert, Ogilvy, Dan Kennedy, Eugene Schwartz...) |
| `@story-chief` | Storytelling | 12 storytellers (Joseph Campbell, Blake Snyder, Oren Klaff...) |
| `@data-chief` | Data Intelligence | Peter Fader (CLV/RFM), Sean Ellis (AARRR), Nick Mehta... |
| `@design-chief` | Design | Marty Neumeier, Aaron Draplin, Brad Frost, Chris Do... |
| `@cyber-chief` | Cybersecurity | Georgia Weidman, Peter Kim, Jim Manico, Chris Sanders... |
| `@legal-chief` | Legal BR + Global | Brad Feld, Ken Adams, especialistas LGPD + tributário BR |
| `@traffic-masters-chief` | Paid Traffic | Molly Pittman, Depesh Mandalia, Kasim Aslam, Tom Breeze... |
| `@tools-orchestrator` | Frameworks & Tools | tools-reviewer, tools-creator, tools-extractor, tools-validator |
| `@design-system` | Design System | Brad Frost (Atomic Design), 36 missões — **bypassPermissions** |
| `@db-sage` | Database Supabase/Postgres | Autônomo, KISS Gate, 36 missões — **bypassPermissions** |

### Grupo 3 — Orquestração Especializada (Claude Code only)

> **Nota:** Instalados via `npx aios-core install --chiefs`.

| Agente | Papel |
|--------|-------|
| `@squad` | Orquestrador-mestre de criação de squads (invoca subagentes: oalanicolas, pedro-valerio, sop-extractor) |
| `@oalanicolas` | Mind Cloning Architect — extrai Voice DNA e Thinking DNA de mentes elite |
| `@pedro-valerio` | Process Absolutist — valida workflows, audita veto conditions e fluxo unidirecional |
| `@sop-extractor` | SOP Extraction Specialist — extrai SOPs de conteúdos e entrevistas |

### Agentes com bypassPermissions

> **NOTA:** `@design-system` e `@db-sage` têm `bypassPermissions: true` — operam sem pedir aprovação de tool use ao usuário. Os hooks de governança foram ajustados para funcionar com eles: `@design-system` não toca paths protegidos pelos hooks; `@db-sage` cria plan doc antes da migration (passa `enforce-architecture-first`) e usa `psql -f` em vez de DDL inline (passa `sql-governance`). Ver seção Hooks de Governança para detalhes.

### Comandos de Agentes

Use prefixo `*` para comandos:
- `*help` - Mostrar comandos disponíveis
- `*create-story` - Criar story de desenvolvimento
- `*task {name}` - Executar task específica
- `*exit` - Sair do modo agente

### Mapeamento Agente → Codebase

| Agente | Diretórios Principais |
|--------|----------------------|
| `@dev` | `src/`, código de aplicação |
| `@architect` | `docs/architecture/`, system design |
| `@data-engineer` | database, migrations, schema |
| `@qa` | `tests/`, `*.test.*`, quality gates |
| `@po` | `docs/stories/`, epics, requirements |
| `@devops` | CI/CD, git operations |
| `@db-sage` | database schema, RLS, migrations |
| `@design-system` | componentes UI, tokens, design system |
| `@copy-chief` | copy, landing pages, ad copy, email |
| `@tools-orchestrator` | `.aios-core/data/`, frameworks, mental models |
| `@squad` | `squads/`, `.aios-core/development/agents/` |

---

## Skills Disponíveis

Skills são workflows especializados invocados via `/skill-name`. Ficam em `.claude/skills/`.

> **Nota:** Skills são instaladas conforme disponibilidade. Use `npx aios-core install --skills` para instalar todas.

| Skill | Uso | Agente Principal |
|-------|-----|-----------------|
| `architect-first` | Validação arquitetural pré-implementação | `@architect` |
| `clone-mind` | Pipeline 9 camadas para clonar mentes (checkpoint humano L6-L8) | `@oalanicolas` |
| `enhance-workflow` | Pipeline multi-agente 5 fases com Domain Roundtable (15 domínios) | `@aios-master` |
| `ralph` | Autonomous Development Loop — executa stories iterativamente com estado | `@dev` |
| `brand-book-generator` | Template e processo para Brand Books (10 seções) | Squad branding |
| `brand-qa-checklist` | QA por tipo de entrega de marca | Squad branding |
| `brand-strategy-brief` | Brief estratégico de marca (11 seções) | Squad branding |
| `content-calendar` | Calendário editorial e estratégia de conteúdo | Squad branding |
| `copy-frameworks` | Biblioteca AIDA, PAS, BAB, 4Ps, templates por canal | `@copy-chief` |
| `mcp-builder` | Construir MCP servers (Node e Python) | `@devops` |
| `skill-creator` | Criar novas skills com scripts de validação | `@aios-master` |
| `synapse` | Context engine — domains, layers, rules, manifest | `@aios-master` |

---

## Pipeline por Tipo de Missão

Escolha o pipeline conforme o tipo de trabalho. Pipelines podem ser combinados.

| Tipo de Missão | Pipeline | Notas |
|----------------|----------|-------|
| **Produto / Software** | `@pm` → `@sm` → `@dev` → `@qa` → `@devops` | Pipeline core AIOS. Stories em `docs/stories/` |
| **Arquitetura** | `@architect` → `@dev` → `@qa` → `@devops` | Usar skill `architect-first` antes de `@dev` |
| **Database** | `@architect` → `@db-sage` → `@qa` → `@devops` | `@db-sage` substitui `@data-engineer` em missões complexas |
| **Design System** | `@ux-design-expert` → `@design-chief` → `@design-system` → `@dev` | `@design-system` entrega componentes; `@dev` consome |
| **Conteúdo / Copy** | `@pm` → `@copy-chief` → `@story-chief` → revisão `@qa` | Chiefs operam autonomamente; `@qa` valida entrega final |
| **Tráfego Pago** | `@pm` → `@traffic-masters-chief` → `@copy-chief` → revisão | Strategy first, depois copy executado |
| **Marca Completa** | Squad `elite-branding-marketing` (pipeline interno próprio) | Pipeline do squad próprio |
| **Clonagem de Mente** | skill `clone-mind` → `@oalanicolas` → `@pedro-valerio` | Checkpoint humano obrigatório nas camadas L6-L8 |
| **Criação de Squad** | `@squad` (orquestra oalanicolas + pedro-valerio + sop-extractor) | Usar skill `squad` como guia |
| **Segurança** | `@cyber-chief` → `@dev` (fix) → `@qa` → `@devops` | `@cyber-chief` diagnóstica; `@dev` corrige |
| **Legal** | `@legal-chief` → validação humana → `@pm` (incorpora no PRD) | Nunca implementar contrato/cláusula sem validação humana |
| **Autonomous Loop** | skill `ralph` + autoClaude v3.0 (worktrees) | Para execução iterativa de stories sem interrupção |

---

## Story-Driven Development

1. **Trabalhe a partir de stories** - Todo desenvolvimento começa com uma story em `docs/stories/`
2. **Atualize progresso** - Marque checkboxes conforme completa: `[ ]` → `[x]`
3. **Rastreie mudanças** - Mantenha a seção File List na story
4. **Siga critérios** - Implemente exatamente o que os acceptance criteria especificam

### Workflow de Story (Core)
```
@po *create-story → @dev implementa → @qa testa → @devops push
```

### Workflow Autônomo (ralph + autoClaude)
```
skill ralph → autoClaude worktree → @dev loop → @qa gate → @devops merge
```

---

## Hooks de Governança

Hooks ativos em `.claude/hooks/`. Executam automaticamente em eventos Claude Code.

| Hook | Arquivo | O que governa | Agentes afetados |
|------|---------|--------------|-----------------|
| Enforce Architecture First | `enforce-architecture-first.py` | Bloqueia Write/Edit em paths protegidos sem doc prévia | `@dev`, `@db-sage` |
| Mind Clone Governance | `mind-clone-governance.py` | Governança do processo de clonagem de mentes + checkpoint L6-L8 | `@oalanicolas`, skill `clone-mind` |
| Pre-commit Version Check | `pre-commit-version-check.sh` | Valida versão antes de commits | `@devops` |
| Precompact Session Digest | `precompact-session-digest.js` | Salva digest de sessão antes de compactação | Todos |
| Read Protection | `read-protection.py` | Protege leitura de arquivos sensíveis | Todos |
| Slug Validation | `slug-validation.py` | Valida slugs de agentes/squads | `@squad`, `@squad-creator` |
| SQL Governance | `sql-governance.py` | Bloqueia DDL inline via Bash; permite file-based (`psql -f`) e supabase CLI | `@db-sage` |
| Synapse Engine | `synapse-engine.js` | Motor do sistema Synapse de injeção de contexto | Todos |
| Write Path Validation | `write-path-validation.py` | Valida caminhos de escrita | Todos |

**Status de conflitos (resolvido):**
- `@design-system` — sem conflito real: escreve em paths de UI, não toca paths protegidos.
- `@db-sage` — resolvido: cria plan doc antes da migration (passa `enforce-architecture-first`) e usa `psql -f` (passa `sql-governance`).

> **Nota:** Hooks Python/Shell requerem Python 3 instalado. Hooks JS rodam nativamente.

---

## Padrões de Código

### Convenções de Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `WorkflowList` |
| Hooks | prefixo `use` | `useWorkflowOperations` |
| Arquivos | kebab-case | `workflow-list.tsx` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Interfaces | PascalCase + sufixo | `WorkflowListProps` |

### Imports
**Sempre use imports absolutos.** Nunca use imports relativos.
```typescript
// Correto
import { useStore } from '@/stores/feature/store'

// Errado
import { useStore } from '../../../stores/feature/store'
```

**Ordem de imports:**
1. React/core libraries
2. External libraries
3. UI components
4. Utilities
5. Stores
6. Feature imports
7. CSS imports

### TypeScript
- Sem `any` - Use tipos apropriados ou `unknown` com type guards
- Sempre defina interface de props para componentes
- Use `as const` para objetos/arrays constantes
- Tipos de ref explícitos: `useRef<HTMLDivElement>(null)`

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  logger.error(`Failed to ${operation}`, { error })
  throw new Error(`Failed to ${operation}: ${error instanceof Error ? error.message : 'Unknown'}`)
}
```

---

## Testes & Quality Gates

### Comandos de Teste
```bash
npm test                    # Rodar testes
npm run test:coverage       # Testes com cobertura
npm run lint                # ESLint
npm run typecheck           # TypeScript
```

### Quality Gates (Pre-Push)
Antes de push, todos os checks devem passar:
```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # Jest / Vitest
```

---

## Convenções Git

### Commits
Seguir Conventional Commits:
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `test:` - Testes
- `chore:` - Manutenção
- `refactor:` - Refatoração

**Referencie story ID:** `feat: implement feature [Story 2.1]`

### Branches
- `main` - Branch principal
- `feat/*` - Features
- `fix/*` - Correções
- `docs/*` - Documentação

### Push Authority
**Apenas `@devops` pode fazer push para remote.**

---

## Otimização Claude Code

### Uso de Ferramentas
| Tarefa | Use | Não Use |
|--------|-----|---------|
| Buscar conteúdo | `Grep` tool | `grep`/`rg` no bash |
| Ler arquivos | `Read` tool | `cat`/`head`/`tail` |
| Editar arquivos | `Edit` tool | `sed`/`awk` |
| Buscar arquivos | `Glob` tool | `find` |
| Operações complexas | `Task` tool | Múltiplos comandos manuais |

### Performance
- Prefira chamadas de ferramentas em batch
- Use execução paralela para operações independentes
- Cache dados frequentemente acessados durante a sessão

### Gerenciamento de Sessão
- Rastreie progresso da story durante a sessão
- Atualize checkboxes imediatamente após completar tasks
- Mantenha contexto da story atual sendo trabalhada
- Salve estado importante antes de operações longas

### Recuperação de Erros
- Sempre forneça sugestões de recuperação para falhas
- Inclua contexto do erro em mensagens ao usuário
- Sugira procedimentos de rollback quando apropriado

---

## Comandos Frequentes

### Desenvolvimento
```bash
npm run dev                 # Iniciar desenvolvimento
npm test                    # Rodar testes
npm run lint                # Verificar estilo
npm run typecheck           # Verificar tipos
npm run build               # Build produção
```

### AIOS
```bash
npx aios-core install       # Instalar AIOS
npx aios-core doctor        # Diagnóstico do sistema
npx aios-core info          # Informações do sistema
```

### Sync de Agentes
```bash
npm run sync:ide:claude     # Sincronizar agentes Core para Claude Code
npm run sync:ide:codex      # Sincronizar agentes Core para Codex CLI
npm run sync:ide:gemini     # Sincronizar agentes Core para Gemini CLI
npm run validate:parity     # Verificar paridade multi-IDE
```

---

## Technical Preferences

Preferências técnicas do projeto estão em `.aios-core/data/technical-preferences.md`.
Tech presets disponíveis em `.aios-core/data/tech-presets/`.

Configure o preset ativo em `core-config.yaml`:
```yaml
techPreset:
  active: nextjs-react  # ou outro preset disponível
```

---

## MCP Usage

Ver `.claude/rules/mcp-usage.md` para regras detalhadas.

**Resumo:**
- Preferir ferramentas nativas do Claude Code sobre MCP
- MCP Docker Gateway apenas quando explicitamente necessário
- `@devops` gerencia toda infraestrutura MCP

---

## Debug

### Habilitar Debug
```bash
export AIOS_DEBUG=true
```

### Logs
```bash
tail -f .aios/logs/agent.log
```

---

*Synkra AIOS Claude Code Configuration v4.3*
*CLI First | Observability Second | UI Third*
*Installed: {{timestamp}} | AIOS v{{aiosVersion}}*
