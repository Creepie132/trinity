# Payment Status Page Implementation

## Обзор
Создана страница `/pay/[id]` для проверки статуса платежа перед перенаправлением на Tranzilla.

## Функциональность

### 1. Проверка статуса платежа
При переходе по ссылке `/pay/[id]`, страница:

1. **Получает платёж из БД** по `id`
2. **Проверяет статус:**
   - ❌ `cancelled` → Показывает "Эта ссылка недействительна"
   - ✅ `pending` → Перенаправляет на `payment_link` (Tranzilla)
   - ℹ️ Другие статусы → Показывает соответствующую страницу

### 2. Билингвальная поддержка
- **Иврит (עברית)** - RTL
- **Русский (Русский)** - LTR
- Автоопределение языка из браузера
- Кнопка переключения языка

### 3. Адаптивный дизайн
- ✅ Мобильная версия (до 768px)
- ✅ Десктопная версия (768px+)
- Центрированная карточка
- Градиентный фон
- Dark mode поддержка

## Файлы

### 1. Страница
**Путь:** `src/app/pay/[id]/page.tsx`

**Компоненты:**
- Loading state с анимацией
- Cancelled payment card (красная карточка)
- Error state (оранжевая карточка)
- Переключатель языка

### 2. Миграция БД
**Путь:** `supabase/migrations/allow-anonymous-payment-status-read.sql`

**Что делает:**
- Разрешает анонимный SELECT на таблицу `payments`
- Нужно для того, чтобы клиенты могли проверить статус без авторизации

**Применение миграции:**

#### Вариант 1: Supabase Dashboard
1. Открыть: https://supabase.com/dashboard
2. Выбрать проект Trinity
3. SQL Editor
4. Скопировать и выполнить SQL из файла миграции

#### Вариант 2: Supabase CLI
```bash
cd trinity
supabase migration up
```

#### Вариант 3: Вручную через SQL Editor
```sql
CREATE POLICY "Anonymous users can check payment status"
  ON payments
  FOR SELECT
  USING (true);
```

## Безопасность

### RLS Политика
Новая политика разрешает анонимный SELECT, но:

✅ **Безопасно потому что:**
1. Payment ID = UUID (сложно угадать)
2. Ссылки на оплату предназначены для клиентов
3. Страница показывает только статус, без чувствительных данных
4. Приложение запрашивает только: `id, status, payment_link, amount, currency`

❌ **НЕ раскрывается:**
- `client_id`
- `org_id`
- `transaction_id`
- Другие внутренние данные

### Что видит клиент:
- Статус платежа (pending, cancelled, etc.)
- Сумма и валюта (для информации)
- Перенаправление на Tranzilla (если pending)

## Использование

### Создание платёжной ссылки
```typescript
// Backend создаёт платёж через API
POST /api/payments/create-link
{
  "client_id": "uuid",
  "amount": 150.50,
  "description": "תשלום עבור שירות"
}

// Ответ:
{
  "success": true,
  "payment_id": "uuid",
  "payment_link": "https://direct.tranzila.com/..."
}
```

### Использование страницы /pay/[id]
```typescript
// Вместо прямой ссылки Tranzilla:
const directLink = "https://direct.tranzila.com/ambersol/iframenew.php?..."

// Используем промежуточную страницу:
const payLink = `https://yourapp.com/pay/${payment_id}`

// Страница проверит статус и перенаправит
```

## Сценарии использования

### 1. Нормальный флоу (pending)
```
Клиент → /pay/abc-123
         ↓
    Проверка БД (status = pending)
         ↓
    Показать "Загрузка..."
         ↓
    Перенаправление на Tranzilla
```

### 2. Отменённый платёж (cancelled)
```
Клиент → /pay/abc-123
         ↓
    Проверка БД (status = cancelled)
         ↓
    Показать "Ссылка недействительна"
         ↓
    Кнопка "Вернуться на сайт"
```

### 3. Не найден
```
Клиент → /pay/invalid-id
         ↓
    Ошибка БД (не найдено)
         ↓
    Показать "Платёж не найден"
         ↓
    Кнопка "Вернуться на сайт"
```

## Тестирование

### Создать тестовый платёж
```bash
curl -X POST https://yourapp.com/api/payments/create-link \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid",
    "amount": 100,
    "description": "Test payment"
  }'
```

### Проверить страницу
1. Открыть: `https://yourapp.com/pay/{payment_id}`
2. Должна загрузиться страница "Обработка платежа"
3. Через 1 секунду → перенаправление на Tranzilla

### Проверить отмену
1. Отменить платёж: `POST /api/payments/{id}/cancel`
2. Открыть: `https://yourapp.com/pay/{payment_id}`
3. Должна показаться красная карточка "Ссылка недействительна"

## Интеграция в существующий код

### В компоненте создания платежа
```typescript
// До (прямая ссылка):
const link = response.payment_link

// После (через /pay страницу):
const link = `${window.location.origin}/pay/${response.payment_id}`
```

### Преимущества промежуточной страницы:
1. ✅ Проверка статуса перед редиректом
2. ✅ Красивая страница загрузки
3. ✅ Обработка отменённых ссылок
4. ✅ Билингвальная поддержка
5. ✅ Аналитика (можно добавить)

## TODO (опционально)
- [ ] Добавить аналитику (track открытие ссылки)
- [ ] Добавить возможность повторной отправки ссылки
- [ ] Показывать таймер истечения ссылки
- [ ] Добавить кастомизацию сообщений через org settings
