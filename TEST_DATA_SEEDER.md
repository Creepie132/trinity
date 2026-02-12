# 🌱 Test Data Seeder

**Version:** 2.19.0  
**Date:** 2026-02-12

---

## 📋 Overview

Система для автоматического заполнения организации "Test" реалистичными тестовыми данными для создания скриншотов и демонстрации функционала.

---

## 🎯 What It Does

Создаёт в организации "Test":
- **25 клиентов** с израильскими именами на иврите
- **80 визитов** с различными услугами
- **40 платежей** с разными статусами и методами оплаты

---

## 🚀 Usage

### Method 1: Admin UI (Recommended)

1. Войди в админку: `/admin`
2. Перейди в Organizations
3. Найди организацию **"Test"**
4. Нажми на неё (Eye icon)
5. В открывшемся Sheet найди жёлтую карточку **"נתוני בדיקה"**
6. Нажми кнопку **"מלא נתוני בדיקה"**
7. Подтверди в диалоге
8. Дождись toast уведомления с результатами

**Визуальные индикаторы:**
- 🎁 Жёлтая карточка (только для организации Test)
- 🔄 Spinner во время создания данных
- ✅ Toast с количеством созданных записей

---

### Method 2: API Endpoint

```bash
# Direct API call
curl -X POST https://trinity-sage.vercel.app/api/admin/seed-test-data \
  -H "Cookie: sb-xxx-auth-token=..." \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "נתוני בדיקה נוצרו בהצלחה",
  "data": {
    "organization": "Test",
    "org_id": "uuid",
    "clients": 25,
    "visits": 80,
    "payments": 40
  }
}
```

---

### Method 3: Local Script

```bash
# Run standalone script
npx tsx scripts/seed-test-data.ts
```

**Requirements:**
- Environment variables set (`.env.local`)
- Service role key access

**Output:**
```
🌱 Starting seed for Test organization...

✅ Found Test organization: uuid

📝 Creating 25 clients...
✅ Created 25 clients

📝 Creating 80 visits...
✅ Created 80 visits

📝 Creating 40 payments...
✅ Created 40 payments

🎉 Seed completed successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Organization: Test
Clients: 25
Visits: 80
Payments: 40
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Done!
```

---

## 📊 Data Specification

### 1. Clients (25 total)

**Israeli Names (Hebrew):**
- דנה כהן, יוסי לוי, מירב אברהם
- אלון דוד, נועה פרץ, רוני שמעון
- תמר יעקב, אורי מזרחי, שירה גולדברג
- עומר חיים, ליאת ברק, אייל רוזן
- מאיה שלום, נדב כץ, רותם פלד
- גל אריאלי, הילה וולף, עידו נחמיאס
- ענבר סולומון, דור מלכה, שני ביטון
- ניר אוחיון, אפרת טל, יונתן הרוש
- קרן זיו

**Phone Numbers:**
- Prefixes: `050`, `052`, `054`
- Format: `050-123-4567`
- All randomized

**Emails:**
- Pattern: `{firstName}@gmail.com`
- Example: `דנה@gmail.com`

**Notes (Hebrew):**
- `"לקוחה קבועה"` (Regular client)
- `"מעדיף תורים בבוקר"` (Prefers morning appointments)
- `"אלרגיה לחומרי צבע"` (Allergy to dyes)
- `"VIP"` (VIP client)
- `""` (Empty)
- `"מעדיפה סטייליסטית מסוימת"` (Prefers specific stylist)
- `"מעדיף תורים אחר הצהריים"` (Prefers afternoon)
- `"מעדיפה תורים בסופי שבוع"` (Prefers weekends)

**Created Dates:**
- Range: Last 6 months
- Randomized distribution

---

### 2. Visits (80 total)

**Service Types:**
- `תספורת` (Haircut)
- `צבע` (Color)
- `החלקה` (Straightening)
- `טיפול פנים` (Facial)
- `מניקור` (Manicure)
- `פדיקור` (Pedicure)
- `תספורת + צבע` (Haircut + Color)
- `טיפול שיער` (Hair treatment)

**Prices:**
- Range: 80-500 ILS
- Random distribution

**Notes:**
- `""` (Empty)
- `"שילמה במזומן"` (Paid cash)
- `"ביקשה תור חוזר"` (Requested return appointment)
- `"מרוצה מאוד"` (Very satisfied)
- `"צריך מעקב"` (Needs follow-up)

**Created Dates:**
- Range: Last 3 months
- Randomized distribution

**Client Assignment:**
- Randomly assigned to created clients
- Ensures realistic distribution

---

### 3. Payments (40 total)

**Amounts:**
- Match visit prices
- Range: 80-500 ILS

**Status Distribution:**
- **70%** `completed` (28 payments)
- **20%** `pending` (8 payments)
- **10%** `failed` (4 payments)

**Payment Methods:**
- `credit_card` (Credit card)
- `cash` (Cash)
- `bit` (Bit transfer)
- `stripe` (Stripe)
- Random distribution

**Provider:**
- All set to `manual`

**Created Dates:**
- Range: Last 3 months
- Matches visit dates

**Paid At:**
- Only for `completed` payments
- Random date within last 3 months

**Linked Data:**
- 40 out of 80 visits have payments
- Each payment linked to:
  - Client (via `client_id`)
  - Visit (via `visit_id`)

---

## 🔒 Security

### Permission Checks

