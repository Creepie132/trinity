import { useOrganization } from '@/hooks/useOrganization'

/**
 * useQuickMode — возвращает true если для организации включён
 * "Быстрый режим мастера" (features.quick_mode === true).
 *
 * Используется в карточке клиента для условного показа
 * кнопки быстрого создания визита.
 */
export function useQuickMode(): boolean {
  const { data: org } = useOrganization()
  return (org as any)?.features?.quick_mode === true
}
