-- ============================================
-- Модуль "Дневник / יומן" — База данных
-- ============================================

-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date timestamptz,
  completed_at timestamptz,
  client_id uuid,
  visit_id uuid,
  payment_id uuid,
  contact_phone text,
  contact_email text,
  contact_address text,
  is_auto boolean DEFAULT false,
  auto_type text,
  is_read boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS для задач
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see org tasks" ON tasks
  FOR ALL
  USING (org_id IN (SELECT org_id FROM org_users WHERE user_id = auth.uid()));

-- Индексы для задач
CREATE INDEX idx_tasks_org ON tasks(org_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  link text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS для уведомлений
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Индексы для уведомлений
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
