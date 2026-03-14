-- ============================================================
-- Trinity CRM: Sales & Sale Items
-- Автор: Viktor (Claude) | 14.03.2025
-- ============================================================

-- 1. Таблица продаж (одна запись = один факт продажи)
CREATE TABLE IF NOT EXISTS public.sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id  uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  sale_date   date NOT NULL DEFAULT CURRENT_DATE,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  paid_amount  numeric(10,2) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','partial','paid','refunded','cancelled')),
  receipt_sent boolean NOT NULL DEFAULT false,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Строки продажи (товары/услуги внутри одной продажи)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,     -- snapshot имени на момент продажи
  quantity      numeric(10,3) NOT NULL DEFAULT 1,
  unit_price    numeric(10,2) NOT NULL DEFAULT 0,
  total_price   numeric(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Индексы для быстрых выборок
CREATE INDEX IF NOT EXISTS sales_org_id_idx       ON public.sales(org_id);
CREATE INDEX IF NOT EXISTS sales_client_id_idx    ON public.sales(client_id);
CREATE INDEX IF NOT EXISTS sales_staff_id_idx     ON public.sales(staff_id);
CREATE INDEX IF NOT EXISTS sales_sale_date_idx    ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS sales_status_idx       ON public.sales(status);
CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS sale_items_org_id_idx  ON public.sale_items(org_id);

-- 4. RLS — данные изолированы по org_id, сервер не доверяет клиенту
ALTER TABLE public.sales      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только данные своей организации
CREATE POLICY "sales_org_isolation" ON public.sales
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "sale_items_org_isolation" ON public.sale_items
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_users WHERE user_id = auth.uid()
    )
  );

-- 5. updated_at автообновление
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS sales_updated_at ON public.sales;
CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
