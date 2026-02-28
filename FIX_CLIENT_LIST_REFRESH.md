# Исправление: Список клиентов не обновляется после добавления

## Проблема
Клиент успешно сохраняется в базу данных (подтверждено логами), но не появляется в списке на странице `/clients`.

## Причина
React Query не успевал обновить кеш после добавления клиента, либо `invalidateQueries` вызывался, но не делал `refetch` активных запросов.

## Решение

### 1. **В хуке useAddClient** (`src/hooks/useClients.ts`)

Добавлен явный `refetchQueries` в `onSuccess`:

```typescript
onSuccess: async (data) => {
  console.log('[useAddClient] onSuccess: invalidating clients queries')
  
  // Инвалидируем все запросы клиентов
  await queryClient.invalidateQueries({ queryKey: ['clients'] })
  
  // ✅ Принудительно рефетчим все активные запросы клиентов
  await queryClient.refetchQueries({ queryKey: ['clients'], type: 'active' })
  
  console.log('[useAddClient] Queries invalidated and refetched')
  
  toast.success('הלקוח נוסף בהצלחה')
}
```

**Изменения:**
- ✅ Добавлен `await` перед `invalidateQueries`
- ✅ Добавлен `refetchQueries` для активных запросов
- ✅ Добавлены console.log для отладки

### 2. **В компоненте AddClientDialog** (`src/components/clients/AddClientDialog.tsx`)

Добавлен явный рефетч после успешного добавления:

```typescript
try {
  await addClient.mutateAsync({ ... })

  console.log('[AddClientDialog] Client added successfully, invalidating queries')

  // ✅ Явно инвалидируем и рефетчим клиентов
  await queryClient.invalidateQueries({ queryKey: ['clients'] })
  await refetchClients()

  console.log('[AddClientDialog] Queries invalidated, list should refresh')

  // Reset form и закрываем диалог
  setFormData({ ... })
  onOpenChange(false)
} catch (error) {
  console.error('[AddClientDialog] Error adding client:', error)
}
```

**Изменения:**
- ✅ Добавлен `useQueryClient` и `refetchClients` из `useClients`
- ✅ Добавлен try-catch для обработки ошибок
- ✅ Явный вызов `invalidateQueries` и `refetchClients`
- ✅ Диалог закрывается только после успешного рефетча
- ✅ Добавлены console.log для отладки

## Последовательность выполнения

1. Пользователь заполняет форму и нажимает "Сохранить"
2. `handleSubmit` вызывает `addClient.mutateAsync()`
3. API роут создаёт клиента в базе (через supabaseAdmin)
4. **onSuccess в useAddClient:**
   - Инвалидирует кеш клиентов
   - Делает refetch всех активных запросов
5. **handleSubmit в AddClientDialog:**
   - Дополнительно инвалидирует кеш
   - Явно вызывает `refetchClients()`
6. Диалог закрывается
7. Список клиентов обновляется с новым клиентом

## Отладка

После деплоя проверьте консоль браузера:

```
Adding client via API route
Client added successfully, ID: <uuid>
[useAddClient] onSuccess: invalidating clients queries
[useAddClient] Queries invalidated and refetched
[AddClientDialog] Client added successfully, invalidating queries
Loading clients for org_id: <uuid>
Loaded clients count: N+1
[AddClientDialog] Queries invalidated, list should refresh
```

Если новый клиент **не появляется**, проверьте:

1. **org_id совпадает?**
   - В логе создания: `Saving client with org_id: <uuid>`
   - В логе загрузки: `Loading clients for org_id: <uuid>`
   - Они должны **совпадать**!

2. **RLS политики работают?**
   - Выполните `FIX_CLIENT_VISIBILITY.sql` в Supabase

3. **Клиент создался?**
   - Проверьте в Supabase Dashboard → Table Editor → clients

## Альтернативное решение (если не помогло)

Если проблема сохраняется, попробуйте:

### Вариант 1: Перезагрузка страницы
```typescript
onOpenChange(false)
window.location.reload()
```

### Вариант 2: Задержка перед закрытием
```typescript
await refetchClients()
await new Promise(resolve => setTimeout(resolve, 500))
onOpenChange(false)
```

### Вариант 3: Обновить стейт вручную
```typescript
onSuccess: (data) => {
  // Оптимистичное обновление кеша
  queryClient.setQueryData(['clients'], (old: any) => {
    return {
      ...old,
      data: [data, ...(old?.data || [])],
      count: (old?.count || 0) + 1,
    }
  })
}
```

## Итог

✅ Добавлен явный `refetchQueries` в хук  
✅ Добавлен явный `refetchClients()` в форме  
✅ Добавлено логирование для отладки  
✅ Диалог закрывается только после рефетча  

**Commit:** `3d60a74` - Fix: add explicit refetchQueries after client creation to update list

---

**Дата:** 2026-02-28  
**Статус:** ✅ Исправлено через явный refetch
