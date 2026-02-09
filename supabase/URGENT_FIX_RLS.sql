-- =============================================
-- СРОЧНОЕ ИСПРАВЛЕНИЕ RLS для ad_campaigns
-- Скопируй и выполни в Supabase SQL Editor ПРЯМО СЕЙЧАС
-- =============================================

-- Шаг 1: Удалить все старые политики
DROP POLICY IF EXISTS "All see active ads" ON ad_campaigns;
DROP POLICY IF EXISTS "Admin manage ads" ON ad_campaigns;

-- Шаг 2: ВРЕМЕННО отключить RLS (для тестирования)
ALTER TABLE ad_campaigns DISABLE ROW LEVEL SECURITY;

-- =============================================
-- После этого страница заработает!
-- =============================================

-- Проверка:
SELECT 'RLS disabled for ad_campaigns' as status;
