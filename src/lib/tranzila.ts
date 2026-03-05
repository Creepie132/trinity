export async function createTranzilaPaymentLink({
  amount,
  description,
  paymentId,
  successUrl,
  failUrl,
}: {
  amount: number
  description: string
  paymentId: string
  successUrl: string
  failUrl: string
}) {
  const terminal = process.env.TRANZILLA_TERMINAL_ID
  const password = process.env.TRANZILLA_TERMINAL_PASSWORD

  const params = new URLSearchParams({
    supplier: terminal!,
    TranzilaPW: password!,
    sum: amount.toString(),
    currency: '1', // ILS
    description: description,
    tranmode: 'A',
    success_url: successUrl,
    fail_url: failUrl,
    notify_url: failUrl,
    cField1: paymentId,
    lang: 'il',
  })

  const paymentLink = `https://direct.tranzila.com/${terminal}/iframenew.php?${params.toString()}`

  return {
    url: paymentLink,
    transactionId: null,
  }
}
