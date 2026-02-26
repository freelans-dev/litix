# Story LITIX-8.2: Melhorias UI de Alertas

**Epic:** Epic 4 - Monitoramento com Alertas
**Status:** In Progress
**Prioridade:** Must
**Estimativa:** 3 pontos
**Dependencias:** LITIX-8.1

---

## User Story

Como advogado, quero poder marcar alertas como lidos diretamente na pagina de alertas, e ver um botao para marcar todos como lidos.

## Acceptance Criteria

- [x] AC1: Botao "Marcar como lido" em cada alerta nao lido
- [x] AC2: Botao "Marcar todos como lidos" no topo da pagina
- [x] AC3: Alertas lidos ficam com aparencia visual distinta (opacidade reduzida)
- [x] AC4: Contador de alertas nao lidos no header atualiza apos marcar

---

## Implementacao

### Arquivos Criados
- `src/features/alerts/components/mark-read-button.tsx`
- `src/features/alerts/components/mark-all-read-button.tsx`

### Arquivos Modificados
- `src/app/dashboard/alerts/page.tsx`
