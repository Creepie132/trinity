-- =============================================
-- WhatsApp Inbox — входящие сообщения
-- Trinity CRM | 18.03.2026
-- =============================================

-- Таблица разговоров (один разговор = один контакт)
CREATE TABLE IF NOT EXISTS wa_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  phone text NOT NULL,
  contact_name text,
  status text DEFAULT 'new' CHECK (status IN ('new','in_progress','waiting','closed')),
  lead_status text DEFAULT 'new' CHECK (lead_status IN ('new','contacted','demo_scheduled','converted','lost')),
  last_message_at timestamptz DEFAULT now(),
  last_message_text text,
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, phone)
);

-- Таблица сообщений
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES wa_conversations(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  whapi_message_id text UNIQUE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text DEFAULT 'text' CHECK (message_type IN ('text','image','audio','document','location')),
  body text,
  media_url text,
  status text DEFAULT 'received' CHECK (status IN ('received','sent','delivered','read','failed')),
  sent_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Индексы для быстрой работы
CREATE INDEX IF NOT EXISTS idx_wa_conversations_org_id ON wa_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status ON wa_conversations(org_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_last_msg ON wa_conversations(org_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_conversation ON wa_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_org ON wa_messages(org_id);

-- RLS политики
ALTER TABLE wa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage conversations"
  ON wa_conversations FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can manage messages"
  ON wa_messages FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM org_users WHERE user_id = auth.uid()
    )
  );

-- Realtime для живого чата
ALTER PUBLICATION supabase_realtime ADD TABLE wa_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_messages;
