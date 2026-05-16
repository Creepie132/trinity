/**
 * scripts/run-migration.mjs
 * Запускает SQL миграцию через Supabase Management API
 * node scripts/run-migration.mjs
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'tjryzcqvsavtllahjyrj'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN env variable is required')
  process.exit(1)
}

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const text = await res.text()
  return { ok: res.ok, body: text }
}

const STEPS = [
  ['CREATE system_errors', `
    CREATE TABLE IF NOT EXISTS public.system_errors (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id           uuid,
      user_id          uuid,
      route            text NOT NULL,
      method           text NOT NULL DEFAULT 'GET',
      error_message    text NOT NULL,
      error_stack      text,
      request_body     jsonb,
      severity         text NOT NULL DEFAULT 'low'
                       CHECK (severity IN ('low','medium','high','critical')),
      attempt_count    integer NOT NULL DEFAULT 0,
      is_critical_path boolean NOT NULL DEFAULT false,
      healed           boolean NOT NULL DEFAULT false,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    )
  `],
  ['INDEX system_errors_route_msg', `
    CREATE INDEX IF NOT EXISTS system_errors_route_msg
      ON public.system_errors (route, error_message) WHERE healed = false
  `],
  ['INDEX system_errors_created_at', `
    CREATE INDEX IF NOT EXISTS system_errors_created_at
      ON public.system_errors (created_at DESC)
  `],
  ['RLS system_errors', `ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY`],
  ['POLICY system_errors', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_errors' AND policyname='superadmin_all_system_errors') THEN
        CREATE POLICY "superadmin_all_system_errors" ON public.system_errors FOR ALL
          USING ((auth.jwt()->>'is_admin')::boolean = true);
      END IF;
    END $$
  `],
  ['CREATE ai_healing_logs', `
    CREATE TABLE IF NOT EXISTS public.ai_healing_logs (
      id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      error_id               uuid NOT NULL REFERENCES public.system_errors(id) ON DELETE CASCADE,
      status                 text NOT NULL DEFAULT 'analyzing'
                             CHECK (status IN ('analyzing','fix_generated','testing','merged','deployed','rolled_back','failed','awaiting_approval')),
      branch_name            text,
      pr_url                 text,
      preview_url            text,
      deployment_id          text,
      previous_deployment_id text,
      claude_analysis        text,
      generated_diff         text,
      test_file_content      text,
      test_result            text CHECK (test_result IN ('pass','fail')),
      build_result           text CHECK (build_result IN ('success','failure')),
      rollback_triggered     boolean NOT NULL DEFAULT false,
      rollback_at            timestamptz,
      merged_at              timestamptz,
      created_at             timestamptz NOT NULL DEFAULT now(),
      updated_at             timestamptz NOT NULL DEFAULT now()
    )
  `],
  ['INDEX ai_healing_logs_error_id', `CREATE INDEX IF NOT EXISTS ai_healing_logs_error_id ON public.ai_healing_logs (error_id)`],
  ['INDEX ai_healing_logs_status', `CREATE INDEX IF NOT EXISTS ai_healing_logs_status ON public.ai_healing_logs (status)`],
  ['INDEX ai_healing_logs_merged_at', `CREATE INDEX IF NOT EXISTS ai_healing_logs_merged_at ON public.ai_healing_logs (merged_at) WHERE merged_at IS NOT NULL`],
  ['RLS ai_healing_logs', `ALTER TABLE public.ai_healing_logs ENABLE ROW LEVEL SECURITY`],
  ['POLICY ai_healing_logs', `
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ai_healing_logs' AND policyname='superadmin_all_healing_logs') THEN
        CREATE POLICY "superadmin_all_healing_logs" ON public.ai_healing_logs FOR ALL
          USING ((auth.jwt()->>'is_admin')::boolean = true);
      END IF;
    END $$
  `],
  ['FUNCTION set_updated_at', `
    CREATE OR REPLACE FUNCTION public.set_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
  `],
  ['TRIGGER system_errors', `
    DROP TRIGGER IF EXISTS set_updated_at_system_errors ON public.system_errors;
    CREATE TRIGGER set_updated_at_system_errors
      BEFORE UPDATE ON public.system_errors
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
  `],
  ['TRIGGER ai_healing_logs', `
    DROP TRIGGER IF EXISTS set_updated_at_healing_logs ON public.ai_healing_logs;
    CREATE TRIGGER set_updated_at_healing_logs
      BEFORE UPDATE ON public.ai_healing_logs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
  `],
]

async function run() {
  console.log('🚀 Self-Healing migration via Supabase Management API\n')
  let ok = 0, fail = 0
  for (const [name, sql] of STEPS) {
    process.stdout.write(`  ${name}... `)
    const result = await query(sql)
    if (result.ok || result.body.includes('already exists')) {
      console.log('✅')
      ok++
    } else {
      console.log(`❌  ${result.body.slice(0, 100)}`)
      fail++
    }
  }
  console.log(`\n${ok} OK, ${fail} failed`)
  if (fail === 0) console.log('✅ Migration complete!')
}

run().catch(console.error)
