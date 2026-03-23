/**
 * migrate-modals-v3.mjs
 * Простой и надёжный подход:
 * 1. Добавить импорт TrinityModalShell
 * 2. Добавить иконку
 * 3. Добавить darkHeader проп к <Modal
 * 4. Вставить <TrinityModalShell> после первого > закрывающего Modal тег
 * 5. Вставить </TrinityModalShell> перед </Modal>
 *
 * Находим конец тега Modal парсингом глубины скобок.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve('.')

// [relPath, icon, openVar, closeExpr]
const FILES = [
  ['src/components/visits/VisitDetailModal.tsx', 'Calendar', 'open', 'onClose'],
  ['src/components/visits/EditVisitSheet.tsx', 'Calendar', 'open', '() => onOpenChange(false)'],
  ['src/components/user/UserProfileSheet.tsx', 'User', 'open', '() => onOpenChange(false)'],
  ['src/components/sms/CampaignDetailsSheet.tsx', 'MessageSquare', 'open', '() => onOpenChange(false)'],
  ['src/components/services/ServiceDetailSheet.tsx', 'Scissors', 'open', 'onClose'],
  ['src/components/services/CreateServiceDialog.tsx', 'Scissors', 'open', '() => onOpenChange(false)'],
  ['src/components/payments/PaymentReportModal.tsx', 'BarChart2', 'open', 'onClose'],
  ['src/components/payments/CreateSubscriptionDialog.tsx', 'CreditCard', 'open', '() => onOpenChange(false)'],
  ['src/components/payments/CreateStripePaymentDialog.tsx', 'CreditCard', 'open', '() => onOpenChange(false)'],
  ['src/components/payments/CreatePaymentLinkDialog.tsx', 'Link', 'open', '() => onOpenChange(false)'],
  ['src/components/payments/CreatePaymentDialog.tsx', 'CreditCard', 'open', 'handleClose'],
  ['src/components/payments/CreateCashPaymentDialog.tsx', 'Banknote', 'open', '() => onOpenChange(false)'],
  ['src/components/payments/CreateBitPaymentDialog.tsx', 'Smartphone', 'open', '() => onOpenChange(false)'],
  ['src/components/OnboardingWizard.tsx', 'Sparkles', 'open', 'onClose'],
  ['src/components/modals/ProductDetailsModal.tsx', 'Package', 'isOpen', '() => closeModal("product-details")'],
  ['src/components/modals/payments/PaymentDetailsModal.tsx', 'Receipt', 'isOpen', '() => closeModal("payment-details")'],
  ['src/components/modals/other/EditOrganizationModal.tsx', 'Building2', 'open', 'onClose'],
  ['src/components/modals/other/CareInstructionSendModal.tsx', 'Send', 'open', 'onClose'],
  ['src/components/modals/diary/CreateTaskModal.tsx', 'CheckSquare', 'isOpen', '() => closeModal("create-task")'],
  ['src/components/modals/ClientDetailsModal.tsx', 'User', 'isOpen', '() => closeModal("client-details")'],
  ['src/components/modals/clients/ClientGalleryModal.tsx', 'Image', 'isOpen', '() => { setLightboxIndex(null); closeModal("client-gallery") }'],
  ['src/components/inventory/TransferRequestDialog.tsx', 'ArrowRightLeft', 'open', 'onClose'],
  ['src/components/inventory/SellProductDialog.tsx', 'ShoppingCart', 'open', '() => onOpenChange(false)'],
  ['src/components/inventory/ProductDetailSheet.tsx', 'Package', 'open', 'onClose'],
  ['src/components/inventory/EditProductDialog.tsx', 'Package', 'open', '() => onOpenChange(false)'],
  ['src/components/inventory/CreateProductDialog.tsx', 'PackagePlus', 'open', '() => onOpenChange(false)'],
  ['src/components/inventory/BarcodeScanner.tsx', 'ScanLine', 'open', 'onClose'],
  ['src/components/inventory/AddStockDialog.tsx', 'PackagePlus', 'open', '() => onOpenChange(false)'],
  ['src/components/GlobalSearch.tsx', 'Search', 'open', '() => onOpenChange(false)'],
  ['src/components/diary/TaskDesktopPanel.tsx', 'CheckSquare', 'isOpen', 'onClose'],
  ['src/components/care-instructions/CreateCareInstructionDialog.tsx', 'FileText', 'open', '() => onOpenChange(false)'],
  ['src/components/admin/CreateOrgSubscriptionDialog.tsx', 'CreditCard', 'open', 'onClose'],
  ['src/components/admin/AdminProfileSheet.tsx', 'Shield', 'open', '() => onOpenChange(false)'],
  ['src/components/clients/EditClientSheet.tsx', 'UserPen', 'open', 'onClose'],
]

/**
 * Найти индекс закрывающего > открывающего тега <Modal ...>
 * Начинаем с позиции сразу после '<Modal'
 * Учитываем вложенность { } и строки
 */
