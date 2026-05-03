-- ============================================================
-- client_edit_tokens — временные токены для самостоятельного
-- редактирования профиля клиентом
-- ============================================================

create table if not exists client_edit_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null default gen_random_uuid() unique,
  client_id   uuid not null references clients(id) on delete cascade,
  org_id      uuid not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours'),
  used_at     timestamptz,        -- null = ещё не использован
  is_active   boolean not null default true
);

-- Ускоряем поиск по токену
create index if not exists idx_client_edit_tokens_token
  on client_edit_tokens(token)
  where is_active = true;

-- RLS: таблица публична только через service role (API routes)
alter table client_edit_tokens enable row level security;

-- Владелец организации может читать свои токены
create policy "org owner can read tokens"
  on client_edit_tokens for select
  using (
    org_id in (
      select org_id from org_users
      where user_id = auth.uid()
    )
  );

-- Только service role может вставлять и обновлять (API routes)
-- — никаких client-side правил для write
