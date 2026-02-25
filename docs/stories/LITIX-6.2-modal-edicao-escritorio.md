# Story LITIX-6.2: Modal de Edicao dos Dados do Escritorio

**Epic:** Epic 6 - Edicao de Dados do Escritorio
**Status:** Ready for Dev
**Prioridade:** Must
**Estimativa:** 8 pontos
**Dependencias:** LITIX-6.1 (API PATCH)

---

## User Story

Como advogado, quero editar os dados internos do escritorio diretamente na pagina do processo, atraves de um modal intuitivo com campos organizados, para poder preencher informacoes como cliente, responsavel, contingencia e valores provisionados.

## Contexto

A pagina de detalhe (`/dashboard/cases/[cnj]`) ja exibe os dados do escritorio como read-only no card "Dados do escritorio". Esta story adiciona um botao "Editar" que abre um modal/sheet com formulario para todos os 14 campos editaveis. O formulario usa o PATCH endpoint criado em LITIX-6.1.

---

## Acceptance Criteria

- [ ] AC1: Botao "Editar" visivel no card "Dados do escritorio" na pagina de detalhe do processo
- [ ] AC2: Clicar no botao abre um Sheet (side panel) com formulario organizado em secoes
- [ ] AC3: Secao "Cliente": campos `cliente` (text com autocomplete de clientes existentes do tenant), `relacionamento` (text)
- [ ] AC4: Secao "Equipe": campos `responsavel` (text com autocomplete de membros do tenant), `setor` (select com opcoes)
- [ ] AC5: Secao "Risco e Contingencia": campos `contingencia` (select: ativa/passiva), `probabilidade` (select: provavel/possivel/remota), `risco` (select: baixo/medio/alto/critico), `faixa` (text)
- [ ] AC6: Secao "Valores": campos `provisionamento` (currency input R$), `reserva` (currency input R$)
- [ ] AC7: Secao "Resultado": campos `resultado` (textarea), `desfecho` (textarea)
- [ ] AC8: Secao "Notas": campo `notes` (textarea com contagem de caracteres max 2000)
- [ ] AC9: Botao "Salvar" envia PATCH para `/api/v1/cases/[id]` e fecha o sheet com toast de sucesso
- [ ] AC10: Erros de validacao exibidos inline nos campos
- [ ] AC11: Loading state no botao enquanto salva
- [ ] AC12: Apos salvar, os dados na pagina de detalhe atualizam sem reload (revalidate path)

---

## Dev Notes

### Componentes necessarios

```
src/features/cases/components/
  edit-office-data-sheet.tsx   -- NOVO: Sheet com formulario
  edit-office-data-form.tsx    -- NOVO: Form com secoes
```

### Autocomplete de cliente

Para o campo `cliente`, buscar clientes unicos do tenant:
```typescript
// Query para autocomplete
const { data } = await supabase
  .from('monitored_cases')
  .select('cliente')
  .eq('tenant_id', tenantId)
  .not('cliente', 'is', null)
  .order('cliente')
// Deduplicate in JS
const uniqueClients = [...new Set(data?.map(d => d.cliente))]
```

### Autocomplete de responsavel

Buscar membros do tenant:
```typescript
const { data } = await supabase
  .from('tenant_members')
  .select('id, user_id, role, profiles(full_name, email)')
  .eq('tenant_id', tenantId)
```

### Selects pre-definidos

```typescript
const SETORES = ['Contencioso', 'Consultivo', 'Trabalhista', 'Tributario', 'Familia', 'Criminal', 'Empresarial', 'Outro']
const CONTINGENCIAS = [{ value: 'ativa', label: 'Ativa' }, { value: 'passiva', label: 'Passiva' }]
const PROBABILIDADES = [{ value: 'provavel', label: 'Provavel' }, { value: 'possivel', label: 'Possivel' }, { value: 'remota', label: 'Remota' }]
const RISCOS = [{ value: 'baixo', label: 'Baixo' }, { value: 'medio', label: 'Medio' }, { value: 'alto', label: 'Alto' }, { value: 'critico', label: 'Critico' }]
```

### Currency input

Para `provisionamento` e `reserva`, usar input numerico com mascara BRL:
```typescript
// Format: R$ 50.000,00
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
```

### Revalidacao apos salvar

```typescript
import { useRouter } from 'next/navigation'
const router = useRouter()
// Apos PATCH sucesso:
router.refresh() // Revalida server components da pagina
```

### Integracao com pagina de detalhe

Modificar `src/app/dashboard/cases/[cnj]/page.tsx`:
- Adicionar botao "Editar" no header do card "Dados do escritorio"
- Importar e renderizar `EditOfficeDataSheet` passando o caseData
- O sheet e um Client Component, a pagina continua Server Component

### Arquivos a criar/modificar

```
src/features/cases/components/edit-office-data-sheet.tsx  -- NOVO
src/features/cases/components/edit-office-data-form.tsx   -- NOVO
src/app/dashboard/cases/[cnj]/page.tsx                    -- MODIFICAR: adicionar botao editar
src/app/api/v1/cases/[cnj]/suggestions/route.ts           -- NOVO: autocomplete de clientes/responsaveis
```

---

## Tasks

- [ ] Task 1: Criar componente EditOfficeDataSheet
  - [ ] Subtask 1.1: Sheet/Drawer com header e scroll
  - [ ] Subtask 1.2: Formulario com secoes organizadas
  - [ ] Subtask 1.3: Selects para contingencia, probabilidade, risco
  - [ ] Subtask 1.4: Currency inputs para provisionamento e reserva
  - [ ] Subtask 1.5: Textarea para resultado, desfecho, notas

- [ ] Task 2: Autocomplete de cliente e responsavel
  - [ ] Subtask 2.1: API GET `/api/v1/cases/[cnj]/suggestions` retornando clientes e membros unicos
  - [ ] Subtask 2.2: Componente de autocomplete/combobox

- [ ] Task 3: Integrar na pagina de detalhe
  - [ ] Subtask 3.1: Botao "Editar" no card Dados do Escritorio
  - [ ] Subtask 3.2: Passar caseData para o Sheet
  - [ ] Subtask 3.3: Revalidar pagina apos salvar

- [ ] Task 4: Testes visuais
  - [ ] Subtask 4.1: Modal abre e fecha corretamente
  - [ ] Subtask 4.2: Dados salvos refletem na pagina
  - [ ] Subtask 4.3: Validacao inline funciona
  - [ ] Subtask 4.4: Toast de sucesso/erro

---

## Definition of Done

- [ ] Sheet de edicao funcional com todos os campos
- [ ] Autocomplete de cliente e responsavel funcionando
- [ ] Dados salvos via PATCH e pagina atualizada
- [ ] Story status: Ready for Review
