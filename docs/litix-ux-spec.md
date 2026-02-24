# Litix — UX Specification
**Version:** 1.0 | **Audience:** Developers, designers | **Stack:** Next.js 15, Tailwind CSS 4, shadcn/ui

---

## 1. Design Philosophy

### 1.1 Core Principle: "Clarity Before Complexity"

Litix serves **advogados brasileiros** — professionals under deadline pressure, operating in a high-stakes environment. The UI must be:

1. **Scannable at a glance** — a lawyer checking the dashboard before a hearing must see critical information in <3 seconds
2. **Trustworthy** — navy/dark blue palette signals authority and reliability (inspired by court room aesthetics)
3. **Minimal cognitive load** — no decorative elements, no marketing language inside the dashboard
4. **Dense but not cluttered** — lawyers work with large case volumes; tables and lists must show maximum information without scrolling

### 1.2 Users and their Context

| Persona | Usage context | Key need | Frustration pattern |
|---|---|---|---|
| Dr. Rafael (socio, 2.000 processos) | Desktop, morning review | Scan overnight alerts, no surprise deadlines | Information buried in menus |
| Dra. Camila (advogada solo, 120 processos) | Mobile + desktop | Quick check while in court | Too many clicks to see the status |
| João (estagiário, delegated tasks) | Desktop | Mark tasks done, update status | Unclear what needs attention |

### 1.3 Anti-Patterns to Avoid

- ❌ Full-screen loading spinners (prefer skeleton UI)
- ❌ Confirmation dialogs for non-destructive actions
- ❌ Empty dashboard (always show state-appropriate CTAs)
- ❌ Truncating CNJ numbers (always show full format)
- ❌ Generic error messages ("Algo deu errado") — always be specific
- ❌ Dark mode toggle (not needed; use OS preference via media query)

---

## 2. Design System

### 2.1 Color Palette

Defined in `src/app/globals.css` via CSS custom properties (oklch):

```css
/* Primary — Law firm navy blue */
--primary: oklch(0.32 0.09 245)          /* #1e3a5f */
--primary-foreground: oklch(0.98 0 0)   /* white */

/* Sidebar — Darker navy */
--sidebar: oklch(0.28 0.09 245)          /* #162032 */
--sidebar-foreground: oklch(0.95 0 0)   /* near-white */

/* Semantic colors */
--success: oklch(0.52 0.14 150)          /* #16a34a green — monitoring active */
--alert-warning: oklch(0.78 0.15 75)    /* #f59e0b amber — deadline approaching */
--alert-critical: oklch(0.57 0.22 27)   /* #dc2626 red — unread/urgent */
```

**Usage rules:**
- `--primary` for CTAs, active states, links, progress bars
- `--success` for "monitoring active" indicators and positive states
- `--alert-warning` for deadline-approaching alerts
- `--alert-critical` for unread count badges and urgent states
- Never use color alone to convey state — always pair with text or icon

### 2.2 Typography

```
Font: Inter (system-ui fallback)
Scale: 12px / 14px / 16px / 18px / 20px / 24px / 30px / 36px
Weight: 400 (body), 500 (label), 600 (heading), 700 (display)
```

**Special:** CNJ numbers ALWAYS use `font-mono` class (JetBrains Mono) to ensure digit alignment:
```html
<span class="font-mono text-xs cnj">0000001-12.2023.8.26.0001</span>
```

### 2.3 Spacing

Use Tailwind's 4px base unit. Standard component padding:
- Cards: `p-4` (mobile) → `p-5` or `p-6` (desktop)
- Table cells: `px-4 py-3`
- Page padding: `p-6`
- Stack gap: `space-y-2` (tight), `space-y-4` (standard), `space-y-6` (sections)

### 2.4 Elevation

```
Level 0: bg-background (main area)
Level 1: bg-card + border (cards, tables)
Level 2: bg-card + border + shadow-sm (dropdowns, modals)
Sidebar:  bg-sidebar (separate color scale)
```

---

## 3. Component Guidelines

### 3.1 Monitoring Status Indicator

The animated pulse is a critical UX element for lawyers — they must immediately know a process is being monitored:

