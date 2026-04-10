-- ============================================================
-- Trinity CRM — Mobile Sessions
-- Назначение: отслеживание активных мобильных сессий
-- для выброса дублирующих устройств через Supabase Realtime.
-- Дата: 2026-04-10
-- ============================================================

create table if not exists public.mobile_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  org_id          uuid not null,
  -- SHA-256 хеш access_token (сам токен не хранится — безопасность)
  token_hash      text not null,
  device_name     text,
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

create index if not exists mobile_sessions_user_id_idx
  on public.mobile_sessions (user_id);

create index if not exists mobile_sessions_token_hash_idx
  on public.mobile_sessions (token_hash);

-- Один user_id = одна запись.
-- При новом логине — upsert обновляет token_hash,
-- что Supabase Realtime шлёт как UPDATE старому устройству.
create unique index if not exists mobile_sessions_user_id_unique
  on public.mobile_sessions (user_id);

-- RLS: пользователь видит только свою строку
alter table public.mobile_sessions enable row level security;

create policy "user sees own session"
  on public.mobile_sessions
  for select
  using (user_id = auth.uid());

-- Realtime: включаем для таблицы
begin;
  alter publication supabase_realtime add table public.mobile_sessions;
commit;
