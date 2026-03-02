-- Migration 011: Add role column to case_members
-- Tabela já existe — apenas adiciona a coluna role

ALTER TABLE case_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'lead'
  CHECK (role IN ('lead', 'collaborator'));