```html
<!-- Active monitoring -->
<span class="relative flex h-2 w-2">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60"></span>
  <span class="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
</span>
<span class="text-xs font-medium text-success">Ativo</span>

<!-- Inactive -->
<Radio size={12} class="text-muted-foreground" />
<span class="text-xs text-muted-foreground">Inativo</span>
```

### 3.2 Alert Cards

Border-left 4px + subtle background tint to encode alert type at a glance:

| Alert type | Border color | Background |
|---|---|---|
| `new_movement` | `--primary` (navy) | `bg-primary/[0.02]` |
| `deadline_approaching` | `--alert-warning` (amber) | `bg-amber-500/[0.03]` |
| `status_change` | `--alert-critical` (red) | `bg-destructive/[0.03]` |

Unread alerts have a blue dot indicator (top-right) + slightly higher background contrast.

### 3.3 CNJ Formatting

CNJ format: `NNNNNNN-DD.AAAA.J.TT.OOOO`

Always format with `formatCNJ()` from `@/lib/crypto`. Raw digits in database, formatted in UI:
```
Input:  00000011220238260001
Output: 0000001-12.2023.8.26.0001
```

### 3.4 Empty States

Every empty state must:
1. Show a relevant icon (muted, 30-40px)
2. Explain why it's empty (1 line)
3. Offer a CTA relevant to the user's plan

```
Pattern:
[icon - muted]
"Nenhum processo ainda"         ← what's empty
"Cadastre seu OAB para..."      ← why/how
[CTA button]                    ← action
```

### 3.5 Plan-Gated Features

When a feature requires a higher plan, show a locked state — never hide the feature entirely:

```
[amber border card]
[Lock icon] "Recurso disponível no plano Solo ou superior"
"Descrição do valor que o usuário está perdendo"
[Ver planos button]
```

This follows "frustration as motivation" — users should feel the value they're missing.

---

## 4. Page Specifications

### 4.1 Dashboard Home (`/dashboard`)

**Layout:** 4 stat cards + recent alerts section

```
┌─────────────────────────────────────────────────────┐
│ Bom dia, Dr. Rafael                                 │
│ Escritório Silva & Associados                       │
├──────────┬──────────┬──────────┬──────────┤
│ Total    │ Alertas  │ Não lidos│ Prazos   │
│  2.000   │    12    │     3    │    5     │
│processos │  hoje    │          │ próx 48h │
└──────────┴──────────┴──────────┴──────────┘
│ Últimas movimentações (5)                   [Ver todos]│
│ ● 0000001-12.2023.8.26.0001 — Sentença publicada (2h) │
│ ○ 0000002-34.2023.8.26.0002 — Prazo em 2 dias   (4h) │
└─────────────────────────────────────────────────────┘
```

**Stat cards:** Tap/click goes to relevant filtered list (e.g., "Prazos" → `/dashboard/alerts?filter=deadline`)

### 4.2 Process List (`/dashboard/cases`)

**Primary view:** Table with search + filter tabs

```
Processos                         [+ Adicionar]
────────────────────────────────────────────
[🔍 Buscar por CNJ...]  [Todos] [Monitorados]
────────────────────────────────────────────
PROCESSO (CNJ)       TRIBUNAL   PROVIDER  STATUS    ÚLTIMA CONSULTA
0000001-12.2023...   TJSP       datajud   ● Ativo   há 3 min
0000002-34.2023...   TRT15      —         ○ Inativo  Nunca
```

**Mobile:** Hide TRIBUNAL and PROVIDER columns. Keep CNJ, STATUS, ÚLTIMA CONSULTA.

**Click on row:** Opens Ficha Única (`/dashboard/cases/[cnj]`)

**Add button:** Opens `/dashboard/cases/search` in a full page (not modal — forms on mobile need space)

### 4.3 Ficha Única (`/dashboard/cases/[cnj]`)

The most important screen for lawyers. Must show all key information without scrolling on desktop:

