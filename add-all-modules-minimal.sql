-- Add all modules - minimal version (no price_yearly)

INSERT INTO public.module_pricing (module_key, name_he, name_ru, price_monthly, is_available, sort_order)
VALUES
  ('clients', 'לקוחות', 'Клиенты', 0, true, 1),
  ('visits', 'ביקורים', 'Визиты', 0, true, 2),
  ('diary', 'יומן', 'Дневник', 19, true, 3),
  ('booking', 'הזמנות אונליין', 'Онлайн-запись', 29, true, 4),
  ('inventory', 'מלאי', 'Склад', 39, true, 5),
  ('payments', 'תשלומים', 'Платежи', 49, true, 6),
  ('sms', 'קמפיינים SMS', 'SMS-кампании', 59, true, 7),
  ('subscriptions', 'מנויים', 'Подписки', 29, true, 8),
  ('statistics', 'סטטיסטיקה', 'Статистика', 19, true, 9),
  ('reports', 'דוחות', 'Отчёты', 29, true, 10),
  ('telegram', 'התראות טלגרם', 'Telegram-уведомления', 9, true, 11),
  ('loyalty', 'נקודות נאמנות', 'Программа лояльности', 39, true, 12),
  ('birthday', 'הודעות יום הולדת', 'Поздравления с ДР', 9, true, 13)
ON CONFLICT (module_key)
DO UPDATE SET
  name_he = EXCLUDED.name_he,
  name_ru = EXCLUDED.name_ru,
  price_monthly = EXCLUDED.price_monthly,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;

-- Verify
SELECT module_key, name_he, name_ru, price_monthly, is_available, sort_order
FROM public.module_pricing
ORDER BY sort_order;
