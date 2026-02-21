import crypto from 'crypto'

const BILLING_BASE = 'https://billing5.tranzila.com'
const DISPLAY_BASE = 'https://my.tranzila.com'

function getTranzilaInvoiceHeaders() {
  const nonce = crypto.randomUUID()
  const timestamp = Math.floor(Date.now() / 1000).toString()

  return {
    'Content-Type': 'application/json',
    'X-tranzila-api-access-token': process.env.TRANZILLA_BILLING_ACCESS_TOKEN!,
    'X-tranzila-api-app-key': process.env.TRANZILLA_BILLING_APP_KEY!,
    'X-tranzila-api-nonce': nonce,
    'X-tranzila-api-request-time': timestamp,
  }
}

export const TRANZILA_INVOICE_ERRORS: Record<number, string> = {
  10000: 'Неверное имя терминала',
  10003: 'Неверный формат даты',
  10008: 'Сумма товаров и платежей не совпадает',
  10300: 'Ошибка создания документа',
  10301: 'Настройки терминала не найдены',
  10302: 'Ошибка создания PDF',
  10400: 'Неизвестный метод оплаты',
  10405: 'Сумма платежа не указана',
  10600: 'Документ не найден',
}

export function mapPaymentMethodToTranzila(method: string): number {
  const map: Record<string, number> = {
    credit_card: 1,
    cash: 5,
    bank_transfer: 4,
    bit: 10,
    check: 3,
  }
  return map[method] ?? 1
}

export interface CreateInvoiceParams {
  terminalName: string
  clientName: string
  clientEmail: string
  amount: number
  items: Array<{
    name: string
    unitPrice: number
    quantity?: number
    code?: string
  }>
  paymentMethod: string
  ccLast4?: string
  ccBrand?: number
  txnIndex?: number
}

export interface TranzilaInvoiceResponse {
  status_code: number
  status_msg: string
  document?: {
    id: string
    number: string
    total_charge_amount: number
    currency: string
    created_at: string
    retrieval_key: string
  }
}

export async function createTranzilaInvoice(
  params: CreateInvoiceParams
): Promise<TranzilaInvoiceResponse> {
  const today = new Date().toISOString().split('T')[0]

  const body = {
    terminal_name: params.terminalName,
    document_date: today,
    document_type: 'IR',
    document_language: 'heb',
    document_currency_code: 'ILS',
    action: 1,
    response_language: 'eng',
    vat_percent: 18,
    client_name: params.clientName,
    client_email: params.clientEmail,
    client_country_code: 'IL',
    created_by_system: 'TrinityCRM',
    items: params.items.map((item, idx) => ({
      type: 'I',
      code: item.code ?? `ITEM-${idx + 1}`,
      name: item.name,
      price_type: 'G',
      unit_price: item.unitPrice,
      units_number: item.quantity ?? 1,
      unit_type: 1,
      currency_code: 'ILS',
      to_doc_currency_exchange_rate: 1,
    })),
    payments: [{
      payment_method: mapPaymentMethodToTranzila(params.paymentMethod),
      payment_date: today,
      amount: params.amount,
      currency_code: 'ILS',
      ...(params.paymentMethod === 'credit_card' && {
        cc_last_4_digits: params.ccLast4 ?? '0000',
        cc_credit_term: 1,
        cc_brand: params.ccBrand ?? 2,
      }),
      ...(params.txnIndex && { txnindex: params.txnIndex }),
    }],
  }

  const response = await fetch(`${BILLING_BASE}/api/documents_db/create_document`, {
    method: 'POST',
    headers: getTranzilaInvoiceHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Tranzila Billing API HTTP error: ${response.status}`)
  }

  return response.json()
}

export function getInvoiceDisplayUrl(retrievalKey: string): string {
  return `${DISPLAY_BASE}/api/get_financial_document/${retrievalKey}`
}
