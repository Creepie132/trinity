# Trinity CRM — QA Bug Report
> Статический аудит кода. Дата: 07.05.2026. Аудитор: Лея (AI).

---

## 🔴 Критические баги (5)

### BUG-001 · ClientDetailsModal не рендерится на мобиле
**Файл:** `src/components/modals/ClientDetailsModal.tsx` L73  
**Описание:** При клике на клиента на мобиле (<768px) компонент возвращает `null` — нет ни BottomSheet, ни ClientCard. Строка `if (isMobile && !showGdprDialog) return null` убивает весь рендер на мобиле.  
**Ожидаемое:** должен открываться TrinityMobDetailShell или ClientBottomSheet с данными клиента.  
**Статус:** ❌ Не исправлен

---

### BUG-002 · SaleDetailModal: правая часть пустая (белый прямоугольник)
**Файл:** `src/components/sales/SaleDetailModal.tsx` L415–430  
**Описание:** `desktopContent` передаётся как children TrinityModalShell. При race condition с `mounted` флагом или при определённых путях открытия — возможен ранний return null до рендера контента.  
**Связано:** записано в памяти как "правая часть модалки пустая (белый прямоугольник, контент не рендерится)"  
**Статус:** ❌ Не исправлен

---

### BUG-003 · ClientDetailsModal: stale closure при редактировании клиента
**Файл:** `src/components/modals/ClientDetailsModal.tsx` L115–120  
**Описание:** В `handleEditClick` при сохранении вызывается `onSaved` который открывает client-details с `{ ...client, ...updated }`. Но `client` в замыкании — устаревший объект. Пользователь может видеть старые данные сразу после сохранения.  
**Статус:** ❌ Не исправлен

---

### BUG-004 · DELETE /api/sales: нет invalidate для inventory query
**Файл:** `src/components/sales/SaleDetailModal.tsx` L149–160  
**Описание:** После удаления продажи инвалидируются только `['sales']` и `['payments']`. Если в продаже были товары — stock пересчитан на сервере, но UI инвентаря показывает старые данные до ручного рефреша.  
**Исправление:** добавить `queryClient.invalidateQueries({ queryKey: ['products'] })` и `['inventory']` после успешного удаления.  
**Статус:** ❌ Не исправлен

---

### BUG-005 · ClientDesktopPanel: Tranzila terminal хардкодит `hrehabtok`
**Файл:** `src/components/clients/ClientDesktopPanel.tsx` L189, L217  
**Описание:** URL токенизации карты содержит хардкод `hrehabtok` — конкретный Tranzila терминал. Нарушает multi-tenant архитектуру. Другие организации токенизируют карты клиентов через чужой терминал.  
**Исправление:** брать terminal из `organizations.tranzila_terminal` или аналогичного поля org-настроек.  
**Статус:** ❌ Не исправлен

---

## 🟡 Средние баги (6)

### BUG-006 · useModalStore: отсутствует тип 'client-documents'
**Файл:** `src/store/useModalStore.ts` · `ClientDetailsModal.tsx` L292  
**Описание:** Кнопка Documents вызывает `openModal('client-documents', ...)`, но тип `'client-documents'` отсутствует в `ModalType`. Modal открывается, но нигде не обрабатывается в ModalManager — кнопка "Документы" нажимается и ничего не происходит.  
**Статус:** ❌ Не исправлен

---

### BUG-007 · ClientDesktopPanel: прямые Supabase-запросы в клиентском компоненте
**Файл:** `src/components/clients/ClientDesktopPanel.tsx` L102–120  
**Описание:** Компонент делает прямые запросы к Supabase (client_subscriptions, recurring_plans, subscription_charges) через браузерный клиент без явной проверки org_id. При неправильной RLS — потенциальная утечка данных между орг.  
**Исправление:** вынести в API route с `getAuthContext()`.  
**Статус:** ❌ Не исправлен

---

### BUG-008 · SaleDetailModal: canDeleteSale не учитывает 'cancelled' и 'refunded'
**Файл:** `src/components/sales/SaleDetailModal.tsx` L155  
**Описание:** `canDeleteSale = status === 'unpaid' || status === 'new'`. Для cancelled/refunded — кнопка обычного удаления не показывается, но AdminDeleteButton рендерится. Поведение не определено явно — возможна путаница в UI.  
**Статус:** ❌ Не исправлен

