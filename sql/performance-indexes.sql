-- ================================================
-- TRINITY CRM — Performance Indexes Migration
-- Индексы для полей, по которым идёт частый поиск.
-- Дата: 2026-03-27
-- Применить в Supabase SQL Editor или через migration.
-- ================================================

-- ─── CLIENTS ─────────────────────────────────────────────────────────────────
-- Поиск по имени и фамилии (ILIKE '%query%')
-- GIN + pg_trgm позволяет индексировать подстроку — намного быстрее seq scan.
-- Расширение уже должно быть включено (было добавлено ранее для тригралов).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_first_name_trgm
  ON clients USING GIN (first_name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_last_name_trgm
  ON clients USING GIN (last_name gin_trgm_ops);

-- Поиск по телефону (точное совпадение и LIKE '972...')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_phone
  ON clients (phone);

-- Фильтрация по org_id + сортировка — основной паттерн всех запросов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_org_created
  ON clients (org_id, created_at DESC);

-- ─── VISITS ──────────────────────────────────────────────────────────────────
-- Фильтр по org_id + дата — главный запрос страницы визитов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visits_org_scheduled
  ON visits (org_id, scheduled_at DESC);

-- Фильтр по client_id — история клиента
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visits_client_id
  ON visits (client_id, scheduled_at DESC);

-- Фильтр по статусу (scheduled / completed / cancelled)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_visits_status
  ON visits (org_id, status);

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
-- Поиск по названию товара
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (name gin_trgm_ops);

-- Фильтр по org_id — все запросы товаров
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_org_active
  ON products (org_id, is_active);

-- ─── SERVICES ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_org_id
  ON services (org_id);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_org_created
  ON payments (org_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_client_id
  ON payments (client_id);

-- ─── VERIFY ──────────────────────────────────────────────────────────────────
-- После применения — убедиться что индексы созданы:
-- SELECT indexname, tablename FROM pg_indexes
--   WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
--   ORDER BY tablename, indexname;
