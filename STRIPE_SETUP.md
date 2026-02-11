# 💳 Stripe Payment Integration Setup

## 📋 Обзор

Trinity CRM теперь поддерживает **две платёжные системы**:
1. **Tranzilla** — создание платёжных ссылок для отправки клиентам
2. **Stripe** — мгновенный redirect на Stripe Checkout

---

## 🔧 Настройка Stripe

### 1️⃣ Получение API ключей

1. Зайдите в [Stripe Dashboard](https://dashboard.stripe.com)
2. Перейдите в **Developers → API keys**
3. Скопируйте:
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

### 2️⃣ Настройка Webhook

1. В Stripe Dashboard → **Developers → Webhooks**
2. Нажмите **Add endpoint**
3. Введите URL вашего сайта:
   ```
   https://your-domain.com/api/payments/stripe-webhook
   ```
   
4. Выберите события:
   - ✅ `checkout.session.completed`

5. Нажмите **Add endpoint**
6. Скопируйте **Signing secret** (whsec_...)

### 3️⃣ Environment Variables

Добавьте в `.env.local`:

```env
# Stripe (платежи)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 4️⃣ Перезапуск

```bash
npm run dev
```

---

## 🎯 Как использовать

### В интерфейсе CRM:

1. Перейдите в **תשלומים** (Payments)
2. Две кнопки:
   - **"צור קישור תשלום (Tranzilla)"** — синяя (создание ссылки)
   - **"צור קישור תשלום (Stripe)"** — фиолетовая (redirect на Stripe)

### Процесс оплаты через Stripe:

```
1. Нажатие кнопки Stripe
   ↓
2. Выбор клиента + сумма
   ↓
3. POST /api/payments/stripe-checkout
   ↓
4. Открытие Stripe Checkout в новом окне
   ↓
5. Клиент вводит карту и оплачивает
   ↓
6. Stripe отправляет webhook → /api/payments/stripe-webhook
   ↓
7. Запись в таблицу payments (status: 'completed')
   ↓
8. Redirect на /payments?success=true
```

---

## 🔒 Безопасность

### Webhook Verification

Каждый webhook от Stripe **верифицируется** через `stripe.webhooks.constructEvent`:

```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)
```

Без корректной подписи webhook **отклоняется**.

### Middleware Exclusion

`/api/payments/stripe-webhook` добавлен в исключения middleware (публичный endpoint):

```typescript
const STRIPE_WEBHOOK_PATH = '/api/payments/stripe-webhook'

if (pathname === STRIPE_WEBHOOK_PATH || ...) {
  return NextResponse.next() // ✅ Разрешить без аутентификации
}
```

---

## 🆚 Tranzilla vs Stripe

| Аспект | Tranzilla | Stripe |
|--------|-----------|--------|
| **Процесс** | Создание ссылки → отправка клиенту | Мгновенный redirect |
| **UI оплаты** | Tranzilla iframe | Stripe Checkout |
| **Webhook** | callback + webhook | webhook only |
| **Статус** | pending → completed | completed сразу |
| **Использование** | Отправка ссылок (SMS/WhatsApp) | Быстрая оплата на месте |

---

## 🧪 Тестирование

### Test Cards (Stripe Test Mode):

| Карта | Результат |
|-------|-----------|
| `4242 4242 4242 4242` | ✅ Успешная оплата |
| `4000 0000 0000 0002` | ❌ Отклонена |
| `4000 0000 0000 9995` | ⏳ Требует SCA |

**Любая дата в будущем + любой CVC = OK**

### Проверка webhook:

1. Откройте Stripe Dashboard → Webhooks
2. Нажмите **Send test webhook**
3. Выберите `checkout.session.completed`
4. Проверьте логи в консоли:
   ```
   [Stripe Webhook] Event received: checkout.session.completed
   [Stripe Webhook] Payment saved: { id: '...', amount: 150 }
   ```

---

## 🐛 Troubleshooting

### "Missing STRIPE_SECRET_KEY"
→ Проверьте `.env.local`, перезапустите сервер

### "Invalid signature"
→ Проверьте `STRIPE_WEBHOOK_SECRET`, должен быть от правильного endpoint

### Webhook не приходит
→ В продакшене: проверьте Webhook URL в Stripe Dashboard  
→ В разработке: используйте [Stripe CLI](https://stripe.com/docs/stripe-cli) для форвардинга

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe-webhook
```

### Payment не записывается
→ Проверьте:
- `SUPABASE_SERVICE_ROLE_KEY` в `.env.local`
- Таблица `payments` существует
- Логи в консоли (`[Stripe Webhook] ...`)

---

## 📚 Документация

- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Trinity CRM - CLAUDE.md](./CLAUDE.md)

---

**Made with ❤️ by Amber Solutions Systems**
