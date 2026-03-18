
---

## 📅 История сессий (продолжение)

### 18.03.2026 — сессия 2
- Создан Project "Trinity CRM" в Claude.ai с полными инструкциями
- Создан файл KNOWLEDGE_BASE.md (этот файл)
- Настроен webhook в Whapi: https://ambersol.co.il/api/webhooks/whapi?token=trinity_whapi_secret_2026
- Добавлена переменная WHAPI_WEBHOOK_SECRET в Vercel
- Применена SQL миграция wa_inbox в Supabase (wa_conversations + wa_messages)
- Задеплоен код: api/wa-inbox/* + api/webhooks/whapi
- Добавлен пункт WhatsApp в Sidebar и MobileSidebar
- Страница /inbox уже существовала — исправлен конфликт имён createClient

### Статус WhatsApp Inbox
- Backend: ✅ готов
- SQL: ✅ применена
- Webhook Whapi: ✅ настроен
- UI: ✅ готова (src/app/(dashboard)/inbox/page.tsx)
- Sidebar: ✅ добавлен

### По боту (Kira)
- Бан Anthropic был из-за: бот переписывался с реальным человеком (Анетой) без её ведома что она общается с AI
- Решение: бот должен представляться как AI — "Привет, я Кира, AI-ассистент Trinity"
- Можно вернуться на Claude API с этим правилом — бана не будет
- Альтернативы: OpenAI GPT-4o (дешевле на объёме), Gemini (хорош с ивритом)
