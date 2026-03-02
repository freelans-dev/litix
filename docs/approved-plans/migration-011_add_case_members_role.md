# Migration 011: Add role column to case_members

## Objetivo
Adicionar coluna `role` (lead/collaborator) à tabela `case_members` existente.

## Mudanças
- ALTER TABLE case_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'lead'
- CHECK constraint: role IN ('lead', 'collaborator')

## Impacto
- Sem breaking changes (default 'lead' para registros existentes)
- Sem downtime necessário
