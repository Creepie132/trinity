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
-- 2. Примечание по gateway_transactions UNIQUE constraint
-- ────────────────────────────────────────────────────────────
-- Constraint UNIQUE(gateway, gateway_ref) уже стоит в основной миграции.
-- Это корректно: один gateway_ref = одна физическая транзакция шлюза.
-- Tranzila может прислать один webhook дважды (retry при плохом соединении) —
-- база отбросит дубль через UNIQUE constraint.
-- Webhook-обработчик должен использовать:
--   INSERT INTO gateway_transactions (...) VALUES (...)
--   ON CONFLICT (gateway, gateway_ref) DO NOTHING
--   RETURNING id
-- Если RETURNING вернул NULL — это дубль, возвращаем 200 OK без обработки.
-- НЕ добавляем status в constraint — один gateway_ref не может иметь
-- два разных статуса одновременно (шлюз отправляет финальный статус).

COMMENT ON CONSTRAINT gateway_transactions_gateway_gateway_ref_key
  ON public.gateway_transactions IS
  'Идемпотентность webhook: один gateway_ref = одна транзакция. Дубли отбрасываются через ON CONFLICT DO NOTHING в webhook-обработчике.';
