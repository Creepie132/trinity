import type { SupabaseClient } from '@supabase/supabase-js';

interface ScheduleMessageParams {
  orgId:           string;
  clientId:        string;
  phone:           string;
  messageBody:     string;
  scheduledAt?:    Date;       // если не указано — отправить сразу
  idempotencyKey?: string;     // предотвращает дубли при повторном вызове
}

interface ScheduleBatchParams {
  orgId:        string;
  firstMessageAt?: Date;       // время первого сообщения (по умолчанию — сейчас)
  messages: Array<{
    clientId:        string;
    phone:           string;
    messageBody:     string;
    idempotencyKey?: string;
  }>;
}

// Случайная задержка 30–240 секунд между сообщениями
function randomDelayMs(): number {
  const seconds = Math.floor(Math.random() * (240 - 30 + 1)) + 30;
  return seconds * 1000;
}

// Планирует одно сообщение
export async function scheduleMessage(
  supabase: SupabaseClient,
  params: ScheduleMessageParams
): Promise<string | null> {
  const { data, error } = await supabase
    .from('outbound_queue')
    .insert({
      org_id:          params.orgId,
      client_id:       params.clientId,
      phone:           params.phone,
      message_body:    params.messageBody,
      scheduled_at:    (params.scheduledAt ?? new Date()).toISOString(),
      idempotency_key: params.idempotencyKey,
    })
    .select('id')
    .single();

  if (error) {
    // 23505 = unique violation — дубль по idempotency_key, молча игнорируем
    if (error.code === '23505') return null;
    throw new Error(`scheduleMessage failed: ${error.message}`);
  }

  return data.id;
}

// Планирует массив сообщений с нарастающей случайной задержкой
// Каждое следующее сообщение отложено на 30–240 сек от предыдущего
export async function scheduleBatch(
  supabase: SupabaseClient,
  params: ScheduleBatchParams
): Promise<{ scheduled: number; skipped: number }> {
  if (params.messages.length === 0) return { scheduled: 0, skipped: 0 };

  let currentTime = params.firstMessageAt ?? new Date();

  const rows = params.messages.map((msg) => {
    const scheduledAt = new Date(currentTime);
    // Следующее сообщение — после случайной паузы
    currentTime = new Date(currentTime.getTime() + randomDelayMs());

    return {
      org_id:          params.orgId,
      client_id:       msg.clientId,
      phone:           msg.phone,
      message_body:    msg.messageBody,
      scheduled_at:    scheduledAt.toISOString(),
      idempotency_key: msg.idempotencyKey ?? null,
    };
  });

  const { data, error } = await supabase
    .from('outbound_queue')
    .insert(rows)
    .select('id');

  if (error) {
    // 23505 = частичные дубли — не фатально, продолжаем
    if (error.code !== '23505') {
      throw new Error(`scheduleBatch failed: ${error.message}`);
    }
  }

  const scheduled = data?.length ?? 0;
  const skipped   = rows.length - scheduled;
  return { scheduled, skipped };
}
