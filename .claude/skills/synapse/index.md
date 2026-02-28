---
description: "Context engine — gerenciar domains, layers, rules e manifest do Synapse"
---

# Synapse — Context Engine Management

## Overview
Skill para gerenciar o Synapse Context Engine — o sistema de 8 layers que injeta regras contextuais em cada prompt.

## Architecture
```
L0 Constitution (NON-NEGOTIABLE, always-on)
L1 Global + Context (always-on)
L2 Agent (triggered by active agent)
L3 Workflow (triggered by active workflow)
L4 Task (triggered by active task)
L5 Squad (triggered by active squad)
L6 Keyword (triggered by prompt keywords)
L7 Star-command (triggered by *command in prompt)
```

## Management Commands

### Create Domain
```
/synapse:tasks:create-domain
```
Creates a new domain file in `.synapse/` and adds manifest entry.

### Add Rule
```
/synapse:tasks:add-rule
```
Adds a rule to an existing domain file.

### Edit Rule
```
/synapse:tasks:edit-rule
```
Modifies an existing rule in a domain file.

### Toggle Domain
```
/synapse:tasks:toggle-domain
```
Enable/disable a domain (sets _STATE=active|inactive in manifest).

### Diagnose
```
/synapse:tasks:diagnose-synapse
```
Runs full diagnostic on the Synapse pipeline.

## File Locations
- Manifest: `.synapse/manifest`
- Domain files: `.synapse/{domain-name}`
- Sessions: `.synapse/sessions/` (auto-generated)
- Metrics: `.synapse/metrics/hook-metrics.json`
- Engine: `.aios-core/core/synapse/engine.js`
- Hook: `.claude/hooks/synapse-engine.js`

## Agent
Primary: `@aios-master` (Orion)
