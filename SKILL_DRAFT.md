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
_Last updated: 26.03.2026_

## Project Overview
- **Product**: Trinity CRM — SaaS CRM for small businesses in Israel (salons, barbershops, clinics, auto shops, lawyers, realtors, etc.)
- **URL**: https://ambersol.co.il
- **GitHub**: github.com/Creepie132/trinity
- **Stack**: Next.js 16 App Router, Supabase, TypeScript, Tailwind CSS, Vercel
- **Supabase project_id**: tjryzcqvsavtllahjyrj
- **Local path**: F:\Amber_solutions_Kira\Trinity
- **Owner**: Влад (CEO Amber Solutions) — creepie1357@gmail.com, superadmin

---

## Engineering Protocol (MANDATORY — every task)

1. **SCAN** — read real files before any code. Never guess from memory.
2. **DESIGN** — validate data, handle errors, assess regression risk.
3. **VALIDATE** — verify fix works, TypeScript clean, no DB mismatches, no debug leftovers.
4. **REPORT** — end every response with:
   - `Проверено: [files/modules]`
   - `Регрессия: [нет/описание]`
   - `Безопасность: [защищено]`

**Deploy rule**: `npm run build` → zero errors → `git commit` + `git push`. Never deploy blind. Claude does the full deploy autonomously — never ask Влад to run git commands himself.

---

## Core SaaS Principles (ALWAYS apply)

### 1. Data Isolation — Non-negotiable
- Every table has `org_id` column
- Data of one org NEVER reaches another
- RLS enabled on ALL tables — no exceptions
- Server NEVER trusts client-side data (headers, localStorage, query params)
- Source of truth: always the database

### 2. Authentication Architecture
- Auth via Supabase session + JWT (Google OAuth)
- `getAuthContext(request)` — canonical auth helper → `src/lib/auth-helpers.ts`
- Returns: `{ user, orgId, activeOrgId, mainOrgId, role, isAdmin }`
- `activeOrgId` — read from `user_active_branch` table (NOT from headers/body)
- Service role client for data queries (bypasses RLS safely on server)
- Superadmins: `ambersolutions.systems@gmail.com`, `creepie1357@gmail.com`

### 3. Branch (Multi-location) Architecture
- Main org: Amber Solutions (Влад) — org_id: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- Branch = separate org_id in `branches` table with `parent_org_id` reference
- `user_active_branch` table: stores `user_id → active_org_id` (server truth)
- `BranchContext.tsx` — client-side cache in localStorage
- Branch switch: update localStorage + `POST /api/set-active-branch`

### 4. Data Scope by Context
| Data type         | Scope           | Mechanism                        |
|-------------------|-----------------|----------------------------------|
| Clients           | Shared (mainOrgId) | getRelatedOrgIds() in API     |
| Visits            | Per activeOrgId | Service role + user_active_branch|
| Payments          | Per activeOrgId | Service role + user_active_branch|
| Products/Inventory| Per activeOrgId | Service role + user_active_branch|
| Services          | Per activeOrgId | Service role                     |
| Dashboard stats   | Per activeOrgId | useBranch() hook                 |


---

## Code Rules (STRICT)

### Build & Commit
- `npm run build` (NOT yarn) — must be zero errors before commit
- One commit = one task
- Format: `feat:` / `fix:` / `refactor:` / `chore:`
- Claude commits and pushes autonomously after clean build

### LTR/RTL
- `dir` from `language === 'he' ? 'rtl' : 'ltr'`
- `locale` from `useLanguage()` — NEVER hardcode `'he'`

### TypeScript
- Never use `any` unless absolutely unavoidable
- Always update types in `src/types/database.ts` when changing DB schema

---

## Key Files Reference

### Auth & Security
- `src/lib/auth-helpers.ts` — `getAuthContext()`, `getAdminAuthContext()`
- `src/lib/supabase-service.ts` — service role client (bypasses RLS)
- `src/lib/get-active-org.ts` — `getActiveOrgId()` with branch validation
- `src/lib/supabase-browser.ts` — browser client

