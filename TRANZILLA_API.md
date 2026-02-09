# Tranzilla Payment API Integration

## 📋 Обзор

Интеграция с платёжной системой Tranzilla для приёма платежей по кредитным картам.

## 🔧 Настройка

### 1. Переменные окружения (.env.local)

```env
TRANZILLA_TERMINAL_ID=your_terminal_id
TRANZILLA_API_KEY=your_api_key
```

Для тестирования (sandbox):
```env
TRANZILLA_TERMINAL_ID=sandbox
TRANZILLA_API_KEY=sandbox_key
```

### 2. Webhook URL

После деплоя настройте webhook URL в панели Tranzilla:
```
https://your-domain.com/api/payments/webhook
```

## 🚀 API Endpoints

### POST /api/payments/create-link

Создание ссылки на оплату.

**Request:**
```json
{
  "client_id": "uuid",
  "amount": 100.50,
  "description": "Оплата за услуги",
  "visit_id": "uuid" // опционально
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "payment_link": "https://sandbox.tranzilla.co.il/...",
  "amount": 100.50,
  "currency": "ILS"
}
```

**Пример использования:**

```typescript
const response = await fetch('/api/payments/create-link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'client-uuid',
    amount: 150.00,
    description: 'Оплата визита',
  }),
})

const { payment_link } = await response.json()
// Redirect user to payment_link
window.location.href = payment_link
```

### POST /api/payments/webhook

Webhook для получения уведомлений от Tranzilla.

**Автоматически обрабатывает:**
- Успешные платежи (Response: '000')
- Неуспешные платежи
- Обновление статуса в БД
- Сохранение transaction_id

**Вебхук от Tranzilla отправляет:**
```
Response=000 (успех) или другой код (ошибка)
ConfirmationCode=123456789
sum=100.50
currency=1 (ILS)
contact=payment_id
```

### GET /api/payments/callback

Callback URL для редиректа пользователя после оплаты.

**Параметры:**
- `status=success` или `status=failed`
- `contact=payment_id`

**Поведение:**
Редиректит на `/payments?status=...&payment_id=...`

## 🧪 Тестирование (Sandbox)

### Тестовые данные карты:

- **Номер карты:** 4444-3333-2222-1111
- **Дата истечения:** 01/26
- **CVV:** 123
- **Имя:** Test User

### Тестовый сценарий:

1. Создайте тестового клиента
2. Создайте ссылку на оплату:
   ```bash
   curl -X POST http://localhost:3000/api/payments/create-link \
     -H "Content-Type: application/json" \
     -d '{
       "client_id": "your-client-uuid",
       "amount": 100,
       "description": "Test payment"
     }'
   ```
3. Откройте полученную ссылку
4. Введите тестовые данные карты
5. Проверьте обновление статуса в БД

## 📊 Статусы платежей

- `pending` — создан, ожидает оплаты
- `completed` — успешно оплачен
- `failed` — ошибка оплаты
- `refunded` — возвращён

## 🔐 Безопасность

**Production checklist:**

- ✅ Используйте HTTPS
- ✅ Настройте IP whitelist для webhook
- ✅ Проверяйте подпись webhook (если доступна)
- ✅ Храните API ключи в переменных окружения
- ✅ Логируйте все транзакции
- ✅ Настройте мониторинг и алерты

## 📝 Примечания

- Tranzilla работает в израильских шекелях (ILS)
- Комиссия взимается Tranzilla (уточните у провайдера)
- Webhook может приходить с задержкой
- Рекомендуется проверять статус платежа по таймауту

## 🔗 Документация Tranzilla

- [Developer Portal](https://www.tranzilla.com/docs/)
- [API Reference](https://www.tranzilla.com/api-docs/)
- [Sandbox Environment](https://sandbox.tranzilla.co.il/)
