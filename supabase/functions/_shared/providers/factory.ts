import { WhapiProvider } from './whapi.provider.ts';
import { WatiProvider } from './wati.provider.ts';
import type { WhatsAppProvider } from './types.ts';

// Фабрика — переключение провайдера в одном месте
// Чтобы сменить провайдера: изменить provider_type в wa_integrations для org
export function createProvider(providerType: string): WhatsAppProvider {
  switch (providerType) {
    case 'whapi':
      return new WhapiProvider();
    case 'wati':
      return new WatiProvider();
    default:
      throw new Error(`Unknown provider type: "${providerType}"`);
  }
}
