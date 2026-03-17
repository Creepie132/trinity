import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createProvider } from '../_shared/providers/factory.ts';

const BATCH_SIZE = 10;

Deno.serve(async (req: Request) => {
  // Принимаем только POST от pg_cron (Authorization header обязателен)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Атомарный захват — FOR UPDATE SKIP LOCKED внутри функции
    const { data: messages, error: fetchError } = await supabase.rpc(
      'claim_pending_messages',
      { batch_size: BATCH_SIZE }
    );

    if (fetchError) {
      console.error('[process-wa-queue] claim_pending_messages error:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-wa-queue] Processing ${messages.length} messages`);

    // Обрабатываем параллельно, но собираем все результаты
    const results = await Promise.allSettled(
      messages.map((msg: any) => processMessage(supabase, msg))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed    = results.filter(r => r.status === 'rejected').length;

    console.log(`[process-wa-queue] Done: ${succeeded} ok, ${failed} failed`);

    return new Response(
      JSON.stringify({ processed: messages.length, succeeded, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[process-wa-queue] Fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

// ─── Обработка одного сообщения ───────────────────────────────────────────────

async function processMessage(supabase: any, msg: any): Promise<void> {
  const startTime = Date.now();

  // 1. Получаем интеграцию для org
  const { data: integration, error: intError } = await supabase
    .from('wa_integrations')
    .select('provider_type, instance_id, vault_secret_id')
    .eq('org_id', msg.org_id)
    .eq('is_active', true)
    .single();

  if (intError || !integration) {
    await markError(supabase, msg, 'No active WhatsApp integration found for org');
    return;
  }

  // 2. Достаём API ключ из Vault
  const { data: secretData, error: vaultError } = await supabase
    .schema('vault')
    .from('decrypted_secrets')
    .select('decrypted_secret')
    .eq('id', integration.vault_secret_id)
    .single();

  if (vaultError || !secretData?.decrypted_secret) {
    console.error('[process-wa-queue] Vault error:', vaultError);
    await markError(supabase, msg, 'Failed to retrieve API key from Vault');
    return;
  }

  // 3. Создаём провайдер и отправляем
  let result;
  try {
    const provider = createProvider(integration.provider_type);
    result = await provider.sendMessage({
      phone:      msg.phone,
      message:    msg.message_body,
      instanceId: integration.instance_id,
      apiKey:     secretData.decrypted_secret,
    });
  } catch (err) {
    await markError(supabase, msg, err instanceof Error ? err.message : 'Provider error');
    return;
  }

  const duration = Date.now() - startTime;

  // 4. Пишем лог (всегда, независимо от результата)
  await supabase.from('wa_send_log').insert({
    org_id:        msg.org_id,
    queue_id:      msg.id,
    provider_type: integration.provider_type,
    response_body: { messageId: result.messageId, error: result.error },
    status_code:   result.statusCode,
    success:       result.success,
    duration_ms:   duration,
  });

  // 5. Обновляем статус
  if (result.success) {
    await supabase
      .from('outbound_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', msg.id);
  } else {
    await markError(supabase, msg, result.error ?? 'Unknown provider error');
  }
}

// ─── Экспоненциальный backoff при ошибке ──────────────────────────────────────

async function markError(supabase: any, msg: any, errorMessage: string): Promise<void> {
  const newAttempts = (msg.attempts ?? 0) + 1;
  const maxAttempts = msg.max_attempts ?? 3;
  const isExhausted = newAttempts >= maxAttempts;

  // 2^attempts минут: 2 → 4 → 8 мин
  const backoffMs    = Math.pow(2, newAttempts) * 60_000;
  const nextRetryAt  = isExhausted
    ? null
    : new Date(Date.now() + backoffMs).toISOString();

  await supabase
    .from('outbound_queue')
    .update({
      status:        isExhausted ? 'error' : 'pending',
      attempts:      newAttempts,
      error_message: errorMessage,
      next_retry_at: nextRetryAt,
      // откладываем scheduled_at чтобы не попасть в следующий batch сразу
      scheduled_at:  nextRetryAt ?? new Date().toISOString(),
    })
    .eq('id', msg.id);

  if (isExhausted) {
    console.error(
      `[process-wa-queue] Message ${msg.id} exhausted all ${maxAttempts} attempts. Last error: ${errorMessage}`
    );
  }
}