### Branch System
- `src/contexts/BranchContext.tsx` — `activeOrgId`, `mainOrgId`, `switchBranch`
- `src/app/api/set-active-branch/route.ts` — saves branch to DB
- `src/app/api/user/active-branch/route.ts` — reads branch from DB

### Hooks (src/hooks/)
- `useAuth.ts` — canonical auth hook
- `useBranch.ts` — branch context hook
- `useFeatures.ts` — feature flags per org
- `useClients.ts` — clients list + useAddClient, useUpdateClient
- `usePayments.ts` — payments list + stats (ONE realtime channel)
- `useExpenses.ts` — expenses list + stats (ONE realtime channel)
- `useServices.ts` — services CRUD
- `useProducts.ts` — inventory CRUD
- `useRealtimeSync.ts` — universal Supabase Realtime hook
- `usePermissions.ts` — staff permissions per user
- `useStaffPermissions.ts` — staff permissions management
- `usePipeline.ts` — deals pipeline (worker CRM)

### UI Components (src/components/ui/)
- `TrinityModalShell.tsx` — **STANDARD for ALL modals**
- `WizardModal.tsx` — multi-step wizard shell
- `Modal.tsx` — base draggable/pinnable modal
- `TrinityMob.tsx` — mobile bottom sheet for client card
- `TrinityButton.tsx` — standard button component
- `TrinityCard.tsx` — standard card component
- `TrinityBottomDrawer.tsx` — mobile bottom drawer

### Client Components (src/components/clients/)
- `ClientDesktopPanel.tsx` — desktop client card (has own inline edit form with city/address)
- `EditClientSheet.tsx` — edit modal using TrinityModalShell
- `ClientBottomSheet.tsx` — mobile: wraps TrinityMob + EditClientSheet
- `ClientCard.tsx` — mobile client list card with swipe actions
- `AddClientDialog.tsx` — new client modal

### Types
- `src/types/database.ts` — ALL DB types (auto-generated + manual additions)
  - `Client` = Tables<'clients'>
  - `ClientSummary` — subset returned by `/api/clients/summary`
  - `Payment`, `Service`, `Product`, etc.


---

## ★ TrinityModalShell — Modal Standard

**ALL modals in Trinity MUST use `TrinityModalShell`.**
- Location: `src/components/ui/TrinityModalShell.tsx`
- Exception: modals with fully custom layout (e.g. `ClientDesktopPanel`) — ask Влад first
- Never build a raw modal from scratch

```tsx
<TrinityModalShell
  open={open}
  onClose={onClose}
  icon={<SomeIcon />}
  title="Заголовок"
  subtitle="Подзаголовок"
  dir={language === 'he' ? 'rtl' : 'ltr'}
  sidebarExtra={<div>/* кнопки Save/Cancel */</div>}
  footerContent={<div>/* footer кнопки */</div>}
>
  {/* основной контент */}
</TrinityModalShell>
```

---

## ★ WizardModal — Multi-step Wizard Pattern

**ALWAYS use `WizardModal` for any multi-step dialog in Trinity.**

```tsx
import { WizardModal, WizardStep } from '@/components/ui/WizardModal'

<WizardModal
  open={open}
  onClose={onClose}
  title="Заголовок"
  steps={[{ label: 'Шаг 1', icon: Icon1 }, ...]}
  currentStep={step}
  onNext={() => setStep(n => n + 1)}
  onBack={() => setStep(n => n - 1)}
  canProceed={isValid}
  onSubmit={handleSubmit}
  isSubmitting={isPending}
  dir={language === 'he' ? 'rtl' : 'ltr'}
  size="lg"
>
  {step === 1 && <Step1 />}
  {step === 2 && <Step2 />}
</WizardModal>
```

---

## ★ useRealtimeSync — Rules

**ONE channel per table. Never subscribe to the same table twice.**

