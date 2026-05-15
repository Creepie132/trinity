-- ============================================================
-- Trinity CRM — Payments Module Patch
-- 15.05.2026
-- ============================================================
-- Дополнения к 20260515_payments_module.sql:
--   1. pg_cron джоба для очистки старых idempotency_key (30 дней)
--   2. Комментарий по стратегии ON CONFLICT для webhook-обработчика
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. pg_cron: очистка payment_links старше 30 дней
--    со статусом terminal (paid / failed / cancelled / expired)
-- ────────────────────────────────────────────────────────────
-- Расширение pg_cron включено в Supabase по умолчанию
SELECT cron.schedule(
  'cleanup-payment-links-idempotency', -- имя джобы (уникальное)
  '0 3 * * *',                         -- каждый день в 03:00 UTC
  $$
    DELETE FROM public.payment_links
    WHERE
      status IN ('paid', 'failed', 'cancelled', 'expired')
      AND created_at < now() - interval '30 days';
  $$
);

-- ────────────────────────────────────────────────────────────
-- 2. Добавляем updated_at к gateway_transactions (нужен для upsert)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.gateway_transactions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ────────────────────────────────────────────────────────────
-- 3. Стратегия ON CONFLICT для webhook-обработчика
-- ────────────────────────────────────────────────────────────
-- ПРАВИЛЬНАЯ стратегия: DO UPDATE SET status = EXCLUDED.status
--
-- Почему НЕ DO NOTHING:
--   Tranzila шлёт webhooks последовательно: сначала pending, потом success.
--   Оба webhook имеют один gateway_ref. Если первый (pending) записался,
--   а второй (success) отбросился через DO NOTHING — платёж навсегда
--   зависнет в pending. Деньги списаны, в системе — ничего.
--
-- Правильная стейт-машина:
--   pending → success:  DO UPDATE — апдейт проходит ✓
--   pending → failed:   DO UPDATE — апдейт проходит ✓
--   success → success:  DO UPDATE — идемпотентен ✓
--   success → pending:  невозможный кейс от легитимного шлюза;
--                       защита в route через .neq('status','paid') на payment_links

COMMENT ON CONSTRAINT gateway_transactions_gateway_gateway_ref_key
  ON public.gateway_transactions IS
  'Идемпотентность webhook: один gateway_ref = одна физическая транзакция. Webhook-обработчик использует ON CONFLICT DO UPDATE SET status=EXCLUDED.status — стейт-машина корректно обрабатывает pending→success переходы.';
