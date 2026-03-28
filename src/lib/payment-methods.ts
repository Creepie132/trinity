/**
 * payment-methods.ts — единый справочник методов оплаты Trinity.
 *
 * Единственный источник истины для:
 *   - PaymentMethodModal
 *   - UnifiedPaymentDialog
 *   - UnifiedSalesDialog
 *   - Карточки клиента
 *
 * Добавить новый метод — только здесь.
 */

import React from 'react'
import { CreditCard, Banknote, Building2, FileCheck, Link } from 'lucide-react'

// ─── Типы ──────────────────────────────────────────────────────────────────────

export type TrinityPaymentMethodId =
  | 'card'          // Кредитная карта → Tranzila ссылка
  | 'cash'          // Наличные → прямая запись
  | 'check'         // Чек → прямая запись
  | 'bank_transfer' // Банковский перевод → прямая запись
  | 'link'          // Ссылка на оплату (только для UnifiedPaymentDialog)

/** Соответствие frontend id → api value (для POST /api/sales и /api/payments) */
export const PAYMENT_METHOD_API_MAP: Record<TrinityPaymentMethodId, string> = {
  card:          'credit',
  cash:          'cash',
  check:         'check',
  bank_transfer: 'bank_transfer',
  link:          'link',
}

// ─── Визуальный конфиг метода ──────────────────────────────────────────────────

export interface PaymentMethodConfig {
  id: TrinityPaymentMethodId
  labelHe: string
  labelRu: string
  descHe: string
  descRu: string
  icon: React.ReactNode
  gradient: string
  glow: string
  bg: string
  border: string
  color: string
}

// ─── Справочник ────────────────────────────────────────────────────────────────

export const TRINITY_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'card',
    labelHe: 'כרטיס אשראי', labelRu: 'Кредитная карта',
    descHe: 'תשלום מאובטח עם Tranzila', descRu: 'Безопасная оплата через Tranzila',
    icon: React.createElement(CreditCard, { size: 22 }),
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    glow: 'rgba(99,102,241,0.35)',
    bg: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
    border: '#c7d2fe', color: '#4338ca',
  },
  {
    id: 'cash',
    labelHe: 'מזומן', labelRu: 'Наличные',
    descHe: 'תשלום במזומן ישירות', descRu: 'Оплата наличными напрямую',
    icon: React.createElement(Banknote, { size: 22 }),
    gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    glow: 'rgba(34,197,94,0.3)',
    bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
    border: '#bbf7d0', color: '#15803d',
  },
  {
    id: 'check',
    labelHe: "צ'ק", labelRu: 'Чек',
    descHe: "תשלום בצ'ק", descRu: 'Оплата чеком',
    icon: React.createElement(FileCheck, { size: 22 }),
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glow: 'rgba(245,158,11,0.3)',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
    border: '#fde68a', color: '#b45309',
  },
  {
    id: 'bank_transfer',
    labelHe: 'העברה בנקאית', labelRu: 'Банковский перевод',
    descHe: 'העברה ישירה לחשבון', descRu: 'Прямой перевод на счёт',
    icon: React.createElement(Building2, { size: 22 }),
    gradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    glow: 'rgba(14,165,233,0.3)',
    bg: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
    border: '#bae6fd', color: '#0369a1',
  },
  {
    id: 'link',
    labelHe: 'קישור תשלום', labelRu: 'Ссылка на оплату',
    descHe: 'קישור מאובטח ללקוח', descRu: 'Безопасная ссылка клиенту',
    icon: React.createElement(Link, { size: 22 }),
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    glow: 'rgba(139,92,246,0.3)',
    bg: 'linear-gradient(135deg, #faf5ff, #ede9fe)',
    border: '#ddd6fe', color: '#6d28d9',
  },
]

/** Методы для модального выбора (без 'link' — он в отдельном флоу) */
export const PAYMENT_METHODS_FOR_MODAL = TRINITY_PAYMENT_METHODS.filter(
  m => m.id !== 'link'
)

/** Хелпер: получить конфиг по id */
export function getPaymentMethodConfig(id: TrinityPaymentMethodId): PaymentMethodConfig | undefined {
  return TRINITY_PAYMENT_METHODS.find(m => m.id === id)
}

/** Определяет требует ли метод Tranzila ссылку (асинхронный флоу) */
export function isCardMethod(id: TrinityPaymentMethodId): boolean {
  return id === 'card'
}
