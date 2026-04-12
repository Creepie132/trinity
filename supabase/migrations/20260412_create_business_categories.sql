-- Migration: create_business_categories
-- Таблица категорий бизнеса для онбординга Trinity Mobile
-- Дата: 2026-04-12

CREATE TABLE IF NOT EXISTS public.business_categories (
  id        uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name      text NOT NULL,
  org_id    uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- NULL = глобальная категория, uuid = кастомная категория орга
  is_global boolean GENERATED ALWAYS AS (org_id IS NULL) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biz_categories_org ON public.business_categories(org_id);

-- RLS
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

-- Глобальные категории видны всем аутентифицированным
CREATE POLICY "biz_categories_global_read"
  ON public.business_categories FOR SELECT
  USING (
    org_id IS NULL
    OR org_id IN (
      SELECT ou.org_id FROM public.org_users ou
      WHERE ou.user_id = (SELECT auth.uid())
    )
  );

-- Кастомные категории: создаёт только owner/admin своей орги
CREATE POLICY "biz_categories_org_insert"
  ON public.business_categories FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT ou.org_id FROM public.org_users ou
      WHERE ou.user_id = (SELECT auth.uid())
        AND ou.role IN ('owner', 'admin')
    )
  );

-- Дефолтные категории
INSERT INTO public.business_categories (name, org_id) VALUES
  ('Салон красоты',        NULL),
  ('Барбершоп',            NULL),
  ('Клиника / медицина',   NULL),
  ('СПА',                  NULL),
  ('Ногтевой сервис',      NULL),
  ('Тату / пирсинг',       NULL),
  ('Массаж',               NULL),
  ('Автомойка',            NULL),
  ('Фитнес / спорт',       NULL),
  ('Стоматология',         NULL),
  ('Ветеринария',          NULL),
  ('Юридические услуги',   NULL),
  ('Недвижимость',         NULL),
  ('Обучение / репетитор', NULL),
  ('Другое',               NULL)
ON CONFLICT DO NOTHING;
