-- Add "Diary" module to module_pricing table
-- Price: ₪19/month

-- Check if table exists, if not create it
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

-- Insert or update "diary" module
INSERT INTO public.module_pricing (
  module_key,
  name_he,
  name_ru,
  desc_he,
  desc_ru,
  price_monthly,
  price_yearly,
  is_available,
  sort_order
)
VALUES (
  'diary',
  'יומן',
  'Дневник',
  'ניהול משימות ותזכורות',
  'Управление задачами и напоминаниями',
  19.00,
  200.00,
  true,
  3
)
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

-- Verify the insert
SELECT 
  module_key,
  name_he,
  name_ru,
  price_monthly,
  is_available
FROM public.module_pricing
WHERE module_key = 'diary';
