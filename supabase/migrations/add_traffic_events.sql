-- ============================================================
-- Migration: traffic_events table + RPC aggregation functions
-- Trinity CRM — SEO & Traffic Analytics Module
-- ============================================================

-- 1. Таблица событий трафика (публичная запись, без RLS — анонимные данные)
CREATE TABLE IF NOT EXISTS public.traffic_events (
  id          bigserial PRIMARY KEY,
  event_type  text        NOT NULL CHECK (event_type IN ('view','demo_click','pricing_click','wa_click','register_start')),
  source      text        NOT NULL DEFAULT 'direct',
  referrer    text,
  path        text        NOT NULL DEFAULT '/',
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Индексы для производительности аналитических запросов
CREATE INDEX IF NOT EXISTS idx_traffic_events_created_at  ON public.traffic_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_events_source      ON public.traffic_events (source);
CREATE INDEX IF NOT EXISTS idx_traffic_events_event_type  ON public.traffic_events (event_type);
CREATE INDEX IF NOT EXISTS idx_traffic_events_source_date ON public.traffic_events (source, created_at DESC);

-- 3. RLS: включаем, но разрешаем INSERT без авторизации (анонимный трекинг)
--    SELECT — только для admin через service role
ALTER TABLE public.traffic_events ENABLE ROW LEVEL SECURITY;

-- Разрешить всем писать события (анонимные просмотры лендинга)
CREATE POLICY "allow_public_insert_traffic_events"
  ON public.traffic_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Читать может только service role (через админ RPC)
-- SELECT политики нет → только service role key обходит RLS

-- 4. RPC: агрегация событий по источникам за период
CREATE OR REPLACE FUNCTION get_traffic_stats(days_back int DEFAULT 30)
RETURNS TABLE (
  source        text,
  views         bigint,
  demo_clicks   bigint,
  wa_clicks     bigint,
  reg_starts    bigint,
  conversion_pct numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    te.source,
    COUNT(*) FILTER (WHERE te.event_type = 'view')           AS views,
    COUNT(*) FILTER (WHERE te.event_type = 'demo_click')     AS demo_clicks,
    COUNT(*) FILTER (WHERE te.event_type = 'wa_click')       AS wa_clicks,
    COUNT(*) FILTER (WHERE te.event_type = 'register_start') AS reg_starts,
    CASE
      WHEN COUNT(*) FILTER (WHERE te.event_type = 'view') = 0 THEN 0
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE te.event_type = 'register_start')::numeric
         / COUNT(*) FILTER (WHERE te.event_type = 'view')::numeric) * 100,
        2
      )
    END AS conversion_pct
  FROM public.traffic_events te
  WHERE te.created_at >= now() - (days_back || ' days')::interval
  GROUP BY te.source
  ORDER BY views DESC;
$$;
-- 5. RPC: агрегация по дням (для временного графика)
CREATE OR REPLACE FUNCTION get_traffic_by_day(days_back int DEFAULT 30)
RETURNS TABLE (
  day           date,
  views         bigint,
  conversions   bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    te.created_at::date                                      AS day,
    COUNT(*) FILTER (WHERE te.event_type = 'view')          AS views,
    COUNT(*) FILTER (WHERE te.event_type = 'register_start') AS conversions
  FROM public.traffic_events te
  WHERE te.created_at >= now() - (days_back || ' days')::interval
  GROUP BY te.created_at::date
  ORDER BY day ASC;
$$;

-- 6. RPC: детальный отчёт по Google-трафику и конверсии
CREATE OR REPLACE FUNCTION get_google_conversion_report(days_back int DEFAULT 30)
RETURNS TABLE (
  total_google_views     bigint,
  google_demo_clicks     bigint,
  google_wa_clicks       bigint,
  google_reg_starts      bigint,
  google_conversion_pct  numeric,
  total_all_views        bigint,
  google_share_pct       numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'view')           AS total_google_views,
    COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'demo_click')     AS google_demo_clicks,
    COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'wa_click')       AS google_wa_clicks,
    COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'register_start') AS google_reg_starts,
    CASE
      WHEN COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'view') = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'register_start')::numeric
        / COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'view')::numeric * 100, 2)
    END AS google_conversion_pct,
    COUNT(*) FILTER (WHERE event_type = 'view')                                 AS total_all_views,
    CASE
      WHEN COUNT(*) FILTER (WHERE event_type = 'view') = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE source = 'google' AND event_type = 'view')::numeric
        / COUNT(*) FILTER (WHERE event_type = 'view')::numeric * 100, 2)
    END AS google_share_pct
  FROM public.traffic_events
  WHERE created_at >= now() - (days_back || ' days')::interval;
$$;
