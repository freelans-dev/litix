# Story LITIX-7.3: Seletor de Cliente nos Processos

**Epic:** Epic 7 - Entidade de Cliente
**Status:** Ready for Dev
**Prioridade:** Must
**Estimativa:** 5 pontos
**Dependencias:** LITIX-7.2 (CRUD API)

---

## User Story

Como advogado, quero vincular um cliente cadastrado a cada processo diretamente no formulario de edicao, com busca por nome, para substituir o campo texto livre por uma referencia ao cadastro de clientes.

## Contexto

O campo `cliente` (texto livre) no edit sheet sera substituido por um seletor que busca na tabela `clients`. Ao selecionar, preenche `client_id` no processo. O campo TEXT `cliente` sera mantido em sync (preenchido automaticamente com o nome do cliente selecionado) para retrocompatibilidade com webhook e busca.

---

## Acceptance Criteria

- [ ] AC1: Campo "Cliente" no edit sheet substituido por combobox com busca
- [ ] AC2: Combobox busca clientes do tenant via GET `/api/v1/clients?q=...`
- [ ] AC3: Opcao "Criar novo cliente" no final da lista abre inline fields para nome + documento
- [ ] AC4: Ao selecionar cliente, PATCH envia `client_id` + `cliente` (nome do client)
- [ ] AC5: Na pagina de detalhe, "Cliente" exibe nome com link para detalhes se client_id existir
- [ ] AC6: PATCH `/api/v1/cases/[cnj]` aceita campo `client_id` (UUID)
- [ ] AC7: Coluna "Cliente" visivel na lista de processos (`/dashboard/cases`)
- [ ] AC8: Webhook payload inclui `client_id` e dados basicos do cliente

---

## Dev Notes

### Atualizar PATCH schema

```typescript
// Adicionar ao patchSchema em src/app/api/v1/cases/[cnj]/route.ts
client_id: z.string().uuid().nullable().optional(),
```

### Combobox no edit sheet

Usar o componente Input existente com datalist nativo para simplicidade, ou criar um dropdown custom:

```typescript
// Busca clientes conforme usuario digita
const [clients, setClients] = useState([])
const [query, setQuery] = useState('')

useEffect(() => {
  if (query.length < 2) return
  fetch(`/api/v1/clients?q=${query}&limit=10`)
    .then(r => r.json())
    .then(d => setClients(d.data))
}, [query])
```

### Sync client_id -> cliente TEXT

No PATCH handler, quando `client_id` e enviado, buscar o nome do cliente e preencher `cliente` automaticamente:

```typescript
if (updates.client_id) {
  const { data: client } = await supabase
    .from('clients')
    .select('name')
    .eq('id', updates.client_id)
    .single()
  if (client) updates.cliente = client.name
}
```

### Lista de processos

Modificar `src/app/dashboard/cases/page.tsx`:
- Adicionar coluna "Cliente" na tabela
- Mostrar `caseData.cliente` (TEXT, sempre em sync)

### Webhook payload

Modificar `src/lib/webhook-payload.ts`:
- Adicionar `client_id` ao payload
- Adicionar objeto `client` com dados basicos se client_id existir

### Arquivos a modificar

```
src/app/api/v1/cases/[cnj]/route.ts              -- Adicionar client_id ao PATCH + sync
src/features/cases/components/edit-office-data-sheet.tsx -- Combobox de clientes
src/app/dashboard/cases/[cnj]/page.tsx            -- Link para cliente
src/app/dashboard/cases/page.tsx                  -- Coluna cliente na lista
src/lib/webhook-payload.ts                        -- client_id + client object
```

---

## Tasks

- [ ] Task 1: Atualizar PATCH endpoint para aceitar client_id
  - [ ] Subtask 1.1: Adicionar client_id ao schema
  - [ ] Subtask 1.2: Auto-sync client_id -> cliente (nome)

- [ ] Task 2: Combobox de clientes no edit sheet
  - [ ] Subtask 2.1: Fetch clientes com debounce
  - [ ] Subtask 2.2: Dropdown com resultados
  - [ ] Subtask 2.3: Opcao "Criar novo" inline

- [ ] Task 3: Integracoes visuais
  - [ ] Subtask 3.1: Coluna "Cliente" na lista de processos
  - [ ] Subtask 3.2: Link para cliente na pagina de detalhe

- [ ] Task 4: Webhook payload
  - [ ] Subtask 4.1: client_id no payload

---

## Definition of Done

- [ ] Seletor de clientes funcional no edit sheet
- [ ] client_id vincula processo ao cadastro
- [ ] Lista de processos mostra cliente
- [ ] Webhook inclui client_id
- [ ] Story status: Ready for Review