```
← Processos
0000001-12.2023.8.26.0001                [Consultar] [● Monitorando]
TJSP

┌─────────┬──────────┬────────────┬──────────────┐
│Tribunal │Provider  │Últ consulta│ Cadastrado   │
│  TJSP   │ datajud  │ há 3 min   │ 15 jan 2026  │
└─────────┴──────────┴────────────┴──────────────┘

[● Monitoramento ativo. O Litix verifica este processo...]

[DataJud] [Codilo] [Escavador] [Judit] [Predictus]
  ↑ principal

Histórico de movimentações (3)
────────────────────────────────────────
│ NOVA MOVIMENTAÇÃO                          │ ← navy border
│ Sentença publicada                         │
│ "Julgado procedente o pedido..."           │
│ há 2 horas · 15 jan 2026 às 14:30          │
────────────────────────────────────────
│ PRAZO SE APROXIMANDO                       │ ← amber border
│ Prazo recursal em 2 dias                   │
│ "Último dia para recurso: 17 jan 2026"     │
│ há 6 horas · 15 jan 2026 às 10:00          │
```

**Consultar button:** Triggers immediate multi-provider lookup. Shows loading state on button.

**MonitorToggle:** Instant optimistic update (toggle state immediately, revert on error).

### 4.4 Alerts Inbox (`/dashboard/alerts`)

Focused, inbox-like interface:

```
Alertas
3 não lidos

[Todos] [Não lidos] [Prazos]

│●│ 📄 Sentença publicada                    2h  │
│ │ "Julgado procedente..."                       │
│ │ 0000001-12.2023... · TJSP              [link] │
────────────────────────────────────────
│○│ ⏰ Prazo em 2 dias                       6h  │
│ │ "Recurso — último dia 17 jan"                 │
│ │ 0000002-34.2023... · TRT15             [link] │
```

**● / ○ = unread/read dot**

### 4.5 Webhooks (`/dashboard/settings/webhooks`)

Key UX consideration: show the secret key with reveal/hide toggle. Never show raw secret by default.

### 4.6 Pricing Page (`/pricing`)

Conversion-optimized layout:
- "Mais popular" badge on Escritório plan
- All plans visible above the fold on desktop
- FAQ section addresses objections
- Free plan prominently listed (reduces friction to sign up)

---

## 5. User Flows

### 5.1 Onboarding Flow (New User)

```
/auth/signup → Verify Email → /auth/callback → /dashboard
     ↓
[empty dashboard — no cases]
     ↓
CTA: "Cadastre seu OAB para importar automaticamente"
     ↓
/dashboard/settings/profile → OAB form → "Importação iniciada"
     ↓
Background job runs → Cases appear in /dashboard/cases
     ↓
User returns to dashboard → Cases + monitoring active
```

**Key principle:** First-run experience must get user to value (seeing their cases) as fast as possible.

### 5.2 Alert Resolution Flow

```
Notification email / dashboard badge
     ↓
/dashboard/alerts → See unread alert
     ↓
Click case link → /dashboard/cases/[cnj]
     ↓
Read movement details → Take legal action
     ↓
Alert marked as read (automatic on open, or manual)
```

### 5.3 Add Single Case Flow

```
/dashboard/cases → [+ Adicionar]
     ↓
/dashboard/cases/search → Type CNJ
     ↓
POST /api/v1/cases → Success
     ↓
Redirect to /dashboard/cases/[cnj] (Ficha Única)
     ↓
Monitoring already active
```

### 5.4 Upgrade Flow

```
Feature blocked (e.g., webhook, OAB import)
     ↓
Locked state with "Ver planos" CTA
     ↓
/pricing → Select plan
     ↓
POST /api/v1/billing/checkout → Stripe Checkout
     ↓
Payment → Success URL → /dashboard/billing?success=1
     ↓
Plan updated via Stripe webhook → Dashboard unlocked
```

---

## 6. Accessibility

### 6.1 Requirements

- **WCAG 2.1 AA** compliance minimum
- All interactive elements keyboard-accessible
- Focus rings visible (Tailwind `ring-2 ring-ring ring-offset-2`)
- Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Screen reader labels for icon-only buttons:
  ```html
  <Button aria-label="Remover webhook">
    <Trash2 size={14} />
  </Button>
  ```

### 6.2 Critical Accessibility Rules for Litix

1. **CNJ numbers**: Use `<code>` or `aria-label="Número do processo: XXXX"` for screen readers
2. **Status indicators**: Animated pulse must have `role="status"` and `aria-live="polite"`
3. **Alert badges**: Use `aria-label="X alertas não lidos"`
4. **Tables**: Always have `<th scope="col">` and `<caption>` when meaningful
5. **Loading states**: Use `aria-busy="true"` during fetch operations

