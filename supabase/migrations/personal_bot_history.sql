-- Таблица истории разговоров личного бота Влада
-- Хранит все сообщения (входящие и исходящие) по каждому chat_id
-- Используется для передачи контекста в GPT при каждом новом сообщении

CREATE TABLE IF NOT EXISTS personal_bot_history (
  id          bigserial PRIMARY KEY,
  chat_id     text        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Индекс для быстрой выборки истории по chat_id
CREATE INDEX IF NOT EXISTS personal_bot_history_chat_id_idx
  ON personal_bot_history (chat_id, created_at DESC);

-- Автоочистка: удалять сообщения старше 30 дней чтобы не раздувать таблицу
-- (запускается вручную или через pg_cron если нужно)
-- DELETE FROM personal_bot_history WHERE created_at < now() - interval '30 days';

-- RLS не нужен — таблица доступна только через service role (вебхук)
