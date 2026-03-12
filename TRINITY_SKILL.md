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

### One Prompt = One Task
- Never combine multiple changes in one prompt
- Always: exact file path + exact code to find + exact replacement
- After every change: `yarn build` → manual check → commit

### Commit Format
```
feat: [description]     — new feature
fix: [description]      — bug fix
refactor: [description] — refactoring without behavior change
chore: [description]    — config, deps, cleanup
```

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
- `src/hooks/useProducts.ts` — products with staleTime: 0
- `src/hooks/useFeatures.ts` — feature flags per org

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
| inventory_transactions | Stock movements | id, org_id, product_id, type |

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
