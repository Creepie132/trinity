# 🎯 Modal Manager (Zustand)

Глобальная система управления модальными окнами через Zustand.

## 📦 Структура

```
src/
├── store/
│   └── useModalStore.ts          # Zustand store для модалок
├── components/
│   └── modals/
│       ├── ModalManager.tsx      # Глобальный менеджер модалок
│       ├── ClientDetailsModal.tsx # Модалка деталей клиента
│       └── ...                   # Другие модалки
```

## 🚀 Использование

### 1. Открыть модалку

```tsx
import { useModalStore } from '@/store/useModalStore'

function MyComponent() {
  const { openModal } = useModalStore()

  const handleClick = () => {
    openModal('client-details', {
      client: { id: '123', name: 'John' },
      locale: 'he',
    })
  }

  return <button onClick={handleClick}>Открыть</button>
}
```

### 2. Закрыть модалку

```tsx
const { closeModal } = useModalStore()

closeModal('client-details')
```

### 3. Проверить статус

```tsx
const { isModalOpen } = useModalStore()

if (isModalOpen('client-details')) {
  // Модалка открыта
}
```

### 4. Получить данные модалки

```tsx
const { getModalData } = useModalStore()

const data = getModalData('client-details')
console.log(data?.client)
```

## 🎨 Создание новой модалки

### Шаг 1: Добавь тип в `useModalStore.ts`

```typescript
export type ModalType = 
  | 'client-details'
  | 'your-new-modal' // ← добавь здесь
```

### Шаг 2: Создай компонент модалки

```tsx
// src/components/modals/YourNewModal.tsx
'use client'

import { useModalStore } from '@/store/useModalStore'
import ModalWrapper from '../ModalWrapper'

export function YourNewModal() {
  const { isModalOpen, closeModal, getModalData } = useModalStore()
  
  const isOpen = isModalOpen('your-new-modal')
  const data = getModalData('your-new-modal')

  return (
    <ModalWrapper isOpen={isOpen} onClose={() => closeModal('your-new-modal')}>
      <div className="w-full max-w-md p-6">
        <h2>Your Modal Content</h2>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </ModalWrapper>
  )
}
```

### Шаг 3: Добавь в ModalManager

```tsx
// src/components/modals/ModalManager.tsx
import { YourNewModal } from './YourNewModal'

export function ModalManager() {
  return (
    <>
      <ClientDetailsModal />
      <YourNewModal /> {/* ← добавь здесь */}
    </>
  )
}
```

## 🎭 Доступные модалки

| Тип | Описание |
|-----|----------|
| `client-details` | Детали клиента |
| `client-edit` | Редактирование клиента |
| `visit-create` | Создание визита |
| `product-create` | Создание товара |
| `product-sell` | Продажа товара |
| `product-add-stock` | Добавление товара |
| `product-return` | Возврат товара |
| `quick-sale` | Быстрая продажа |

## 💡 Преимущества

✅ **Глобальное состояние** - открывай модалки откуда угодно  
✅ **Нет prop drilling** - не надо передавать `isOpen` через 5 компонентов  
✅ **Типобезопасность** - TypeScript автодополнение  
✅ **Производительность** - рендерятся только открытые модалки  
✅ **Чистый код** - логика модалок отделена от бизнес-логики  

## 🔧 API

### `openModal(type, data?)`
Открывает модалку с данными

```tsx
openModal('client-details', { client: {...} })
```

### `closeModal(type)`
Закрывает конкретную модалку

```tsx
closeModal('client-details')
```

### `closeAllModals()`
Закрывает все модалки

```tsx
closeAllModals()
```

### `isModalOpen(type)`
Проверяет открыта ли модалка

```tsx
if (isModalOpen('client-details')) { ... }
```

### `getModalData(type)`
Получает данные модалки

```tsx
const data = getModalData('client-details')
```

## 📝 Примеры

### Цепочка модалок

```tsx
// Открыть детали → Редактирование
const handleEdit = () => {
  closeModal('client-details')
  openModal('client-edit', { client })
}
```

### Модалка с колбэком

```tsx
openModal('confirmation', {
  title: 'Удалить клиента?',
  onConfirm: () => {
    deleteClient(id)
    closeModal('confirmation')
  }
})
```

---

**🎉 Готово!** Модалки теперь управляются глобально через Zustand.
