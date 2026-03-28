import { z } from "zod"

// ── UUID helper ──────────────────────────────────────────────────────────────────────────────
// Имя нарочно, чтобы ошибка 'инвалидный UUID' перехватывалась на сервере
// до обращения к БД, а не приходила из Supabase.
const strictUuid = z.string().uuid('Invalid UUID — optimistic IDs are not accepted')

// Клиенты
export const createClientSchema = z.object({
  first_name: z.string().min(1, "Имя обязательно").max(100),
  last_name: z.string().min(1, "Фамилия обязательна").max(100),
  phone: z.string().min(7).max(20).regex(/^[0-9+\-() ]+$/, "Некорректный телефон"),
  email: z.string().email("Некорректный email").optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
})

// Обновление клиента (PUT /api/clients/[id])
// id валидируется отдельно в route params, здесь опциональные поля body
export const updateClientSchema = z.object({
  first_name:    z.string().min(1).max(100).optional(),
  last_name:     z.string().max(100).optional().or(z.literal('')),
  phone:         z.string().min(7).max(20).regex(/^[0-9+\-() ]+$/).optional().or(z.literal('')),
  email:         z.string().email().optional().or(z.literal('')),
  address:       z.string().max(300).optional().or(z.literal('')),
  city:          z.string().max(100).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  notes:         z.string().max(2000).optional().or(z.literal('')),
  description:   z.string().max(2000).optional().or(z.literal('')).nullable(),
  paint_code:    z.string().max(200).optional().or(z.literal('')).nullable(),
})

// Визиты
export const createVisitSchema = z.object({
  // strictUuid — отклонит 'optimistic-...' задолго до Supabase
  clientId: strictUuid,
  service: z.string().max(500).optional().nullable(),
  serviceId: z.string().optional().nullable(), // UUID или текст, может быть null для встречи
  date: z.string().min(1),
  time: z.string().min(1),
  duration: z.coerce.number().int().max(480).optional().nullable(),
  price: z.string().optional().nullable(), // Может быть null/пустой строкой для встречи
  quantity: z.coerce.number().int().min(1, 'Количество не может быть меньше 1').max(999).default(1),
  notes: z.string().max(2000).optional().or(z.literal("")).nullable(),
  event_type: z.enum(['visit', 'meeting']).default('visit'),
  meeting_link: z.string().url().optional().or(z.literal("")).nullable(),
})

// Создание продажи (POST /api/sales)
export const createSaleSchema = z.object({
  client_id: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    product_id:   z.string().uuid().optional().nullable(),
    product_name: z.string().min(1).max(500),
    quantity:     z.coerce.number().int().min(1).max(9999),
    unit_price:   z.coerce.number().min(0).max(1_000_000),
  })).min(1, 'At least one item required'),
  paid_amount:    z.coerce.number().min(0).max(10_000_000).optional(),
  payment_method: z.enum(['cash', 'bit', 'credit', 'credit_card', 'bank', 'bank_transfer', 'check']).optional(),
  sale_date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:          z.string().max(2000).optional().nullable(),
  discount_type:  z.enum(['percent', 'amount']).optional(),
  discount_value: z.coerce.number().min(0).max(100_000).optional(),
}).superRefine((data, ctx) => {
  // Проверяем что скидка в процентах не превышает 100%
  if (data.discount_type === 'percent' && (data.discount_value ?? 0) > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Discount percent cannot exceed 100', path: ['discount_value'] })
  }
  // Проверяем что paid_amount не превышает сумму товаров с учётом скидки
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const discountAmt = data.discount_type === 'percent'
    ? subtotal * ((data.discount_value ?? 0) / 100)
    : (data.discount_value ?? 0)
  const total = Math.max(0, subtotal - discountAmt)
  if ((data.paid_amount ?? 0) > total + 0.01) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `paid_amount (${data.paid_amount}) exceeds total (${total.toFixed(2)})`, path: ['paid_amount'] })
  }
})

// Обновление визита (PUT)
export const updateVisitSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  service_id:   z.string().uuid().optional().nullable(),
  duration_minutes: z.coerce.number().int().min(5).max(480).optional().nullable(),
  notes:  z.string().max(2000).optional().nullable(),
  price:  z.coerce.number().min(0).max(100000).optional().nullable(),
})

// ── Допустимые методы оплаты (единый источник истины) ──────────────────────────
export const PAYMENT_METHOD_VALUES = ['cash', 'bit', 'credit', 'credit_card', 'bank', 'bank_transfer', 'check'] as const
export type PaymentMethodValue = typeof PAYMENT_METHOD_VALUES[number]

// ── Допустимые категории расходов (единый источник истины) ─────────────────────
export const EXPENSE_CATEGORY_VALUES = [
  'supplies', 'food', 'transport', 'utilities',
  'equipment', 'marketing', 'rent', 'salary', 'other',
] as const
export type ExpenseCategoryValue = typeof EXPENSE_CATEGORY_VALUES[number]

// ── Phone utilities ──────────────────────────────────────────────────────────
/**
 * Нормализует телефон к E.164 для единого хранения в БД.
 * Используется в API-обработчиках перед вставкой в Supabase.
 * Это обеспечивает совместимость с SMS-модулем и WhatsApp.
 */
