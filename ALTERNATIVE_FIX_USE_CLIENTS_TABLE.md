# Альтернативное решение: Загрузка напрямую из таблицы clients

## Проблема
View `client_summary` может не работать с RLS правильно, поэтому новые клиенты не отображаются.

## Решение
Загружать клиентов напрямую из таблицы `clients` и вычислять статистику отдельно.

## Изменения в `src/hooks/useClients.ts`

### Вариант 1: Простой (без статистики)
```typescript
export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['clients', orgId, searchQuery, page, pageSize],
    enabled: !!orgId,
    queryFn: async () => {
      console.log('Loading clients for org_id:', orgId)
      
      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      // ✅ Загружаем напрямую из таблицы clients
      let query = supabase
        .from('clients')  // ← Изменено с 'client_summary'
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data, error, count } = await query
      
      if (error) {
        console.error('Error loading clients:', error)
        throw error
      }
      
      console.log('Loaded clients count:', count)
      
      // Добавляем пустую статистику для совместимости
      const clientsWithStats = (data || []).map(client => ({
        ...client,
        last_visit: null,
        total_visits: 0,
        total_paid: 0,
      }))
      
      return { data: clientsWithStats as ClientSummary[], count: count || 0 }
    },
  })
}
```

### Вариант 2: Со статистикой (отдельные запросы)
```typescript
export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['clients', orgId, searchQuery, page, pageSize],
    enabled: !!orgId,
    queryFn: async () => {
      console.log('Loading clients for org_id:', orgId)
      
      const from = (page - 1) * pageSize
      const to = page * pageSize - 1

      // Загружаем клиентов
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (searchQuery && searchQuery.trim()) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`
        )
      }

      const { data: clients, error, count } = await query
      
      if (error) {
        console.error('Error loading clients:', error)
        throw error
      }
      
      if (!clients || clients.length === 0) {
        return { data: [], count: 0 }
      }

      // Загружаем статистику визитов
      const clientIds = clients.map(c => c.id)
      const { data: visits } = await supabase
        .from('visits')
        .select('client_id, visit_date')
        .in('client_id', clientIds)

      // Загружаем статистику платежей
      const { data: payments } = await supabase
        .from('payments')
        .select('client_id, amount, status')
        .in('client_id', clientIds)
        .eq('status', 'completed')

      // Собираем статистику
      const clientsWithStats = clients.map(client => {
        const clientVisits = visits?.filter(v => v.client_id === client.id) || []
        const clientPayments = payments?.filter(p => p.client_id === client.id) || []
        
        return {
          ...client,
          last_visit: clientVisits.length > 0 
            ? clientVisits.sort((a, b) => 
                new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
              )[0].visit_date
            : null,
          total_visits: clientVisits.length,
          total_paid: clientPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        }
      })
      
      console.log('Loaded clients count:', count)
      
      return { data: clientsWithStats as ClientSummary[], count: count || 0 }
    },
  })
}
```

### Вариант 3: Использовать RPC функцию (рекомендуется)
В Supabase создайте функцию из `FIX_CLIENT_VISIBILITY.sql`:
```sql
CREATE OR REPLACE FUNCTION get_client_summary(p_org_id uuid)
RETURNS TABLE (...) 
...
```

Затем в хуке:
```typescript
export function useClients(searchQuery?: string, page: number = 1, pageSize: number = 25) {
  const { orgId } = useAuth()

  return useQuery({
    queryKey: ['clients', orgId, searchQuery, page, pageSize],
    enabled: !!orgId,
    queryFn: async () => {
      console.log('Loading clients for org_id:', orgId)
      
      // Используем RPC функцию
      const { data, error } = await supabase
        .rpc('get_client_summary', { p_org_id: orgId })
      
      if (error) {
        console.error('Error loading clients:', error)
        throw error
      }
      
      // Применяем поиск на клиенте
      let filteredData = data || []
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        filteredData = filteredData.filter(c =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
        )
      }
      
      // Пагинация на клиенте
      const from = (page - 1) * pageSize
      const to = page * pageSize
      const paginatedData = filteredData.slice(from, to)
      
      console.log('Loaded clients count:', filteredData.length)
      
      return { 
        data: paginatedData as ClientSummary[], 
        count: filteredData.length 
      }
    },
  })
}
```

## Рекомендация

1. **Сначала попробуйте Вариант 1** (простой) - чтобы убедиться что проблема именно в view
2. Если работает - используйте **Вариант 3** (RPC функция) для продакшена
3. **Вариант 2** - только если не хотите создавать SQL функцию

## Проверка

После изменения:
1. Откройте консоль браузера
2. Проверьте логи:
   - `Loading clients for org_id: <UUID>`
   - `Loaded clients count: N`
3. Убедитесь что org_id совпадает с тем что выводится в API route при создании
4. Новые клиенты должны отображаться сразу после добавления

---

**Дата:** 2026-02-28  
**Статус:** Альтернативное решение (если view не работает)
