# Исправление ошибки загрузки баннера

## Проблема
```
שגיאה בהעלאת קובץ: new row violates row-level security policy
```

## Решение (2 шага)

### Шаг 1: Создайте Storage Bucket

**Через Supabase Dashboard (Проще):**

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Storage** (левое меню)
4. Нажмите **"New bucket"**
5. Заполните:
   - **Name:** `ad-banners`
   - **Public bucket:** ✅ ОБЯЗАТЕЛЬНО включить!
6. Нажмите **"Create bucket"**

**Или через SQL Editor:**

```sql
-- Create public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;
```

### Шаг 2: Перезапустите сервер

```bash
# Остановите (Ctrl+C)
# Запустите заново
npm run dev
```

---

## Проверка что bucket создан

**Вариант 1: Dashboard**
- Storage → должен быть bucket `ad-banners`

**Вариант 2: SQL**
```sql
SELECT * FROM storage.buckets WHERE id = 'ad-banners';
```

Должно вернуть:
```
id          | name       | public
------------|------------|--------
ad-banners  | ad-banners | true
```

---

## Если всё ещё не работает

### Временное решение: Отключить RLS на Storage

**⚠️ ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ!**

```sql
-- Удалить все RLS политики на storage.objects
DROP POLICY IF EXISTS "Authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Отключить RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

После тестирования **ОБЯЗАТЕЛЬНО включите обратно**:

```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## Что я исправил в коде

✅ Создал API route `/api/upload/banner` который использует **Service Role Key**
✅ Обновил функцию `uploadBanner()` для использования API route
✅ API route обходит RLS и загружает файлы от имени сервера

Теперь загрузка работает через безопасный API endpoint!

---

## Тестирование

1. Перейдите на `/admin/ads`
2. Нажмите **"הוסף קמפיין"**
3. Загрузите картинку (jpg, png)
4. Должен появиться preview
5. Если нет ошибки — всё работает! ✅

---

## Если видите другую ошибку

**"Bucket not found":**
- Bucket `ad-banners` не создан → см. Шаг 1

**"Service role key not found":**
- Добавьте `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`
- Перезапустите сервер

**"Invalid file type":**
- Загружайте только изображения (jpg, png, webp, svg)

**"File too large":**
- Максимум 5MB (можно увеличить в Supabase Dashboard → Storage → Settings)

---

**После создания bucket всё должно заработать!** 🎉
