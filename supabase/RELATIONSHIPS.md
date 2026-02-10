# Trinity CRM - Database Relationships

## Entity Relationship Diagram (Text Format)

```
┌─────────────────────────┐
│   auth.users (Supabase) │
│   - id (uuid)           │
│   - email               │
└───────┬─────────────┬───┘
        │             │
        │             │ (1:1)
        │             ▼
        │       ┌─────────────────┐
        │       │  admin_users    │
        │       │  - id           │
        │       │  - user_id (FK) │
        │       │  - email        │
        │       │  - full_name    │
        │       │  - role         │
        │       └─────────────────┘
        │ (1:N)
        ▼
┌──────────────────┐
│   org_users      │
│   - id           │
│   - org_id (FK)  │◄───────┐
│   - user_id (FK) │        │
│   - email        │        │
│   - role         │        │ (1:N)
└──────────────────┘        │
                            │
                    ┌───────┴──────────┐
                    │  organizations   │
                    │  - id            │
                    │  - name          │
                    │  - category      │
                    │  - features      │
                    │  - is_active     │
                    │  - plan          │
                    └───────┬──────────┘
                            │
                            │ (1:N)
        ┌───────────────────┼────────────────────┬──────────────────┐
        │                   │                    │                  │
        ▼                   ▼                    ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐
│   clients     │  │    visits     │  │   payments   │  │ sms_campaigns  │
│  - id         │  │  - id         │  │  - id        │  │  - id          │
│  - org_id(FK) │  │  - org_id(FK) │  │  - org_id(FK)│  │  - org_id (FK) │
│  - first_name │  │  - client_id  │  │  - client_id │  │  - name        │
│  - last_name  │  │  - visit_date │  │  - visit_id  │  │  - message     │
│  - phone      │  │  - amount     │  │  - amount    │  │  - status      │
│  - email      │  │  - service    │  │  - status    │  │  - sent_count  │
└───────┬───────┘  └───────┬───────┘  │  - provider  │  └────────┬───────┘
        │                  │          └──────┬───────┘           │
        │ (1:N)            │ (1:N)           │                   │ (1:N)
        │                  │                 │ (N:1)             │
        └──────────────────┼─────────────────┘                   │
                           │                                     │
                           │ (N:0..1)                            ▼
                           │                          ┌──────────────────┐
                           └─────────────────────────►│  sms_messages    │
                                                      │  - id            │
                                                      │  - org_id (FK)   │
                                                      │  - campaign_id   │
                                                      │  - client_id(FK) │
                                                      │  - phone         │
                                                      │  - message       │
                                                      │  - status        │
                                                      └──────────────────┘

┌──────────────────┐
│  ad_campaigns    │  (Independent table, no FK relationships)
│  - id            │
│  - advertiser    │
│  - banner_url    │
│  - target_cats   │
│  - is_active     │
│  - clicks        │
│  - impressions   │
└──────────────────┘
```

## Table Relationships (Detailed)

### 1. **organizations** (Core multi-tenant table)
- **Children:**
  - `org_users` (N) — organization members
  - `clients` (N) — customer records
  - `visits` (N) — service visits
  - `payments` (N) — payment transactions
  - `sms_campaigns` (N) — SMS marketing campaigns
  - `sms_messages` (N) — individual SMS messages

### 2. **org_users** (Organization members)
- **Parents:**
  - `organizations` (1) via `org_id`
  - `auth.users` (1) via `user_id`

### 3. **admin_users** (System administrators)
- **Parents:**
  - `auth.users` (1) via `user_id` (UNIQUE - 1:1 relationship)

### 4. **clients** (Customer records)
- **Parents:**
  - `organizations` (1) via `org_id`
- **Children:**
  - `visits` (N) — visit history
  - `payments` (N) — payment history
  - `sms_messages` (N) — SMS history

### 5. **visits** (Service visits)
- **Parents:**
  - `organizations` (1) via `org_id`
  - `clients` (1) via `client_id`
- **Children:**
  - `payments` (N) via `visit_id` (optional reference)

### 6. **payments** (Payment transactions)
- **Parents:**
  - `organizations` (1) via `org_id`
  - `clients` (1) via `client_id`
  - `visits` (0..1) via `visit_id` (optional)

### 7. **sms_campaigns** (SMS marketing campaigns)
- **Parents:**
  - `organizations` (1) via `org_id`
- **Children:**
  - `sms_messages` (N) — individual messages in campaign

### 8. **sms_messages** (Individual SMS)
- **Parents:**
  - `organizations` (1) via `org_id`
  - `sms_campaigns` (1) via `campaign_id`
  - `clients` (1) via `client_id`

### 9. **ad_campaigns** (Banner advertisements)
- **No foreign key relationships**
- Independent table for system-wide advertisements
- Targeting via `target_categories` array field

## Cascade Behavior

### ON DELETE CASCADE:
- Deleting `organizations` → deletes all related:
  - `org_users`
  - `clients` → deletes `visits`, `payments`, `sms_messages`
  - `sms_campaigns` → deletes `sms_messages`
  
- Deleting `auth.users` → deletes:
  - `org_users` (user memberships)
  - `admin_users` (admin privileges)

- Deleting `clients` → deletes:
  - `visits`
  - `payments`
  - `sms_messages`

- Deleting `sms_campaigns` → deletes:
  - `sms_messages`

### ON DELETE SET NULL:
- Deleting `visits` → sets `payments.visit_id = NULL`
  (payments can exist without visit reference)

## Unique Constraints

1. **org_users**: `(org_id, email)` — one email per organization
2. **admin_users**: `user_id` — one admin record per user

## Indexes

```sql
-- Organizational isolation (critical for multi-tenancy)
idx_clients_org_id ON clients(org_id)
idx_visits_org_id ON visits(org_id)
idx_payments_org_id ON payments(org_id)
idx_sms_campaigns_org_id ON sms_campaigns(org_id)

-- Foreign key lookups
idx_visits_client_id ON visits(client_id)
idx_payments_client_id ON payments(client_id)
idx_sms_messages_campaign_id ON sms_messages(campaign_id)

-- Ad campaigns filtering
idx_ad_campaigns_active ON ad_campaigns(is_active, start_date, end_date)
```

## Security Model (RLS)

### Users can access data from their organizations:
```sql
org_id IN (SELECT get_user_org_ids())
```

### Admins bypass all restrictions:
```sql
OR is_admin()
```

### Public access:
- `ad_campaigns` — SELECT only active campaigns (no auth required)

## Views

### client_summary
Aggregates client data with stats:
- Last visit date
- Total visits count
- Total paid amount (completed payments)

**Base query:**
```sql
SELECT 
  c.*,
  MAX(v.visit_date) AS last_visit,
  COUNT(v.id) AS total_visits,
  SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) AS total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id
GROUP BY c.id
```

---

**Version:** 2.4.0  
**Last Updated:** 2026-02-10  
**Generated from:** Trinity CRM Database Schema
