// Типы для notification preferences.
// Вынесены из api/notifications/preferences/route.ts (route-файл не может
// экспортировать интерфейсы — нарушение Next.js App Router constraints).

export interface NotifChannels {
  push: boolean
  telegram: boolean
  email: boolean
}

export interface NotificationPreferences {
  [eventKey: string]: NotifChannels
}

export const DEFAULT_NOTIF_CHANNELS: NotifChannels = {
  push: true,
  telegram: false,
  email: false,
}
