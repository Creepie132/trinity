/**
 * self-healing/vercel.ts
 * Vercel API: получение деплоя, мониторинг сборки, rollback
 */

const VERCEL_TOKEN = () => process.env.VERCEL_TOKEN!
const VERCEL_PROJECT_ID = () => process.env.VERCEL_PROJECT_ID!
const VERCEL_TEAM_ID = () => process.env.VERCEL_TEAM_ID ?? undefined

const vFetch = async (path: string, init?: RequestInit) => {
  const teamParam = VERCEL_TEAM_ID() ? `&teamId=${VERCEL_TEAM_ID()}` : ''
  const url = `https://api.vercel.com${path}${path.includes('?') ? teamParam.replace('&', '&') : '?' + teamParam.replace('&', '')}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel ${res.status} on ${path}: ${body}`)
  }
  return res.json()
}

export interface VercelDeployment {
  uid: string
  url: string
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED'
  readyState: string
  target: 'production' | 'preview' | null
  meta: { githubCommitRef?: string }
}

/** Получить самый свежий продакшн-деплой (для Dead Man's Switch rollback) */
export async function getLatestProductionDeployment(): Promise<VercelDeployment | null> {
  const data = await vFetch(
    `/v6/deployments?projectId=${VERCEL_PROJECT_ID()}&target=production&limit=2`
  )
  return (data.deployments?.[0] as VercelDeployment) ?? null
}

/** Получить preview-деплой для ветки auto-fix */
export async function getPreviewDeployment(
  branchName: string,
  maxWaitMs = 5 * 60 * 1000
): Promise<VercelDeployment | null> {
  const pollInterval = 10_000
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    const data = await vFetch(
      `/v6/deployments?projectId=${VERCEL_PROJECT_ID()}&target=preview&limit=10`
    )
    const deploy = (data.deployments as VercelDeployment[]).find(
      d => d.meta?.githubCommitRef === branchName
    )

    if (deploy) {
      if (deploy.state === 'READY') return deploy
      if (deploy.state === 'ERROR') return deploy
    }

    await sleep(pollInterval)
  }

  return null
}

/** Откатить продакшн на предыдущий деплой */
export async function rollbackToDeployment(deploymentId: string): Promise<void> {
  await vFetch(
    `/v9/projects/${VERCEL_PROJECT_ID()}/rollback/${deploymentId}`,
    { method: 'POST' }
  )
}

/** Проверить статус конкретного деплоя */
export async function getDeploymentStatus(deploymentId: string): Promise<VercelDeployment> {
  return vFetch(`/v13/deployments/${deploymentId}`)
}

// ─── Валидатор CI (запускается после preview-деплоя) ─────────────────────────

export interface CiValidationResult {
  buildSuccess: boolean
  smokeTestPassed: boolean
  smokeTestError: string | null
}

/**
 * Делает тестовый GET к исправленному роуту на preview-URL.
 * Не проверяет бизнес-логику — только что роут отвечает (не 500).
 */
export async function runSmokeTest(
  previewUrl: string,
  route: string
): Promise<CiValidationResult> {
  const testUrl = `https://${previewUrl}${route}`
  try {
    const res = await fetch(testUrl, {
      method: 'GET',
      headers: { 'x-healing-smoke-test': '1' },
      signal: AbortSignal.timeout(15_000),
    })
    return {
      buildSuccess: true,
      smokeTestPassed: res.status < 500,
      smokeTestError: res.status >= 500 ? `HTTP ${res.status}` : null,
    }
  } catch (e: any) {
    return {
      buildSuccess: false,
      smokeTestPassed: false,
      smokeTestError: e.message ?? 'Network error',
    }
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
