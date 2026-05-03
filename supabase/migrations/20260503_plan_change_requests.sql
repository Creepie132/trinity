-- Trinity CRM: Plan Change Requests table + org_credits
-- 03.05.2026

-- Запросы на смену тарифного плана (с подтверждением клиентом)
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initiated_by      text NOT NULL CHECK (initiated_by IN ('admin', 'client')),
  from_plan         text NOT NULL,
  to_plan           text NOT NULL,
  from_price        numeric(10,2) NOT NULL,
  to_price          numeric(10,2) NOT NULL,
  proration_type    text NOT NULL CHECK (proration_type IN ('upgrade', 'downgrade', 'same')),
  prorated_amount   numeric(10,2) NOT NULL DEFAULT 0,
  credit_amount     numeric(10,2) NOT NULL DEFAULT 0,
  days_left         int NOT NULL DEFAULT 0,
  days_in_period    int NOT NULL DEFAULT 30,
  billing_date      date,
  effective_date    date NOT NULL,
  next_billing_date date NOT NULL,
  confirm_token     text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status            text NOT NULL DEFAULT 'pending_confirmation'
                    CHECK (status IN ('pending_confirmation','confirmed','charging','completed','failed','cancelled')),
  confirmed_at      timestamptz,
  charge_result     jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS plan_change_requests_org_id_idx ON plan_change_requests(org_id);
CREATE INDEX IF NOT EXISTS plan_change_requests_token_idx  ON plan_change_requests(confirm_token);

-- Кредиты организации (credit notes при downgrade)
CREATE TABLE IF NOT EXISTS org_credits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount      numeric(10,2) NOT NULL,
  reason      text NOT NULL,   -- 'downgrade_proration', 'manual', etc.
  source_id   uuid,            -- plan_change_requests.id
  applied_at  timestamptz,     -- когда применён к биллингу
  expires_at  timestamptz DEFAULT (now() + interval '1 year'),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_credits_org_id_idx ON org_credits(org_id);

-- RLS
ALTER TABLE plan_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_credits          ENABLE ROW LEVEL SECURITY;

-- plan_change_requests: читать/изменять только через service role (API routes)
-- Публичный доступ по токену — через отдельный анон endpoint
CREATE POLICY "service_role_all_plan_change"
  ON plan_change_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_org_credits"
  ON org_credits FOR ALL TO service_role USING (true) WITH CHECK (true);
