# Optimistic UI — Trinity CRM Standard

## Концепция

Все CRUD-мутации в Trinity используют **единый хук `useOptimisticMutation`**.
Пользователь видит результат **немедленно** — до ответа сервера.
При ошибке (RLS, FK, таймаут) — **автоматический откат** + toast.

---

## Файлы

| Файл | Описание |
|---|---|
| `src/hooks/useOptimisticMutation.ts` | Архитектурное ядро |
| `src/hooks/useServices.ts` | PoC-эталон (v2.0.0) |

---

## API хука

```ts
useOptimisticMutation<TData, TVariables, TCacheData>({
  queryKey,        // QueryKey — ключ кэша
  mutationFn,      // (vars) => Promise<TData>
  applyOptimistic, // (old, vars) => TCacheData — чистая функция
  strategy?,       // 'setQueryData' | 'setQueriesData' (default)
  invalidateKeys?, // QueryKey[] — доп. инвалидация в onSettled
  messages?,       // { success?, error? } — автотосты
  onSuccess?,      // (data, vars) => void — доп. колбэк
  onError?,        // (error, vars) => void — доп. колбэк
  onSettled?,      // () => void — доп. колбэк
})
```

---

## Жизненный цикл

```
user action
  │
  ▼
onMutate
  ├─ cancelQueries(queryKey)          ← стоп исходящим рефетчам
  ├─ snapshot = getQueryData(...)     ← снимок для rollback
  └─ setQueryData(applyOptimistic)    ← мгновенное обновление UI
  │
  ▼
mutationFn (fetch к серверу) ──────────────────────────────────
  │                                                            │
  ▼ onSuccess                                          onError ▼
toast.success(messages.success)           setQueryData(snapshot) ← ROLLBACK
userOnSuccess?.()                         toast.error(messages.error + err.message)
  │                                       userOnError?.()
  └───────────────────┐                          │
                      ▼                          │
                  onSettled ◄────────────────────┘
                    invalidateQueries(queryKey)
                    invalidateQueries(invalidateKeys[])
                    userOnSettled?.()
```

---

## Стратегии snapshot

### `setQueriesData` (по умолчанию)
Используй для списков с фильтрами/параметрами/страницами.
Охватывает ВСЕ вариации queryKey:
- `['services']`
- `['services', { filter: 'active' }]`

### `setQueryData`
Используй для одиночных записей (`useProduct(id)`, `useClient(id)`).
Работает с конкретным ключом — быстрее, точнее.

---

## Эталонный пример (useCreateService)

```ts
export function useCreateService() {
  return useOptimisticMutation<Service, CreateServiceDTO, Service[]>({
    queryKey: ['services'],

    mutationFn: async (dto) => {
      const data = await apiFetch<{ service: Service }>('/api/services', {
        method: 'POST',
        json: dto,
      })
      return data.service
    },

    applyOptimistic: (old, dto) => {
      const optimistic: Service = {
        id:               `optimistic-${Date.now()}`,
        org_id:           '',
        name:             dto.name,
        duration_minutes: dto.duration_minutes ?? 0,
        color:            dto.color ?? '#6366f1',
        is_active:        true,
        created_at:       new Date().toISOString(),
      }
      return [optimistic, ...(old ?? [])]
    },

    messages: {
      success: 'השירות נוסף בהצלחה',
      error:   'שגיאה ביצירת שירות',
    },
  })
}
```

---

## Карта миграции

| Хук | Статус | Примечание |
|---|---|---|
| `useServices` (create/update/delete) | ✅ Мигрирован | Эталон |
| `useProducts` (create/update/delete) | ⏳ Ручной | Мигрировать следующим |
| `useCreateSale`, `useToggleReceipt` | ⏳ Ручной | Простая миграция |
| `useUpdateExpense`, `useDeleteExpense` | ⏳ Ручной | Простая миграция |
| `useUpdateVisitStatus`, `useUpdateVisit` | ⏳ Ручной | Осторожно: `VisitsResult` |
| `useAddClient`, `useUpdateClient` | ⏳ Ручной | Осторожно: `{ data, count }` |

### Особые случаи при миграции

**Визиты** — кэш имеет форму `VisitsResult = { data: Visit[], count: number }`:
```ts
applyOptimistic: (old, { id, status }) => ({
  ...old,
  data: old?.data.map(v => v.id === id ? { ...v, status } : v) ?? [],
  count: old?.count ?? 0,
})
```

**Клиенты** — пагинация `{ data: ClientSummary[], count: number }`:
```ts
applyOptimistic: (old, dto) => ({
  data: [optimistic, ...(old?.data ?? [])],
  count: (old?.count ?? 0) + 1,
})
```

---

## Правило именования оптимистичных ID

Всегда: `` `optimistic-${Date.now()}` ``

Это позволяет guards в `useClient` и `useUpdateClient` блокировать
запросы с временным ID до завершения `onSettled`.

---

## Changelog

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-04-02 | Создан `useOptimisticMutation` |
| — | 2026-04-02 | `useServices` мигрирован как PoC |
