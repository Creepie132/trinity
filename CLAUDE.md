# CLAUDE.md — Trinity CRM (Web + PWA)

> Инструкция для AI-ассистента. Читать **полностью** перед любой задачей.

---

## 🎯 Проект

**Trinity CRM** — SaaS CRM для малого бизнеса в Израиле.
Домен: `ambersol.co.il` · GitHub: `Creepie132/trinity` · Путь: `F:\Amber_solutions_Kira\Trinity`

---

## 🛠️ Стек технологий

| Слой | Технология |
|------|-----------|
| Frontend | Next.js App Router (v16), React 18, TypeScript |
| Стили | Tailwind CSS + shadcn/ui + Lucide React |
| Состояние | TanStack Query v5 (React Query) + Zustand |
| Backend | Next.js API Routes (serverless) |
| БД | Supabase (PostgreSQL 15 + RLS + Realtime) |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Storage | Supabase Storage |
| Деплой | Vercel (`push origin main` = production) |
| Платежи | Tranzila (terminal + invoices API) |
| Мессенджер | WhatsApp через Whapi.cloud |

---

## 🔤 Шрифты

| Контекст | Шрифт |
|----------|-------|
| **Trinity CRM (основное приложение)** | **Rubik** (Hebrew-first, все веса) |
| Hebrew interface | **Rubik** + **Noto Sans Hebrew** |
| Russian interface | **Rubik** |
| **Лендинг `/landing`** | **Inter** (изолирован, подключается отдельно) |

> ⚠️ Шрифт Rubik подключается в `src/app/layout.tsx` для всего app-контекста.
> Лендинг изолирован через cookie `trinity_page=landing` — у него свой `<html>` без Trinity-провайдеров.
> **Никогда не добавляй новые шрифты без явного согласования.**

---

## 🗺️ Структура файлов (ключевые пути)

```
src/
├── app/
│   ├── (dashboard)/        # Основные страницы (clients, visits, sales, payments...)
│   ├── (worker)/           # Изолированный раздел для сотрудников
│   ├── admin/              # Суперадмин панель
│   ├── api/                # API Routes
│   ├── landing/            # Публичный лендинг
│   ├── login/              # Аутентификация
│   └── demo/               # Демо-режим
├── components/
│   ├── ui/                 # Базовые компоненты (Modal, TrinityModalShell, WizardModal...)
│   ├── sales/              # Компоненты продаж (UnifiedSalesDialog и др.)
│   ├── visits/             # Компоненты визитов
│   ├── payments/           # Компоненты платежей
│   ├── shared/             # Переиспользуемые (ItemPickerSheet и др.)
│   └── layout/             # Sidebar, GoldTabBar, Header...
├── hooks/                  # Custom hooks (useClients, useServices, useSales...)
├── lib/                    # Утилиты (auth-helpers, tranzila, supabase...)
├── contexts/               # React Contexts (LanguageContext, BranchContext...)
└── types/                  # TypeScript типы (database.ts и др.)
```

---

## ⚙️ Правила работы AI (обязательно)

### 1. СНАЧАЛА ЧИТАЙ, ПОТОМ ПИШИ

Перед написанием любого кода:

1. Найди и прочитай **все файлы**, связанные с задачей
2. Проверь существующие хуки, типы, компоненты — не дублируй
3. Читай реальный код, не угадывай структуру по названию

```
❌ Неправильно: "Думаю, там используется useState для..."
✅ Правильно: прочитать файл → увидеть реальную реализацию
```

### 2. CROSS-CHECK ПЕРЕД ИЗМЕНЕНИЕМ

Перед правкой любого файла проверь:

- Какие компоненты **импортируют** этот файл?
- Какие таблицы/поля БД он **читает/пишет**?
- Есть ли **типы** в `src/types/` которые нужно обновить?
- Есть ли **тесты** или **смежные файлы** с той же логикой?

Инструменты: `start_search` по имени файла/функции/таблицы.

### 3. ИНЖЕНЕРНЫЙ ПРОТОКОЛ

