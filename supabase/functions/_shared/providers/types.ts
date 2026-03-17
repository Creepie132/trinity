export interface SendMessageParams {
  phone: string;       // международный формат без +: 972501234567
  message: string;
  instanceId: string;
  apiKey: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface WhatsAppProvider {
  readonly providerType: string;
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
}
