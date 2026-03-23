/**
 * migrate-modals.mjs
 * Добавляет импорт TrinityModalShell и оборачивает содержимое <Modal> в него.
 * Запуск: node scripts/migrate-modals.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve('.')

// Файлы которые НЕ трогаем (подтверждения, уже готовые, не модалки)
const SKIP = new Set([
  'src/components/clients/GdprDeleteDialog.tsx',
  'src/components/sales/ProductDetailModal.tsx',       // уже готов
  'src/components/sales/ProductCatalogModal.tsx',       // уже готов
  'src/components/modals/clients/SaleModal.tsx',        // уже готов
  'src/components/clients/AddClientDialog.tsx',         // уже готов
])

const FILES = [
  'src/components/visits/VisitDetailModal.tsx',
  'src/components/visits/EditVisitSheet.tsx',
  'src/components/user/UserProfileSheet.tsx',
  'src/components/sms/CampaignDetailsSheet.tsx',
  'src/components/services/ServiceDetailSheet.tsx',
  'src/components/services/CreateServiceDialog.tsx',
  'src/components/payments/PaymentReportModal.tsx',
  'src/components/payments/CreateSubscriptionDialog.tsx',
  'src/components/payments/CreateStripePaymentDialog.tsx',
  'src/components/payments/CreatePaymentLinkDialog.tsx',
  'src/components/payments/CreatePaymentDialog.tsx',
  'src/components/payments/CreateCashPaymentDialog.tsx',
  'src/components/payments/CreateBitPaymentDialog.tsx',
  'src/components/OnboardingWizard.tsx',
  'src/components/modals/ProductDetailsModal.tsx',
  'src/components/modals/payments/PaymentDetailsModal.tsx',
  'src/components/modals/other/EditOrganizationModal.tsx',
  'src/components/modals/other/CareInstructionSendModal.tsx',
  'src/components/modals/diary/CreateTaskModal.tsx',
  'src/components/modals/ClientDetailsModal.tsx',
  'src/components/modals/clients/ClientGalleryModal.tsx',
  'src/components/inventory/TransferRequestDialog.tsx',
  'src/components/inventory/SellProductDialog.tsx',
  'src/components/inventory/ProductDetailSheet.tsx',
  'src/components/inventory/EditProductDialog.tsx',
  'src/components/inventory/CreateProductDialog.tsx',
  'src/components/inventory/BarcodeScanner.tsx',
  'src/components/inventory/AddStockDialog.tsx',
  'src/components/GlobalSearch.tsx',
  'src/components/diary/TaskDesktopPanel.tsx',
  'src/components/care-instructions/CreateCareInstructionDialog.tsx',
  'src/components/admin/CreateOrgSubscriptionDialog.tsx',
  'src/components/admin/AdminProfileSheet.tsx',
  'src/components/clients/EditClientSheet.tsx',
]

const ICON_MAP = {
  // Визиты
  'VisitDetailModal': 'Calendar',
  'EditVisitSheet': 'Calendar',
  // Юзер
  'UserProfileSheet': 'User',
  // SMS
  'CampaignDetailsSheet': 'MessageSquare',
  // Услуги
  'ServiceDetailSheet': 'Scissors',
  'CreateServiceDialog': 'Scissors',
  // Платежи
  'PaymentReportModal': 'BarChart2',
  'CreateSubscriptionDialog': 'CreditCard',
  'CreateStripePaymentDialog': 'CreditCard',
  'CreatePaymentLinkDialog': 'Link',
  'CreatePaymentDialog': 'CreditCard',
  'CreateCashPaymentDialog': 'Banknote',
  'CreateBitPaymentDialog': 'Smartphone',
  // Онбординг
  'OnboardingWizard': 'Sparkles',
  // Продукты
  'ProductDetailsModal': 'Package',
  'PaymentDetailsModal': 'Receipt',
  'EditOrganizationModal': 'Building2',
  'CareInstructionSendModal': 'Send',
  'CreateTaskModal': 'CheckSquare',
  'ClientDetailsModal': 'User',
  'ClientGalleryModal': 'Image',
  // Инвентарь
  'TransferRequestDialog': 'ArrowRightLeft',
  'SellProductDialog': 'ShoppingCart',
  'ProductDetailSheet': 'Package',
  'EditProductDialog': 'Package',
  'CreateProductDialog': 'PackagePlus',
  'BarcodeScanner': 'ScanLine',
  'AddStockDialog': 'PackagePlus',
  // Поиск
  'GlobalSearch': 'Search',
  // Дневник
  'TaskDesktopPanel': 'CheckSquare',
  // Уходовые инструкции
  'CreateCareInstructionDialog': 'FileText',
  // Админ
  'CreateOrgSubscriptionDialog': 'CreditCard',
  'AdminProfileSheet': 'Shield',
  'EditClientSheet': 'UserPen',
}

let migrated = 0
let skipped = 0
let errors = []

for (const relPath of FILES) {
  if (SKIP.has(relPath)) { skipped++; continue }

  const fullPath = resolve(ROOT, relPath)
  let src

  try {
    src = readFileSync(fullPath, 'utf8')
  } catch (e) {
    errors.push(`READ ERROR: ${relPath}: ${e.message}`)
    continue
  }

  // Уже содержит TrinityModalShell — пропускаем
  if (src.includes('TrinityModalShell')) {
    console.log(`⏭  Already migrated: ${relPath}`)
    skipped++
    continue
  }

  // Определяем имя компонента (имя файла без расширения)
  const componentName = relPath.split('/').pop().replace('.tsx', '')
  const iconName = ICON_MAP[componentName] || 'Layers'

  // 1. Добавляем импорт TrinityModalShell после строки импорта Modal
  let newSrc = src.replace(
    `import Modal from '@/components/ui/Modal'`,
    `import Modal from '@/components/ui/Modal'\nimport { TrinityModalShell } from '@/components/ui/TrinityModalShell'`
  )

  // Если Modal импортируется иначе (default + named) — fallback
  if (!newSrc.includes('TrinityModalShell')) {
    newSrc = src.replace(
      /import Modal from ['"]@\/components\/ui\/Modal['"]/,
      `import Modal from '@/components/ui/Modal'\nimport { TrinityModalShell } from '@/components/ui/TrinityModalShell'`
    )
  }

  // 2. Добавляем иконку в импорт lucide если нет
  const iconAlreadyImported = new RegExp(`\\b${iconName}\\b`).test(newSrc)
  if (!iconAlreadyImported) {
    // Ищем уже существующий импорт lucide-react
    const lucideImportMatch = newSrc.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/)
    if (lucideImportMatch) {
      const existingIcons = lucideImportMatch[1]
      newSrc = newSrc.replace(
        lucideImportMatch[0],
        `import { ${existingIcons.trim()}, ${iconName} } from 'lucide-react'`
      )
    } else {
      // Добавляем новый импорт lucide после импорта TrinityModalShell
      newSrc = newSrc.replace(
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'`,
        `import { TrinityModalShell } from '@/components/ui/TrinityModalShell'\nimport { ${iconName} } from 'lucide-react'`
      )
    }
  }

  // 3. Оборачиваем содержимое Modal в TrinityModalShell
  // Паттерн: <Modal ... > ... </Modal>
  // Ищем открывающий тег Modal и добавляем darkHeader + TrinityModalShell внутрь

  // Добавляем darkHeader к Modal если нет
  newSrc = newSrc.replace(
    /<Modal\b([^>]*?)(?<!\/)>/gs,
    (match, attrs) => {
      if (attrs.includes('darkHeader')) return match
      if (attrs.includes('WizardModal')) return match
      return `<Modal${attrs} darkHeader>`
    }
  )

  // Добавляем TrinityModalShell сразу после открывающего <Modal ...>
  // и закрывающий </TrinityModalShell> перед </Modal>
  // Находим все <Modal ... > ... </Modal> и оборачиваем их содержимое

  // Простой подход: вставляем TrinityModalShell после каждого >  закрывающего Modal-тега
  // и перед каждым </Modal>
  // Используем уникальный маркер чтобы не двойной обернуть

  // Ищем паттерн: открывающий тег Modal (до первого >) затем содержимое до </Modal>
  // Заменяем на: <Modal ...> <TrinityModalShell ...> содержимое </TrinityModalShell> </Modal>

  // Получаем open/onClose из атрибутов Modal
  const modalOpenMatch = newSrc.match(/<Modal\b[^>]*open=\{([^}]+)\}/)
  const openProp = modalOpenMatch ? modalOpenMatch[1] : 'open'

  const modalCloseMatch = newSrc.match(/<Modal\b[^>]*onClose=\{([^}]+)\}/)
  const closeProp = modalCloseMatch ? modalCloseMatch[1] : 'onClose'

  // Определяем dir из атрибутов Modal или ищем в коде
  let dirProp = `language === 'he' ? 'rtl' : 'ltr'`
  const dirInModal = newSrc.match(/dir=\{([^}]+)\}/)
  if (dirInModal) dirProp = dirInModal[1]

  const shellOpen = `\n      <TrinityModalShell\n        open={${openProp}}\n        onClose={${closeProp}}\n        icon={<${iconName} />}\n        title={title ?? ''}\n        dir={${dirProp}}\n      >`
  const shellClose = `\n      </TrinityModalShell>`

  // Вставляем TrinityModalShell после первого закрывающего > тега Modal
  // (это конец пропсов Modal, начало children)
  newSrc = newSrc.replace(
    /(<Modal\b(?:[^>]|\n)*?>)([\s\S]*?)(<\/Modal>)/g,
    (match, openTag, content, closeTag) => {
      // Не трогаем если уже есть TrinityModalShell
      if (content.includes('TrinityModalShell')) return match
      return `${openTag}${shellOpen}${content}${shellClose}\n    ${closeTag}`
    }
  )

  try {
    writeFileSync(fullPath, newSrc, 'utf8')
    console.log(`✅ Migrated: ${relPath}`)
    migrated++
  } catch (e) {
    errors.push(`WRITE ERROR: ${relPath}: ${e.message}`)
  }
}

console.log(`\n📊 Done: ${migrated} migrated, ${skipped} skipped`)
if (errors.length) {
  console.log(`❌ Errors (${errors.length}):`)
  errors.forEach(e => console.log('  ', e))
}
