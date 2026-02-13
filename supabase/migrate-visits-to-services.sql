-- Migration: Migrate visits.service_type to services table integration
-- Step 1: Add service_id column to visits table
-- Step 2: Create default services for existing service types
-- Step 3: Migrate data from service_type to service_id
-- Step 4: Make service_id NOT NULL after migration
-- Step 5: Drop service_type column (optional, keep for backward compatibility)

-- ============================================================
-- STEP 1: Add service_id column to visits table
-- ============================================================
ALTER TABLE visits
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visits_service_id ON visits(service_id);

-- ============================================================
-- STEP 2: Create default services for each organization
-- ============================================================
-- This function creates default services based on existing service types
-- Run this for each organization that has visits

-- Default service mappings (Hebrew/Russian names and colors)
-- You can customize these before running the migration

DO $$
DECLARE
  org RECORD;
  service_haircut UUID;
  service_coloring UUID;
  service_smoothing UUID;
  service_facial UUID;
  service_manicure UUID;
  service_pedicure UUID;
  service_massage UUID;
  service_consultation UUID;
  service_meeting UUID;
  service_advertising UUID;
BEGIN
  -- Loop through all organizations that have visits
  FOR org IN (SELECT DISTINCT org_id FROM visits WHERE service_id IS NULL)
  LOOP
    RAISE NOTICE 'Creating default services for organization: %', org.org_id;

    -- Create Haircut service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'תספורת',
      'Стрижка',
      100,
      60,
      '#f59e0b', -- Amber
      'תספורת סטנדרטית',
      'Стандартная стрижка'
    )
    RETURNING id INTO service_haircut;

    -- Create Coloring service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'צבע',
      'Окрашивание',
      200,
      120,
      '#ef4444', -- Red
      'צביעת שיער',
      'Окрашивание волос'
    )
    RETURNING id INTO service_coloring;

    -- Create Smoothing service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'החלקה',
      'Выпрямление',
      300,
      180,
      '#8b5cf6', -- Purple
      'החלקת שיער',
      'Кератиновое выпрямление'
    )
    RETURNING id INTO service_smoothing;

    -- Create Facial service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'טיפול פנים',
      'Уход за лицом',
      150,
      90,
      '#10b981', -- Green
      'טיפול פנים מקצועי',
      'Профессиональный уход за лицом'
    )
    RETURNING id INTO service_facial;

    -- Create Manicure service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'מניקור',
      'Маникюр',
      80,
      60,
      '#ec4899', -- Pink
      'מניקור מלא',
      'Полный маникюр'
    )
    RETURNING id INTO service_manicure;

    -- Create Pedicure service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'פדיקור',
      'Педикюр',
      100,
      90,
      '#06b6d4', -- Cyan
      'פדיקור מלא',
      'Полный педикюр'
    )
    RETURNING id INTO service_pedicure;

    -- Create Massage service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'עיסוי',
      'Массаж',
      120,
      60,
      '#f97316', -- Orange
      'עיסוי מקצועי',
      'Профессиональный массаж'
    )
    RETURNING id INTO service_massage;

    -- Create Consultation service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'ייעוץ',
      'Консультация',
      50,
      30,
      '#3b82f6', -- Blue
      'ייעוץ מקצועי',
      'Профессиональная консультация'
    )
    RETURNING id INTO service_consultation;

    -- Create Meeting service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'פגישה',
      'Встреча',
      0,
      60,
      '#84cc16', -- Lime
      'פגישה עסקית',
      'Деловая встреча'
    )
    RETURNING id INTO service_meeting;

    -- Create Advertising service
    INSERT INTO services (org_id, name, name_ru, price, duration_minutes, color, description, description_ru)
    VALUES (
      org.org_id,
      'פרסום',
      'Реклама',
      0,
      30,
      '#6366f1', -- Indigo
      'פרסום ושיווק',
      'Реклама и маркетинг'
    )
    RETURNING id INTO service_advertising;

    -- ============================================================
    -- STEP 3: Migrate existing visits to use service_id
    -- ============================================================
    -- Map service_type to service_id
    
    UPDATE visits SET service_id = service_haircut
    WHERE org_id = org.org_id AND service_type = 'haircut' AND service_id IS NULL;

    UPDATE visits SET service_id = service_coloring
    WHERE org_id = org.org_id AND service_type = 'coloring' AND service_id IS NULL;

    UPDATE visits SET service_id = service_smoothing
    WHERE org_id = org.org_id AND service_type = 'smoothing' AND service_id IS NULL;

    UPDATE visits SET service_id = service_facial
    WHERE org_id = org.org_id AND service_type = 'facial' AND service_id IS NULL;

    UPDATE visits SET service_id = service_manicure
    WHERE org_id = org.org_id AND service_type = 'manicure' AND service_id IS NULL;

    UPDATE visits SET service_id = service_pedicure
    WHERE org_id = org.org_id AND service_type = 'pedicure' AND service_id IS NULL;

    UPDATE visits SET service_id = service_massage
    WHERE org_id = org.org_id AND service_type = 'massage' AND service_id IS NULL;

    UPDATE visits SET service_id = service_consultation
    WHERE org_id = org.org_id AND service_type = 'consultation' AND service_id IS NULL;

    UPDATE visits SET service_id = service_meeting
    WHERE org_id = org.org_id AND service_type = 'meeting' AND service_id IS NULL;

    UPDATE visits SET service_id = service_advertising
    WHERE org_id = org.org_id AND service_type = 'advertising' AND service_id IS NULL;

    RAISE NOTICE 'Migration complete for organization: %', org.org_id;
  END LOOP;
END $$;

-- ============================================================
-- STEP 4: Verify migration (check for unmigrated visits)
-- ============================================================
-- Run this to see if any visits don't have service_id
SELECT org_id, service_type, COUNT(*)
FROM visits
WHERE service_id IS NULL
GROUP BY org_id, service_type;

-- ============================================================
-- STEP 5 (OPTIONAL): Make service_id NOT NULL
-- ============================================================
-- Only run this after verifying all visits have been migrated
-- ALTER TABLE visits ALTER COLUMN service_id SET NOT NULL;

-- ============================================================
-- STEP 6 (OPTIONAL): Drop service_type column
-- ============================================================
-- Keep service_type for backward compatibility during transition
-- Uncomment to remove after full migration:
-- ALTER TABLE visits DROP COLUMN IF EXISTS service_type;

-- ============================================================
-- ROLLBACK (if needed)
-- ============================================================
-- To rollback:
-- ALTER TABLE visits DROP COLUMN IF EXISTS service_id;
-- DELETE FROM services WHERE org_id IN (SELECT DISTINCT org_id FROM visits);