```ts
// ✅ CORRECT — one channel, extra queryKeys via onEvent
useRealtimeSync({
  table: 'payments',
  orgId: activeOrgId,
  queryKey: ['payments'],
  onEvent: () => {
    queryClient.invalidateQueries({ queryKey: ['payments-stats'], exact: false })
  },
})

// ❌ WRONG — causes "mismatch between server and client bindings" error
useRealtimeSync({ table: 'payments', orgId, queryKey: ['payments'] })
useRealtimeSync({ table: 'payments', orgId, queryKey: ['payments-stats'] })
```

Channel name format: `realtime:${table}:${orgId}:${queryKey.join(':')}`
This prevents collision even if rule is accidentally violated.

---

## ★ ClientSummary — Required SELECT fields

`GET /api/clients/summary` MUST always select:
```ts
.select(`id, first_name, last_name, phone, email,
         address, city, date_of_birth,
         notes, description, paint_code,
         loyalty_balance, created_at, org_id, assigned_to`)
```
⚠️ Missing any field → edit form initializes with empty values → data gets overwritten with null on save.

`ClientSummary` type in `src/types/database.ts` must mirror this exactly.

---

## ★ ClientDesktopPanel — Inline Edit Form

`ClientDesktopPanel.tsx` has its OWN inline edit form (separate from `EditClientSheet`).
It has its own `editForm` state and `handleSave()`. When adding new client fields:
- Add to `editForm` useState initial value
- Add to `useEffect` that populates from `client`
- Add input field in the editing JSX block
- Add display row in the view (non-editing) JSX block


---

## Database — All 65 Tables

### 👥 Auth & Users
| Table | Purpose | Key columns |
|-------|---------|-------------|
| organizations | One row per client/org | id, name, features(jsonb), plan, slug, tranzila_* |
| org_users | User membership | user_id, org_id, role (owner/manager/staff) |
| admin_users | Trinity superadmins + sales agents | user_id, is_sales_agent |
| user_active_branch | Active branch per user | user_id, active_org_id |
| staff_permissions | Granular permissions per staff | org_id, user_id, can_manage_clients, phone_mask_enabled, etc. |
| invitations | Org invitations | email, token, org_id, status |
| access_requests | Access request flow | user_id, email, status |
| impersonation_sessions | Admin impersonation | admin_user_id, target_org_id, token |

### 🏢 Branch System
| Table | Purpose | Key columns |
|-------|---------|-------------|
| branches | Branch → parent org | parent_org_id, child_org_id, name, is_active |
| transfer_requests | Inventory transfers between branches | from_org_id, to_org_id, items(jsonb), status |

### 👤 Clients
| Table | Purpose | Key columns |
|-------|---------|-------------|
| clients | CRM clients | id, org_id, first_name, last_name, phone, email, address, city, date_of_birth, notes, description, paint_code, loyalty_balance, assigned_to, client_tags[], social_links(jsonb) |
| client_photos | Client photo gallery | org_id, client_id, storage_path, visit_id |
| client_subscriptions | Recurring billing per client | org_id, client_id, amount, billing_day, status, card_token |

### 📅 Visits & Services
| Table | Purpose | Key columns |
|-------|---------|-------------|
| visits | Appointments | org_id, client_id, service_id, scheduled_at, status, price, quantity, deal_id |
| visit_services | Services in a visit | visit_id, service_id, service_name, price |
| services | Service catalog | org_id, name, name_ru, price, duration_minutes, color, is_active |
| bookings | Online booking requests | org_id, service_id, client_name, client_phone, scheduled_at, status |
| booking_settings | Online booking config | org_id, slug, is_enabled, working_hours(jsonb), slot_duration_minutes |

### 💰 Payments & Finance
| Table | Purpose | Key columns |
|-------|---------|-------------|
| payments | All payments | org_id, client_id, visit_id, amount, status, payment_method, provider, tranzila_document_id |
| payment_attempts | Payment retry log | org_id, amount, status, tranzila_response(jsonb) |
| subscription_charges | Recurring charge log | subscription_id, client_id, amount, status, tranzila_document_id |
| subscription_billing_log | Org subscription billing | org_id, amount, status, period_start/end |
| expenses | Business expenses | org_id, vendor, amount, category, receipt_url, items(jsonb) |
| revenue_logs | Worker revenue tracking | deal_id, worker_id, setup_fee, commission_amount |

