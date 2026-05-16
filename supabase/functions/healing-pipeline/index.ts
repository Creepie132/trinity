/**
 * supabase/functions/healing-pipeline/index.ts
 * Stateless Self-Healing pipeline — Deno Edge Function
 * Без внешних npm импортов (только fetch)
 */

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const GITHUB_TOKEN  = Deno.env.get('GITHUB_TOKEN')!
const GITHUB_OWNER  = Deno.env.get('GITHUB_OWNER') ?? 'Creepie132'
const GITHUB_REPO   = Deno.env.get('GITHUB_REPO')  ?? 'trinity'
const VERCEL_TOKEN  = Deno.env.get('VERCEL_TOKEN')!
const VERCEL_PID    = Deno.env.get('VERCEL_PROJECT_ID')!
const TG_TOKEN      = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TG_CHAT       = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') ?? ''

const CRITICAL = ['/api/payments','/api/auth','/api/billing','/api/tranzila','/api/webhooks','/api/plan-change','/api/gateway']
const DMS_MS   = 15 * 60 * 1000
const sleep    = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Supabase admin notification helper ───────────────────────────────────────
// Отправляет уведомление суперадмину через таблицу notifications
// org_id = null означает системное уведомление (суперадмин видит их отдельно)
async function notifyAdmin(title: string, body: string, type = 'system_healing') {
  // Получаем org_id суперадмина из admin_users
  const adminsRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=user_id&limit=5`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  })
  const admins = await adminsRes.json().catch(() => [])

  // Вставляем уведомление без org_id — оно будет видно в admin панели
  await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ org_id: null, type, title, body, read: false }),
  }).catch(() => {})
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

async function dbSelect(table: string, query: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
  })
  return r.json()
}

async function dbInsert(table: string, data: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  })
  const rows = await r.json()
  return Array.isArray(rows) ? rows[0] : rows
}

async function dbUpdate(table: string, filter: string, data: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: {
      'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
}

// ── Telegram ──────────────────────────────────────────────────────────────────

async function tg(text: string) {
  if (!TG_TOKEN || !TG_CHAT) return
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
  }).catch(() => {})
}

const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ── GitHub ────────────────────────────────────────────────────────────────────

async function gh(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  })
  if (!r.ok) throw new Error(`GitHub ${r.status} ${path}: ${await r.text()}`)
  return r.json()
}

// ── Vercel ────────────────────────────────────────────────────────────────────

async function vr(path: string, init?: RequestInit) {
  const r = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!r.ok) throw new Error(`Vercel ${r.status} ${path}: ${await r.text()}`)
  return r.json()
}

// ── Dead Man's Switch ─────────────────────────────────────────────────────────

async function checkDMS(route: string) {
  const since = new Date(Date.now() - DMS_MS).toISOString()
  const rows = await dbSelect(
    'ai_healing_logs',
    `status=eq.merged&merged_at=gte.${since}&previous_deployment_id=not.is.null&order=merged_at.desc&limit=1&select=*,system_errors!inner(route)`
  )
  if (!rows?.length) return null
  const log = rows[0]
  // Проверяем что route совпадает
  if (log.system_errors?.route !== route) return null
  return log
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let error: Record<string, unknown>
  try {
    const payload = await req.json()
    error = payload.record ?? payload
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  if (!error?.id || !error?.route) return new Response('No error record', { status: 200 })

  const route = error.route as string
  const errMsg = (error.error_message as string) ?? 'unknown'
  const errId = error.id as string
  const attemptCount = (error.attempt_count as number) ?? 0

  console.log(`[healing] route=${route} errorId=${errId} attempt=${attemptCount}`)

  // Лимит попыток
  if (attemptCount >= 2) {
    await tg(`🛑 <b>Лимит попыток</b>\n📍 <code>${route}</code>`)
    return new Response('Max attempts', { status: 200 })
  }

  // Dead Man's Switch
  try {
    const dmsLog = await checkDMS(route)
    if (dmsLog?.previous_deployment_id) {
      console.log(`[DMS] Деградация на ${route}`)
      await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PID}/rollback/${dmsLog.previous_deployment_id}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
      })
      await dbUpdate('ai_healing_logs', `id=eq.${dmsLog.id}`, {
        status: 'rolled_back', rollback_triggered: true, rollback_at: new Date().toISOString()
      })
      await tg(`🚨 <b>АВТО-ОТКАТ</b> | Dead Man's Switch\n\n📍 <code>${route}</code>\n🔁 Откат на: <code>${dmsLog.previous_deployment_id}</code>\n⚠️ Расследуйте вручную!`)
      return new Response('Rolled back', { status: 200 })
    }
  } catch (e) {
    console.error('[DMS] check failed:', e)
  }

  // Создаём лог
  const log = await dbInsert('ai_healing_logs', { error_id: errId, status: 'analyzing' })
  if (!log?.id) return new Response('Log create failed', { status: 500 })

  const isCritical = CRITICAL.some(p => route.startsWith(p))
  await tg(`🔍 <b>Self-Healing</b>\n📍 <code>${route}</code>\n❗ <code>${esc(errMsg)}</code>\n⏳ Claude анализирует...`)
  await notifyAdmin(`🔍 Self-Healing: обнаружена ошибка`, `${route} — ${errMsg.slice(0,120)}\nClaude анализирует...`)

  try {
    // Получаем исходный код
    const filePath = `src/app${route}/route.ts`
    const fileData = await gh(`/contents/${filePath}`)
    const sourceCode = atob(fileData.content.replace(/\n/g, ''))

    // Claude
    const cr = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 4096,
        system: `You are an expert TypeScript/Next.js engineer performing automated bug repair for a production CRM system called Trinity.
CRITICAL RULES:
1. Respond with valid JSON ONLY — no markdown, no explanation outside JSON
2. The fixedCode field MUST contain the complete fixed file content
3. The file MUST have at least one named export (export async function GET, POST, etc.)
4. Fix ONLY the root cause — do not remove functionality
5. If the error is in a test/simulation file, make it handle errors gracefully instead of throwing
JSON schema: {"analysis":"string","fixedCode":"string","diff":"string","testCode":"string","testFileName":"string","confidence":"high|medium|low"}`,
        messages: [{ role: 'user', content: `Production error in Trinity CRM:\nRoute: ${route}\nError: ${errMsg}\nStack: ${(error.error_stack as string ?? 'N/A').slice(0,500)}\n\nSource file (${filePath}):\n\`\`\`typescript\n${sourceCode.slice(0,5000)}\n\`\`\`\n\nRespond with JSON only. fixedCode must be the complete file with all exports intact.` }]
      }),
    })
    const cd = await cr.json()
    const raw = (cd.content?.[0]?.text ?? '{}').replace(/^```json\s*/i,'').replace(/```\s*$/i,'').trim()
    const p = JSON.parse(raw)

    // ── Валидация fixedCode ────────────────────────────────────────────────
    // Claude должен вернуть валидный TypeScript с export — иначе билд сломается
    const fixedCode = (p.fixedCode ?? '').trim()
    if (!fixedCode || fixedCode.length < 50 || !fixedCode.includes('export')) {
      console.error('[healing] Claude returned invalid fixedCode:', fixedCode.slice(0,100))
      await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'failed' })
      await tg(`❌ <b>Claude вернул невалидный фикс</b>\n📍 <code>${route}</code>\n⚠️ fixedCode не содержит export или слишком короткий.\n\n<b>Анализ:</b> ${esc(p.analysis ?? 'N/A')}`)
      return new Response('Invalid fixedCode', { status: 200 })
    }

    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, {
      status: 'fix_generated', claude_analysis: p.analysis, generated_diff: p.diff, test_file_content: p.testCode
    })

    // GitHub: ветка + коммит + PR
    const mainRef = await gh(`/git/ref/heads/main`)
    const branch = `auto-fix/bug-${errId.slice(0,8)}`
    await gh('/git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: mainRef.object.sha }) })

    const existing = await gh(`/contents/${filePath}?ref=${branch}`)
    await gh(`/contents/${filePath}`, {
      method: 'PUT',
      body: JSON.stringify({ message: `fix: auto-heal bug-${errId.slice(0,8)}`, content: btoa(unescape(encodeURIComponent(fixedCode))), sha: existing.sha, branch })
    })

    const pr = await gh('/pulls', { method: 'POST', body: JSON.stringify({ title: `🤖 Auto-heal: bug-${errId.slice(0,8)}`, head: branch, base: 'main', body: `**Error:** ${errMsg}\n\n**Analysis:** ${p.analysis}` }) })
    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { branch_name: branch, pr_url: pr.html_url })

    if (isCritical) {
      await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'awaiting_approval' })
      await tg(`🔐 <b>КРИТИЧЕСКИЙ ПУТЬ</b>\n📍 <code>${route}</code>\n🔗 ${pr.html_url}`)
      return new Response('Awaiting approval', { status: 200 })
    }

    await tg(`🛠 <b>Фикс готов</b>\n📍 <code>${route}</code>\n🌿 <code>${branch}</code>\n🔗 ${pr.html_url}\n⏳ CI...`)
    await notifyAdmin(`🛠 Фикс создан`, `${route}\nВетка: ${branch}\nPR: ${pr.html_url}\nTesting...`)
    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'testing' })

    // Сохраняем prev deploy
    const prevDeploys = await vr(`/v6/deployments?projectId=${VERCEL_PID}&target=production&limit=1`)
    const prevDeploy = prevDeploys.deployments?.[0]

    // Ждём preview (до 5 мин)
    let preview = null
    for (let i = 0; i < 30; i++) {
      await sleep(10000)
      const d = await vr(`/v6/deployments?projectId=${VERCEL_PID}&target=preview&limit=10`)
      preview = d.deployments?.find((x: {meta?: {githubCommitRef?: string}, state?: string}) => x.meta?.githubCommitRef === branch)
      if (preview?.state === 'READY' || preview?.state === 'ERROR') break
    }

    if (!preview || preview.state === 'ERROR') {
      await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'failed', build_result: 'failure' })
      await tg(`❌ <b>Билд упал</b>\n📍 <code>${route}</code>`)
      return new Response('Build failed', { status: 200 })
    }

    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { preview_url: preview.url, build_result: 'success' })

    // Smoke test
    const smoke = await fetch(`https://${preview.url}${route}`, {
      headers: { 'x-healing-smoke-test': '1' }, signal: AbortSignal.timeout(15000)
    }).catch(() => null)
    const passed = smoke && smoke.status < 500
    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { test_result: passed ? 'pass' : 'fail' })

    if (!passed) {
      await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'failed' })
      await tg(`❌ <b>Smoke test упал</b>\n📍 <code>${route}</code>`)
      return new Response('Smoke failed', { status: 200 })
    }

    // Мерж
    await gh(`/pulls/${pr.number}/merge`, { method: 'PUT', body: JSON.stringify({ commit_title: `fix: auto-heal bug-${errId.slice(0,8)}`, merge_method: 'squash' }) })
    await gh(`/git/refs/heads/${branch}`, { method: 'DELETE' }).catch(() => {}) // ветка может уже не существовать
    await dbUpdate('system_errors', `id=eq.${errId}`, { healed: true })

    // Получаем ID нового деплоя — может быть ещё BUILDING, не падаем
    let newDeployId: string | null = null
    try {
      const newDeploys = await vr(`/v6/deployments?projectId=${VERCEL_PID}&target=production&limit=1`)
      newDeployId = newDeploys.deployments?.[0]?.uid ?? null
    } catch (_) { /* деплой ещё не появился — OK */ }

    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, {
      status: 'merged', merged_at: new Date().toISOString(),
      deployment_id: newDeployId, previous_deployment_id: prevDeploy?.uid ?? null
    })

    await tg(`✅ <b>ИСПРАВЛЕНО!</b>\n📍 <code>${route}</code>\n🧪 Тест: PASS\n🏗 Билд: OK\n🚀 Мерж выполнен\n⚡ DMS активен 15 мин\n\n${esc(p.analysis.slice(0,200))}`)
    await notifyAdmin(`✅ Баг исправлен автоматически`, `${route}\n${p.analysis.slice(0,200)}\n\nМерж выполнен. Dead Man's Switch активен 15 мин.`, 'system_healed')
      

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[healing] Error:', msg)
    await dbUpdate('ai_healing_logs', `id=eq.${log.id}`, { status: 'failed' })
    await tg(`❌ <b>Pipeline ошибка</b>\n📍 <code>${route}</code>\n💥 ${esc(msg.slice(0,200))}`)
  }

  return new Response('OK', { status: 200 })
})
