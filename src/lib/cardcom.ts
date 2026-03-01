/**
 * CardCom Payment Gateway Integration
 * Docs: https://secure.cardcom.solutions/documentation
 */

const CARDCOM_API = 'https://secure.cardcom.solutions/api/v11'
const TERMINAL = process.env.CARDCOM_TERMINAL || '1000'
const API_NAME = process.env.CARDCOM_API_NAME || 'kzFKfohEvL6AOF8aMEJz'
const API_PASSWORD = process.env.CARDCOM_API_PASSWORD || 'FIDHlh4pAadw3Slbdsjg'

export async function createCardComPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
  webhookUrl,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
  webhookUrl: string
}) {
  const response = await fetch(`${CARDCOM_API}/LowProfile/Create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      TerminalNumber: TERMINAL,
      ApiName: API_NAME,
      ApiPassword: API_PASSWORD,
      Amount: amount,
      CoinID: 1, // ILS
      Description: description,
      ReturnValue: paymentId,
      SuccessRedirectUrl: successUrl,
      FailedRedirectUrl: failUrl,
      WebHookUrl: webhookUrl,
      Language: 'he',
      Operation: 1, // charge
    }),
  })

  const data = await response.json()

  if (data.ResponseCode !== 0) {
    throw new Error(`CardCom error: ${data.Description}`)
  }

  return {
    url: data.LowProfileUrl,
    lowProfileId: data.LowProfileId,
  }
}

export interface CardComWebhookData {
  ResponseCode: number
  Description?: string
  ReturnValue?: string
  InternalDealNumber?: string
  Amount?: number
  Currency?: string
  [key: string]: any
}

export function parseCardComWebhook(data: CardComWebhookData) {
  const isSuccess = data.ResponseCode === 0

  return {
    success: isSuccess,
    paymentId: data.ReturnValue || null,
    transactionId: data.InternalDealNumber || null,
    amount: data.Amount || null,
    currency: 'ILS',
    responseCode: data.ResponseCode,
    description: data.Description || null,
    rawData: data,
  }
}