function findTagClose(src, fromIdx) {
  let depth = 0
  let inStr = false
  let strCh = ''
  for (let i = fromIdx; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (c === strCh && src[i-1] !== '\\') inStr = false
      continue
    }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strCh = c; continue }
    if (c === '{') { depth++; continue }
    if (c === '}') { depth--; continue }
    if (c === '>' && depth === 0) {
      if (src[i-1] === '/') return -1  // self-closing — пропускаем
      return i
    }
  }
  return -1
}

let migrated = 0
let errors = []

for (const [relPath, iconName, openVar, closeExpr] of FILES) {
  const fullPath = resolve(ROOT, relPath)
  let src
  try { src = readFileSync(fullPath, 'utf8') }
  catch (e) { errors.push(`READ ${relPath}: ${e.message}`); continue }

  if (src.includes('TrinityModalShell')) {
    console.log(`⏭  Skip (already): ${relPath}`)
    continue
  }

  let out = src

  // 1. Импорт TrinityModalShell
  out = out.replace(
    /import Modal from ['"]@\/components\/ui\/Modal['"]/,
    `import Modal from '@/components/ui/Modal'\nimport { TrinityModalShell } from '@/components/ui/TrinityModalShell'`
  )

  // 2. Иконка в lucide
  if (!new RegExp(`\\b${iconName}\\b`).test(out)) {
    const m = out.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/)
    if (m) {
      out = out.replace(m[0], `import { ${m[1].trim()}, ${iconName} } from 'lucide-react'`)
    } else {
      out = out.replace(
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'`,
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'\nimport { ${iconName} } from 'lucide-react'`
      )
    }
  }

  // 3. Находим dir expr из первого <Modal в файле
  let dirExpr = `language === 'he' ? 'rtl' : 'ltr'`
  const dirM = out.match(/\bdir=\{([^}]+)\}/)
  if (dirM) dirExpr = dirM[1]

  // 4. Обрабатываем каждый <Modal блок
  // Собираем новую строку посегментно
  let result = ''
  let cursor = 0

  while (cursor < out.length) {
    // Найти следующий <Modal (не </Modal>, не <ModalWrapper и т.п.)
    const searchFrom = cursor
    let mStart = -1
    let si = searchFrom
    while (si < out.length) {
      const idx = out.indexOf('<Modal', si)
      if (idx === -1) break
      const nextCh = out[idx + 6]  // символ после 'Modal'
      // Должен быть пробел, \n, \t или >
      if (nextCh === ' ' || nextCh === '\n' || nextCh === '\t' || nextCh === '>') {
        // Не </Modal>
        if (out[idx + 1] !== '/') {
          mStart = idx
          break
        }
      }
      si = idx + 1
    }

    if (mStart === -1) {
      result += out.slice(cursor)
      break
    }

    result += out.slice(cursor, mStart)

    // Найти конец открывающего тега
    const tagEnd = findTagClose(out, mStart + 6)
    if (tagEnd === -1) {
      // self-closing или не нашли — пропускаем
      result += out.slice(mStart, mStart + 6)
      cursor = mStart + 6
      continue
    }

    let openTag = out.slice(mStart, tagEnd + 1)

    // Добавляем darkHeader если нет
    if (!openTag.includes('darkHeader')) {
      openTag = openTag.slice(0, -1) + '\n      darkHeader\n    >'
    }

    // Найти </Modal> для этого блока
    const contentStart = tagEnd + 1
    const closeTagIdx = out.lastIndexOf('</Modal>', out.indexOf('</Modal>', contentStart) + 8)
    // Простой поиск — берём ближайший </Modal>
    const firstClose = out.indexOf('</Modal>', contentStart)
    if (firstClose === -1) {
      result += openTag + out.slice(contentStart)
      cursor = out.length
      continue
    }

    const content = out.slice(contentStart, firstClose)

    const shellBlock =
      `\n      <TrinityModalShell\n        open={${openVar}}\n        onClose={${closeExpr}}\n        icon={<${iconName} />}\n        title={''}\n        dir={${dirExpr}}\n      >` +
      content +
      `\n      </TrinityModalShell>\n    `

    result += openTag + shellBlock + '</Modal>'
    cursor = firstClose + 8
  }

  try {
    writeFileSync(fullPath, result, 'utf8')
    console.log(`✅ ${relPath}`)
    migrated++
  } catch (e) {
    errors.push(`WRITE ${relPath}: ${e.message}`)
  }
}

console.log(`\n📊 ${migrated} migrated`)
if (errors.length) { console.log('❌'); errors.forEach(e => console.log(' ', e)) }
