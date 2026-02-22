import { z } from "zod"

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

// Визиты
export const createVisitSchema = z.object({
  clientId: z.string().uuid(),
  service: z.string().max(500).optional(),
  serviceId: z.string().optional(), // UUID или текст
  date: z.string().min(1),
  time: z.string().min(1),
  duration: z.coerce.number().int().min(1).max(480).optional(),
  price: z.string().min(1), // Приходит как строка
  notes: z.string().max(2000).optional().or(z.literal("")),
})

// Платежи
export const createPaymentSchema = z.object({
  client_id: z.string().uuid(),
  amount: z.number().min(0.01).max(100000),
  description: z.string().max(500).optional().or(z.literal("")),
  visit_id: z.string().uuid().optional(),
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
    const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ")
    return { data: null, error: errors }
  }
  return { data: result.data, error: null }
}