**Admin Only:**
```typescript
// Check if user is admin
const { data: admin } = await supabase
  .from('admin_users')
  .select('user_id')
  .eq('user_id', user.id)

if (!admin) {
  return 403 // Forbidden
}
```

### Organization Check

**Only "Test" Organization:**
```typescript
const { data: testOrg } = await supabase
  .from('organizations')
  .select('id, name')
  .eq('name', 'Test')

if (!testOrg) {
  return 404 // Not Found
}
```

### UI Visibility

**Button Only Visible for Test:**
```typescript
{selectedOrg.name === 'Test' && (
  <Card>
    <Button onClick={handleSeedTestData}>
      מלא נתוני בדיקה
    </Button>
  </Card>
)}
```

---

## 🎨 UI Components

### Admin Panel - Test Organization Sheet

**Location:** `/admin/organizations` → Test org Sheet

**New Card:**
```
┌─ נתוני בדיקה ────────────────┐
│ 🎁 Yellow background          │
│                                │
│ מלא את הארגון ב-25 לקוחות,    │
│ 80 ביקורים ו-40 תשלומים       │
│ לצורך צילומי מסך              │
│                                │
│ [מלא נתוני בדיקה] (Yellow)   │
└────────────────────────────────┘
```

**Features:**
- Yellow background (`bg-yellow-50`)
- Yellow border (`border-yellow-200`)
- Gift icon (🎁)
- Loading state with spinner
- Disabled during seeding
- Confirmation dialog

---

## 🧪 Testing

### Test Flow

1. **Create Test Organization:**
```sql
-- In Supabase SQL Editor
INSERT INTO organizations (name, email, category, plan)
VALUES ('Test', 'test@example.com', 'salon', 'pro');
```

2. **Run Seeder:**
- Via Admin UI (recommended)
- Or via API
- Or via script

3. **Verify Data:**
```sql
-- Check clients
SELECT COUNT(*) FROM clients WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);
-- Expected: 25

-- Check visits
SELECT COUNT(*) FROM visits WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);
-- Expected: 80

-- Check payments
SELECT COUNT(*) FROM payments WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);
-- Expected: 40
```

4. **Check Screenshots:**
- Dashboard stats should show data
- Clients page should list 25 clients
- Charts should have realistic data

---

## 📸 Use Cases

### Screenshot Preparation

**Dashboard:**
- Total clients: 25
- Visits this month: ~25-30 (random)
- Revenue chart with data
- Active clients graph

**Clients Page:**
- Full list of 25 Hebrew names
- Phone numbers displayed
- Visit history per client
- Realistic notes

**Payments Page:**
- Mix of completed/pending/failed
- Different payment methods
- Various amounts
- Date range coverage

**Stats Page:**
- Revenue charts with data
- Top clients ranking
- Monthly trends

---

## 🐛 Troubleshooting

### Organization Not Found

**Error:** `Organization "Test" not found`

**Solution:**
```sql
-- Create Test organization
INSERT INTO organizations (name, email, category, plan)
VALUES ('Test', 'test@example.com', 'salon', 'pro');
```

---

### Button Not Visible

**Issue:** Yellow card not showing in admin panel

**Checklist:**
- [ ] Organization name is exactly "Test" (case-sensitive)
- [ ] Viewing organization sheet (not main table)
- [ ] Logged in as admin
- [ ] Page refreshed after org creation

---

### Duplicate Data

**Issue:** Multiple runs create duplicate clients

**Solution:**
```sql
-- Clear test data before re-running
DELETE FROM payments WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);

DELETE FROM visits WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);

DELETE FROM clients WHERE org_id = (
  SELECT id FROM organizations WHERE name = 'Test'
);
```

**Or:**
Delete and recreate Test organization

---

### Permission Denied

**Error:** `Admin access required`

**Solution:**
```sql
-- Check if user is admin
SELECT * FROM admin_users WHERE user_id = auth.uid();

-- Add user as admin if needed
INSERT INTO admin_users (user_id, email, role)
VALUES (auth.uid(), 'your@email.com', 'admin');
```

---

## 📚 Files

**API Route:**
- `src/app/api/admin/seed-test-data/route.ts`

**Script:**
- `scripts/seed-test-data.ts`

**Admin UI:**
- `src/app/admin/organizations/page.tsx`

---

## 🔍 Example Data Preview

### Client Example
```json
{
  "first_name": "דנה",
  "last_name": "כהן",
  "email": "דנה@gmail.com",
  "phone": "050-123-4567",
  "notes": "לקוחה קבועה",
  "org_id": "uuid"
}
```

### Visit Example
```json
{
  "client_id": "client-uuid",
  "service_type": "תספורת + צבע",
  "price": 350,
  "notes": "מרוצה מאוד",
  "org_id": "uuid"
}
```

### Payment Example
```json
{
  "client_id": "client-uuid",
  "visit_id": "visit-uuid",
  "amount": 350,
  "status": "completed",
  "payment_method": "credit_card",
  "paid_at": "2026-01-15T10:30:00Z",
  "org_id": "uuid"
}
```

---

## ✅ Success Metrics

After seeding, you should have:
- ✅ 25 clients with Hebrew names
- ✅ 80 visits with variety of services
- ✅ 40 payments (28 completed, 8 pending, 4 failed)
- ✅ Realistic data distribution
- ✅ Screenshots ready for marketing
- ✅ Demo environment populated

---

**Version History:**
- v2.19.0 (2026-02-12) - Initial test data seeder
- Realistic Israeli data
- Admin UI integration
- Standalone script option
