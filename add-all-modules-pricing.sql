-- Add ALL modules to module_pricing table
-- This ensures all modules from MODULES config have pricing records

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.module_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  name_he TEXT NOT NULL,
  name_ru TEXT NOT NULL,
  desc_he TEXT,
  desc_ru TEXT,
  price_monthly NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10, 2),
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert all modules (always visible modules are free or base pricing)
INSERT INTO public.module_pricing (module_key, name_he, name_ru, desc_he, desc_ru, price_monthly, price_yearly, is_available, sort_order)
VALUES
  ('clients', 'לקוחות', 'Клиенты', 'ניהול לקוחות', 'Управление клиентами', 0, 0, true, 1),
  ('visits', 'ביקורים', 'Визиты', 'ניהול ביקורים ותורים', 'Управление визитами и записями', 0, 0, true, 2),
  ('diary', 'יומן', 'Дневник', 'ניהול משימות ותזכורות', 'Управление задачами и напоминаниями', 19, 200, true, 3),
  ('booking', 'הזמנות אונליין', 'Онлайн-запись', 'מערכת הזמנות אונליין', 'Система онлайн-записи', 29, 300, true, 4),
  ('inventory', 'מלאי', 'Склад', 'ניהול מלאי ומוצרים', 'Управление складом и товарами', 39, 400, true, 5),
  ('payments', 'תשלומים', 'Платежи', 'מערכות תשלום', 'Платёжная система', 49, 500, true, 6),
  ('sms', 'קמפיינים SMS', 'SMS-кампании', 'שליחת הודעות SMS', 'Отправка SMS-сообщений', 59, 600, true, 7),
  ('subscriptions', 'מנויים', 'Подписки', 'ניהול מנויים חוזרים', 'Управление подписками', 29, 300, true, 8),
  ('statistics', 'סטטיסטיקה', 'Статистика', 'דשבורד וגרפים', 'Дашборд и графики', 19, 200, true, 9),
  ('reports', 'דוחות', 'Отчёты', 'דוחות עסקיים', 'Бизнес-отчёты', 29, 300, true, 10),
  ('telegram', 'התראות טלגרם', 'Telegram-уведомления', 'התראות ב-Telegram', 'Уведомления в Telegram', 9, 90, true, 11),
  ('loyalty', 'נקודות נאמנות', 'Программа лояльности', 'תוכנית נאמנות', 'Система бонусов и лояльности', 39, 400, true, 12),
  ('birthday', 'הודעות יום הולדת', 'Поздравления с ДР', 'ברכות אוטומטיות', 'Автоматические поздравления', 9, 90, true, 13)
ON CONFLICT (module_key)
DO UPDATE SET
  name_he = EXCLUDED.name_he,
  name_ru = EXCLUDED.name_ru,
  desc_he = EXCLUDED.desc_he,
  desc_ru = EXCLUDED.desc_ru,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Verify all modules
SELECT 
  module_key,
  name_he,
  name_ru,
  price_monthly,
  is_available,
  sort_order
FROM public.module_pricing
ORDER BY sort_order;
