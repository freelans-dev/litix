---
description: "Autonomous Development Loop — executa stories iterativamente com estado persistente"
---

# Ralph — Autonomous Development Loop

## Overview
Ralph é o skill de desenvolvimento autônomo que executa stories iterativamente, mantendo estado entre iterações. Ideal para implementar stories completas sem interrupção.

## Workflow

### 1. Story Loading
- Receber a story (path ou ID)
- Ler o conteúdo completo da story em `docs/stories/`
- Validar que a story tem acceptance criteria definidos
- Carregar o File List existente

### 2. Planning
- Analisar acceptance criteria
- Criar plano de implementação com subtasks
- Identificar dependências entre tasks
- Estimar ordem de execução

### 3. Iterative Implementation Loop
```
REPEAT until all acceptance criteria are met:
  1. Select next uncompleted task
  2. Implement the task
  3. Run quality checks (lint, typecheck, test)
  4. Update story checkboxes [x]
  5. Update File List in story
  6. If quality check fails → fix and retry (max 3 retries)
  7. If blocked → log blocker and move to next task
```

### 4. Quality Gate
After all tasks complete:
- Run full quality gate: `npm run lint && npm run typecheck && npm test`
- Verify all acceptance criteria are met
- Update story status to "Ready for Review"

### 5. Handoff
- Summarize completed work
- List any blockers or deferred items
- Recommend next steps (QA review, deployment)

## State Persistence
- Progress saved to story checkboxes after each task
- File List updated in real-time
- Blockers logged in story Dev Notes section

## Usage
```
/ralph docs/stories/LITIX-X.Y-feature-name.md
```

## Agent
Primary: `@dev` (Dex)
Quality: `@qa` (Quinn) for final validation
