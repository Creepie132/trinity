-- ============================================================
-- Migration: self_healing_tables
-- Trinity CRM — Zero-Touch Resolution System
-- ============================================================

-- ─── system_errors ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.system_errors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid REFERENCES organizations(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route            text NOT NULL,
  method           text NOT NULL DEFAULT 'GET',
  error_message    text NOT NULL,
  error_stack      text,
  request_body     jsonb,
  severity         text NOT NULL DEFAULT 'low'
                   CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  attempt_count    integer NOT NULL DEFAULT 0,
  is_critical_path boolean NOT NULL DEFAULT false,
  healed           boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Индексы для быстрого поиска дубликатов и Dead Man's Switch
CREATE INDEX IF NOT EXISTS system_errors_route_msg
  ON public.system_errors (route, error_message)
  WHERE healed = false;

CREATE INDEX IF NOT EXISTS system_errors_created_at
  ON public.system_errors (created_at DESC);

-- RLS: только суперадмин читает (org_id может быть null)
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_system_errors"
  ON public.system_errors
  FOR ALL
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

-- ─── ai_healing_logs ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_healing_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id              uuid NOT NULL REFERENCES system_errors(id) ON DELETE CASCADE,
  status                text NOT NULL DEFAULT 'analyzing'
                        CHECK (status IN (
                          'analyzing','fix_generated','testing',
                          'merged','deployed','rolled_back',
                          'failed','awaiting_approval'
                        )),
  branch_name           text,
  pr_url                text,
  preview_url           text,
  deployment_id         text,
  previous_deployment_id text,
  claude_analysis       text,
  generated_diff        text,
  test_file_content     text,
  test_result           text CHECK (test_result IN ('pass', 'fail')),
  build_result          text CHECK (build_result IN ('success', 'failure')),
  rollback_triggered    boolean NOT NULL DEFAULT false,
  rollback_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_healing_logs_error_id
  ON public.ai_healing_logs (error_id);

CREATE INDEX IF NOT EXISTS ai_healing_logs_status
  ON public.ai_healing_logs (status);

ALTER TABLE public.ai_healing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_all_healing_logs"
  ON public.ai_healing_logs
  FOR ALL
  USING ((auth.jwt() ->> 'is_admin')::boolean = true);

-- ─── Auto-update updated_at trigger ──────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_system_errors ON public.system_errors;
CREATE TRIGGER set_updated_at_system_errors
  BEFORE UPDATE ON public.system_errors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_healing_logs ON public.ai_healing_logs;
CREATE TRIGGER set_updated_at_healing_logs
  BEFORE UPDATE ON public.ai_healing_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Realtime для ai_healing_logs (статусы в реальном времени) ─

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_healing_logs;
