/**
 * migrate-modals-v2.mjs
 * Правильная стратегия:
 * 1. Добавляем импорт TrinityModalShell
 * 2. Добавляем иконку в lucide импорт
 * 3. Добавляем darkHeader к <Modal (если нет)
 * 4. Вставляем <TrinityModalShell ...> ПОСЛЕ закрывающего > первого <Modal блока
 *    и </TrinityModalShell> ПЕРЕД </Modal>
 *
 * Ключевые fix-ы по сравнению с v1:
 * - darkHeader вставляем до закрывающего > тега Modal, а не после
 * - Находим конец пропсов Modal правильно (первый > не внутри {})
 * - Не трогаем footer= пропс
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve('.')

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
 * Находит позицию конца открывающего тега <Modal ...>
 * т.е. первый '>' который не находится внутри {} или строки
 */
function findModalOpenTagEnd(src, startIdx) {
  let depth = 0
  let inStr = false
  let strChar = ''
  let i = startIdx

  while (i < src.length) {
    const ch = src[i]

    if (inStr) {
      if (ch === strChar && src[i - 1] !== '\\') inStr = false
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true
      strChar = ch
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
    } else if (ch === '>' && depth === 0) {
      // Проверяем что это не /> (self-closing)
      if (src[i - 1] !== '/') {
        return i
      }
    }
    i++
  }
  return -1
}

/**
 * Находит позицию </Modal> начиная с pos, учитывая вложенность
 */
function findModalCloseTag(src, startIdx) {
  // Ищем </Modal> которое соответствует открывающему тегу
  // Простой поиск последнего </Modal> в блоке (Modal не вкладывается сам в себя)
  let pos = startIdx
  let openCount = 0

  while (pos < src.length) {
    const openMatch = src.indexOf('<Modal', pos)
    const closeMatch = src.indexOf('</Modal>', pos)

    if (closeMatch === -1) break

    if (openMatch !== -1 && openMatch < closeMatch) {
      openCount++
      pos = openMatch + 6
    } else {
      if (openCount === 0) {
        return closeMatch
      }
      openCount--
      pos = closeMatch + 8
    }
  }
  return -1
}

let migrated = 0
let errors = []

for (const [relPath, iconName, openProp, closeProp] of FILES) {
  const fullPath = resolve(ROOT, relPath)
  let src

  try {
    src = readFileSync(fullPath, 'utf8')
  } catch (e) {
    errors.push(`READ: ${relPath}: ${e.message}`)
    continue
  }

  if (src.includes('TrinityModalShell')) {
    console.log(`⏭  Already migrated: ${relPath}`)
    continue
  }

  let out = src

  // ── 1. Добавляем импорт TrinityModalShell ─────────────────────────────────
  out = out.replace(
    /import Modal from ['"]@\/components\/ui\/Modal['"]/,
    `import Modal from '@/components/ui/Modal'\nimport { TrinityModalShell } from '@/components/ui/TrinityModalShell'`
  )

  // ── 2. Добавляем иконку в lucide если нет ────────────────────────────────
  const iconUsed = new RegExp(`\\b${iconName}\\b`).test(out)
  if (!iconUsed) {
    const lucideMatch = out.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/)
    if (lucideMatch) {
      out = out.replace(
        lucideMatch[0],
        `import { ${lucideMatch[1].trim()}, ${iconName} } from 'lucide-react'`
      )
    } else {
      out = out.replace(
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'`,
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'\nimport { ${iconName} } from 'lucide-react'`
      )
    }
  }

  // ── 3. Для каждого <Modal в файле: добавляем darkHeader + оборачиваем ────
  // Обрабатываем все вхождения <Modal (кроме </Modal>)
  let result = ''
  let pos = 0

  while (true) {
    // Найти следующий <Modal (не </Modal>)
    let modalStart = -1
    let searchPos = pos
    while (searchPos < out.length) {
      const idx = out.indexOf('<Modal', searchPos)
      if (idx === -1) break
      // Убедимся что это не </Modal>
      if (out[idx + 1] !== '/') {
        modalStart = idx
        break
      }
      searchPos = idx + 1
    }

    if (modalStart === -1) {
      result += out.slice(pos)
      break
    }

    // Добавляем всё до <Modal
    result += out.slice(pos, modalStart)

    // Находим конец открывающего тега >
    const tagEnd = findModalOpenTagEnd(out, modalStart)
    if (tagEnd === -1) {
      result += out.slice(modalStart)
      break
    }

    let openTag = out.slice(modalStart, tagEnd + 1)

    // Добавляем darkHeader если нет
    if (!openTag.includes('darkHeader')) {
      // Вставляем перед последним > или />
      openTag = openTag.slice(0, -1) + '\n      darkHeader>'
    }

    // Находим </Modal> для этого открывающего тега
    const contentStart = tagEnd + 1
    const closeTagPos = findModalCloseTag(out, contentStart)
    if (closeTagPos === -1) {
      result += openTag + out.slice(contentStart)
      break
    }

    const content = out.slice(contentStart, closeTagPos)
    const closeTag = out.slice(closeTagPos, closeTagPos + 8) // </Modal>

    // Определяем dir
    let dirExpr = `language === 'he' ? 'rtl' : 'ltr'`
    const dirMatch = openTag.match(/dir=\{([^}]+)\}/)
    if (dirMatch) dirExpr = dirMatch[1]

    // Строим TrinityModalShell обёртку
    const shellOpen = `\n      <TrinityModalShell\n        open={${openProp}}\n        onClose={${closeProp}}\n        icon={<${iconName} />}\n        title={''}\n        dir={${dirExpr}}\n      >`
    const shellClose = `\n      </TrinityModalShell>`

    result += openTag + shellOpen + content + shellClose + '\n    ' + closeTag

    pos = closeTagPos + 8
    out = out // продолжаем с обновлённым out, но pos сдвинут
    // Переключаемся на result + остаток
    out = result + out.slice(pos)
    result = ''
    pos = 0

    // Ищем следующий Modal — но уже только после вставленного блока
    // Находим конец только что вставленного блока
    const shellCloseInOut = `</TrinityModalShell>\n    </Modal>`
    const insertedEnd = out.indexOf(shellCloseInOut)
    if (insertedEnd !== -1) {
      pos = insertedEnd + shellCloseInOut.length
      result = out.slice(0, pos)
      out = out
    } else {
      break
    }
  }

  if (!result) result = out

  try {
    writeFileSync(fullPath, result, 'utf8')
    console.log(`✅ ${relPath}`)
    migrated++
  } catch (e) {
    errors.push(`WRITE: ${relPath}: ${e.message}`)
  }
}

console.log(`\n📊 Done: ${migrated} migrated`)
if (errors.length) {
  console.log('❌ Errors:')
  errors.forEach(e => console.log(' ', e))
}
