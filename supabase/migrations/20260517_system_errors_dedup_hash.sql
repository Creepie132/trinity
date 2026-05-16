-- Migration: add dedup_hash to system_errors
-- Trinity CRM — Self-Healing v2: дедупликация Log Drain

ALTER TABLE public.system_errors
  ADD COLUMN IF NOT EXISTS dedup_hash text;

-- Индекс для быстрого поиска дублей (isDuplicate запрос)
CREATE INDEX IF NOT EXISTS system_errors_dedup_hash
  ON public.system_errors (dedup_hash, healed, created_at DESC)
  WHERE dedup_hash IS NOT NULL;
