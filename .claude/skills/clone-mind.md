---
description: "Pipeline de 9 camadas para clonar mentes elite com checkpoint humano L6-L8"
---

# Clone Mind — 9-Layer Mind Extraction Pipeline

## Overview
Pipeline completo para extrair Voice DNA e Thinking DNA de mentes elite, criando agent personas fiéis ao original.

## Pipeline Layers

### L1: Source Material Intake
- Collect all available source material (books, articles, interviews, speeches, social media)
- Catalog by type, date, and topic
- Identify primary vs secondary sources

### L2: Vocabulary Extraction
- Extract signature words and phrases
- Map vocabulary frequency and context
- Identify unique linguistic patterns

### L3: Communication Pattern Analysis
- Sentence structure analysis (length, complexity, rhythm)
- Tone mapping (formal/informal, emotional/logical, direct/indirect)
- Metaphor and analogy cataloging

### L4: Mental Model Mapping
- Decision frameworks used
- Analogies and references preferred
- Problem-solving approaches
- Knowledge domains and expertise areas

### L5: Belief System Extraction
- Core values and non-negotiables
- Worldview and assumptions
- Priorities and trade-off patterns

### L6: Voice Synthesis (**HUMAN CHECKPOINT**)
- Synthesize Voice DNA from L2-L3
- Generate sample outputs in the cloned voice
- **HALT: Present to user for validation**
- User confirms: "This sounds like [person]" or provides corrections

### L7: Thinking Synthesis (**HUMAN CHECKPOINT**)
- Synthesize Thinking DNA from L4-L5
- Present decision scenarios with cloned reasoning
- **HALT: User validates reasoning patterns**

### L8: Integration Test (**HUMAN CHECKPOINT**)
- Combined voice + thinking in real scenarios
- **HALT: Final holistic validation by user**
- User approves or requests adjustments

### L9: Agent Specification Generation
- Generate complete agent YAML specification
- Include all DNA components
- Create deployment-ready agent file

## Usage
```
/clone-mind "Gary Halbert" --sources ./reference-materials/
```

## Agent
Primary: `@oalanicolas` (Mirror)
Validation: `@pedro-valerio` (Axiom)
