/**
 * self-healing/telegram-alerts.ts
 * Все Telegram-уведомления системы self-healing
 */
import { sendTelegramMessage } from '@/lib/telegram'
import type { SystemError, AiHealingLog, HealingStatus } from './types'

const ADMIN_CHAT_ID = () => process.env.TELEGRAM_ADMIN_CHAT_ID!

/** Ошибка обнаружена, начинаем анализ */
export async function alertAnalysisStarted(error: SystemError): Promise<void> {
  await send(
    `🔍 <b>Trinity Self-Healing</b> | Обнаружена ошибка\n\n` +
    `📍 <b>Роут:</b> <code>${error.route}</code>\n` +
    `❗ <b>Ошибка:</b> <code>${esc(error.error_message)}</code>\n` +
    `🆔 <b>ID:</b> <code>${error.id}</code>\n` +
    `🔄 Попытка: ${error.attempt_count + 1}/2\n\n` +
    `⏳ Claude анализирует проблему...`
  )
}

/** Критический путь — нужен ручной апрув */
export async function alertCriticalPathApproval(
  error: SystemError,
  log: AiHealingLog
): Promise<void> {
  await send(
    `🔐 <b>КРИТИЧЕСКИЙ ПУТЬ</b> | Требуется апрув\n\n` +
    `📍 <b>Роут:</b> <code>${error.route}</code>\n` +
    `❗ <b>Ошибка:</b> <code>${esc(error.error_message)}</code>\n\n` +
    `🤖 <b>Анализ Claude:</b>\n${esc(log.claude_analysis ?? 'N/A')}\n\n` +
    `🔗 <b>PR:</b> ${log.pr_url ?? 'создаётся...'}\n` +
    `🔗 <b>Preview:</b> ${log.preview_url ?? 'ожидание...'}\n\n` +
    `⚠️ Авто-мерж <b>отключён</b> для этого роута.\n` +
    `Проверь PR и замержь вручную.`
  )
}

/** Фикс сгенерирован */
export async function alertFixGenerated(
  error: SystemError,
  log: AiHealingLog,
  confidence: string
): Promise<void> {
  const confIcon = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴'
  await send(
    `🛠 <b>Фикс сгенерирован</b>\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `${confIcon} Уверенность Claude: <b>${confidence}</b>\n` +
    `🌿 Ветка: <code>${log.branch_name}</code>\n` +
    `🔗 PR: ${log.pr_url}\n\n` +
    `⏳ Запускаем CI/CD тесты...`
  )
}

/** Тесты прошли, мерж выполнен */
export async function alertMergedAndDeployed(
  error: SystemError,
  log: AiHealingLog
): Promise<void> {
  await send(
    `✅ <b>Исправлено и задеплоено</b>\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `🧪 Тест: PASS ✓\n` +
    `🏗 Билд: SUCCESS ✓\n` +
    `🚀 Продакшн обновлён\n\n` +
    `📊 Мониторинг Dead Man's Switch активен (15 мин)\n\n` +
    `<b>Diff изменений:</b>\n<pre>${esc((log.generated_diff ?? '').slice(0, 800))}</pre>`
  )
}

/** CI провалился */
export async function alertCiFailed(
  error: SystemError,
  reason: string
): Promise<void> {
  await send(
    `❌ <b>CI/CD провалился</b> | Self-Healing остановлен\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `💥 Причина: ${esc(reason)}\n\n` +
    `⚠️ Требуется ручное исправление.`
  )
}

/** Dead Man's Switch сработал — авто-откат */
export async function alertRollbackTriggered(
  error: SystemError,
  prevDeployId: string
): Promise<void> {
  await send(
    `🚨 <b>АВТО-ОТКАТ</b> | Dead Man's Switch\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `🔁 Откат на деплой: <code>${prevDeployId}</code>\n\n` +
    `После исправления новая ошибка в том же модуле была обнаружена в течение 15 минут.\n` +
    `Продакшн откатан на предыдущий стабильный деплой.\n\n` +
    `⚠️ Требуется ручное расследование!`
  )
}

/** Лимит попыток исчерпан */
export async function alertMaxAttemptsReached(route: string): Promise<void> {
  await send(
    `🛑 <b>Лимит попыток исчерпан</b>\n\n` +
    `📍 <code>${route}</code>\n` +
    `Система совершила 2 попытки авто-исправления — обе неудачны.\n` +
    `Дальнейшие попытки заблокированы.\n\n` +
    `⚠️ Требуется ручное вмешательство.`
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function send(text: string): Promise<void> {
  const chatId = ADMIN_CHAT_ID()
  if (!chatId) {
    console.warn('[self-healing] TELEGRAM_ADMIN_CHAT_ID not set')
    return
  }
  await sendTelegramMessage(chatId, text)
}
