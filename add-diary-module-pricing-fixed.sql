-- Add "Diary" module to module_pricing table
-- Price: ₪19/month
-- Fixed version without desc_he/desc_ru columns

-- Insert or update "diary" module
INSERT INTO public.module_pricing (
  module_key,
  name_he,
  name_ru,
  price_monthly,
  price_yearly,
  is_available,
  sort_order
)
VALUES (
  'diary',
  'יומן',
  'Дневник',
  19.00,
  200.00,
  true,
  3
)
ON CONFLICT (module_key)
DO UPDATE SET
  name_he = EXCLUDED.name_he,
  name_ru = EXCLUDED.name_ru,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  is_available = EXCLUDED.is_available,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Verify the insert
SELECT 
  module_key,
  name_he,
  name_ru,
  price_monthly,
  is_available,
  sort_order
FROM public.module_pricing
WHERE module_key = 'diary';
