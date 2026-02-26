# 🎯 Modal Migration Status

## ✅ Полностью мигрированы (ModalWrapper)
- `ClientDetailsModal` - детали клиента
- `ProductDetailsModal` - детали товара
- `AddStockDialog` - добавление товара
- `CreateProductDialog` - создание товара
- `QuickSaleDialog` - быстрая продажа
- `ReturnProductDialog` - возврат товара
- `SellProductDialog` - продажа товара

## 🔄 Обёрточные (используют старые компоненты)
- `AddClientModal` - добавление клиента (обёртка)
- `CreateVisitModal` - создание визита (обёртка)

## ⏳ Ожидают миграции (27 компонентов)

### Клиенты
- [ ] EditClientModal - редактирование
- [ ] DeleteClientModal - удаление

### Визиты  
- [ ] EditVisitModal
- [ ] CompleteVisitPaymentModal
- [ ] AddProductToVisitModal
- [ ] AddServiceToVisitModal

### Платежи
- [ ] CreatePaymentModal
- [ ] CreatePaymentLinkModal
- [ ] CreateCashPaymentModal
- [ ] CreateStripePaymentModal
- [ ] CreateSubscriptionModal

### Услуги
- [ ] CreateServiceModal
- [ ] ServiceDetailsModal

### Дневник
- [ ] CreateTaskModal
- [ ] TaskDetailsModal

### Админ
- [ ] AdminProfileModal
- [ ] UserProfileModal

### SMS
- [ ] CampaignDetailsModal

### Прочее
- [ ] CareInstructionModal
- [ ] OrgSubscriptionModal

---

## 📝 Как мигрировать компонент:

### 1. Создай файл модалки
```tsx
// src/components/modals/category/ComponentModal.tsx
'use client'

import { useModalStore } from '@/store/useModalStore'
import ModalWrapper from '@/components/ModalWrapper'

export function ComponentModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('modal-type')
  const data = getModalData('modal-type')

  return (
    <ModalWrapper isOpen={isOpen} onClose={() => closeModal('modal-type')}>
      <div className="w-full max-w-md p-6">
        {/* Your content */}
      </div>
    </ModalWrapper>
  )
}
```

### 2. Добавь в ModalManager
```tsx
import { ComponentModal } from './category/ComponentModal'

export function ModalManager() {
  return (
    <>
      {/* ... */}
      <ComponentModal />
    </>
  )
}
```

### 3. Используй в коде
```tsx
const { openModal } = useModalStore()

openModal('modal-type', { data })
```

### 4. Удали старый компонент
- Удали файл `*Dialog.tsx` / `*Sheet.tsx`
- Удали импорты
- Удали локальный state

---

## 🎨 Преимущества новой системы:

✅ Единый стиль (rounded-[32px])  
✅ Dark mode поддержка  
✅ Глобальное управление  
✅ Меньше кода  
✅ TypeScript безопасность  
✅ Лучшая производительность  

---

**Статус**: 9/36 компонентов мигрированы (25%)
