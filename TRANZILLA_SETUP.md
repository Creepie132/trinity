# 💳 Tranzilla Payment Integration - Production Setup

**Version:** 2.17.2  
**Terminal:** ambersol (one-time) + ambersoltok (recurring)  
**Updated:** 2026-02-12

---

## 🔑 Credentials

### Regular Payments Terminal
- **Terminal Name:** `ambersol`
- **iframe URL:** `https://direct.tranzila.com/ambersol/iframenew.php`
- **Password:** `70XsZWnP`

### Token Terminal (Recurring Payments)
- **Terminal Name:** `ambersoltok`
- **iframe URL:** `https://direct.tranzila.com/ambersoltok/iframenew.php`
- **Password:** `jW1ncQYP`

---

## ⚙️ Environment Variables

Add to `.env.local`:

```bash
# Tranzilla - Regular Terminal (one-time payments)
TRANZILLA_TERMINAL_ID=ambersol
TRANZILLA_TERMINAL_PASSWORD=70XsZWnP

# Tranzilla - Token Terminal (recurring payments)
TRANZILLA_TOKEN_TERMINAL=ambersoltok
TRANZILLA_TOKEN_PASSWORD=jW1ncQYP

# Public (for frontend)
NEXT_PUBLIC_TRANZILLA_TERMINAL=ambersol
```

---

## 🚀 API Endpoints

### 1. Create One-Time Payment Link

**Endpoint:** `POST /api/payments/create-link`

**Request:**
```json
{
  "client_id": "uuid",
  "amount": 150.50,
  "description": "תשלום עבור טיפול"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "payment_link": "https://direct.tranzila.com/ambersol/iframenew.php?...",
  "amount": 150.50,
  "currency": "ILS"
}
```

**Payment Link Parameters:**
- `sum` - Amount (e.g., 150.50)
- `currency=1` - ILS
- `cred_type=1` - Credit card
- `lang=he` - Hebrew interface
- `TranzilaPW` - Terminal password
- `contact` - Payment ID (for tracking)
- `success_url_address` - Redirect on success
- `fail_url_address` - Redirect on failure
- `notify_url_address` - Webhook callback

---

### 2. Create Token Link (Recurring Payments)

**Endpoint:** `POST /api/payments/tranzilla-token/route.ts`

**Request:**
```json
{
  "client_id": "uuid",
  "amount": 100.00,
  "description": "רישום כרטיס אשראי"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "token_link": "https://direct.tranzila.com/ambersoltok/iframenew.php?...",
  "amount": 100.00,
  "currency": "ILS",
  "terminal": "ambersoltok",
  "note": "This link creates a token for recurring payments"
}
```

**Token Link Additional Parameters:**
- `create_token=1` - Request token creation
- Terminal: `ambersoltok` (different from regular terminal)

---

### 3. Webhook Handler

**Endpoint:** `POST /api/payments/webhook` (called by Tranzilla)

**Tranzilla POST Data:**
```
Response=000          // '000' = success, other = failed
index=123456          // Transaction ID
sum=150.50           // Amount
ccno=****1234        // Last 4 digits of card
contact=payment_id   // Our payment ID
currency=1           // ILS
```

**Processing Logic:**
1. Parse webhook data
2. Find payment by `contact` field
3. Check `Response`:
   - `'000'` → `status='completed'`, set `paid_at`
   - Other → `status='failed'`
4. Save `transaction_id` from `index`
5. Update payment in database

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "status": "completed",
  "transaction_id": "123456",
  "response_code": "000"
}
```

---

## 🔄 Payment Flow

### One-Time Payment Flow

```
1. User creates payment link via POST /api/payments/create-link
   ├─ Payment record created (status: 'pending')
   ├─ Link generated: https://direct.tranzila.com/ambersol/...
   └─ Link saved to payment.payment_link

2. Customer clicks link
   ├─ Opens Tranzilla iframe
   ├─ Enters card details
   └─ Confirms payment

3. Tranzilla processes payment
   ├─ Success → redirects to /payments?success=true
   ├─ Fail → redirects to /payments?failed=true
   └─ Sends webhook to /api/payments/webhook

4. Webhook updates payment
   ├─ Parse Response code ('000' = success)
   ├─ Update status: 'completed' or 'failed'
   ├─ Save transaction_id from index
   └─ Set paid_at timestamp
```

### Token (Recurring) Payment Flow

```
1. User creates token link via POST /api/payments/tranzilla-token
   ├─ Payment record created with metadata.token_requested=true
   ├─ Link generated: https://direct.tranzila.com/ambersoltok/...
   └─ Link saved to payment.payment_link

2. Customer clicks link
   ├─ Opens Tranzilla iframe (ambersoltok terminal)
   ├─ Enters card details
   └─ Confirms (token creation)

3. Tranzilla creates token
   ├─ Success → token stored in Tranzilla system
   ├─ Redirects to /payments?success=true&token=true
   └─ Sends webhook to /api/payments/webhook

4. Token can be used for future charges
   ├─ Server-to-server charge without user input
   ├─ Terminal: ambersoltok
   └─ Reference token in future API calls
