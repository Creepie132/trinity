-- Check module_pricing table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'module_pricing'
ORDER BY ordinal_position;

-- Check existing data
SELECT * FROM public.module_pricing ORDER BY sort_order;