export function normalizePhoneE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (/^05\d{8}$/.test(digits))     return '+972' + digits.slice(1) // Israeli local
  if (/^\+\d{10,15}$/.test(digits)) return digits                   // уже E.164
  if (/^972\d{9}$/.test(digits))    return '+' + digits             // без +
  return raw.trim()                                                  // fallback
}

/**
 * Фронтенд-совместимая валидация: Israeli 05X + международный формат.
 * Экспортируется для переиспользования в DemoOrderModal и API.
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(\+972|0)(5[0-9])\d{7}$|^\+?\d{10,15}$/.test(cleaned)
}

// ── ISO date helper ────────────────────────────────────────────────────────────
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

// Платежи — создание (POST /api/payments)
export const createPaymentSchema = z.object({
  client_id:      z.string().uuid('Invalid client_id'),
  amount:         z.coerce.number()
                    .min(0.01, 'Amount must be > 0')
                    .max(1_000_000, 'Amount too large'),
  payment_method: z.enum(PAYMENT_METHOD_VALUES).optional().default('credit_card'),
  visit_id:       z.string().uuid('Invalid visit_id').optional().nullable(),
  description:    z.string().max(500).optional().or(z.literal('')),
  status:         z.enum(['pending', 'completed', 'failed'])
                    .optional()
                    .default('completed'),
})

// Расходы — создание (POST /api/expenses)
export const createExpenseSchema = z.object({
  vendor:       z.string().min(1, 'Vendor required').max(200),
  amount:       z.coerce.number()
                  .min(0.01, 'Amount must be > 0')
                  .max(10_000_000, 'Amount too large'),
  expense_date: isoDate,
  category:     z.enum(EXPENSE_CATEGORY_VALUES).refine(
                  (v) => EXPENSE_CATEGORY_VALUES.includes(v as any),
                  { message: 'Invalid category' }
                ),
  description:  z.string().max(1000).optional().or(z.literal('')),
  notes:        z.string().max(2000).optional().or(z.literal('')),
})

// Расходы — обновление (PATCH /api/expenses)
export const updateExpenseSchema = z.object({
  id:           z.string().uuid('Invalid expense id'),
  vendor:       z.string().min(1).max(200).optional(),
  amount:       z.coerce.number()
                  .min(0.01, 'Amount must be > 0')
                  .max(10_000_000)
                  .optional(),
  expense_date: isoDate.optional(),
  category:     z.enum(EXPENSE_CATEGORY_VALUES).optional(),
  description:  z.string().max(1000).optional().or(z.literal('')),
  verified:     z.boolean().optional(),
  notes:        z.string().max(2000).optional().or(z.literal('')),
  order_number: z.string().max(100).optional().or(z.literal('')),
})

// SMS
export const createSmsSchema = z.object({
  name: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  filter_type: z.enum(["all", "single", "inactive_days"]),
  filter_value: z.string().optional(),
})

// Бронирование (публичное)
export const createBookingSchema = z.object({
  service_id: z.string().uuid().optional(),
  service_name: z.string().min(1).max(200),
  client_name: z.string().min(1).max(200),
  client_phone: z.string().min(7).max(20),
  client_email: z.string().email().optional().or(z.literal("")),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).max(100000).optional(),
  notes: z.string().max(2000).nullish().default(''),
})

// Услуги
export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  name_ru: z.string().max(200).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  price: z.number().min(0).max(100000).optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  color: z.string().max(20).optional().or(z.literal("")),
  is_active: z.boolean().optional(),
})

// Товары
export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  sku: z.string().max(100).optional().or(z.literal("")),
  category: z.string().max(100).optional().or(z.literal("")),
  purchase_price: z.number().min(0).optional(),
  sell_price: z.number().min(0.01), // Required
  quantity: z.number().int().min(0).optional(),
  min_quantity: z.number().int().min(0).optional(),
  unit: z.string().max(50).optional().or(z.literal("")),
  image_url: z.string().max(500).optional().or(z.literal("")),
})

// Листинг визитов (GET /api/visits/list)
export const listVisitsSchema = z.object({
  dateFilter:      z.enum(['today', 'week', 'month', 'all']).default('week'),
  statusFilter:    z.enum(['all', 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).default('all'),
  eventTypeFilter: z.enum(['all', 'visit', 'meeting']).default('all'),
  search:          z.string().max(200).optional(),
  page:            z.coerce.number().int().min(1).max(1000).default(1),
  pageSize:        z.coerce.number().int().min(1).max(100).default(30),
})
export type ListVisitsInput = z.infer<typeof listVisitsSchema>

// Продажа товара со склада (POST /api/inventory/sell)
export const sellProductSchema = z.object({
  product_id:     z.string().uuid('Invalid product_id'),
  quantity:       z.coerce.number().int().min(1, 'Quantity must be >= 1').max(9999),
  price_per_unit: z.coerce.number().min(0.01, 'Price must be > 0').max(1_000_000),
  payment_method: z.enum(['cash', 'bit', 'credit', 'bank_transfer']),
  client_id:      z.string().uuid('Invalid client_id').optional().nullable(),
})

// Контактная форма
export const contactFormSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  message: z.string().min(1).max(5000),
})

// Хелпер для валидации в API
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): {
  data: T | null;
  error: string | null;
} {
  const result = schema.safeParse(body)
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")
    return { data: null, error: errors }
  }
  return { data: result.data, error: null }
}
