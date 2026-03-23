---
name: trinity-crm
description: >-
  Use this skill for ANY work on Trinity CRM (ambersol.co.il) — a SaaS CRM
  system for small businesses in Israel. Stack: Next.js App Router, Supabase,
  TypeScript, Tailwind CSS, Vercel. Triggers on code changes, database
  migrations, architecture decisions, API routes, authentication, branch
  isolation, payments (Tranzila), UI components. Always apply SaaS-grade
  standards: security, scalability, data isolation per org_id.
---

# Trinity CRM — Developer Skill

## Project Overview
- **Product**: Trinity CRM — SaaS CRM for small businesses in Israel
- **URL**: https://ambersol.co.il
- **GitHub**: github.com/Creepie132/trinity
- **Stack**: Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Vercel
- **Supabase project_id**: tjryzcqvsavtllahjyrj
- **Local path**: F:\Amber_solutions_Kira\Trinity
- **Server path**: /home/node/.openclaw/workspace/Leya-Project/clientbase-pro/

---

## Core SaaS Principles (ALWAYS apply)

### 1. Data Isolation — Non-negotiable
- Every table has `org_id` column
- Data of one client NEVER reaches another client
- RLS enabled on ALL tables — no exceptions
- Server NEVER trusts client-side data (headers, localStorage, query params)
- Source of truth: always the database

### 2. Authentication Architecture
- Auth via Supabase session + JWT
- `getAuthContext(request)` — canonical auth helper in `src/lib/auth-helpers.ts`
- Returns: `{ user, orgId, activeOrgId, role }`
- `activeOrgId` — read from `user_active_branch` table (NOT from headers)
- Service role client used for data queries (bypasses RLS safely on server)

### 3. Branch (Multi-location) Architecture
- Main org: Amber Solutions (Влад)
- Branch org: separate org_id in `branches` table with `parent_org_id` reference
- Table `user_active_branch`: stores `user_id → active_org_id` (server-side truth)
- `BranchContext.tsx` — client-side context, reads from localStorage as UI cache
- On branch switch: update localStorage + call `POST /api/set-active-branch`

### 4. Data by Context
| Data type | Scope | Mechanism |
|---|---|---|
| Clients | Shared (mainOrgId) | API without branch context |
| Visits | Per activeOrgId | Service role + user_active_branch |
| Payments | Per activeOrgId | Service role + user_active_branch |
| Products/Inventory | Per activeOrgId | Service role + user_active_branch |
| Dashboard stats | Per activeOrgId | useBranch() hook |

---

## Code Rules (STRICT)

### Build & Commit
- After every change: `npm run build` (NOT yarn) → manual check → commit
- One commit = one task
- Commit format: `feat:` / `fix:` / `refactor:` / `chore:`

### LTR/RTL
- `dir` from `language === 'he' ? 'rtl' : 'ltr'`
- `locale` from `useLanguage()` — NEVER hardcode `'he'`

---

## ★ Modal Grid System (MANDATORY for ALL modals)

**Every modal container in Trinity MUST follow this layout contract.**
Content must NEVER dictate the modal width. The container controls size.

### The Rule
```css
.modal-container {
  /* Fixed grid: clamp ensures mobile-responsive + desktop-stable */
  width: 95%;
  max-width: clamp(320px, 60vw, 650px);

  /* RTL/LTR centering via logical property — no duplication */
  margin-inline: auto;

  /* Content cannot break out */
  overflow: hidden;
  overflow-wrap: break-word;
  display: flex;
  flex-direction: column;
}

.modal-content {
  /* Scroll inside, never expand the shell */
  overflow-y: auto;
  flex-grow: 1;
}
```

### In Modal.tsx (already implemented — inline style)
```tsx
style={{
  width: '95%',
  maxWidth: width
    ? `clamp(320px, ${width}, calc(100vw - 32px))`
    : size === 'sm'   ? 'clamp(320px, 90vw, 384px)'
    : size === 'md'   ? 'clamp(320px, 90vw, 448px)'
    : size === 'lg'   ? 'clamp(320px, 85vw, 512px)'
    : size === 'xl'   ? 'clamp(320px, 85vw, 576px)'
    : 'clamp(320px, 80vw, 896px)',
  marginInline: 'auto',
  overflowWrap: 'break-word',
}}
```