**Фаза 1 — Скан:** Читаем реальные файлы. Никаких предположений.

**Фаза 2 — Проект:** Планируем изменения с учётом:
- Валидация входящих данных
- Обработка ошибок (типизированные error-классы)
- Оценка регрессии

**Фаза 3 — Валидация:**
- TypeScript не ломается
- UI не теряет элементы
- API маршруты защищены auth

**Фаза 4 — Отчёт:**
```
✅ Проверено: [список файлов]
🔁 Регрессия: нет / описание
🔒 Безопасность: защищено
```

### 4. ЗАПРЕЩЕНО

```
❌ Monkey-patching
❌ Temp-скрипты (_fix.js, _patch.js) — только через стандартные механизмы
❌ Удалять UI-элементы без явной просьбы
❌ Хардкодить org_id, user_id или другие тенантные данные
❌ Угадывать структуру БД — читать types/database.ts
```

---

## 🔐 Безопасность (обязательные паттерны)

### Каждый API Route обязан:

```typescript
// 1. Auth первым делом
const auth = await getAuthContext(req)
if ('error' in auth) return auth.error

// 2. Данные только через activeOrgId из БД (не из заголовков!)
const { orgId, activeOrgId } = auth

// 3. Все запросы фильтровать по org_id
.eq('org_id', orgId)

// 4. Service role только ПОСЛЕ проверки auth
const service = createSupabaseServiceClient()
```

### RLS правило:

```sql
-- ✅ Правильно (один вызов на запрос)
WHERE user_id = (SELECT auth.uid())

-- ❌ Неправильно (вызов на каждую строку)
WHERE user_id = auth.uid()
```

---

## 🎨 UI-правила

### Модалки

| Тип | Компонент |
|-----|-----------|
| Стандартная форма | `TrinityModalShell` + `Modal` |
| Многошаговая | `WizardModal` |
| Мобильный паттерн | `ModalBottomSheet` |

**Никогда не создавать кастомный modal "с нуля"** — использовать существующие.

### Адаптивность (ОБЯЗАТЕЛЬНО для всех страниц)

```
Mobile  < 768px
Tablet  768–1024px
Desktop > 1024px
```

**Правило**: добавление нового раздела/страницы требует поддержки всех трёх брейкпоинтов.

### Методы оплаты

`enabled_payment_methods` из org-настроек должен применяться **везде**: в визитах, продажах, платежах.
`credit_card` = карта, всегда присутствует по умолчанию.

После любой работы с платёжными методами — обязательно проверить консистентность по всей системе.

### Навигация (модули)

После работы с модулями или навигацией — проверить синхронизацию включён/выключен → UI.

---

## 🚀 Деплой (строгий порядок)

```bash
# 1. Чистый билд — ОБЯЗАТЕЛЬНО
npm run build   # должен быть 0 ошибок, 0 TypeScript warnings

# 2. Commit через файл (Windows CMD)
# Писать message в файл → коммитить через -F → удалять файл:
# write_file → docs\commit-msg.txt
# cd /d F:\Amber_solutions_Kira\Trinity
# git add <файлы>
# git commit -F docs\commit-msg.txt
# git push origin main
# del docs\commit-msg.txt

# git push origin main = PRODUCTION (Vercel auto-deploy)
```

**Никогда не пушить без чистого билда.**

### Commit-сообщения (формат)

```
feat: новая функциональность
fix: исправление бага
refactor: рефакторинг без изменения поведения
chore: конфигурация, зависимости
docs: документация
```

---

## 🐛 Правило отладки

При визуальной или функциональной ошибке:

1. **Читать реальные логи** (Vercel dashboard, browser console)
2. **Искать реальный код** — не угадывать
3. **Debug-сборка** если нужно — никогда не гадать

```
❌ "Наверное, проблема в том что..."
✅ Прочитать файл → найти реальную причину → зафиксировать
```

---

## 📋 Checklist перед каждым PR/деплоем

