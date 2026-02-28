# Решение: RLS ошибка при добавлении клиента

## Проблема
При добавлении клиента возникает RLS ошибка, несмотря на то что политика INSERT существует.

## Диагностика

### 1. Запустить SQL проверку
Выполните в Supabase SQL Editor:

```sql
-- Проверка 1: Текущий пользователь
SELECT auth.uid() as user_id;

-- Проверка 2: Есть ли пользователь в org_users?
SELECT * FROM org_users WHERE user_id = auth.uid();

-- Проверка 3: Работает ли функция get_user_org_ids()?
SELECT get_user_org_ids();

-- Проверка 4: Существуют ли политики?
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'clients';
```

### Если функция get_user_org_ids() возвращает ПУСТО:
**Причина:** Пользователь не добавлен в таблицу `org_users`

**Решение:** Добавить пользователя в org_users:

```sql
-- Получить ID вашей организации
SELECT id, name FROM organizations LIMIT 5;

-- Добавить себя в организацию
INSERT INTO org_users (org_id, user_id, email, role, joined_at)
VALUES (
  'YOUR_ORG_ID_HERE',  -- ← замените на ID организации из SELECT выше
  auth.uid(),
  'your-email@example.com',  -- ← ваш email
  'owner',
  now()
)
ON CONFLICT (org_id, email) DO NOTHING;

-- Проверить снова
SELECT get_user_org_ids();
```

### Если политики отсутствуют или неправильные:

**Решение:** Пересоздать политики:

```sql
-- Удалить старые
DROP POLICY IF EXISTS "Users see own org clients" ON clients;
DROP POLICY IF EXISTS "Users insert own org clients" ON clients;
DROP POLICY IF EXISTS "Users update own org clients" ON clients;
DROP POLICY IF EXISTS "Users delete own org clients" ON clients;

-- Создать новые
CREATE POLICY "Users see own org clients" 
  ON clients FOR SELECT 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users insert own org clients" 
  ON clients FOR INSERT 
  WITH CHECK (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users update own org clients" 
  ON clients FOR UPDATE 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());

CREATE POLICY "Users delete own org clients" 
  ON clients FOR DELETE 
  USING (org_id IN (SELECT get_user_org_ids()) OR is_admin());
```

## Код добавления клиента (уже правильный)

### `/src/hooks/useClients.ts` - хук useAddClient()

```typescript
export function useAddClient() {
  const queryClient = useQueryClient()
  const { orgId, isLoading } = useAuth()  // ← получаем orgId из useAuth

  return useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => {
      // ✅ Проверка что orgId загружен
      if (isLoading) {
        throw new Error('אנא המתן, הנתונים נטענים...')
      }
      
      // ✅ Проверка что orgId не null
      if (!orgId || orgId === '0') {
        throw new Error('לא נמצא ארגון למשתמש הנוכחי. אנא פנה לתמיכה.')
      }

      console.log('Adding client with orgId:', orgId) // debug

      // ✅ Передаем org_id при вставке
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, org_id: orgId }])  // ← org_id передается!
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('הלקוח נוסף בהצלחה')
    },
    onError: (error: any) => {
      console.error('Add client error:', error)
      toast.error('שגיאה בהוספת לקוח: ' + error.message)
    },
  })
}
```

### `/src/hooks/useAuth.ts` - хук useAuth()

```typescript
export function useAuth(): UseAuthResult {
  // ...

  useEffect(() => {
    const loadAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setUser(null)
        setOrgId(null)
        return
      }

      setUser(user)

      // ✅ Получаем организации пользователя по USER_ID (не по email!)
      const { data: orgRows } = await supabase
        .from('org_users')
        .select('org_id, role, organizations(name)')
        .eq('user_id', user.id)  // ← используем user_id (Foreign Key)

      const userOrganizations = (orgRows || []).map(row => ({
        org_id: row.org_id,
        org_name: row.organizations?.name || 'Unknown',
        role: row.role || 'user',
      }))

      // ✅ Берем первую организацию (или сохраненную)
      const selectedOrgId = userOrganizations[0]?.org_id || null
      setOrgId(selectedOrgId)
      setIsLoading(false)
    }

    loadAuth()
  }, [])

  return { user, orgId, isLoading, ... }
}
```

## Итоговая проверка

После исправления выполните:

```sql
-- 1. Проверить что пользователь в org_users
SELECT 
  ou.user_id,
  ou.org_id,
  ou.email,
  o.name as org_name
FROM org_users ou
JOIN organizations o ON o.id = ou.org_id
WHERE ou.user_id = auth.uid();
-- Ожидается: 1 строка с вашими данными

-- 2. Проверить что функция работает
SELECT get_user_org_ids();
-- Ожидается: UUID вашей организации

-- 3. Проверить политики
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clients';
-- Ожидается: 4 политики (SELECT, INSERT, UPDATE, DELETE)

-- 4. Тест добавления клиента
INSERT INTO clients (org_id, first_name, last_name, phone)
SELECT org_id, 'Test', 'Client', '+972000000000'
FROM org_users
WHERE user_id = auth.uid()
LIMIT 1;

-- Если вставка прошла успешно, удалить тестового клиента
DELETE FROM clients WHERE phone = '+972000000000';
```

## Часто встречающиеся ошибки

### ❌ Ошибка: "new row violates row-level security policy"
**Причина:** Функция `get_user_org_ids()` возвращает пустой результат  
**Решение:** Добавить пользователя в `org_users` (см. выше)

### ❌ Ошибка: "orgId is null"
**Причина:** `useAuth()` не может найти организацию для пользователя  
**Решение:** Убедиться что пользователь есть в `org_users` с правильным `user_id`

### ❌ Ошибка: "Missing orgId 0"
**Причина:** `useAuth()` возвращает `'0'` вместо реального UUID  
**Решение:** Проверить что запрос в `useAuth` использует `user_id`, а не `email`

## Проверка в коде (DevTools)

Откройте консоль браузера и проверьте:

```javascript
// 1. Проверить что user загружен
console.log(user)

// 2. Проверить что orgId не null
console.log(orgId)

// 3. При попытке добавить клиента должен появиться лог:
// "Adding client with orgId: <UUID>"
```

---

**Итог:**
✅ Код правильный  
✅ Политики правильные  
⚠️ Проблема скорее всего в том, что пользователь не добавлен в `org_users`
