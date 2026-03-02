# Story LITIX-2.3: Tela de Resultado da Importacao com Progresso em Tempo Real

**Epic:** Epic 2 - Import Automatico por OAB
**Status:** Done
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-2.2

---

## User Story

Como advogado, quero ver em tempo real o progresso da importacao dos meus processos e revisar os resultados antes de confirmar o monitoramento.

## Contexto

Importar centenas de processos pode levar 1-5 minutos. O advogado precisa de feedback visual para saber que algo esta acontecendo e entender o resultado. A tela de resultado e o primeiro contato com os dados reais do produto — precisa impressionar e demonstrar valor imediatamente.

---

## Acceptance Criteria

- [x]AC1: Tela `/dashboard/import/:importId` exibe progress bar em tempo real via Supabase Realtime (subscreve changes em `oab_imports`)
- [x]AC2: Progress bar mostra percentual (imported/total_found), numero de processos encontrados e tribunais cobertos
- [x]AC3: Apos conclusao, exibe lista paginada dos processos importados com: CNJ, tribunal, classe, partes, data de distribuicao, provider de origem
- [x]AC4: Badge de provider attribution em cada processo (DataJud, Judit, Escavador, Merged)
- [x]AC5: Botao "Remover" em cada processo para excluir da carteira antes de confirmar
- [x]AC6: Botao "Confirmar importacao" habilita monitoramento automatico em todos os processos nao removidos
- [x]AC7: Resumo final: "X processos importados em Y tribunais. Monitoramento ativo."
- [x]AC8: Se importacao falhar, exibe mensagem de erro com opcao de tentar novamente
- [x]AC9: Redireciona para dashboard principal apos confirmacao

---

## Dev Notes

### Supabase Realtime

```typescript
// src/features/import/hooks/use-import-progress.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useImportProgress(importId: string) {
  const [progress, setProgress] = useState<OabImport | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`oab_import_${importId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'oab_imports',
        filter: `id=eq.${importId}`,
      }, (payload) => setProgress(payload.new as OabImport))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [importId])

  return progress
}
```

### Componentes/Arquivos Esperados

```
src/
  app/
    dashboard/
      import/
        [importId]/
          page.tsx                    -- Pagina de resultado de importacao
  features/
    import/
      components/
        import-progress.tsx          -- Progress bar com stats em tempo real
        import-results-table.tsx     -- Tabela de processos importados
        provider-badge.tsx           -- Badge colorido por provider
        import-summary.tsx           -- Resumo final pos-confirmacao
      hooks/
        use-import-progress.ts       -- Supabase Realtime hook
        use-import-results.ts        -- Lista de processos importados
      services/
        import.service.ts
```

---

## Tasks

- [x]Task 1: Implementar hook de progresso em tempo real
  - [x]Subtask 1.1: `use-import-progress.ts` com Supabase Realtime channel
  - [x]Subtask 1.2: `import-progress.tsx` com progress bar animada e stats

- [x]Task 2: Implementar lista de resultados
  - [x]Subtask 2.1: `import-results-table.tsx` com paginacao, filtros por tribunal e provider
  - [x]Subtask 2.2: `provider-badge.tsx` com cores por provider (DataJud=azul, Judit=verde, etc)
  - [x]Subtask 2.3: Acao de "Remover processo" com confirmacao

- [x]Task 3: Implementar confirmacao de importacao
  - [x]Subtask 3.1: API `POST /api/v1/import/:importId/confirm` que habilita monitoramento
  - [x]Subtask 3.2: `import-summary.tsx` com resumo e redirect para dashboard

- [x]Task 4: Testes
  - [x]Subtask 4.1: Progress bar atualiza em tempo real conforme job progride
  - [x]Subtask 4.2: Remover processo antes de confirmar exclui da lista
  - [x]Subtask 4.3: Confirmacao redireciona para dashboard com processos monitorados

---

## Definition of Done

- [x]Progress bar em tempo real funcionando via Supabase Realtime
- [x]Lista de processos importados com provider attribution
- [x]Fluxo de confirmacao completo
- [x]Testes passando
- [x]Code review aprovado
- [x]Story status: Ready for Review
