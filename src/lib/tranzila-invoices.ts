import crypto from 'crypto'

// ─── Auth ────────────────────────────────────────────────────────────────────

function buildHeaders(): Record<string, string> {
  const publicKey  = process.env.TRANZILA_PUBLIC_KEY!
  const privateKey = process.env.TRANZILA_PRIVATE_KEY!

  if (!publicKey || !privateKey) {
    throw new Error('TRANZILA_PUBLIC_KEY / TRANZILA_PRIVATE_KEY not set')
  }

  const time  = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(40).toString('hex') // 80 chars

  // hash_hmac('sha256', message=publicKey, key=privateKey+time+nonce)
  const accessToken = crypto
    .createHmac('sha256', privateKey + time + nonce)
    .update(publicKey)
    .digest('hex')

  return {
    'Content-Type': 'application/json',
    'X-tranzila-api-app-key':      publicKey,
    'X-tranzila-api-request-time': time,
    'X-tranzila-api-nonce':        nonce,
    'X-tranzila-api-access-token': accessToken,
  }
}

const BILLING_BASE = 'https://billing5.tranzila.com/api/documents_db'
// Терминал с активным Invoices API
const INVOICE_TERMINAL = process.env.TRANZILA_TERMINAL_ID ?? 'ambersolt'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string
  quantity: number
  unit_price: number
}

/** payment_method codes per Tranzila Invoices API */
export type TranzilaPaymentMethod = '1' | '2' | '3' | '4' | '5'
// 1=credit card, 2=cash, 3=check, 4=bank transfer, 5=other

export const PAYMENT_METHOD_MAP: Record<string, TranzilaPaymentMethod> = {
  credit_card: '1',
  card:        '1',
  cash:        '2',
  check:       '3',
  bank_transfer: '4',
  transfer:    '4',
  bit:         '1', // Bit работает как карта
  other:       '5',
}

export interface CreateReceiptParams {
  clientName:    string
  clientEmail?:  string   // если есть — Tranzila сама шлёт PDF на email
  items:         ReceiptItem[]
  totalAmount:   number
  paymentMethod: string   // ключ из PAYMENT_METHOD_MAP или уже '1'..'5'
}

export interface TranzilaDocumentResult {
  documentId:   string
  documentNum:  string
  createdAt:    string
  retrievalKey: string
}

// ─── createReceipt ───────────────────────────────────────────────────────────

/**
 * Creates a receipt (קבלה) via Tranzila Invoices API.
 * If clientEmail is provided, Tranzila automatically emails the PDF.
 * Returns document ID to store in DB and later fetch PDF.
 */
export async function createReceipt(
  params: CreateReceiptParams
): Promise<TranzilaDocumentResult> {
  const method: TranzilaPaymentMethod =
    (PAYMENT_METHOD_MAP[params.paymentMethod] ?? params.paymentMethod ?? '5') as TranzilaPaymentMethod

  const body: Record<string, unknown> = {
    terminal_name:     INVOICE_TERMINAL,
    document_language: 'heb',
    response_language: 'eng',
    client: {
      name:  params.clientName,
      ...(params.clientEmail ? { email: params.clientEmail } : {}),
    },
    items: params.items.map(item => ({
      name:          item.name,
      quantity:      item.quantity,
      unit_price:    item.unit_price,
      currency_code: 'ILS',
    })),
    payments: [{
      payment_method: method,
      amount:         params.totalAmount,
      currency_code:  'ILS',
    }],
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

/**
 * Fetches PDF bytes for a previously created Tranzila document.
 * Returns a Buffer ready to stream or attach to WhatsApp/email.
 */
export async function getReceiptPdf(documentId: string): Promise<Buffer> {
  const body = {
    terminal_name:     INVOICE_TERMINAL,
    document_id:       documentId,
    response_language: 'eng',
  }

  const res = await fetch(`${BILLING_BASE}/get_document`, {
    method:  'POST',
    headers: buildHeaders(),
    body:    JSON.stringify(body),
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!contentType.includes('application/pdf')) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(
      `Tranzila get_document error: ${JSON.stringify(errData)}`
    )
  }

  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── Legacy aliases (backward compatibility) ─────────────────────────────────
// tranzila/webhook и tranzila-success используют старые имена

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
    name:       i.name,
    quantity:   1,
    unit_price: i.unitPrice,
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
  })

  // Return shape compatible with old callers
  return {
    status_code: 0,
    status_msg:  'Success',
    document: {
      id:           receipt.documentId,
      number:       receipt.documentNum,
      created_at:   receipt.createdAt,
      retrieval_key: receipt.retrievalKey,
    },
  }
}
