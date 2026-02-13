-- ================================================
-- TRINITY CRM - Services & Care Instructions
-- Migration: Create services and care_instructions tables
-- Version: 2.25.0
-- Date: 2026-02-13
-- ================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLE: services
-- Услуги организации (вместо хардкоженного списка)
-- ================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ru TEXT,
  price DECIMAL(10,2),
  duration_minutes INTEGER DEFAULT 60,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TABLE: care_instructions
-- Инструкции по уходу после услуги (PDF)
-- ================================================
CREATE TABLE IF NOT EXISTS care_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES for performance
-- ================================================

-- Services: query by org_id + active status
CREATE INDEX IF NOT EXISTS services_org_id_idx ON services(org_id);
CREATE INDEX IF NOT EXISTS services_org_active_idx ON services(org_id, is_active);

-- Care Instructions: query by org_id + service_id
CREATE INDEX IF NOT EXISTS care_instructions_org_id_idx ON care_instructions(org_id);
CREATE INDEX IF NOT EXISTS care_instructions_service_id_idx ON care_instructions(service_id);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on both tables
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_instructions ENABLE ROW LEVEL SECURITY;

-- Services: Users can only see services from their organization
CREATE POLICY "Users can view their org's services" ON services
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert services in their org" ON services
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's services" ON services
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's services" ON services
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Care Instructions: Users can only see instructions from their organization
CREATE POLICY "Users can view their org's instructions" ON care_instructions
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert instructions in their org" ON care_instructions
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org's instructions" ON care_instructions
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their org's instructions" ON care_instructions
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- ================================================
-- COMMENTS for documentation
-- ================================================

COMMENT ON TABLE services IS 'Услуги организации (настраиваемые)';
COMMENT ON TABLE care_instructions IS 'Инструкции по уходу после услуг (генерация PDF)';

COMMENT ON COLUMN services.name IS 'Название услуги на иврите';
COMMENT ON COLUMN services.name_ru IS 'Название услуги на русском (опционально)';
COMMENT ON COLUMN services.price IS 'Цена услуги';
COMMENT ON COLUMN services.duration_minutes IS 'Длительность услуги в минутах';
COMMENT ON COLUMN services.color IS 'Цвет для отображения в календаре';

COMMENT ON COLUMN care_instructions.service_id IS 'Привязка к услуге (опционально)';
COMMENT ON COLUMN care_instructions.title IS 'Заголовок инструкции';
COMMENT ON COLUMN care_instructions.content IS 'Текст инструкции (для генерации PDF)';

-- ================================================
-- END OF MIGRATION
-- ================================================