### Why this matters
| Issue | Root cause | Fix |
|---|---|---|
| Modal width "jumps" | Content sets container width | Fixed `max-width` via `clamp()` |
| Hebrew text breaks layout | Long phrases push boundaries | `overflow-wrap: break-word` + hard width |
| iPhone SE overflow | Wide modal exits viewport | `width: 95%` + `clamp` minimum |
| RTL/LTR margin duplication | `margin-left/right` hardcoded | `margin-inline: auto` |

### Size reference
| `size` prop | `max-width` |
|---|---|
| `sm` | `clamp(320px, 90vw, 384px)` |
| `md` | `clamp(320px, 90vw, 448px)` |
| `lg` | `clamp(320px, 85vw, 512px)` |
| `xl` | `clamp(320px, 85vw, 576px)` |
| `full` | `clamp(320px, 80vw, 896px)` |

---

## Key Files Reference

### Auth & Security
- `src/lib/auth-helpers.ts` — `getAuthContext()`, reads activeOrgId from DB
- `src/lib/supabase/server.ts` — server Supabase client (cookies)
- `src/lib/supabase-service.ts` — service role client (bypasses RLS)
- `src/lib/get-active-org.ts` — `getActiveOrgId()` helper

### Branch System
- `src/contexts/BranchContext.tsx` — `activeOrgId`, `mainOrgId`, `switchBranch`
- `src/app/api/set-active-branch/route.ts` — saves branch to DB
- `src/app/api/user/active-branch/route.ts` — reads branch from DB

### Hooks
- `src/hooks/useAuth.ts` — canonical auth hook
- `src/hooks/useBranch.ts` — branch context hook
- `src/hooks/useFeatures.ts` — feature flags per org

### UI Components
- `src/components/ui/Modal.tsx` — base draggable/pinnable modal (**engine** — never import directly in feature components)
- `src/components/ui/TrinityModalShell.tsx` — branded sidebar shell (dark sidebar + content area)
- `src/components/ui/WizardModal.tsx` — **reusable multi-step wizard shell**

---

## ★ TrinityModalShell — Standard Modal Face

**Use `TrinityModalShell` inside `Modal` for all non-wizard dialogs.**

### Usage
```tsx
import Modal from '@/components/ui/Modal'
import { TrinityModalShell } from '@/components/ui/TrinityModalShell'

<Modal open={open} onClose={onClose} darkHeader width="680px">
  <TrinityModalShell icon={<UserPlus/>} title="Новый клиент" subtitle="Заполните данные">
    {formContent}
  </TrinityModalShell>
</Modal>
```

### Props
| Prop | Type | Description |
|---|---|---|
| `icon` | ReactNode | Lucide icon shown in sidebar circle |
| `title` | string | Title in sidebar |
| `subtitle` | string? | Subtitle below title |
| `accentColor` | string? | Icon circle color (default: `--trinity-accent`) |
| `sidebarBg` | string? | Sidebar background (default: `#1e2533`) |
| `sidebarExtra` | ReactNode? | Extra content below title in sidebar |
| `dir` | `'rtl'│'ltr'` | Text direction |

---

## ★ WizardModal — Reusable Wizard Pattern

**ALWAYS use `WizardModal` for any multi-step dialog in Trinity.**
Never build a custom wizard from scratch — use this component.

### Location
`src/components/ui/WizardModal.tsx`

### Visual Style
- Dark blue gradient header: `from-[#1a237e] via-[#283593] to-[#3949ab]`
- Amber hexagon logo mark + Trinity CRM label in header
- White circular close button top-right
- Step indicator with icons on colored background (always readable)
- White content area, gray footer with dot-progress
- Emerald submit button, indigo next button

