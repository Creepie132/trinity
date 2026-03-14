import crypto from 'crypto'

// ─── Auth ────────────────────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  const publicKey  = process.env.TRANZILA_PUBLIC_KEY!
  const privateKey = process.env.TRANZILA_PRIVATE_KEY!

  if (!publicKey || !privateKey) {
    throw new Error('TRANZILA_PUBLIC_KEY / TRANZILA_PRIVATE_KEY not set')
  }

  const time  = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(40).toString('hex')

  const accessToken = crypto
    .createHmac('sha256', privateKey + time + nonce)
    .update(publicKey)
    .digest('hex')

  return {
    'Content-Type':                'application/json',
    'X-tranzila-api-app-key':      publicKey,
    'X-tranzila-api-request-time': time,
    'X-tranzila-api-nonce':        nonce,
    'X-tranzila-api-access-token': accessToken,
  }
}

const BILLING_BASE    = 'https://billing5.tranzila.com/api/documents_db'
const INVOICE_TERMINAL = process.env.TRANZILA_TERMINAL_ID ?? 'ambersolt'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name:      string
  quantity:  number
  unit_price: number
}

export type TranzilaPaymentMethod = '1' | '2' | '3' | '4' | '5'
// 1=credit card, 2=cash, 3=check, 4=bank transfer, 5=other

export const PAYMENT_METHOD_MAP: Record<string, TranzilaPaymentMethod> = {
  credit_card:   '1',
  card:          '1',
  cash:          '2',
  check:         '3',
  bank_transfer: '4',
  transfer:      '4',
  bit:           '1',
  other:         '5',
}

export interface CardDetails {
  last4?:       string   // 4 последние цифры карты
  brand?:       string   // 'visa' | 'mastercard' | 'amex' | 'diners' | etc.
  expiry?:      string   // 'MM/YY'
  approvalNum?: string   // מספר אישור
  shovar?:      string   // מספר שובר שב"א
  tranIndex?:   string   // Tranzila transaction index
}

export interface CreateReceiptParams {
  clientName:    string
  clientEmail?:  string
  items:         ReceiptItem[]
  totalAmount:   number
  paymentMethod: string
  card?:         CardDetails  // ← данные карточной транзакции
}

export interface TranzilaDocumentResult {
  documentId:   string
  documentNum:  string
  createdAt:    string
  retrievalKey: string
}

// cc_brand codes in Tranzila Invoices API
const BRAND_CODE: Record<string, string> = {
  visa:       '1',
  mastercard: '2',
  master:     '2',
  amex:       '3',
  diners:     '4',
  isracard:   '5',
  discover:   '6',
}

function brandCode(brand?: string): string | undefined {
  if (!brand) return undefined
  return BRAND_CODE[brand.toLowerCase()] ?? '2' // default mastercard
}

// ─── createReceipt ───────────────────────────────────────────────────────────

/**
 * Creates a חשבונית מס קבלה via Tranzila Invoices API.
 * Tranzila auto-emails signed PDF to client if clientEmail provided.
 * Card details (last4, brand, expiry, approval, shovar) appear in the document.
 */
export async function createReceipt(
  params: CreateReceiptParams
): Promise<TranzilaDocumentResult> {
  const method: TranzilaPaymentMethod =
    (PAYMENT_METHOD_MAP[params.paymentMethod] ?? params.paymentMethod ?? '5') as TranzilaPaymentMethod

  // Build payment object — include card details if available
  const payment: Record<string, unknown> = {
    payment_method: method,
    amount:         params.totalAmount,
    currency_code:  'ILS',
  }

  if (params.card && method === '1') {
    const c = params.card
    if (c.last4)       payment['cc_last_4_digits'] = c.last4
    if (c.brand)       payment['cc_brand']         = brandCode(c.brand)
    if (c.expiry)      payment['cc_expiry_date']   = c.expiry
    if (c.approvalNum) payment['cc_approval_number'] = c.approvalNum
    if (c.shovar)      payment['cc_shovar']          = c.shovar
    if (c.tranIndex)   payment['cc_transaction_id']  = c.tranIndex
  }

  const body: Record<string, unknown> = {
    terminal_name:     INVOICE_TERMINAL,
    document_language: 'heb',
    response_language: 'eng',
    client: {
      name: params.clientName,
      ...(params.clientEmail ? { email: params.clientEmail } : {}),
    },
    items: params.items.map(item => ({
      name:          item.name,
      quantity:      item.quantity,
      unit_price:    item.unit_price,
      currency_code: 'ILS',
    })),
    payments: [payment],
  }

  const res = await fetch(`${BILLING_BASE}/create_document`, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(body),
  })

  const data = await res.json()

  if (data.status_code !== 0) {
    throw new Error(
      `Tranzila create_document error ${data.status_code}: ${data.status_msg} [key: ${data.enquiry_key}]`
    )
  }

  return {
    documentId:   data.document.id,
    documentNum:  data.document.number,
    createdAt:    data.document.created_at,
    retrievalKey: data.document.retrieval_key,
  }
}

// ─── getReceiptPdf ───────────────────────────────────────────────────────────

export async function getReceiptPdf(documentId: string): Promise<Buffer> {
  const res = await fetch(`${BILLING_BASE}/get_document`, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify({
      terminal_name:     INVOICE_TERMINAL,
      document_id:       documentId,
      response_language: 'eng',
    }),
  })

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/pdf')) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(`Tranzila get_document error: ${JSON.stringify(errData)}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

// ─── Legacy aliases ───────────────────────────────────────────────────────────

export const TRANZILA_INVOICE_ERRORS: Record<number, string> = {
  10000: 'Invalid terminal name',
  10001: 'Unknown document action',
  10002: 'Invalid document type',
  10300: 'Failed to create document',
  10301: 'Terminal settings not found',
  10302: 'Failed to create PDF file',
  10400: 'Invalid payment method',
  10600: 'Unknown document id',
  10601: 'Document ID not found',
  10602: 'No PDF file found',
}

export function mapPaymentMethodToTranzila(method: string): TranzilaPaymentMethod {
  return PAYMENT_METHOD_MAP[method] ?? '5'
}

export function getInvoiceDisplayUrl(retrievalKey: string): string {
  return `https://billing5.tranzila.com/api/documents_db/display_document?key=${retrievalKey}`
}

interface LegacyCreateParams {
  terminalName?:  string
  clientName:     string
  clientEmail?:   string
  amount:         number
  items?:         Array<{ name: string; unitPrice: number; code?: string }>
  paymentMethod?: string
  ccLast4?:       string
  ccBrand?:       number
  txnIndex?:      number
}

/** @deprecated Use createReceipt() instead */
export async function createTranzilaInvoice(params: LegacyCreateParams) {
  const items: ReceiptItem[] = (params.items ?? []).map(i => ({
    name: i.name, quantity: 1, unit_price: i.unitPrice,
  }))
  if (items.length === 0) {
    items.push({ name: 'תשלום', quantity: 1, unit_price: params.amount })
  }

  const receipt = await createReceipt({
    clientName:    params.clientName,
    clientEmail:   params.clientEmail,
    items,
    totalAmount:   params.amount,
    paymentMethod: params.paymentMethod ?? 'credit_card',
    card: params.ccLast4 ? { last4: params.ccLast4 } : undefined,
  })

  return {
    status_code: 0,
    status_msg:  'Success',
    document: {
      id:            receipt.documentId,
      number:        receipt.documentNum,
      created_at:    receipt.createdAt,
      retrieval_key: receipt.retrievalKey,
    },
  }
}