### 6.3 Motion

Respect `prefers-reduced-motion`. The monitoring pulse animation:
```css
@media (prefers-reduced-motion: reduce) {
  .animate-ping { animation: none; }
}
```

---

## 7. Responsive Breakpoints

```
Mobile:  < 640px  — single column, minimal chrome
Tablet:  640-1024px — two column where sensible
Desktop: > 1024px — full sidebar + content + detail panel
```

### Sidebar behavior:
- Desktop: fixed 240px sidebar, always visible
- Mobile: drawer (hidden by default, hamburger menu button)

### Table columns on mobile:
- Cases: show CNJ + Status only (hide Tribunal, Provider, Last Checked)
- Alerts: show icon + title + time (hide body, hide case link until expand)
- Team: show name + role only (hide email, hide join date)

---

## 8. Loading & Error States

### 8.1 Loading

| Component | Loading pattern |
|---|---|
| Page data | Suspense + skeleton (future) |
| Button action | Spinner inside button, disable during load |
| Toggle | Optimistic UI + revert on error |
| Search | Debounce 300ms |

### 8.2 Error Messages (Portuguese)

Always specific and actionable:

| Error | Message |
|---|---|
| Rate limit | "Muitas consultas. Aguarde um momento." |
| Plan limit (cases) | "Limite de processos atingido. Faça upgrade." |
| CNJ inválido | "Número CNJ inválido. Formato: 0000001-12.2023.8.26.0001" |
| Já cadastrado | "Este processo já está monitorado." |
| Sem permissão | "Permissão insuficiente. Fale com o administrador." |
| Erro genérico | "Erro inesperado. Tente novamente ou contate o suporte." |

### 8.3 Success Messages (Sonner toasts)

- Duration: 4 seconds
- Position: bottom-right
- Never stack more than 3 toasts
- Success: green check icon
- Error: red X icon

---

## 9. Performance Guidelines

### 9.1 Page Load Targets

| Page | Target TTI | Strategy |
|---|---|---|
| `/` landing | < 1.5s | Static generation |
| `/dashboard` | < 2s | Server component, parallel queries |
| `/dashboard/cases` | < 1.5s | Server component, paginated |
| `/dashboard/cases/[cnj]` | < 2s | Dynamic, two parallel queries |

### 9.2 Data Fetching Patterns

- Server Components for initial data load (no loading flash)
- Client Components only for interactive updates (MonitorToggle, forms)
- `router.refresh()` to revalidate Server Component data after mutations
- No `useEffect` data fetching — use React Server Components or React Query for complex cases

---

## 10. Design Tokens Reference

```css
/* In src/app/globals.css */

/* Spacing */
--radius: 0.5rem  /* Cards, buttons, inputs */

/* Alert semantic colors */
.alert-movement  { border-left: 4px solid var(--primary) }
.alert-deadline  { border-left: 4px solid var(--alert-warning) }
.alert-critical  { border-left: 4px solid var(--alert-critical) }

/* CNJ monospace formatting */
.cnj { font-family: 'JetBrains Mono', monospace; letter-spacing: 0.02em }

/* Provider badge */
.badge-provider { font-size: 11px; padding: 2px 6px; border-radius: 4px }
```

---

## 11. Copy Guidelines

### 11.1 Tone
- Professional but direct — no startup jargon
- Português formal (você, não tu)
- Action-oriented labels: "Monitorar", "Importar OAB", "Ver processo"
- Never: "Ops!", "Uh oh", "Oops" — too casual for law firm context

### 11.2 Key Strings

| Context | String |
|---|---|
| Empty cases | "Nenhum processo ainda" |
| Empty alerts | "Sem alertas" |
| Monitor active | "Monitoramento ativo" |
| Monitor inactive | "Monitoramento pausado" |
| Last checked | "Última consulta: há X min" |
| Never checked | "Nunca consultado" |
| Plan upgrade CTA | "Fazer upgrade para [Plano]" |
| Free plan | "Grátis para sempre" |
| Signup CTA | "Começar grátis" |
| No credit card | "Sem cartão de crédito" |

---

*Litix UX Specification v1.0 — Fevereiro 2026*
