# Story LITIX-3.3: Consulta Avulsa por CNJ com Opcao de Monitorar

**Epic:** Epic 3 - Ficha Unica do Processo
**Status:** Draft
**Prioridade:** Must
**Estimativa:** 3 pontos
**Dependencias:** LITIX-3.1

---

## User Story

Como advogado, quero buscar qualquer processo pelo numero CNJ para consultar seus dados mesmo que ele nao esteja na minha carteira monitorada.

## Contexto

Alem dos processos importados por OAB, o advogado precisa consultar processos avulsos (de clientes eventuais, consultas rapidas, etc.). A consulta avulsa usa o orchestrator existente, exibe a ficha unificada e oferece a opcao de adicionar ao monitoramento — convertendo uma consulta em monitoramento recorrente.

---

## Acceptance Criteria

- [ ] AC1: Campo de busca por CNJ disponivel no header do dashboard (formato `NNNNNNN-DD.AAAA.J.TT.OOOO` com mascara)
- [ ] AC2: Busca dispara `GET /api/v1/processes/:cnj` com orchestrator race strategy
- [ ] AC3: Resultado exibe ficha completa (LITIX-3.1) mesmo para processos nao monitorados
- [ ] AC4: Botao "Adicionar ao monitoramento" na ficha — ao clicar, insere em `monitored_cases` e `case_members`
- [ ] AC5: Consultas avulsas sao contabilizadas no limite do plano (`plan_limits.max_cases`) — ao atingir limite, exibe aviso de upgrade
- [ ] AC6: Historico de ultimas 10 consultas avulsas salvo em localStorage para acesso rapido
- [ ] AC7: CNJ invalido (formato incorreto) rejeita no frontend antes de chamar API
- [ ] AC8: Processo nao encontrado em nenhum provider exibe mensagem clara

---

## Dev Notes

### Validacao de CNJ

```typescript
// src/features/processes/schemas/process.schema.ts
import { z } from 'zod'

export const CNJSchema = z.string().regex(
  /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/,
  'Formato invalido. Use: NNNNNNN-DD.AAAA.J.TT.OOOO'
)
```

### Componentes/Arquivos Esperados

```
src/
  features/
    search/
      components/
        cnj-search-bar.tsx           -- Campo de busca no header com mascara
        search-history.tsx           -- Dropdown de historico de buscas
      hooks/
        use-cnj-search.ts
      schemas/
        search.schema.ts
```

---

## Tasks

- [ ] Task 1: Implementar campo de busca no header
  - [ ] Subtask 1.1: `cnj-search-bar.tsx` com mascara de CNJ e validacao
  - [ ] Subtask 1.2: `search-history.tsx` com historico localStorage
  - [ ] Subtask 1.3: Integrar no layout do dashboard

- [ ] Task 2: Implementar botao "Adicionar ao monitoramento"
  - [ ] Subtask 2.1: API `POST /api/v1/processes/:cnj/monitor` que insere em monitored_cases + case_members
  - [ ] Subtask 2.2: Botao na ficha de processo (visivel apenas se nao esta monitorando)
  - [ ] Subtask 2.3: Verificacao de limite do plano antes de adicionar

- [ ] Task 3: Testes
  - [ ] Subtask 3.1: CNJ invalido rejeitado no frontend
  - [ ] Subtask 3.2: CNJ valido retorna ficha do processo
  - [ ] Subtask 3.3: "Adicionar ao monitoramento" insere nos dados e atualiza UI

---

## Definition of Done

- [ ] Campo de busca no header com mascara e historico
- [ ] Consulta avulsa retorna ficha completa
- [ ] Fluxo de adicionar ao monitoramento funcionando
- [ ] Testes passando
- [ ] Code review aprovado
- [ ] Story status: Ready for Review
