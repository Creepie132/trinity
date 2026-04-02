-- ═══════════════════════════════════════════════════════════
-- Kira AI Memory (Hippocampus) — Level 2
-- ═══════════════════════════════════════════════════════════

-- 1. Сессии Киры (одна на org, можно создавать новые)
create table if not exists public.kira_sessions (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Индекс для быстрого поиска последней сессии орга
create index if not exists kira_sessions_org_id_created_at_idx
  on public.kira_sessions (org_id, created_at desc);

-- 2. Сообщения
create table if not exists public.kira_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.kira_sessions(id) on delete cascade,
  org_id     uuid not null,  -- денормализовано для быстрого RLS без join
  role       varchar(16) not null check (role in ('user', 'assistant', 'system')),
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists kira_messages_session_id_idx
  on public.kira_messages (session_id, created_at asc);

-- ── RLS ─────────────────────────────────────────────────────
alter table public.kira_sessions enable row level security;
alter table public.kira_messages  enable row level security;

-- kira_sessions: пользователь видит только сессии своего орга
create policy "kira_sessions: org members only"
  on public.kira_sessions
  for all
  using (
    org_id in (
      select org_id from public.org_users
      where user_id = auth.uid()
    )
  );

-- kira_messages: пользователь видит только сообщения своего орга
create policy "kira_messages: org members only"
  on public.kira_messages
  for all
  using (
    org_id in (
      select org_id from public.org_users
      where user_id = auth.uid()
    )
  );
