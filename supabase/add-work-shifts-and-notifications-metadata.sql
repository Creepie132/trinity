-- ============================================
-- Migration: work_shifts + notifications.metadata
-- Run manually in Supabase SQL Editor
-- ============================================

-- 1) Add metadata column to notifications (for action buttons data)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- 2) Create work_shifts table
CREATE TABLE IF NOT EXISTS work_shifts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users see work shifts" ON work_shifts
  FOR ALL
  USING (org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_work_shifts_org        ON work_shifts(org_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_user       ON work_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_active     ON work_shifts(org_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_shifts_started_at ON work_shifts(started_at);
