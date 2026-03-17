import { GreenApiProvider } from './green-api.provider.ts';
import { WatiProvider } from './wati.provider.ts';
import type { WhatsAppProvider } from './types.ts';

// Фабрика — чтобы переключить провайдера, меняется только здесь
export function createProvider(providerType: string): WhatsAppProvider {
  switch (providerType) {
    case 'green_api':
      return new GreenApiProvider();
    case 'wati':
      return new WatiProvider();
    default:
      throw new Error(`Unknown provider type: "${providerType}"`);
  }
}