### Usage
```tsx
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'

const steps: WizardStep[] = [
  { label: 'Шаг 1', icon: SomeIcon },
  { label: 'Шаг 2', icon: AnotherIcon },
  { label: 'Шаг 3', icon: ThirdIcon },
]

<WizardModal
  open={open}
  onClose={onClose}
  title="Заголовок окна"
  logoLabel="Trinity CRM"
  logoBadge="Admin"
  steps={steps}
  currentStep={step}
  onNext={() => setStep(n => n + 1)}
  onBack={() => setStep(n => n - 1)}
  canProceed={isStepValid}
  onSubmit={handleSubmit}
  isSubmitting={isPending}
  submitLabel="Создать"
  cancelLabel="Отмена"
  backLabel="Назад"
  nextLabel="Далее"
  dir="rtl"
  size="lg"
>
  {step === 1 && <StepOneContent />}
  {step === 2 && <StepTwoContent />}
  {step === 3 && <StepThreeContent />}
</WizardModal>
```

### Props Reference

| Prop | Type | Default | Description |
|---|---|---|---|
| `open` | boolean | — | Controls visibility |
| `onClose` | () => void | — | Called on X or backdrop |
| `title` | string | — | Main heading (white text in header) |
| `logoLabel` | string | `'Trinity CRM'` | Brand name next to hex logo |
| `logoBadge` | string? | — | Optional pill label (Admin, Pro, Beta) |
| `steps` | WizardStep[] | — | Array of `{ label, icon }` |
| `currentStep` | number | — | 1-based current step index |
| `onNext` | () => void | — | Called when Next is clicked |
| `onBack` | () => void | — | Called when Back is clicked |
| `canProceed` | boolean | — | Enables Next/Submit button |
| `onSubmit` | () => void | — | Called on last step Submit |
| `isSubmitting` | boolean? | `false` | Shows spinner on Submit button |
| `submitLabel` | string? | `'Создать'` | Last step button text |
| `cancelLabel` | string? | `'Отмена'` | First step back button text |
| `backLabel` | string? | `'Назад'` | Other steps back button text |
| `nextLabel` | string? | `'Далее'` | Next button text |
| `dir` | `'rtl'│'ltr'` | `'rtl'` | Text direction |
| `size` | `'sm'│'md'│'lg'│'xl'` | `'md'` | Modal width |

### Pattern: i18n inside wizard
```tsx
const { language } = useLanguage()
const s = I18N[language]
<MyWizard s={s} lang={language} />
```

### Pattern: canProceed per step
```tsx
const canProceed = step === 1
  ? form.name.trim().length > 0
  : step === 2 ? form.file.length > 0
  : !!form.date
```

### Existing wizards using WizardModal
- `src/app/admin/ads/page.tsx` — Create Ad Campaign (3 steps)

---

## Database Key Tables

| Table | Purpose | Key columns |
|---|---|---|
| organizations | One row per client/org | id, name, features(jsonb), plan |
| org_users | User membership | user_id, org_id, role |
| branches | Branch → parent org | id, parent_org_id, child_org_id |
| user_active_branch | Active branch per user | user_id, active_org_id |
| clients | CRM clients | id, org_id, name, phone |
| visits | Appointments | id, org_id, client_id |
| payments | Payments | id, org_id, client_id, amount |
| products | Inventory items | id, org_id, name, price, stock |
| ad_campaigns | Ad banners | id, advertiser_name, banner_url, is_active |

---

## Security Checklist (before every API route)
- [ ] `getAuthContext()` called first
- [ ] User is authenticated (return 401 if not)
- [ ] `activeOrgId` comes from DB, not from request headers/body
- [ ] All DB queries filter by `org_id`
- [ ] Service role used only after auth check passes
- [ ] No sensitive data in logs or responses

---

## SaaS Decision Framework

When Влад proposes a solution, evaluate against:
1. **Security** — Could this expose one org's data to another?
2. **Scalability** — Works the same for 10 and 10,000 users?
3. **Reliability** — Fails gracefully? No dependency on browser state?
4. **Maintainability** — Easy to debug in 6 months?

If a better approach exists → say so immediately, explain why, propose alternative.
Never stay silent. Never just agree.
