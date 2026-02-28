---
description: "Criar novas skills AIOS com estrutura e validação"
---

# Skill Creator — Create New AIOS Skills

## Workflow

### 1. Skill Definition
- Define skill name (kebab-case)
- Define description
- Identify primary agent
- Determine skill type: single file (.md) or directory (folder/)

### 2. Structure
```
.claude/skills/{skill-name}/
├── index.md          # Main skill file with frontmatter
├── templates/        # Optional: templates used by the skill
└── scripts/          # Optional: validation scripts
```

### 3. Frontmatter Format
```yaml
---
description: "Short description of what the skill does"
---
```

### 4. Content Structure
- **Overview**: What the skill does
- **Workflow**: Step-by-step process
- **Usage**: How to invoke (`/skill-name`)
- **Agent**: Which agent primarily uses this skill

### 5. Registration
Skills are auto-discovered by Claude Code from `.claude/skills/`.
No manual registration needed — just create the file.

### 6. Validation
- Skill file must have frontmatter with `description`
- Workflow steps must be actionable
- Agent reference must exist in `.claude/commands/AIOS/agents/`

## Usage
```
/skill-creator --name "my-skill" --agent dev --type directory
```

## Agent
Primary: `@aios-master` (Orion)