---

### BUG-009 · clients/page.tsx: org_id передаётся в URL-параметр
**Файл:** `src/app/(dashboard)/clients/page.tsx` L153  
**Описание:** `params.append('org_id', orgId)` — org_id передаётся в query string при экспорте. Нарушает правило безопасности: API должен брать org_id из сессии через `getAuthContext()`.  
**Проверить:** убедиться что /api/export игнорирует org_id из query.  
**Статус:** ❌ Не исправлен

---

### BUG-010 · ClientDetailsModal: QuickVisitModal не рендерится на десктопе
**Файл:** `src/components/modals/ClientDetailsModal.tsx` L35, L211  
**Описание:** Объявлены `quickVisitOpen` и `setQuickVisitOpen`, кнопка в sidebar ставит флаг, но `QuickVisitModal` нигде не рендерится внутри десктопной версии модалки. Быстрый визит не откроется.  
**Статус:** ❌ Не исправлен

---

### BUG-011 · ClientDesktopPanel: totalSpent считается некорректно
**Файл:** `src/components/clients/ClientDesktopPanel.tsx` L237  
**Описание:** Сумма `p.amount || p.price || 0` — если API возвращает другое имя поля, сумма будет 0. Также пересчитывается только при смене вкладки.  
**Статус:** ❌ Не исправлен

---

## 🟢 Низкие / UX (4)

### BUG-012 · SaleDetailModal мобиль: удаление без двойного подтверждения
**Файл:** `src/components/sales/SaleDetailModal.tsx` L293  
**Описание:** На мобиле кнопка Delete сразу вызывает `handleDeleteSale()` без `confirmDeleteSale`. На десктопе — двухэтапное подтверждение. Непоследовательный UX, риск случайного удаления.  
**Статус:** ❌ Не исправлен

---

### BUG-013 · ClientDetailsModal: нет пути "назад" из history
**Файл:** `src/components/modals/ClientDetailsModal.tsx` L175–185  
**Описание:** Клик на счётчики (визиты/оплачено) в sidebar закрывает client-details и открывает client-history. Нет возможности вернуться назад.  
**Статус:** ❌ Не исправлен

---

### BUG-014 · ClientDetailsModal: правая часть визуально пустая без email/address/birthday
**Файл:** `src/components/modals/ClientDetailsModal.tsx` L335  
**Описание:** Секция Information рендерится только при наличии email, address, date_of_birth, created_at или preferred_languages. Клиент только с именем и телефоном — правая часть визуально почти пустая.  
**Статус:** ❌ Не исправлен

---

### BUG-015 · sales/page.tsx: SiteOrdersPanel — проверить условие отображения
**Файл:** `src/app/(dashboard)/sales/page.tsx`  
**Описание:** Компонент и хук `useNewOrdersCount` импортированы. Нужно убедиться что индикатор новых заказов корректно скрывается когда фича выключена.  
**Статус:** ❓ Требует проверки

---

## 💡 Замечания / Рефакторинг (3)

### NOTE-001 · Задача: добавить вкладки истории в ClientDetailsModal
По памяти — запланировано добавить вкладки История визитов, Платежи, Документы в правую часть `ClientDetailsModal`. `ClientDesktopPanel` уже реализовал эту логику — можно переиспользовать.

### NOTE-002 · Рефакторинг: ClientDesktopPanel vs ClientDetailsModal — дублирование
Два компонента с похожей логикой для десктопной карточки клиента. Стоит объединить или чётко разграничить зоны ответственности.

### NOTE-003 · DELETE /api/sales: inventory_transactions не удаляются
В коде есть комментарий об удалении `inventory_transactions`, но код не реализован. Зависит от использования этой таблицы в отчётах.  
**Файл:** `src/app/api/sales/[id]/route.ts` L79–95

---

## Статистика

| Приоритет | Кол-во | Исправлено |
|-----------|--------|-----------|
| 🔴 Критические | 5 | 0 |
| 🟡 Средние | 6 | 0 |
| 🟢 Низкие | 4 | 0 |
| 💡 Замечания | 3 | — |

*Обновлять статус по мере исправления.*
