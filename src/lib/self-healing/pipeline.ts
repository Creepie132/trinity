/**
 * lib/self-healing/pipeline.ts
 * Оркестратор Self-Healing пайплайна.
 *
 * Dead Man's Switch — STATELESS:
 * - setTimeout УБРАН полностью.
 * - При мерже проставляем merged_at + deployment_id в БД.
 * - Следующий перехват ошибки на том же роуте вызовет checkDeadManSwitch()
 *   в error-capture.ts и обнаружит деградацию через запрос к БД.
 */
import type { SystemError } from './types'
import { isCriticalPath } from './types'
import {
  createHealingLog, updateHealingLog,
  markErrorHealed, insertUserNotification,
} from './db'
import { generateHealingProposal } from './claude-agent'
import {
  getFileContent, createFixBranch, commitFix,
  createPullRequest, mergePullRequest, deleteBranch,
} from './github'
import {
  getLatestProductionDeployment, getPreviewDeployment, runSmokeTest,
} from './vercel'
import {
  alertAnalysisStarted, alertCriticalPathApproval, alertFixGenerated,
  alertMergedAndDeployed, alertCiFailed,
} from './telegram-alerts'

export async function runHealingPipeline(error: SystemError): Promise<void> {
  await alertAnalysisStarted(error)
  const log = await createHealingLog(error.id, 'analyzing')

  try {
    // ── Путь к файлу из роута ─────────────────────────────────────────────
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

    // ── GitHub: ветка + коммит + PR ───────────────────────────────────────
    const branchName = await createFixBranch(error.id)
    await commitFix({
      branchName, filePath,
      fixedCode: proposal.fixedCode,
      testFileName: proposal.testFileName,
      testCode: proposal.testCode,
      errorId: error.id,
    })

    const { prUrl, prNumber } = await createPullRequest({
      branchName, errorId: error.id, analysis: proposal.analysis,
    })

    await updateHealingLog(log.id, { branch_name: branchName, pr_url: prUrl })

    // ── CRITICAL PATH → Assisted Healing (без авто-мержа) ─────────────────
    if (isCriticalPath(error.route)) {
      await updateHealingLog(log.id, { status: 'awaiting_approval' })
      await alertCriticalPathApproval(error, {
        ...log, pr_url: prUrl, branch_name: branchName,
      })
      return
    }

    await alertFixGenerated(
      error,
      { ...log, branch_name: branchName, pr_url: prUrl },
      proposal.confidence
    )
    await updateHealingLog(log.id, { status: 'testing' })

    // ── Сохраняем ПРЕДЫДУЩИЙ деплой ДО мержа ─────────────────────────────
    // Это цель для Dead Man's Switch rollback если после мержа всё сломается
    const prevProdDeploy = await getLatestProductionDeployment()

    // ── Vercel: ждём preview + smoke test ────────────────────────────────
    const preview = await getPreviewDeployment(branchName)

    if (!preview || preview.state === 'ERROR') {
      await updateHealingLog(log.id, { status: 'failed', build_result: 'failure' })
      await alertCiFailed(error, 'Vercel preview build failed')
      return
    }

    await updateHealingLog(log.id, {
      preview_url: preview.url,
      build_result: 'success',
    })

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

    // Получаем НОВЫЙ деплой (тот который только что появился после мержа)
    const newProdDeploy = await getLatestProductionDeployment()

    // ── КЛЮЧЕВОЙ ШАГ: сохраняем merged_at + deployment_id ────────────────
    // Dead Man's Switch будет читать эти поля при следующем перехвате ошибки.
    // Если новая ошибка на том же роуте появится в течение 15 мин —
    // checkDeadManSwitch() найдёт эту запись и вернёт shouldRollback=true.
    await updateHealingLog(log.id, {
      status: 'merged',
      merged_at: new Date().toISOString(),
      deployment_id: newProdDeploy?.uid ?? null,
      previous_deployment_id: prevProdDeploy?.uid ?? null,
    })

    await alertMergedAndDeployed(error, {
      ...log,
      generated_diff: proposal.diff,
      pr_url: prUrl,
    })

    // Уведомить пользователя через Supabase Realtime
    if (error.org_id) {
      await insertUserNotification(
        error.org_id,
        '✅ Технический сбой устранён',
        'Технический сбой был успешно устранён в автоматическом режиме. Вы можете продолжить работу.'
      )
    }

    // ── НЕТ setTimeout. ────────────────────────────────────────────────────
    // Dead Man's Switch работает event-driven:
    // следующий вызов withErrorCapture на этом роуте сам проверит merged_at.

  } catch (e: any) {
    console.error('[self-healing] Pipeline error:', e)
    await updateHealingLog(log.id, { status: 'failed' })
    await alertCiFailed(error, e.message ?? 'Unknown pipeline error')
  }
}

function routeToFilePath(route: string): string {
  const clean = route.replace(/^\//, '').replace(/\?.*$/, '')
  return `src/app/${clean}/route.ts`
}
