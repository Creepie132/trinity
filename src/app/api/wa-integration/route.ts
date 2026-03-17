import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-helpers';
import { createSupabaseServiceClient } from '@/lib/supabase-service';

// POST /api/wa-integration
// Сохраняет настройки WhatsApp-провайдера для org.
// API-ключ уходит в Vault — никогда не хранится в открытом виде в БД.
export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if ('error' in auth) return auth.error;
  const { orgId } = auth;

  let body: { providerType: string; instanceId: string; apiKey: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { providerType, instanceId, apiKey } = body;

  if (!providerType || !instanceId || !apiKey) {
    return NextResponse.json(
      { error: 'providerType, instanceId and apiKey are required' },
      { status: 400 }
    );
  }

  const allowed = ['whapi', 'wati', 'meta_cloud'];
  if (!allowed.includes(providerType)) {
    return NextResponse.json({ error: `Unknown providerType: ${providerType}` }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  try {
    // 1. Сохраняем API-ключ в Vault
    const { data: secretId, error: vaultError } = await supabase
      .rpc('vault_create_secret', {
        secret:      apiKey,
        name:        `wa_key_${orgId}`,
        description: `WhatsApp API key for org ${orgId}`,
      });

    if (vaultError || !secretId) {
      console.error('[wa-integration] Vault error:', vaultError);
      return NextResponse.json({ error: 'Failed to store API key' }, { status: 500 });
    }

    // 2. Upsert в wa_integrations (одна запись на org)
    const { error: upsertError } = await supabase
      .from('wa_integrations')
      .upsert(
        {
          org_id:          orgId,
          provider_type:   providerType,
          instance_id:     instanceId,
          vault_secret_id: secretId,
          is_active:       true,
        },
        { onConflict: 'org_id' }
      );

    if (upsertError) {
      console.error('[wa-integration] Upsert error:', upsertError);
      return NextResponse.json({ error: 'Failed to save integration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[wa-integration] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/wa-integration
// Возвращает текущие настройки (без API-ключа!)
export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req);
  if ('error' in auth) return auth.error;
  const { orgId } = auth;

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from('wa_integrations')
    .select('provider_type, instance_id, is_active, updated_at')
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to fetch integration' }, { status: 500 });
  }

  // API-ключ НИКОГДА не возвращается клиенту
  return NextResponse.json({ integration: data ?? null });
}
