# Storage Setup for Ad Banners

## Создание Storage Bucket в Supabase

Для загрузки баннеров нужно создать storage bucket:

### Шаг 1: Создать Bucket через Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Storage** (левое меню)
4. Нажмите **"New bucket"**
5. Заполните:
   - **Name:** `ad-banners`
   - **Public bucket:** ✅ Включить (чтобы баннеры были доступны публично)
6. Нажмите **"Create bucket"**

### Шаг 2: Настроить Policies (опционально)

Bucket уже будет публичным, но можно настроить политики:

1. В Storage → кликните на bucket `ad-banners`
2. Перейдите в **Policies**
3. Добавьте политики:

**Policy 1: Public Read**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-banners');
```

**Policy 2: Authenticated Upload**
```sql
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-banners' AND auth.role() = 'authenticated');
```

**Policy 3: Admin Delete**
```sql
CREATE POLICY "Admin delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-banners' AND is_admin());
```

---

## Альтернатива: Создать через SQL

Если хотите через SQL Editor:

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-banners', 'ad-banners', true)
ON CONFLICT (id) DO NOTHING;
```

Затем добавьте policies через Dashboard → Storage → ad-banners → Policies.

---

## Проверка

После создания bucket:

1. Перейдите на `/admin/ads`
2. Нажмите **"הוסף קמפיין"**
3. Загрузите тестовую картинку
4. Если всё работает — увидите preview баннера
5. URL будет вида: `https://[project].supabase.co/storage/v1/object/public/ad-banners/[filename].jpg`

---

## Troubleshooting

### Ошибка: "Bucket not found"
- Создайте bucket через Dashboard (Шаг 1)

### Ошибка: "Permission denied"
- Убедитесь что bucket **Public**
- Добавьте Policy "Authenticated upload"

### Ошибка: "Invalid file type"
- Проверьте что загружаете изображение (jpg, png, webp)

### Загрузка работает, но картинка не отображается
- Проверьте что bucket **Public**
- Откройте URL баннера в новой вкладке — должна открыться картинка

---

## Рекомендации

1. **Размер файлов:** Ограничьте до 2MB в UI
2. **Форматы:** jpg, png, webp, svg
3. **Оптимизация:** Используйте оптимизированные картинки
4. **Backup:** Периодически бэкапьте Storage

---

**Готово!** Теперь можно загружать баннеры в админке. 🎉
