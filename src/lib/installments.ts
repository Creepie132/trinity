/**
 * lib/installments.ts
 * Shared helpers for installment plan logic (used by API route + cron).
 */

export function computeNextDate(from: Date, frequency: string): string {
  const d = new Date(from)
  if (frequency === 'weekly')        d.setDate(d.getDate() + 7)
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14)
  else                               d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export async function chargeInstallment({
  plan, terminal, password, installmentNumber, supabase, orgId,
}: {
  plan: any
  terminal: string
  password: string
  installmentNumber: number
  supabase: any
  orgId: string
}): Promise<{ success: boolean; tranzila_doc_id?: string; error?: string }> {

  // ── Фаза 1: создаём pending-запись ДО запроса в Tranzila ─────────────────
  // Если процесс упадёт после списания, но до записи в БД —
  // завтра крон увидит pending и НЕ зарядит карту повторно.
  const { data: pendingCharge, error: insertErr } = await supabase
    .from('installment_charges')
    .insert({
      installment_plan_id: plan.id,
      org_id:              orgId,
      client_id:           plan.client_id,
      amount:              plan.installment_amount,
      installment_number:  installmentNumber,
      status:              'pending',
      error_message:       null,
    })
    .select('id')
    .single()

  if (insertErr || !pendingCharge) {
    console.error('[chargeInstallment] Failed to create pending charge:', insertErr)
    return { success: false, error: 'DB error: could not create pending charge' }
  }

  const chargeId = pendingCharge.id

  // ── Фаза 2: запрос в Tranzila CGI ────────────────────────────────────────
  const params = new URLSearchParams({
    supplier:               terminal,
    TranzilaPW:             password,
    TranzilaTK:             plan.tranzila_token,
    expdate:                plan.tranzila_expdate,
    sum:                    plan.installment_amount.toString(),
    currency:               '1',
    tranmode:               'A',
    response_return_format: 'json',
  })

  let result: any = {}
  try {
    const res = await fetch('https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.ambersol.co.il',
        'Origin':  'https://www.ambersol.co.il',
      },
      body: params.toString(),
    })
    const text = await res.text()
    try { result = JSON.parse(text) }
    catch { result = Object.fromEntries(new URLSearchParams(text)) }
  } catch (fetchErr: any) {
    // Сетевой сбой — апдейтим pending → failed, Tranzila не успела списать
    await supabase
      .from('installment_charges')
      .update({ status: 'failed', error_message: 'Network error: ' + fetchErr.message })
      .eq('id', chargeId)
    return { success: false, error: 'Network error' }
  }

  // ── Фаза 3: апдейт pending → success/failed ───────────────────────────────
  const success = result.Response === '000'
  const docId   = result.ConfirmationCode || result.index || null

  await supabase
    .from('installment_charges')
    .update({
      status:          success ? 'success' : 'failed',
      tranzila_doc_id: docId,
      error_message:   success ? null : (result.error || result.error_msg || 'Payment declined'),
      charged_at:      success ? new Date().toISOString() : null,
    })
    .eq('id', chargeId)

  return success
    ? { success: true, tranzila_doc_id: docId }
    : { success: false, error: result.error || result.error_msg || 'Payment declined' }
}
