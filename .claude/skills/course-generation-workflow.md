---
description: "Workflow linear para geração de cursos no CreatorOS"
---

# Course Generation Workflow

## Overview
Workflow linear para criar cursos completos com módulos, aulas, exercícios e materiais de apoio.

## Workflow Steps

### 1. Course Brief
- Define course topic, target audience, and learning objectives
- Set course format (video, text, hybrid)
- Define number of modules and estimated duration

### 2. Curriculum Design
- Create module outline with learning objectives per module
- Map prerequisite knowledge
- Design progression from beginner to advanced

### 3. Lesson Planning
- For each module, create detailed lesson plans
- Include: title, objectives, content outline, exercises, resources
- Estimate time per lesson

### 4. Content Creation
- Write lesson content following the curriculum
- Create exercises and assessments
- Design supplementary materials (checklists, templates, cheat sheets)

### 5. Review & Polish
- @qa reviews for completeness and accuracy
- @copy-chief reviews copy quality
- Final formatting and organization

## Usage
```
/course-generation-workflow "Course Title" --modules 8 --format hybrid
```

## Agents
Primary: `@sm` (River) + `@dev` (Dex)
