import type { WhatsAppProvider, SendMessageParams, SendMessageResult } from './types.ts';

// Документация: https://whapi.cloud/docs
// Endpoint: POST /messages/text
// Auth: Authorization: Bearer <token>
export class WhapiProvider implements WhatsAppProvider {
  readonly providerType = 'whapi';

  // instanceId для Whapi = channel endpoint, напр. "gate.whapi.cloud/channels/YOUR_CHANNEL"
  // или просто "gate.whapi.cloud" если один канал на токен
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { phone, message, instanceId, apiKey } = params;

    // Whapi принимает номер в формате 972XXXXXXXXX (без + и без @c.us)
    const url = `https://${instanceId}/messages/text`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to:   phone,   // "972501234567"
          body: message,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${JSON.stringify(data)}`,
          statusCode: response.status,
        };
      }

      // Whapi возвращает { sent: true, id: "...", ... } при успехе
      if (data.sent === true || data.id) {
        return {
          success: true,
          messageId: data.id ?? data.message?.id,
          statusCode: response.status,
        };
      }

      return {
        success: false,
        error: `Unexpected response: ${JSON.stringify(data)}`,
        statusCode: response.status,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown fetch error',
      };
    }
  }
}
