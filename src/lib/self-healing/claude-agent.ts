/**
 * self-healing/claude-agent.ts
 * Claude API агент: анализирует ошибку, читает файл, генерирует фикс + тест
 */
import type { SystemError } from './types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

export interface HealingProposal {
  analysis: string          // объяснение причины ошибки
  fixedCode: string         // полный исправленный файл
  diff: string              // человекочитаемый diff
  testCode: string          // Vitest микро-тест
  testFileName: string      // напр. __tests__/api-clients.heal.test.ts
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Запрашиваем у Claude анализ ошибки и фикс.
 * Передаём: стектрейс, исходный код файла, контекст запроса.
 */
export async function generateHealingProposal(
  error: SystemError,
  sourceCode: string,
  filePath: string
): Promise<HealingProposal> {
  const prompt = buildPrompt(error, sourceCode, filePath)

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  return parseClaudeResponse(text, filePath)
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert TypeScript/Next.js engineer performing automated bug repair.
You MUST respond with a valid JSON object only — no markdown, no explanation outside JSON.
Schema:
{
  "analysis": "string — root cause explanation in 2-3 sentences",
  "fixedCode": "string — complete fixed file content",
  "diff": "string — unified diff showing changes",
  "testCode": "string — Vitest test that proves the bug is fixed",
  "testFileName": "string — relative path for the test file",
  "confidence": "high|medium|low"
}
Rules:
- Fix ONLY the root cause. No extra refactoring.
- The test MUST fail on original code and pass on fixed code.
- Never remove existing functionality.
- If confidence is low, still provide your best attempt.`

function buildPrompt(
  error: SystemError,
  sourceCode: string,
  filePath: string
): string {
  return `Bug report from production:
Route: ${error.route} [${error.method}]
Error: ${error.error_message}
Stack trace:
${error.error_stack ?? 'N/A'}

Request context:
${JSON.stringify(error.request_body ?? {}, null, 2)}

Source file (${filePath}):
\`\`\`typescript
${sourceCode}
\`\`\`

Generate a fix for this exact bug. Respond with JSON only.`
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseClaudeResponse(text: string, filePath: string): HealingProposal {
  // Убираем возможные markdown-блоки если Claude всё же добавил
  const clean = text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: Partial<HealingProposal>
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error(`Claude returned invalid JSON: ${clean.slice(0, 200)}`)
  }

  if (!parsed.fixedCode || !parsed.testCode) {
    throw new Error('Claude response missing required fields: fixedCode or testCode')
  }

  const routeDir = filePath.replace(/\/route\.ts$/, '').replace(/^src\/app/, '')
  const testFileName =
    parsed.testFileName ||
    `src/__tests__${routeDir}.heal.test.ts`

  return {
    analysis: parsed.analysis ?? 'No analysis provided',
    fixedCode: parsed.fixedCode,
    diff: parsed.diff ?? '',
    testCode: parsed.testCode,
    testFileName,
    confidence: parsed.confidence ?? 'medium',
  }
}
