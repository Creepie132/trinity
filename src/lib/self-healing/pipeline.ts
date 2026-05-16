/**
 * self-healing/pipeline.ts
 * Главный оркестратор. Вызывается из middleware после записи ошибки.
 *
 * Пайплайн:
 * 1. Проверить лимит попыток
 * 2. Если critical_path → Assisted Healing (PR + Telegram, без авто-мержа)
 * 3. Если не critical → Full Self-Healing:
 *    a. Claude генерирует фикс + тест
 *    b. GitHub: ветка, коммит, PR
 *    c. Vercel: ждём preview, smoke-test
 *    d. Мерж в main
 *    e. Dead Man's Switch: мониторим 15 мин, при деградации — rollback
 */
import type { SystemError } from './types'
import { CRITICAL_PATHS, DEAD_MAN_SWITCH_WINDOW_MS } from './types'
import {
  createHealingLog, updateHealingLog,
  markErrorHealed, checkDeadManSwitch, insertUserNotification
} from './db'
import { generateHealingProposal } from './claude-agent'
import {
  getFileContent, createFixBranch, commitFix,
  createPullRequest, mergePullRequest, deleteBranch
} from './github'
import {
  getLatestProductionDeployment, getPreviewDeployment,
  runSmokeTest, rollbackToDeployment
} from './vercel'
import {
  alertAnalysisStarted, alertCriticalPathApproval, alertFixGenerated,
  alertMergedAndDeployed, alertCiFailed, alertRollbackTriggered
} from './telegram-alerts'

/** Точка входа — вызывается fire-and-forget из middleware */
export async function runHealingPipeline(error: SystemError): Promise<void> {
  // Уведомляем: анализ начат
  await alertAnalysisStarted(error)

  const log = await createHealingLog(error.id, 'analyzing')

  try {
    // ── Определяем путь к файлу из роута ──────────────────────────────────
    const filePath = routeToFilePath(error.route)
    const { content: sourceCode } = await getFileContent(filePath)

    // ── Claude генерирует фикс ────────────────────────────────────────────
    const proposal = await generateHealingProposal(error, sourceCode, filePath)

    await updateHealingLog(log.id, {
      status: 'fix_generated',
      claude_analysis: proposal.analysis,
      generated_diff: proposal.diff,
      test_file_content: proposal.testCode,
    })

    // ── GitHub: создаём ветку и коммитим ─────────────────────────────────
    const branchName = await createFixBranch(error.id)
    await commitFix({
      branchName,
      filePath,
      fixedCode: proposal.fixedCode,
      testFileName: proposal.testFileName,
      testCode: proposal.testCode,
      errorId: error.id,
    })

    const { prUrl, prNumber } = await createPullRequest({
      branchName,
      errorId: error.id,
      analysis: proposal.analysis,
    })

    await updateHealingLog(log.id, { branch_name: branchName, pr_url: prUrl })

    // ── CRITICAL PATH → Assisted Healing (без авто-мержа) ────────────────
    if (error.is_critical_path) {
      await updateHealingLog(log.id, { status: 'awaiting_approval' })
      await alertCriticalPathApproval(error, { ...log, pr_url: prUrl, branch_name: branchName })
      return
    }

    // ── Уведомляем о сгенерированном фиксе ───────────────────────────────
    await alertFixGenerated(error, { ...log, branch_name: branchName, pr_url: prUrl }, proposal.confidence)
    await updateHealingLog(log.id, { status: 'testing' })

    // ── Vercel: ждём preview-деплой ───────────────────────────────────────
    const prevProdDeploy = await getLatestProductionDeployment()
    const preview = await getPreviewDeployment(branchName)

    if (!preview || preview.state === 'ERROR') {
      await updateHealingLog(log.id, { status: 'failed', build_result: 'failure' })
      await alertCiFailed(error, 'Vercel preview build failed')
      return
    }

    await updateHealingLog(log.id, {
      preview_url: preview.url,
      deployment_id: preview.uid,
      build_result: 'success',
    })

    // ── Smoke-test ────────────────────────────────────────────────────────
    const ciResult = await runSmokeTest(preview.url, error.route)
    await updateHealingLog(log.id, {
      test_result: ciResult.smokeTestPassed ? 'pass' : 'fail',
    })

    if (!ciResult.smokeTestPassed) {
      await updateHealingLog(log.id, { status: 'failed' })
      await alertCiFailed(error, ciResult.smokeTestError ?? 'Smoke test failed')
      return
    }

    // ── Мерж в main ───────────────────────────────────────────────────────
    await mergePullRequest(prNumber, error.id)
    await deleteBranch(branchName)
    await markErrorHealed(error.id)

    const prodDeploy = await getLatestProductionDeployment()
    await updateHealingLog(log.id, {
      status: 'merged',
      deployment_id: prodDeploy?.uid ?? null,
      previous_deployment_id: prevProdDeploy?.uid ?? null,
    })

    const finalLog = { ...log, generated_diff: proposal.diff, pr_url: prUrl }
    await alertMergedAndDeployed(error, finalLog)

    // Уведомить пользователя через Realtime (если есть org_id)
    if (error.org_id) {
      await insertUserNotification(
        error.org_id,
        '✅ Технический сбой устранён',
        'Технический сбой был успешно устранён в автоматическом режиме. Вы можете продолжить работу.'
      )
    }

    // ── Dead Man's Switch (fire-and-forget фоновый мониторинг) ───────────
    if (prodDeploy && prevProdDeploy) {
      scheduleDeadManSwitch({
        route: error.route,
        logId: log.id,
        orgId: error.org_id,
        deployedAt: new Date().toISOString(),
        currentDeployId: prodDeploy.uid,
        previousDeployId: prevProdDeploy.uid,
        errorRecord: error,
      })
    }
  } catch (e: any) {
    console.error('[self-healing] Pipeline error:', e)
    await updateHealingLog(log.id, { status: 'failed' })
    await alertCiFailed(error, e.message ?? 'Unknown pipeline error')
  }
}

