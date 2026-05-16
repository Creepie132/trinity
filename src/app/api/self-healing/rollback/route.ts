/**
 * app/api/self-healing/rollback/route.ts
 * Ручной rollback из админ-панели (кнопка "Откатить деплой")
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthContext } from '@/lib/auth-helpers'
import { rollbackToDeployment } from '@/lib/self-healing/vercel'
import { updateHealingLog } from '@/lib/self-healing/db'
import { alertRollbackTriggered } from '@/lib/self-healing/telegram-alerts'
import { createSupabaseServiceClient } from '@/lib/supabase-service'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Только суперадмин
  const auth = await getAdminAuthContext()
  if ('error' in auth) return auth.error

  const { logId, deploymentId } = await req.json()

  if (!logId || !deploymentId) {
    return NextResponse.json(
      { error: 'logId and deploymentId required' },
      { status: 400 }
    )
  }

  const svc = createSupabaseServiceClient()
  const { data: log } = await svc
    .from('ai_healing_logs')
    .select('*, system_errors(*)')
    .eq('id', logId)
    .single()

  if (!log) {
    return NextResponse.json({ error: 'Log not found' }, { status: 404 })
  }

  await rollbackToDeployment(deploymentId)

  await updateHealingLog(logId, {
    status: 'rolled_back',
    rollback_triggered: true,
    rollback_at: new Date().toISOString(),
  })

  if (log.system_errors) {
    await alertRollbackTriggered(log.system_errors as any, deploymentId)
  }

  return NextResponse.json({ ok: true, message: 'Rollback initiated' })
}
