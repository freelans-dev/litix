# Migration Plan: 010_api_keys.sql

**Aprovado por:** @analyst
**Data:** 2026-03-01
**Tipo:** Incremental (CREATE TABLE)

---

## Objetivo

Criar tabela `api_keys` para autenticacao programatica via API key (`Bearer ltx_...`). Habilita acesso a API sem sessao de browser, necessario para SDK e integracao enterprise.

---

## Mudancas

1. `CREATE TABLE api_keys` — armazena chaves com hash SHA-256
2. RLS com tenant isolation
3. Index no hash para lookup rapido

---

## Estrategia

- Chaves armazenadas como `sha256(plaintext)` — plaintext nunca persiste
- Prefixo `ltx_` para identificacao
- `key_prefix` guarda os primeiros 12 chars para display na UI
- `is_active` permite revogar sem deletar
- `last_used_at` para auditoria de uso

---

## Rollback

```sql
DROP TABLE IF EXISTS api_keys;
```

---

## Aprovacao

- [x] Plano revisado
- [x] Estrategia segura (hash-only storage)
- [x] RLS configurado
