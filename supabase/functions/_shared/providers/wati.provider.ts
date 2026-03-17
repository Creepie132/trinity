import type { WhatsAppProvider, SendMessageParams, SendMessageResult } from './types.ts';

export class WatiProvider implements WhatsAppProvider {
  readonly providerType = 'wati';

  // instanceId для Wati = subdomain (напр. "live-mt-server")
  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { phone, message, instanceId, apiKey } = params;

    const url = `https://${instanceId}.wati.io/api/v1/sendSessionMessage/${phone}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText: message }),
        signal: AbortSignal.timeout(15_000),
      });

      const data = await response.json().catch(() => ({}));

      return {
        success: response.ok && data.result === true,
        messageId: data.id,
        error: response.ok ? undefined : JSON.stringify(data),
        statusCode: response.status,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}
