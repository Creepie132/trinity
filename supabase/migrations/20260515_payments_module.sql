-- ============================================================
-- Trinity CRM — Payments Module Migration
-- 15.05.2026
-- ============================================================
-- Добавляет:
--   1. organizations.org_type         — тип организации
--   2. billing_profiles               — настройки шлюза мерчанта (ключи зашифрованы)
--   3. payment_links                  — платёжные ссылки Tranzila
--   4. gateway_transactions           — история транзакций от шлюза
--   5. RLS политики для всех таблиц
--   6. Вспомогательные функции для JWT-based RLS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. РАСШИРЕНИЕ pgcrypto (для шифрования API-ключей)
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- 1. organizations.org_type
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE org_type_enum AS ENUM ('trinity', 'payments_only');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_type org_type_enum NOT NULL DEFAULT 'trinity';

COMMENT ON COLUMN public.organizations.org_type IS
  'trinity = полный CRM, payments_only = только приём платежей';

-- ────────────────────────────────────────────────────────────
-- 2. billing_profiles — настройки шлюза мерчанта
-- API-ключи хранятся зашифрованными через pgcrypto
-- Ключ шифрования берётся из переменной окружения через app.settings
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gateway          text        NOT NULL DEFAULT 'tranzila'
                               CHECK (gateway IN ('tranzila', 'cardcom')),
  terminal_name    text        NOT NULL,               -- логин мерчанта (открытый)
  api_key_enc      bytea       NOT NULL,               -- pgp_sym_encrypt(key, secret)
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, gateway)                             -- один шлюз на орг
);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.billing_profiles IS 'Настройки платёжного шлюза для организации';
COMMENT ON COLUMN public.billing_profiles.api_key_enc IS
  'API-ключ мерчанта, зашифрован pgp_sym_encrypt. Никогда не хранить в plain text.';

-- ────────────────────────────────────────────────────────────
-- 3. payment_links — сгенерированные ссылки для оплаты
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_links (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  idempotency_key  text        NOT NULL UNIQUE,        -- защита от двойных списаний
  amount           numeric(10,2) NOT NULL CHECK (amount > 0),
  currency         text        NOT NULL DEFAULT 'ILS',
  description      text,
  client_name      text,
  client_phone     text,
  client_email     text,
  link_url         text,                               -- ссылка Tranzila
  gateway_ref      text,                               -- ID транзакции от шлюза
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','paid','failed','cancelled','expired')),
  expires_at       timestamptz,
  paid_at          timestamptz,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_org_id
  ON public.payment_links(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_idempotency_key
  ON public.payment_links(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_links_status
  ON public.payment_links(org_id, status);

ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.payment_links IS 'Платёжные ссылки, сгенерированные через Tranzila/Cardcom';

-- ────────────────────────────────────────────────────────────
-- 4. gateway_transactions — входящие события от шлюза (webhook)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gateway_transactions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  payment_link_id  uuid        REFERENCES public.payment_links(id) ON DELETE SET NULL,
  gateway          text        NOT NULL DEFAULT 'tranzila',
  gateway_ref      text        NOT NULL,               -- уникальный ID транзакции шлюза
  amount           numeric(10,2) NOT NULL,
  currency         text        NOT NULL DEFAULT 'ILS',
  status           text        NOT NULL
                               CHECK (status IN ('success','failed','refunded','chargeback')),
  raw_payload      jsonb       NOT NULL,               -- полный ответ шлюза (для аудита)
  signature_valid  boolean     NOT NULL DEFAULT false, -- прошла ли проверка подписи
  processed_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gateway, gateway_ref)                        -- идемпотентность webhook
);

CREATE INDEX IF NOT EXISTS idx_gateway_tx_org_id
  ON public.gateway_transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_gateway_tx_payment_link
  ON public.gateway_transactions(payment_link_id);

ALTER TABLE public.gateway_transactions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE  public.gateway_transactions IS 'Входящие webhook-события от платёжного шлюза';
COMMENT ON COLUMN public.gateway_transactions.signature_valid IS
  'true только после успешной проверки HMAC/подписи шлюза';

-- ────────────────────────────────────────────────────────────
-- 5. Вспомогательная функция: get_user_org_type()
-- Читает org_type из JWT (O(1), без запроса к БД)
-- Используется во всех RLS политиках
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_org_type()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Fast path: из JWT custom claims (записывается Auth Hook при логине)
    (auth.jwt() -> 'app_metadata' ->> 'org_type'),
    -- Fallback: запрос к БД (первый логин до refresh токена)
    (
      SELECT o.org_type::text
      FROM public.organizations o
      INNER JOIN public.org_users ou ON ou.org_id = o.id
      WHERE ou.user_id = (SELECT auth.uid())
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.get_user_org_type() IS
  'Возвращает org_type пользователя. Сначала из JWT (O(1)), fallback на таблицу.';

-- ────────────────────────────────────────────────────────────
-- 6. RLS — billing_profiles
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "billing_profiles_org_isolation" ON public.billing_profiles;
CREATE POLICY "billing_profiles_org_isolation"
  ON public.billing_profiles
  FOR ALL
  USING (
    org_id = ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    OR public.is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- 7. RLS — payment_links
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payment_links_org_isolation" ON public.payment_links;
CREATE POLICY "payment_links_org_isolation"
  ON public.payment_links
  FOR ALL
  USING (
    org_id = ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    OR public.is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- 8. RLS — gateway_transactions
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "gateway_tx_org_isolation" ON public.gateway_transactions;
CREATE POLICY "gateway_tx_org_isolation"
  ON public.gateway_transactions
  FOR ALL
  USING (
    org_id = ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid)
    OR public.is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- 9. RLS — блокировка payments_only от CRM-таблиц
-- payments_only пользователи не должны читать/писать CRM данные
-- Политики добавляются к существующим (не заменяют)
-- ────────────────────────────────────────────────────────────

-- clients
DROP POLICY IF EXISTS "block_payments_only_clients" ON public.clients;
CREATE POLICY "block_payments_only_clients"
  ON public.clients
  FOR ALL
  USING (public.get_user_org_type() = 'trinity' OR public.is_admin());

-- visits
DROP POLICY IF EXISTS "block_payments_only_visits" ON public.visits;
CREATE POLICY "block_payments_only_visits"
  ON public.visits
  FOR ALL
  USING (public.get_user_org_type() = 'trinity' OR public.is_admin());

-- products
DROP POLICY IF EXISTS "block_payments_only_products" ON public.products;
CREATE POLICY "block_payments_only_products"
  ON public.products
  FOR ALL
  USING (public.get_user_org_type() = 'trinity' OR public.is_admin());

-- sales
DROP POLICY IF EXISTS "block_payments_only_sales" ON public.sales;
CREATE POLICY "block_payments_only_sales"
  ON public.sales
  FOR ALL
  USING (public.get_user_org_type() = 'trinity' OR public.is_admin());

-- payments (CRM-платежи Trinity, не путать с payment_links)
DROP POLICY IF EXISTS "block_payments_only_crm_payments" ON public.payments;
CREATE POLICY "block_payments_only_crm_payments"
  ON public.payments
  FOR ALL
  USING (public.get_user_org_type() = 'trinity' OR public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 10. updated_at триггеры
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS billing_profiles_updated_at ON public.billing_profiles;
CREATE TRIGGER billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS payment_links_updated_at ON public.payment_links;
CREATE TRIGGER payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
