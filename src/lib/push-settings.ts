// Типы и константы для push-уведомлений.
// Вынесены из api/push/settings/route.ts чтобы route-файл
// не имел именованных экспортов кроме HTTP-хэндлеров (требование Next.js).

export interface PushSettings {
  new_visit: boolean       // Новая запись/визит (онлайн или вручную)
  visit_reminder: boolean  // Напоминания за 4ч/1ч/30мин до и после
  new_payment: boolean     // Новый платёж
  new_client: boolean      // Новый клиент
  birthday: boolean        // День рождения клиента
  task_mentions: boolean   // Задачи: назначение, упоминание, выполнение, дедлайн
  stock_alerts: boolean    // Склад: заканчивается / нет в наличии
  admin_messages: boolean  // Сообщения от администратора системы
}

export const DEFAULT_PUSH_SETTINGS: PushSettings = {
  new_visit: true,
  visit_reminder: true,
  new_payment: true,
  new_client: false,
  birthday: false,
  task_mentions: true,
  stock_alerts: true,
  admin_messages: true,
}
