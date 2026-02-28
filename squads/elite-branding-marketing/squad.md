# Squad: Elite Branding & Marketing

**Slug:** `elite-branding-marketing`
**Version:** 3.0.0
**Type:** Full-service branding and marketing agency

---

## Description

A complete branding and marketing squad modeled after a world-class creative agency. Each agent embodies the philosophy, methodology, and creative standards of a legendary practitioner. The squad operates as a unified pipeline: from brand strategy discovery through visual identity, copywriting, content strategy, marketing planning, asset production, and final QA audit.

---

## Agents

| # | Persona | Reference | Role | Scope |
|---|---------|-----------|------|-------|
| 1 | **Neumeier** | Marty Neumeier | Brand Visionary | Deep Discovery, ZAG differentiation, Golden Circle, brand strategy brief |
| 2 | **Haviv** | Sagi Haviv | Logo & Visual Identity | Logo design, symbol systems, identity marks, visual identity guidelines |
| 3 | **Scher** | Paula Scher | Brand Book & Visual System | Brand Book, complete visual system, typography, color palette, layout grids |
| 4 | **Bierut** | Michael Bierut | Voice Guide & Manifesto | Brand voice, tone of voice, manifesto, verbal identity, messaging pillars |
| 5 | **Ogilvy** | David Ogilvy | High-Conversion Copy & Campaigns | Ad copy, landing pages, email campaigns, sales pages, conversion copy |
| 6 | **Godin** | Seth Godin | Content Strategy & Editorial Calendar | Content strategy, editorial calendar, content pillars, audience building |
| 7 | **Kotler** | Philip Kotler | Marketing Plan & KPIs | Marketing plan, KPIs, performance metrics, market analysis, positioning |
| 8 | **Bauhaus** | -- | Visual Asset Production | Production of visual assets, adaptations, social media graphics, banners |
| 9 | **Ive** | Jony Ive | Brand Experience QA & Audit | Quality audit, brand consistency, experience review, final sign-off |

---

## Pipeline Order

The squad operates in a strict sequential pipeline. Each agent's output feeds the next.

```
Neumeier --> Haviv --> Scher --> Bierut --> Ogilvy --> Godin --> Kotler --> Bauhaus --> Ive
   |           |         |         |          |         |         |          |         |
Strategy    Logo     Brand Book   Voice     Copy    Content   Marketing   Assets     QA
Discovery   & ID     & Visual    Guide     & Ads   Strategy    Plan     Production  Audit
                     System
```

### Phase Details

| Phase | Agent | Input | Output |
|-------|-------|-------|--------|
| 1. Discovery | Neumeier | Client brief, market context | Brand Strategy Brief (skill: `brand-strategy-brief`) |
| 2. Identity | Haviv | Brand Strategy Brief | Logo concepts, identity marks, symbol system |
| 3. Visual System | Scher | Logo + Strategy Brief | Brand Book (skill: `brand-book-generator`) |
| 4. Verbal Identity | Bierut | Brand Book + Strategy Brief | Voice Guide, manifesto, messaging pillars |
| 5. Conversion Copy | Ogilvy | Voice Guide + Strategy | Ad copy, landing pages, campaigns (skill: `copy-frameworks`) |
| 6. Content Strategy | Godin | Voice Guide + Strategy | Editorial calendar, content pillars (skill: `content-calendar`) |
| 7. Marketing Plan | Kotler | All previous deliverables | Marketing plan, KPIs, performance framework |
| 8. Asset Production | Bauhaus | Brand Book + all deliverables | Final visual assets, adaptations, social graphics |
| 9. QA Audit | Ive | All deliverables | Quality report, consistency audit (skill: `brand-qa-checklist`) |

---

## Skills Used

| Skill | File/Folder | Used By | Purpose |
|-------|-------------|---------|---------|
| `brand-strategy-brief` | `.claude/skills/brand-strategy-brief/` | Neumeier | Strategic brief with 11 sections |
| `brand-book-generator` | `.claude/skills/brand-book-generator/` | Scher | Brand Book template and process (10 sections) |
| `copy-frameworks` | `.claude/skills/copy-frameworks/` | Ogilvy | AIDA, PAS, BAB, 4Ps library, channel templates |
| `content-calendar` | `.claude/skills/content-calendar/` | Godin | Editorial calendar and content strategy |
| `brand-qa-checklist` | `.claude/skills/brand-qa-checklist/` | Ive | QA checklist by brand deliverable type |

---

## Activation

Activate the full squad pipeline:

```
@squad activate elite-branding-marketing
```

Or invoke individual agents within the squad context:

```
@neumeier *help
@ogilvy *help
@ive *help
```

---

## Governance

- **No agent commits to git.** All deliverables are files created in the working directory.
- **Pipeline order is enforced.** An agent should not start until the previous agent's deliverable is complete.
- **Ive (QA) has final authority.** No deliverable ships without passing Ive's audit.
- **Human checkpoint** is recommended after Phase 1 (Neumeier's Strategy Brief) before proceeding.

---

## Deliverables Checklist

- [ ] Brand Strategy Brief (Neumeier)
- [ ] Logo & Identity System (Haviv)
- [ ] Brand Book (Scher)
- [ ] Voice Guide & Manifesto (Bierut)
- [ ] Copy & Campaign Assets (Ogilvy)
- [ ] Content Calendar & Strategy (Godin)
- [ ] Marketing Plan & KPIs (Kotler)
- [ ] Visual Assets Package (Bauhaus)
- [ ] QA Audit Report (Ive)

---

*Elite Branding & Marketing Squad v3.0.0*
*Synkra AIOS | CLI First*