// ─── Dead Man's Switch ────────────────────────────────────────────────────────

interface DeadManParams {
  route: string
  logId: string
  orgId: string | null
  deployedAt: string
  currentDeployId: string
  previousDeployId: string
  errorRecord: SystemError
}

/**
 * Запускает таймер: через 15 мин проверяет, не появилась ли новая ошибка
 * в том же модуле. Если да — откатываем на prevDeployId.
 */
function scheduleDeadManSwitch(params: DeadManParams): void {
  setTimeout(async () => {
    try {
      const degraded = await checkDeadManSwitch(params.route, params.deployedAt)
      if (!degraded) {
        // Всё хорошо — финализируем статус
        await updateHealingLog(params.logId, { status: 'deployed' })
        return
      }

      // Деградация обнаружена → откат
      await rollbackToDeployment(params.previousDeployId)
      await updateHealingLog(params.logId, {
        status: 'rolled_back',
        rollback_triggered: true,
        rollback_at: new Date().toISOString(),
      })
      await alertRollbackTriggered(params.errorRecord, params.previousDeployId)

      // Уведомить пользователя об откате
      if (params.orgId) {
        await insertUserNotification(
          params.orgId,
          '⚠️ Откат системы',
          'Система обнаружила нестабильность после обновления и автоматически откатилась на предыдущую версию.'
        )
      }
    } catch (e) {
      console.error('[Dead Man Switch] Rollback failed:', e)
    }
  }, DEAD_MAN_SWITCH_WINDOW_MS)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Преобразует URL роута в путь к файлу в GitHub репозитории.
 * /api/clients → src/app/api/clients/route.ts
 */
function routeToFilePath(route: string): string {
  const clean = route.replace(/^\//, '').replace(/\?.*$/, '')
  return `src/app/${clean}/route.ts`
}