### 📦 Inventory & Sales
| Table | Purpose | Key columns |
|-------|---------|-------------|
| products | Inventory items | org_id, name, sku, barcode, sell_price, purchase_price, quantity, min_quantity |
| inventory_transactions | Stock movements | org_id, product_id, type, quantity, related_payment_id |
| sales | Product sales | org_id, client_id, total_amount, status, deal_id |
| sale_items | Items in a sale | sale_id, product_id, product_name, quantity, unit_price |

### 🎯 CRM Pipeline (Worker Cabinet)
| Table | Purpose | Key columns |
|-------|---------|-------------|
| deals | Sales pipeline deals | org_id, client_id, stage_id, assigned_to, amount, source, rejection_reason |
| deal_stages | Pipeline stages | org_id, name, name_he, color, position, is_won, is_lost |
| deal_tags | Deal tags | org_id, name, color |
| deal_tag_assignments | Many-to-many: deal ↔ tag | deal_id, tag_id |
| sales_plans | Worker sales targets | org_id, user_id, period_year, period_month, target_amount |
| worker_notes | Worker notes on deals/clients | worker_id, deal_id, client_id, text |
| worker_dashboard_settings | Worker dashboard config | org_id, user_id, widgets_config(jsonb) |
| work_shifts | Worker shift tracking | org_id, user_id, started_at, ended_at |
| communication_log | Call/message log per deal | org_id, client_id, deal_id, type, direction |
| call_records | Phone call records | org_id, client_id, phone_from/to, duration_seconds, recording_url |


### 📱 WhatsApp & Messaging
| Table | Purpose | Key columns |
|-------|---------|-------------|
| wa_integrations | WA provider config per org | org_id, provider_type, instance_id, is_active |
| wa_conversations | WA conversation threads | org_id, client_id, phone, status, unread_count |
| wa_messages | Individual WA messages | conversation_id, org_id, direction, body, status |
| wa_trigger_settings | Auto-trigger rules | org_id, trigger_type, is_enabled, message_template |
| wa_send_log | WA send audit log | org_id, queue_id, success, status_code |
| outbound_queue | Message send queue | org_id, client_id, phone, message_body, status, scheduled_at |
| sms_campaigns | SMS broadcast campaigns | org_id, name, message, filter_type, status |
| sms_messages | Individual SMS | campaign_id, client_id, phone, status |
| message_templates | Reusable message templates | org_id, name, content, category, variables[] |

### 🔔 Notifications & Tasks
| Table | Purpose | Key columns |
|-------|---------|-------------|
| notifications | In-app + push notifications | org_id, user_id, type, title, body, is_read, push_sent |
| push_subscriptions | Browser push subscriptions | user_id, org_id, endpoint, p256dh, auth |
| tasks | Tasks & meetings | org_id, assigned_to, title, status, priority, client_id, task_type |

### 💎 Loyalty
| Table | Purpose | Key columns |
|-------|---------|-------------|
| loyalty_points | Points ledger | org_id, client_id, points, type, reference_id |
| loyalty_settings | Loyalty config per org | org_id, is_enabled, points_per_ils, points_per_visit, redemption_rate |

### ⚙️ Settings & Config
| Table | Purpose | Key columns |
|-------|---------|-------------|
| org_integrations | External integrations (Green Invoice, etc.) | org_id, provider, config(jsonb), is_active |
| org_receipt_settings | Receipt/invoice auto-send config | org_id, provider, trigger_events(jsonb), document_type |
| care_instructions | Post-service care instructions | org_id, service_id, title, content, title_ru, content_ru, file_url |
| app_settings | Global app config | key, value(jsonb) |
| audit_log | All data change audit trail | org_id, user_id, action, entity_type, old_data, new_data |