```

---

## 🔧 Code Structure

### Library (`src/lib/tranzilla.ts`)

**Functions:**
- `generateTranzillaPaymentLink(params)` - Create regular payment link
- `generateTranzillaTokenLink(params)` - Create tokenization link
- `parseTranzillaWebhook(data)` - Parse webhook callback
- `verifyTranzillaWebhook(data)` - Verify webhook (placeholder)
- `formatAmount(amount)` - Format amount to 2 decimals
- `getPaymentStatus(responseCode)` - Map code to status

### API Routes
- `/api/payments/create-link/route.ts` - Regular payment creation
- `/api/payments/tranzilla-token/route.ts` - Token payment creation
- `/api/payments/webhook/route.ts` - Webhook handler (both terminals)

---

## 🔒 Security

### Rate Limiting
- **Rate:** 10 requests per minute per user
- **Scope:** `payment:${email}` and `payment-token:${email}`
- **Headers:** `X-RateLimit-*` in response

### Access Control
- ✅ User must be authenticated
- ✅ Organization must have `payments` feature enabled
- ✅ Client must belong to user's organization
- ✅ Amount validation (0 < amount <= 100,000 ILS)

### Webhook Security
- ✅ Service role client (bypasses RLS)
- ✅ Org-scoped updates (can't update other org's payments)
- ✅ Detailed logging for audit trail
- ⚠️ IP whitelist recommended (add Tranzilla IPs to firewall)

**Tranzilla Webhook IPs:**
Add these to your firewall whitelist:
```
# Contact Tranzilla support for official IP list
# Typical: 185.x.x.x range
```

---

## 🧪 Testing

### Test Card Numbers

**Success:**
```
Card: 4580 4580 4580 4580
Expiry: 12/25
CVV: 123
```

**Failure:**
```
Card: 4111 1111 1111 1111
Expiry: 12/25
CVV: 123
```

### Test Flow

1. **Create Payment:**
```bash
curl -X POST https://trinity-sage.vercel.app/api/payments/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid",
    "amount": 10.00,
    "description": "Test payment"
  }'
```

2. **Open Payment Link:**
- Copy `payment_link` from response
- Open in browser
- Enter test card details

3. **Check Webhook:**
- Monitor logs: `vercel logs --follow`
- Check payment status in database

---

## 📊 Response Codes

| Code | Meaning | Status |
|------|---------|--------|
| 000 | Success | completed |
| 001 | Card blocked | failed |
| 002 | Card stolen | failed |
| 003 | Contact credit company | failed |
| 004 | Declined | failed |
| 005 | Forged card | failed |
| 006 | ID/CVV error | failed |
| 033 | Expired card | failed |
| 036 | Card blocked | failed |

**Full list:** https://www.tranzilla.com/docs/response-codes

---

## 🐛 Troubleshooting

### Payment Link Opens But Shows Error

**Problem:** Terminal password incorrect or terminal inactive

**Solution:**
1. Verify `TRANZILLA_TERMINAL_PASSWORD` matches Tranzilla dashboard
2. Check terminal status in Tranzilla admin panel
3. Contact Tranzilla support if terminal is locked

---

### Webhook Not Received

**Problem:** Tranzilla can't reach your webhook URL

**Solution:**
1. Verify `notify_url_address` is publicly accessible
2. Check server logs for incoming webhook requests
3. Test webhook manually:
```bash
curl -X POST https://trinity-sage.vercel.app/api/payments/webhook \
  -d "Response=000&index=123&sum=10.00&contact=payment_id"
```
4. Ensure no firewall blocking Tranzilla IPs

---

### Payment Stays "Pending"

**Problem:** Webhook failed to update payment

**Symptoms:**
- Payment status never changes from 'pending'
- User completed payment but system shows unpaid

**Debug:**
```sql
-- Check payment status
SELECT id, status, transaction_id, paid_at 
FROM payments 
WHERE id = 'payment_id';

-- Check logs
-- Look for: [Tranzilla Webhook] in server logs
```

**Solution:**
1. Check webhook logs for errors
2. Manually update payment:
```sql
UPDATE payments 
SET 
  status = 'completed',
  transaction_id = 'xxx',
  paid_at = NOW()
WHERE id = 'payment_id';
```

---

### Token Creation Fails

**Problem:** Wrong terminal used for tokenization

**Solution:**
- Use `ambersoltok` terminal (not `ambersol`)
- Verify `TRANZILLA_TOKEN_PASSWORD` is set
- Check `create_token=1` parameter in URL

---

## 📚 Additional Resources

**Tranzilla Documentation:**
- Main Docs: https://www.tranzilla.com/docs/
- API Reference: https://www.tranzilla.com/api/
- iframe Integration: https://www.tranzilla.com/iframe/

**Support:**
- Email: support@tranzilla.com
- Phone: 03-6499999

---

## ✅ Production Checklist

Before going live:

- [ ] Environment variables set (`.env.local`)
- [ ] Webhook URL accessible (not localhost)
- [ ] SSL certificate valid (HTTPS required)
- [ ] IP whitelist configured (if available)
- [ ] Test payment flow end-to-end
- [ ] Monitor webhook logs for 24h
- [ ] Set up alerts for failed payments
- [ ] Document terminal credentials securely
- [ ] Configure Tranzilla dashboard settings:
  - [ ] Success/Fail URLs
  - [ ] Webhook URL
  - [ ] Notification emails
  - [ ] Daily report settings

---

**Version History:**
- v2.17.2 (2026-02-12) - Production credentials, real iframe URLs, webhook Response handling
- v2.17.0 (2026-02-11) - Initial Stripe integration
- v2.16.0 (2026-02-11) - Tranzilla sandbox setup
