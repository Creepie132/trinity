import type { WhatsAppProvider, SendMessageParams, SendMessageResult } from './types.ts';

export class GreenApiProvider implements WhatsAppProvider {
  readonly providerType = 'green_api';

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const { phone, message, instanceId, apiKey } = params;

    // Green API: номер в формате 972XXXXXXXXX@c.us
    const chatId = `${phone}@c.us`;
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
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

      if (data.idMessage) {
        return { success: true, messageId: data.idMessage, statusCode: response.status };
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
