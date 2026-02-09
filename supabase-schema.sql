-- ClientBase Pro - Supabase Schema
-- Скопируйте и запустите в SQL Editor на supabase.com

-- Таблица клиентов
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  date_of_birth DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица визитов
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица платежей
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_link TEXT,
  transaction_id TEXT,
  provider TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица SMS кампаний
CREATE TABLE sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('all', 'single', 'inactive_days')),
  filter_value TEXT,
  recipients_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Таблица SMS сообщений
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ
);

-- View для сводки по клиентам
CREATE OR REPLACE VIEW client_summary AS
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  c.date_of_birth,
  c.address,
  c.notes,
  c.created_at,
  MAX(v.visit_date) as last_visit,
  COUNT(v.id) as total_visits,
  COALESCE(SUM(p.amount), 0) as total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'completed'
GROUP BY c.id;

-- Индексы для производительности
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_visits_client_id ON visits(client_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_payments_client_id ON payments(client_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_sms_messages_campaign_id ON sms_messages(campaign_id);

-- Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для clients
CREATE TRIGGER clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) - настройте по вашим требованиям
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Политики доступа (временные - разрешить всё для анонимных пользователей)
-- ⚠️ ВАЖНО: В продакшене замените на настоящую авторизацию!
CREATE POLICY "Allow all for anon" ON clients FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON visits FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON sms_campaigns FOR ALL TO anon USING (true);
CREATE POLICY "Allow all for anon" ON sms_messages FOR ALL TO anon USING (true);
