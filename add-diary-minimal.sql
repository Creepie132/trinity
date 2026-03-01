-- Minimal script to add Diary module (₪19/month)
-- Only uses columns that definitely exist

INSERT INTO public.module_pricing (
  module_key,
  name_he,
  name_ru,
  price_monthly,
  is_available,
  sort_order
)
VALUES (
  'diary',
  'יומן',
  'Дневник',
  19.00,
  true,
  3
)
ON CONFLICT (module_key)
DO UPDATE SET
  name_he = EXCLUDED.name_he,
  name_ru = EXCLUDED.name_ru,
  price_monthly = EXCLUDED.price_monthly,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  updated_at = CURRENT_TIMESTAMP;

-- Verify
SELECT * FROM public.module_pricing WHERE module_key = 'diary';