### 🎯 Demo & Admin
| Table | Purpose | Key columns |
|-------|---------|-------------|
| demo_registrations | Demo sign-ups | email, phone, selected_modules(jsonb), status, org_id |
| demo_sessions | Demo session credentials | org_id, user_id, expires_at, is_active |
| ad_campaigns | In-app advertisement banners | advertiser_name, banner_url, is_active, clicks, impressions |
| subscription_plans | Trinity pricing plans | key, name_he/ru, modules(jsonb), client_limit, price_monthly |
| module_pricing | Per-module pricing | module_key, price_monthly |
| pricing_config | Landing page pricing config | landing_plans(jsonb), demo_setup_base |
| admin_notes | Internal admin notes per org | org_id, admin_email, note |
| support_notes | Support notes per org | org_id, admin_email, note |

---

## API Routes Overview (src/app/api/)

```
/clients          GET (list), POST (create)
/clients/summary  GET (paginated list with visit/payment stats) ← main hook
/clients/[id]     GET, PUT, DELETE
/clients/[id]/visits, /payments, /photos

/visits           GET, POST
/visits/[id]      GET, PUT, DELETE + /services, /products, /status

/payments         GET, POST
/payments/[id]    GET, PUT + /receipt, /send-receipt, /cancel
/payments/create-link, /tranzila-*, /callback, /charge-recurring

/services         GET, POST
/services/[id]    GET, PATCH, DELETE

/products         GET, POST
/products/[id]    GET, PUT, DELETE

/deals            GET, POST
/deals/[id]       GET, PUT, DELETE + /stage

/api/worker/*     Worker cabinet routes (pipeline, meetings, leads, etc.)
/api/admin/*      Superadmin routes (orgs, users, billing, etc.)
/api/cron/*       Scheduled jobs (reminders, birthdays, billing)
/api/webhooks/*   Tranzila, Green Invoice, WhatsApp webhooks
```

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

---

## Known Patterns & Gotchas

### getRelatedOrgIds()
Clients are shared across all branches of an org. Use `getRelatedOrgIds(orgId)` to resolve all related org IDs before querying clients. Pattern used in `/api/clients/route.ts` and `/api/clients/summary/route.ts`.

### ClientBottomSheet interface
When adding new fields to client, ALWAYS update the interface in `ClientBottomSheet.tsx` — otherwise TypeScript will silently drop the fields before passing to `EditClientSheet`.

### ClientDesktopPanel inline form
Has its own `editForm` state separate from `EditClientSheet`. When adding client fields, must update BOTH components.

### Tranzila payments
- `tranzila_terminal` + `tranzila_password` — standard credit card payments
- `tranzila_token_terminal` + `tranzila_token_password` — card tokenization
- `tranzila_credit_password` — credit payments
- Document types: קבלה (receipt) vs חשבונית מס (tax invoice) — controlled by `org_receipt_settings`

---

## Recent Changes Log

| Date | Commit | Change |
|------|--------|--------|
| 26.03.2026 | 8e6fc88 | fix: add address/city/date_of_birth/loyalty_balance to ClientSummary SELECT and type |
| 26.03.2026 | 4551244 | fix: add city field to ClientDesktopPanel inline form + ClientBottomSheet interface |
| 26.03.2026 | a5457db | fix: resolve useRealtimeSync channel name collisions |
| 26.03.2026 | 3534d4c | refactor: enforce one-channel-per-table rule, fix payments+expenses duplicate subscriptions |
| 25.03.2026 | 7a60398 | feat: showPaintCode setting controls paint_code field in all 4 client form locations |
| 25.03.2026 | d561634 | fix: remove QuickActionsPanel from mobile dashboard |
| 24.03.2026 | de6da59 | feat: admin delete payment button in PaymentDetailsDrawer |
| 24.03.2026 | f834022 | fix: language/dir in admin panel |
| 24.03.2026 | 5be5c1c | fix: TrinityModalShell sticky sidebar, EditClientSheet footer buttons |
| 24.03.2026 | a0c2fbe | refactor: migrate all 9 modals to TrinityModalShell |
| 23.03.2026 | 3e8502d | fix: worker cabinet sidebar logos, showOffice, instant render |
| 20.03.2026 | baead85 | feat: quantity field in CreateVisitDialog |
| 20.03.2026 | — | migration: add quantity column to visits table |
