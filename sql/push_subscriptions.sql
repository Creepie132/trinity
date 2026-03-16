-- Push notification subscriptions per user+device
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  -- Один endpoint = одна запись
  UNIQUE (endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_org_id ON public.push_subscriptions(org_id);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои подписки
CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователь может создавать свои подписки
CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователь может удалять свои подписки
CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Обновление timestamp
CREATE OR REPLACE FUNCTION update_push_subs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_subs_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subs_updated_at();
