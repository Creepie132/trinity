/**
 * lib/self-healing/telegram-alerts.ts
 * Все Telegram-уведомления системы self-healing.
 */
import { sendTelegramMessage } from '@/lib/telegram'
import type { SystemError, AiHealingLog } from './types'

const ADMIN_CHAT_ID = () => process.env.TELEGRAM_ADMIN_CHAT_ID!

export async function alertAnalysisStarted(error: SystemError): Promise<void> {
  await send(
    `🔍 <b>Self-Healing</b> | Ошибка обнаружена\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `❗ <code>${esc(error.error_message)}</code>\n` +
    `🆔 <code>${error.id}</code>\n` +
    `🔄 Попытка: ${error.attempt_count + 1}/${2}\n\n` +
    `⏳ Claude анализирует...`
  )
}

export async function alertCriticalPathApproval(
  error: SystemError,
  log: Partial<AiHealingLog>
): Promise<void> {
  await send(
    `🔐 <b>КРИТИЧЕСКИЙ ПУТЬ</b> | Требуется апрув\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `❗ <code>${esc(error.error_message)}</code>\n\n` +
    `🤖 <b>Анализ:</b>\n${esc(log.claude_analysis ?? 'N/A')}\n\n` +
    `🔗 PR: ${log.pr_url ?? '...'}\n\n` +
    `⚠️ Авто-мерж <b>отключён</b>. Проверь PR и замержи вручную.`
  )
}

export async function alertFixGenerated(
  error: SystemError,
  log: Partial<AiHealingLog>,
  confidence: string
): Promise<void> {
  const icon = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴'
  await send(
    `🛠 <b>Фикс сгенерирован</b>\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `${icon} Уверенность: <b>${confidence}</b>\n` +
    `🌿 Ветка: <code>${log.branch_name}</code>\n` +
    `🔗 PR: ${log.pr_url}\n\n` +
    `⏳ CI/CD тесты...`
  )
}

export async function alertMergedAndDeployed(
  error: SystemError,
  log: Partial<AiHealingLog>
): Promise<void> {
  await send(
    `✅ <b>Исправлено и задеплоено</b>\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `🧪 Тест: PASS ✓\n` +
    `🏗 Билд: SUCCESS ✓\n` +
    `🚀 Продакшн обновлён\n\n` +
    `⚡ Dead Man's Switch активен — мониторинг 15 мин\n` +
    `(следующая ошибка на этом роуте = авто-откат)\n\n` +
    `<b>Diff:</b>\n<pre>${esc((log.generated_diff ?? '').slice(0, 600))}</pre>`
  )
}

export async function alertCiFailed(
  error: SystemError,
  reason: string
): Promise<void> {
  await send(
    `❌ <b>CI провалился</b> | Остановлено\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `💥 ${esc(reason)}\n\n` +
    `⚠️ Требуется ручное исправление.`
  )
}

/**
 * @param isAutomatic true = Dead Man's Switch (событийный), false = ручной rollback из UI
 */
export async function alertRollbackTriggered(
  error: Pick<SystemError, 'route' | 'error_message'>,
  prevDeployId: string,
  isAutomatic = false
): Promise<void> {
  const prefix = isAutomatic
    ? `🚨 <b>АВТО-ОТКАТ</b> | Dead Man's Switch`
    : `↩️ <b>РУЧНОЙ ОТКАТ</b> | Админ`

  await send(
    `${prefix}\n\n` +
    `📍 <code>${error.route}</code>\n` +
    `❗ <code>${esc(error.error_message)}</code>\n\n` +
    `🔁 Откат на: <code>${prevDeployId}</code>\n` +
    (isAutomatic
      ? `\nНовая ошибка в том же модуле обнаружена в течение 15 мин после деплоя.\n` +
        `Claude заблокирован. Продакшн откатан.\n\n⚠️ Требуется ручное расследование!`
      : `\nОткат выполнен по команде администратора.`)
  )
}

export async function alertMaxAttemptsReached(route: string): Promise<void> {
  await send(
    `🛑 <b>Лимит попыток исчерпан</b>\n\n` +
    `📍 <code>${route}</code>\n` +
    `Система совершила 2 попытки — обе неудачны.\n` +
    `Дальнейшие попытки заблокированы.\n\n` +
    `⚠️ Требуется ручное вмешательство.`
  )
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function send(text: string): Promise<void> {
  const chatId = ADMIN_CHAT_ID()
  if (!chatId) { console.warn('[self-healing] TELEGRAM_ADMIN_CHAT_ID not set'); return }
  await sendTelegramMessage(chatId, text)
}
