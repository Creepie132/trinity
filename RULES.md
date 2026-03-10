# Правила работы Киры — Trinity CRM

## ⚠️ ОБЯЗАТЕЛЬНО перед каждой задачей:
1. Синхронизировать локальный код с GitHub:
```bash
git fetch origin && git reset --hard origin/main && git clean -fd
```

2. Убедиться что билд чистый:
```bash
npm run build
```

## ⚠️ ОБЯЗАТЕЛЬНО после каждой задачи:
1. Проверить билд:
```bash
npm run build
```
2. Если билд упал — исправить ВСЕ ошибки перед пушем
3. Только после чистого билда:
```bash
git add -A && git commit -m "описание" && git push
```

## 🚫 ЗАПРЕЩЕНО:
- Делать push если npm run build упал с ошибками
- Писать "жду результатов сборки" — Влад сам видит в Vercel
- Использовать @supabase/auth-helpers-nextjs (только @supabase/ssr)
- Создавать компонент который импортирует несуществующий файл/хук

## ✅ Перед созданием компонента:
1. Проверить все импорты:
```bash
ls src/hooks/
ls src/components/ui/
```
2. Сначала создать все хуки и зависимости
3. Потом создать компонент

## 📋 Структура БД (Supabase):
- clients: id, org_id, first_name, last_name, phone, email, notes, date_of_birth, loyalty_balance ⚠️ НЕТ поля name!
- visits: id, org_id, client_id, service_id, scheduled_at, duration_minutes, price, status, notes
- products: id, org_id, name, barcode, sku, category, brand, purchase_price, sell_price, quantity, min_quantity, unit, is_active
- payments: id, org_id, client_id, visit_id, amount, currency, status, payment_method, provider, type
- tasks: id, org_id, created_by, assigned_to, title, description, status, priority, due_date, client_id, visit_id
- services: id, org_id, name, name_ru, price, duration_minutes, color, is_active

## 🔧 Next.js правила:
- "use client" — первая строка в КАЖДОМ файле с хуками
- Страницы с export const metadata — серверные, useState только в дочерних компонентах
- После мутаций: queryClient.invalidateQueries({ queryKey: ['название'] })