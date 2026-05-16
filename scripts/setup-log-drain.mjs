/**
 * scripts/setup-log-drain.mjs
 * Регистрирует Vercel Log Drain для Trinity CRM.
 *
 * Запуск:
 *   node scripts/setup-log-drain.mjs
 *
 * Требуемые env (из .env.local или переменных окружения):
 *   VERCEL_TOKEN           — токен Vercel аккаунта
 *   VERCEL_TEAM_ID         — ID команды (опционально, если personal аккаунт)
 *   VERCEL_LOG_DRAIN_SECRET — секрет для HMAC подписи (генерируется здесь)
 *   NEXT_PUBLIC_SITE_URL   — домен продакшена (https://ambersol.co.il)
 */

import { createHmac, randomBytes } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ── Загружаем .env.local ──────────────────────────────────────────────────────
let env = {}
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
  for (const line of envFile.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) env[key.trim()] = rest.join('=').trim()
  }
} catch { /* .env.local может отсутствовать в CI */ }

const VERCEL_TOKEN  = process.env.VERCEL_TOKEN  ?? env['VERCEL_TOKEN']
const VERCEL_TEAM   = process.env.VERCEL_TEAM_ID ?? env['VERCEL_TEAM_ID'] ?? null
const SITE_URL      = process.env.NEXT_PUBLIC_SITE_URL ?? env['NEXT_PUBLIC_SITE_URL'] ?? 'https://ambersol.co.il'
const DRAIN_SECRET  = process.env.VERCEL_LOG_DRAIN_SECRET ?? env['VERCEL_LOG_DRAIN_SECRET']

if (!VERCEL_TOKEN) {
  console.error('❌ VERCEL_TOKEN не задан')
  process.exit(1)
}

const DRAIN_ENDPOINT = `${SITE_URL}/api/webhooks/vercel-logs`
const TEAM_QUERY     = VERCEL_TEAM ? `?teamId=${VERCEL_TEAM}` : ''

// ── Генерируем секрет если не задан ──────────────────────────────────────────
let secret = DRAIN_SECRET
if (!secret) {
  secret = randomBytes(32).toString('hex')
  console.log('\n⚠️  VERCEL_LOG_DRAIN_SECRET не задан. Сгенерирован новый:')
  console.log(`   VERCEL_LOG_DRAIN_SECRET=${secret}`)
  console.log('   Добавь это в .env.local И в Vercel Environment Variables!\n')
}

// ── Проверяем существующие Log Drains ────────────────────────────────────────
console.log('🔍 Проверяем существующие Log Drains...')
const existingRes = await fetch(`https://api.vercel.com/v1/log-drains${TEAM_QUERY}`, {
  headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
})

if (!existingRes.ok) {
  console.error(`❌ Vercel API error ${existingRes.status}: ${await existingRes.text()}`)
  process.exit(1)
}

const existing = await existingRes.json()
const drains = existing.drains ?? existing ?? []
const alreadyExists = drains.find(d => d.url === DRAIN_ENDPOINT)

if (alreadyExists) {
  console.log(`✅ Log Drain уже существует (id: ${alreadyExists.id})`)
  console.log(`   URL: ${alreadyExists.url}`)
  console.log('\n📋 Следующие шаги:')
  console.log('   1. Убедись что VERCEL_LOG_DRAIN_SECRET добавлен в Vercel env vars')
  console.log('   2. Сделай редеплой: git commit --allow-empty -m "chore: enable log drain" && git push')
  process.exit(0)
}

// ── Создаём Log Drain ─────────────────────────────────────────────────────────
console.log(`📡 Создаём Log Drain → ${DRAIN_ENDPOINT}`)
const createRes = await fetch(`https://api.vercel.com/v1/log-drains${TEAM_QUERY}`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Trinity CRM — Self-Healing',
    url: DRAIN_ENDPOINT,
    // 'json' = ндивидуальные JSON-объекты для каждой записи лога
    // 'ndjson' = newline-delimited JSON (проще парсить батчами)
    deliveryFormat: 'json',
    // Фильтрация на стороне Vercel: только production ошибки уровня error
    sources: ['lambda', 'edge'],
    environments: ['production'],
    // Секрет для HMAC-SHA1 подписи x-vercel-signature
    secret,
  }),
})

if (!createRes.ok) {
  const text = await createRes.text()
  console.error(`❌ Не удалось создать Log Drain: ${createRes.status}`)
  console.error(text)
  process.exit(1)
}

const drain = await createRes.json()
console.log(`✅ Log Drain создан!`)
console.log(`   ID:  ${drain.id ?? drain.drain?.id}`)
console.log(`   URL: ${DRAIN_ENDPOINT}`)
console.log('\n📋 Обязательные следующие шаги:')
console.log(`   1. Добавь в .env.local:`)
console.log(`      VERCEL_LOG_DRAIN_SECRET=${secret}`)
console.log(`   2. Добавь в Vercel Dashboard → Settings → Environment Variables:`)
console.log(`      VERCEL_LOG_DRAIN_SECRET=${secret}`)
console.log(`   3. Сделай редеплой чтобы переменная применилась:`)
console.log(`      git commit --allow-empty -m "chore: enable vercel log drain" && git push origin main`)
