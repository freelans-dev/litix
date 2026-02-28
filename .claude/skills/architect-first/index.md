---
description: "Validação arquitetural obrigatória antes da implementação"
---

# Architect First — Pre-Implementation Validation

## Overview
Skill que garante validação arquitetural antes de qualquer implementação significativa. Usado antes de chamar `@dev` para features complexas.

## Workflow

### 1. Requirement Analysis
- Read the story/requirement document
- Identify architectural implications
- Flag complexity: Simple (skip) | Medium (review) | Complex (full analysis)

### 2. Architecture Review (Medium/Complex)
- Check alignment with existing architecture (docs/litix-architecture.md)
- Review PRD requirements (docs/litix-prd.md)
- Identify affected components and boundaries
- Check for breaking changes

### 3. Impact Assessment
- List affected files and modules
- Identify database schema changes needed
- Flag API contract changes
- Check for security implications

### 4. Decision Document
For Complex changes:
- Create ADR (Architecture Decision Record) in docs/architecture/
- Document alternatives considered
- Record decision rationale
- Get stakeholder approval

### 5. Implementation Guidelines
- Provide specific implementation guidance for @dev
- Define quality criteria
- Specify test requirements
- List files that should NOT be modified

## When to Skip
- Simple bug fixes (single file, clear solution)
- Styling changes (CSS/Tailwind only)
- Documentation updates
- Test additions without code changes

## Usage
```
/architect-first docs/stories/LITIX-X.Y-feature.md
```

## Agent
Primary: `@architect` (Aria)