- [ ] `npm run build` — чистый (0 ошибок)
- [ ] Прочитаны все затронутые файлы
- [ ] Нет дублирования существующей логики
- [ ] API routes защищены через `getAuthContext()`
- [ ] Данные фильтруются по `org_id`
- [ ] Адаптивность: mobile/tablet/desktop
- [ ] UI-элементы не удалены без запроса
- [ ] Методы оплаты консистентны (если затронуты)
- [ ] Документация обновлена (`docs/TRINITY_DOCS.md`)

---

## 📚 Ключевые файлы для чтения

| Файл | Когда читать |
|------|-------------|
| `src/lib/auth-helpers.ts` | Перед любым API route |
| `src/types/database.ts` | Перед работой с БД |
| `src/contexts/LanguageContext.tsx` | Перед добавлением строк UI |
| `src/hooks/use*.ts` | Перед созданием нового хука |
| `src/components/ui/TrinityModalShell.tsx` | Перед созданием модалки |
| `docs/TRINITY_DOCS.md` | Полная документация проекта |

---

---

## 📝 Changelog (сессии разработки)

### 07.05.2026 — Проверка системы + фиксы

#### fix(login): Google OAuth — выбор аккаунта
**Файл:** `src/app/login/page.tsx`

**Проблема:** При нажатии «Войти через Google» браузер сразу логинил без показа экрана выбора аккаунта.

**Фикс:** Добавлен параметр `queryParams: { prompt: 'select_account' }` в `signInWithOAuth`. Теперь всегда показывается account picker Google.

```typescript
// Было:
options: { redirectTo: `${window.location.origin}/callback` }

// Стало:
options: {
  redirectTo: `${window.location.origin}/callback`,
  queryParams: { prompt: 'select_account' },
}
```

---

#### fix(sales): поиск услуг в ItemPickerSheet не принимал ввод
**Файл:** `src/components/sales/UnifiedSalesDialog.tsx` (локальная `ItemPickerSheet`)

**Проблема:** При открытии пикера «Выберите услугу» в продажах — поле поиска визуально есть, но ввод с клавиатуры не работал. `autoFocus` не захватывал фокус потому что `ItemPickerSheet` рендерится через `createPortal` поверх уже активной модалки (`TrinityModalShell`), которая удерживает focus trap внутри себя.

**Фикс:** Убран `autoFocus`, добавлены `useRef` + `useEffect` с явным `.focus()` и задержкой 80ms после смены `step`. Задержка нужна чтобы портал успел отрендериться и focus trap родителя успокоился.

```typescript
const searchInputRef = useRef<HTMLInputElement>(null)
const customInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (!isOpen) return
  if (step === 'service' || step === 'product') {
    const t = setTimeout(() => searchInputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }
  if (step === 'custom') {
    const t = setTimeout(() => customInputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }
}, [step, isOpen])
```

---

#### QA: Проверка системы через браузер (Claude in Chrome)
Проведена полная проверка через реальный браузер на ambersol.co.il:

| Раздел | Статус | Примечания |
|--------|--------|-----------|
| Логин Google | ✅ | После фикса account picker работает |
| Клиенты — список | ✅ | Загрузка, 7 клиентов |
| Клиенты — поиск | ✅ | Debounce ~1-2 сек, фильтрует корректно |
| Клиенты — карточка | ✅ | Все кнопки: Продажа, WhatsApp, Визит, Редактировать |
| Клиенты — добавить | ✅ | Модалка открывается, все поля |
| Клиенты — сортировка | ✅ | Все 4 варианта работают |
| Escape закрывает модалку | ✅ | |
| Визиты — список | ✅ | |
| Визиты — новый визит | ✅ | Форма с клиентом, позициями, датой |
| Продажи — список | ✅ | Статистика, фильтры по статусу |
| Продажи — новая сделка | ✅ | |
| Продажи — поиск услуг | ✅ | После фикса работает |
| Сортировка по алфавиту | ✅ | Список пересортировывается |

**Замечание:** 5 сделок у Влади Халфин со статусом «Не оплачено» на ₪500 — возможно тестовые данные, стоит проверить.

---

*Последнее обновление: 07.05.2026*
