# Настройка Vercel Cron для автоматических напоминаний

## 1. Добавить CRON_SECRET в Vercel Environment Variables

1. Зайди в Vercel Dashboard → Project Settings → Environment Variables
2. Добавь новую переменную:
   - Name: `CRON_SECRET`
   - Value: (скопируй из `.env.local`)
   - Environment: Production, Preview, Development

Текущий CRON_SECRET (из .env.local):
```
a58d3cd80bef9c3087bd733cd7d8ce48dbd3aae5286177239d0b1b91f1f522b2
```

## 2. Включить Cron в Vercel

После деплоя:
1. Зайди в Vercel Dashboard → Project → Settings → Cron Jobs
2. Cron job будет автоматически добавлен из `vercel.json`
3. Проверь расписание: `0 7 * * *` (UTC)

**⚠️ Hobby план ограничения:**
- Hobby аккаунты могут запускать cron **только 1 раз в день**
- Для более частых запусков нужен Pro план
- Текущее расписание: один раз в день в 07:00 UTC

## 3. Расписание (UTC):
- 07:00 UTC = 09:00 IL (зима) / 10:00 IL (лето)
- Cron проверяет:
  - Визиты на ЗАВТРА (напоминание за 24 часа)
  - Визиты через 2 часа (напоминание за 2 часа)

**Для Pro плана** можно изменить на:
```json
"schedule": "0 7,10,12,14,16 * * *"  // 5 раз в день
```

## 4. Включить напоминания для организации

По умолчанию напоминания включены. Чтобы выключить:

```sql
UPDATE organizations 
SET features = jsonb_set(features, '{reminders_enabled}', 'false') 
WHERE id = 'org-id';
```

## 5. Тестирование

Вызвать endpoint вручную:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.vercel.app/api/cron/reminders
```

## 6. Мониторинг

Все отправленные напоминания логируются в `audit_log`:
- `entity_type`: `reminder_tomorrow` или `reminder_2hours`
- `action`: `send_sms`
- `user_email`: `system`

Проверить логи:
```sql
SELECT * FROM audit_log 
WHERE entity_type IN ('reminder_tomorrow', 'reminder_2hours')
ORDER BY created_at DESC;
```
