-- ============================================================
-- Рассрочка (Installment Plans)
-- Позволяет разбивать оплату визита/продажи на N платежей
-- с автоматическим списанием по токену карты Tranzila
-- ============================================================

-- Планы рассрочки
CREATE TABLE IF NOT EXISTS payment_installments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id              uuid REFERENCES visits(id) ON DELETE SET NULL,
  sale_id               uuid REFERENCES sales(id) ON DELETE SET NULL,

  total_amount          numeric(10,2) NOT NULL CHECK (total_amount > 0),
  installment_amount    numeric(10,2) NOT NULL CHECK (installment_amount > 0),
  installments_count    int NOT NULL CHECK (installments_count >= 2 AND installments_count <= 36),
  installments_paid     int NOT NULL DEFAULT 0,

  frequency             text NOT NULL DEFAULT 'monthly'
                          CHECK (frequency IN ('weekly','biweekly','monthly')),

  next_due_date         date NOT NULL,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','completed','failed','cancelled')),

  tranzila_token        text NOT NULL,
  tranzila_expdate      text NOT NULL,  -- MMYY
  card_last4            text,

  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_installments_org   ON payment_installments(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_client ON payment_installments(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due   ON payment_installments(next_due_date) WHERE status = 'active';

-- Лог каждого отдельного списания
CREATE TABLE IF NOT EXISTS installment_charges (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_plan_id   uuid NOT NULL REFERENCES payment_installments(id) ON DELETE CASCADE,
  org_id                uuid NOT NULL,
  client_id             uuid NOT NULL,
  amount                numeric(10,2) NOT NULL,
  installment_number    int NOT NULL,  -- 1-й, 2-й, ... платёж
  status                text NOT NULL CHECK (status IN ('success','failed')),
  tranzila_doc_id       text,
  error_message         text,
  charged_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installment_charges_plan ON installment_charges(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_installment_charges_org  ON installment_charges(org_id);

-- RLS
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_charges  ENABLE ROW LEVEL SECURITY;

-- Политики — только члены той же org
CREATE POLICY "installments_org_isolation" ON payment_installments
  USING (org_id = (SELECT (auth.jwt()->'app_metadata'->>'active_org_id')::uuid));

CREATE POLICY "installment_charges_org_isolation" ON installment_charges
  USING (org_id = (SELECT (auth.jwt()->'app_metadata'->>'active_org_id')::uuid));

-- Триггер updated_at
CREATE OR REPLACE FUNCTION update_payment_installments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_payment_installments_updated_at ON payment_installments;
CREATE TRIGGER trg_payment_installments_updated_at
  BEFORE UPDATE ON payment_installments
  FOR EACH ROW EXECUTE FUNCTION update_payment_installments_updated_at();
