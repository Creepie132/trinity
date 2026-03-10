# 🧠 CLAUDE.md - Trinity Project Memory

**Файл-память проекта для AI-ассистентов**  
**Powered by Amber Solutions Systems**

---

## ⚠️ Правила работы с этим проектом

1. **Не добавляй `Co-Authored-By` в коммиты** — делай простые коммиты без подписей
2. **Всегда запускай `npm run build` перед `git push`** — сборка обязательна
3. **Никогда не пуши если build упал с ошибками** — сначала исправь, потом пушь
4. **Отвечай на русском языке** — это основной язык общения в проекте

---

## 📁 СТРУКТУРА ПРОЕКТА (Актуально на 2026-02-10)

### Основные директории

```
Leya-Project/clientbase-pro/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Main user dashboard routes
│   │   │   ├── clients/        # CRM - Управление клиентами
│   │   │   ├── partners/       # Управление партнёрами
│   │   │   ├── payments/       # Платежи и транзакции
│   │   │   ├── sms/            # SMS кампании
│   │   │   ├── stats/          # Статистика и аналитика
│   │   │   └── layout.tsx      # Dashboard layout с sidebar
│   │   ├── admin/              # Admin panel routes
│   │   │   ├── organizations/  # Управление организациями
│   │   │   ├── ads/            # Реклама и баннеры
│   │   │   ├── billing/        # Биллинг
│   │   │   ├── settings/       # Настройки системы
│   │   │   └── layout.tsx      # Admin layout
│   │   ├── api/                # API Routes
│   │   │   ├── admin/          # Admin API endpoints
│   │   │   │   ├── assign/     # Назначение ролей
│   │   │   │   ├── check/      # Проверка прав доступа
│   │   │   │   ├── organizations/create/ # Создание орг
│   │   │   │   └── profile/    # Профиль админа
│   │   │   ├── ads/            # Реклама API
│   │   │   ├── payments/       # Платежи API
│   │   │   ├── sms/            # SMS API
│   │   │   └── upload/         # Загрузка файлов
│   │   ├── login/              # Страница логина
│   │   ├── callback/           # OAuth callback
│   │   ├── blocked/            # Заблокированный доступ
│   │   └── unauthorized/       # 403 страница
│   ├── components/             # React компоненты
│   │   ├── admin/              # Админские компоненты
│   │   ├── ads/                # Баннеры и реклама
│   │   ├── clients/            # CRM компоненты
│   │   ├── layout/             # Sidebar, Header
│   │   ├── payments/           # Платёжные формы
│   │   ├── sms/                # SMS формы
│   │   ├── ui/                 # shadcn/ui компоненты
│   │   └── user/               # Профиль пользователя
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Аутентификация
│   │   ├── useAdmin.ts         # Проверка админа
│   │   ├── useClients.ts       # CRM данные
│   │   ├── useOrganization.ts  # Организация
│   │   └── useFeatures.ts      # Feature flags
│   └── lib/                    # Утилиты и библиотеки
│       ├── supabase.ts         # Supabase client
│       ├── tranzilla.ts        # Платёжный шлюз
│       ├── inforu.ts           # SMS провайдер
│       └── utils.ts            # Общие утилиты
├── supabase/                   # SQL миграции
│   ├── RELATIONSHIPS.md        # Описание связей БД
│   └── *.sql                   # Миграционные скрипты
├── docs/                       # Документация
│   ├── INVITATION_SYSTEM.md    # Система приглашений
│   ├── FIX_*.md                # История багфиксов
│   └── *.md                    # Прочие гайды
├── CLAUDE.md                   # ← ВЫ ЗДЕСЬ (файл памяти AI)
├── PROJECT_STATUS.md           # Статус проекта
├── SECURITY_AUDIT.md           # Аудит безопасности
└── package.json                # Dependencies
```

### Ключевые файлы

**Аутентификация и доступ:**
- `src/hooks/useAuth.ts` - главный auth hook (user, orgId, isAdmin)
- `src/middleware.ts` - защита маршрутов
- `src/app/callback/route.ts` - OAuth callback handler

**CRM (Клиенты):**
- `src/app/(dashboard)/clients/page.tsx` - главная страница CRM
- `src/components/clients/AddClientDialog.tsx` - добавление клиента
- `src/components/clients/ClientSheet.tsx` - карточка клиента
- `src/hooks/useClients.ts` - загрузка данных

**Админ панель:**
- `src/app/admin/organizations/page.tsx` - управление организациями
- `src/components/admin/AdminProfileSheet.tsx` - профиль админа
- `src/app/api/admin/organizations/create/route.ts` - создание орг

**База данных:**
- `public.organizations` - организации
- `public.org_users` - связь user ↔ org (many-to-many)
- `public.admin_users` - администраторы (глобальные)
- `public.clients` - CRM клиенты
- `public.invitations` - приглашения в организацию

**RLS Functions (критические!):**
- `is_admin()` - проверка админских прав (SECURITY DEFINER)
- `get_user_org_ids()` - организации пользователя (SECURITY DEFINER)
- `is_org_owner()` - проверка владельца организации

---

## 🎨 UI ШАБЛОНЫ TRINITY (Актуально на 2026-02-24)

### ⚠️ ВАЖНО: Всегда используй эти компоненты!

**НЕ создавай кнопки с кастомными стилями. НЕ дублируй логику карточек. НЕ пиши свой поиск.**

---

### 🔘 Кнопки — TrinityButton

**Файл:** `src/components/ui/TrinityButton.tsx`

```tsx
import { 
  TrinityButton, 
  TrinitySaveButton, 
  TrinityCancelButton, 
  TrinityDeleteButton, 
  TrinityCallButton, 
  TrinityWhatsAppButton, 
  TrinityIconButton 
} from '@/components/ui/TrinityButton'
```

**Варианты:** `primary`, `secondary`, `outline`, `ghost`, `danger`, `call`, `whatsapp`, `edit`, `icon`  
**Размеры:** `sm`, `md`, `lg`, `icon`

**Примеры:**

```tsx
// Базовая кнопка
<TrinityButton variant="primary" icon={<Plus size={16} />}>
  Добавить
</TrinityButton>

// Готовые пресеты
<TrinitySaveButton locale={locale} loading={saving} />
<TrinityCancelButton locale={locale} onClick={onClose} />
<TrinityCallButton phone="0541234567" locale={locale} />
<TrinityWhatsAppButton phone="0541234567" locale={locale} />
<TrinityDeleteButton locale={locale} onClick={handleDelete} />

// Круглая иконка
<TrinityIconButton 
  icon={<Pencil size={16} />} 
  color="bg-slate-100" 
  textColor="text-slate-600"
  onClick={handleEdit}
/>
```

---

### 🃏 Карточки — TrinityCard

**Файл:** `src/components/ui/TrinityCard.tsx`

```tsx
import { TrinityCard, getAvatarColor, getInitials } from '@/components/ui/TrinityCard'
```

**Возможности:**
- 4 типа аватаров: `initials`, `icon`, `image`, `timeline`
- 2 layout: Timeline (визиты) + Standard (клиенты, платежи)
- Quick actions (круглые кнопки)
- Bottom Drawer с деталями
- RTL поддержка

**Пример:**

```tsx
<TrinityCard
  avatar={{
    type: 'initials',
    text: getInitials(client.name),
    color: getAvatarColor(client.name)
  }}
  title={client.name}
  subtitle={client.phone}
  stats={[
    { icon: <Calendar size={14} />, text: '5 визитов' }
  ]}
  quickActions={[
    {
      icon: <Phone size={16} />,
      label: 'Позвонить',
      onClick: () => {},
      color: 'bg-blue-50',
      textColor: 'text-blue-600'
    }
  ]}
  detailFields={[
    { label: 'Email', value: client.email }
  ]}
  locale="ru"
/>
```

---

### 🖥️ Десктопные карточки — TrinityCardPc (Split-View)

**Файл:** `src/components/ui/TrinityCardPc.tsx`

**Универсальный шаблон для ВСЕХ десктопных карточек (≥1024px).**

**Архитектура:**
- Grid layout: `350px | 1fr` (левая панель + правая панель)
- Overlay: `bg-black/30`
- Panel: `max-w-5xl mx-auto my-4 rounded-2xl`
- Левая панель: профиль, контакты, данные, edit форма
- Правая панель: KPI заголовок + табы с контентом
- RTL автоматически

**ПРАВИЛО:** НА ДЕСКТОПЕ (≥ lg) используй `TrinityCardPc`. НА МОБИЛЬНОМ (< lg) используй `TrinityCard` + `TrinityBottomDrawer`.

**Пример использования:**

```tsx
import { TrinityCardPc } from '@/components/ui/TrinityCardPc'
import { Phone, MessageCircle, Calendar, CreditCard, Pencil } from 'lucide-react'

<TrinityCardPc
  isOpen={!!selectedClient}
  onClose={() => setSelectedClient(null)}
  locale={language === 'he' ? 'he' : 'ru'}
  
  // Левая панель (30%)
  leftHeader={
    <>
      <div className="bg-blue-500 w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl">
        АК
      </div>
      <h2 className="text-xl font-bold mt-3">Анна Коэн</h2>
    </>
  }
  
  leftActions={
    <>
      <TrinityIconButton 
        icon={<Phone size={18} />} 
        color="bg-blue-50" 
        textColor="text-blue-600" 
      />
      <TrinityIconButton 
        icon={<MessageCircle size={18} />} 
        color="bg-green-50" 
        textColor="text-green-600" 
      />
    </>
  }
  
  leftFields={[
    { label: 'Телефон', value: '054-1234567', dir: 'ltr' },
    { label: 'Email', value: 'anna@mail.com', dir: 'ltr' },
    { label: 'Адрес', value: 'ул. Дизенгофф 123' },
  ]}
  
  leftFooter={
    <TrinityButton 
      variant="edit" 
      fullWidth 
      icon={<Pencil size={16} />}
      onClick={() => setEditing(true)}
    >
      Изменить
    </TrinityButton>
  }
  
  // Форма редактирования (заменяет leftFields)
  isEditing={editing}
  leftEditForm={
    <div className="space-y-3">
      <input className="w-full p-2 rounded-lg border" value={name} onChange={...} />
      <button onClick={handleSave}>Сохранить</button>
    </div>
  }
  
  // Правая панель (70%)
  rightKpi={{
    label: 'Всего потрачено',
    value: '₪2,500'
  }}
  
  tabs={[
    {
      key: 'visits',
      label: 'Визиты',
      icon: <Calendar size={16} />,
      content: <VisitsTable clientId={selectedClient.id} />
    },
    {
      key: 'payments',
      label: 'Финансы',
      icon: <CreditCard size={16} />,
      content: <PaymentsTable clientId={selectedClient.id} />
    },
  ]}
  
  defaultTab="visits"
  maxWidth="max-w-5xl"
/>
```

**Props:**

```typescript
interface TrinityCardPcProps {
  isOpen: boolean
  onClose: () => void
  locale: 'he' | 'ru'
  
  // Левая панель (30%)
  leftHeader?: ReactNode           // Аватар + имя + badge
  leftActions?: ReactNode          // Кнопки (звонок, WhatsApp, email)
  leftFields?: {                   // Поля данных
    label: string
    value: string | ReactNode
    dir?: 'ltr' | 'rtl'
  }[]
  leftFooter?: ReactNode           // Кнопка Edit и т.д.
  leftEditForm?: ReactNode         // Форма редактирования (заменяет leftFields)
  isEditing?: boolean              // Показать форму вместо полей
  
  // Правая панель (70%)
  rightKpi?: {                     // KPI заголовок
    label: string
    value: string
  }
  tabs?: {                         // Табы с контентом
    key: string
    label: string
    icon?: ReactNode
    content: ReactNode
  }[]
  defaultTab?: string
  
  // Стилизация
  maxWidth?: string                // default: max-w-5xl
}
```

**Используется в:**
- ClientDesktopPanel (clients/page.tsx)
- VisitDesktopPanel (visits/page.tsx)
- PaymentDesktopPanel (payments/page.tsx)
- TaskDesktopPanel (diary/page.tsx)

**ВАЖНО:** НИКОГДА не создавай кастомные десктопные панели — всегда используй шаблон `TrinityCardPc`.

---

### 🔍 Поиск — TrinitySearch

**Файл:** `src/components/ui/TrinitySearch.tsx`

```tsx
import { TrinitySearch, TrinitySearchDropdown } from '@/components/ui/TrinitySearch'
```

**TrinitySearch** — простой инпут с фильтрацией:
```tsx
<TrinitySearch
  data={clients}
  searchKeys={['first_name', 'last_name', 'phone', 'email']}
  onResults={(filtered) => setFilteredClients(filtered)}
  placeholder="Поиск клиента..."
  locale="ru"
/>
```

**TrinitySearchDropdown** — с выпадающим списком (автокомплит):
```tsx
<TrinitySearchDropdown
  data={clients}
  searchKeys={['first_name', 'last_name', 'phone']}
  renderItem={(client) => (
    <div>
      <p className="font-medium">{client.first_name} {client.last_name}</p>
      <p className="text-xs text-muted-foreground">{client.phone}</p>
    </div>
  )}
  onSelect={(client) => handleSelect(client)}
  locale="ru"
/>
```

**Особенности:**
- Generic типизация `<T>`
- Клиентская фильтрация (без API)
- Минимум 2 символа для поиска
- RTL поддержка

---

## 📋 Оглавление

1. [Обзор проекта](#обзор-проекта)
2. [Структура файлов](#структура-файлов)
3. [Технологический стек](#технологический-стек)
4. [База данных Supabase](#база-данных-supabase)
5. [API Routes](#api-routes)
6. [Страницы приложения](#страницы-приложения)
7. [Компоненты](#компоненты)
8. [Hooks](#hooks)
9. [Библиотеки и утилиты](#библиотеки-и-утилиты)
10. [Переменные окружения](#переменные-окружения)
11. [Архитектурные решения](#архитектурные-решения)

---

## 🎯 Обзор проекта

**Trinity** — полнофункциональная SaaS CRM система для управления клиентами, платежами и SMS-рассылками.

### Ключевые возможности:
- **Multi-tenancy:** Множество организаций с изолированными данными
- **Управление клиентами:** CRUD операции, история визитов, платежей
- **Платежи:** Интеграция с Tranzilla (Израиль)
- **SMS рассылки:** InforU Mobile API
- **Аналитика:** Графики доходов, визитов, топ клиентов
- **Админ-панель:** Управление организациями, биллинг, реклама
- **Система фич:** Гибкое включение/отключение функций
- **Баннерная реклама:** Монетизация через партнёрские кампании
- **RTL интерфейс:** Полная поддержка иврита

### Целевая аудитория:
- Малый и средний бизнес в Израиле
- Сервисные компании (салоны красоты, автомойки, клиники, рестораны, спортзалы)

---

## 📁 Структура файлов

### Полная структура проекта:

```
clientbase-pro/
├── src/
│   ├── app/                                    # Next.js App Router
│   │   ├── admin/                              # ⭐ АДМИН-ПАНЕЛЬ
│   │   │   ├── layout.tsx                      # Layout с проверкой is_admin()
│   │   │   ├── page.tsx                        # Дашборд админа
│   │   │   ├── organizations/
│   │   │   │   └── page.tsx                    # Управление организациями
│   │   │   ├── billing/
│   │   │   │   └── page.tsx                    # Биллинг и подписки
│   │   │   ├── ads/
│   │   │   │   ├── page.tsx                    # Рекламные кампании
│   │   │   │   └── page-safe.tsx              # Безопасная версия
│   │   │   └── settings/
│   │   │       └── page.tsx                    # Настройки системы
│   │   ├── blocked/                            # ⭐ Страница блокировки
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── clients/                            # Клиенты
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── payments/                           # Платежи
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── sms/                                # SMS рассылки
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── stats/                              # Статистика
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── partners/                           # ⭐ Партнёрские предложения
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── unauthorized/
│   │   │   └── page.tsx
│   │   ├── debug-admin/
│   │   │   └── page.tsx
│   │   ├── api/                                # API Routes
│   │   │   ├── admin/
│   │   │   │   └── check/route.ts             # ⭐ Проверка is_admin()
│   │   │   ├── ads/                            # ⭐ БАННЕРНАЯ РЕКЛАМА API
│   │   │   │   ├── active/route.ts            # GET активные кампании
│   │   │   │   ├── click/route.ts             # POST трекинг кликов
│   │   │   │   └── impression/route.ts        # POST трекинг показов
│   │   │   ├── payments/
│   │   │   │   ├── create-link/route.ts       # POST создание ссылки
│   │   │   │   ├── webhook/route.ts           # POST webhook Tranzilla
│   │   │   │   └── callback/route.ts          # GET redirect после оплаты
│   │   │   ├── sms/
│   │   │   │   ├── campaign/route.ts          # POST создание кампании
│   │   │   │   └── send/route.ts              # POST отправка SMS
│   │   │   ├── upload/
│   │   │   │   └── banner/route.ts            # POST загрузка баннеров
│   │   │   └── health/route.ts                # GET health check
│   │   ├── callback/
│   │   │   └── route.ts                       # Auth callback
│   │   ├── layout.tsx                         # Root layout (RTL)
│   │   ├── page.tsx                           # Dashboard
│   │   ├── loading.tsx                        # Global loading
│   │   ├── error.tsx                          # ⭐ Error Boundary
│   │   ├── global-error.tsx                   # ⭐ Global error handler
│   │   ├── not-found.tsx                      # 404 page
│   │   └── globals.css                        # ⭐ Tailwind 3.x styles
│   ├── components/
│   │   ├── ads/                               # ⭐ БАННЕРНАЯ РЕКЛАМА
│   │   │   └── AdBanner.tsx                   # Компонент баннера
│   │   ├── clients/
│   │   │   ├── AddClientDialog.tsx
│   │   │   └── ClientSheet.tsx
│   │   ├── payments/
│   │   │   ├── CreatePaymentDialog.tsx
│   │   │   └── CreatePaymentLinkDialog.tsx
│   │   ├── sms/
│   │   │   ├── NewCampaignForm.tsx
│   │   │   └── CampaignDetailsSheet.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx                    # ⭐ С фильтрацией фич
│   │   │   └── AdminSidebar.tsx
│   │   ├── providers/
│   │   │   └── QueryProvider.tsx
│   │   ├── ui/                                # shadcn/ui компоненты
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── textarea.tsx
│   │   └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useOrganization.ts                 # ⭐ Получение организации
│   │   ├── useFeatures.ts                     # ⭐ Проверка фич
│   │   ├── useAuth.ts
│   │   ├── useIsAdmin.ts
│   │   ├── useAdmin.ts
│   │   ├── useClients.ts
│   │   ├── usePayments.ts
│   │   ├── useSms.ts
│   │   └── useStats.ts
│   ├── lib/
│   │   ├── supabase.ts                        # Supabase клиент
│   │   ├── supabase-browser.ts
│   │   ├── tranzilla.ts                       # Tranzilla API
│   │   ├── inforu.ts                          # InforU SMS API
│   │   └── utils.ts                           # CN утилита
│   └── types/
│       └── database.ts                        # TypeScript типы БД
├── supabase/                                  # SQL миграции
│   ├── schema-v2.sql                          # Полная схема v2.0
│   ├── schema-v2-part1.sql                    # Tables
│   ├── schema-v2-part2.sql                    # RLS policies
│   ├── schema-v2-part3.sql                    # Views
│   ├── create-storage-bucket.sql              # Storage setup
│   ├── quick-fix-ad-campaigns.sql
│   └── URGENT_FIX_RLS.sql
├── docs/                                      # Документация
│   ├── ADMIN_SETUP.md
│   ├── ADS_IMPLEMENTATION.md                  # ⭐ Баннерная реклама
│   ├── FEATURES_SYSTEM.md                     # ⭐ Система фич
│   ├── SETUP.md
│   ├── PAYMENTS_GUIDE.md
│   ├── SMS_GUIDE.md
│   └── STORAGE_SETUP.md
├── tailwind.config.js                         # ⭐ Tailwind 3.x config
├── postcss.config.mjs                         # ⭐ PostCSS config
├── next.config.ts                             # Next.js config
├── middleware.ts                              # ⭐ С проверкой is_active
├── package.json                               # ⭐ Обновлённые зависимости
├── components.json                            # shadcn/ui config
├── README.md
└── CLAUDE.md                                  # Этот файл
```

---

## 🛠 Технологический стек

### Frontend Framework:
- **Next.js 16.1.6** (App Router)
  - Server Components по умолчанию
  - API Routes
  - Turbopack для dev (с настройкой root)
  - Metadata API

### Language:
- **TypeScript 5.9.3**
  - Строгая типизация
  - Типы для всех сущностей БД

### Styling:
- **Tailwind CSS 3.4.17** ⭐ (откачено с 4.x beta)
  - Utility-first подход
  - Кастомная конфигурация
  - RTL поддержка
  
  **Кастомные утилиты для карточек:**
  ```
  shadow-card          → 0 1px 3px rgba(0, 0, 0, 0.05)
  shadow-card-hover    → 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
  shadow-card-lg       → 0 10px 15px -3px rgba(0, 0, 0, 0.1)
  border-card          → #f1f5f9
  bg-page              → #f8fafc (фон страницы)
  rounded-card         → 16px
  ```

  **🎨 Правило стилизации карточек (ОБЯЗАТЕЛЬНО):**
  ВСЕ карточки и блоки должны иметь:
  - `bg-white rounded-2xl shadow-card border border-card`
  - `hover:shadow-card-hover transition-shadow` (для интерактивных)
  - Фон страницы: `bg-page` (#f8fafc)
  - ⛔ **НИКОГДА** не оставляй карточку без `border` и `shadow`

- **shadcn/ui 3.8.4**
  - Компоненты UI
  - Radix UI primitives
  - Полностью кастомизируемые

### State Management:
- **React Query (@tanstack/react-query) 5.90.20**
  - Кэширование запросов
  - Автоматическое обновление
  - Оптимистичные обновления
  - Stale time: 5 минут для организаций

### Database:
- **Supabase**
  - PostgreSQL
  - REST API (@supabase/supabase-js 2.95.3)
  - SSR support (@supabase/ssr 0.8.0)
  - Row Level Security (RLS)
  - Storage для баннеров

### External APIs:
- **Tranzilla** — платёжный шлюз (Израиль)
  - Sandbox: https://sandbox.tranzilla.co.il
  - Hosted payment page
- **InforU Mobile** — SMS API (Израиль)
  - REST API: https://api.inforu.co.il

### Charts & Analytics:
- **Recharts 3.7.0**
  - Bar Chart (столбчатые)
  - Line Chart (линейные)
  - Horizontal Bar (горизонтальные)
  - Responsive
  - RTL совместимость

### Utilities:
- **date-fns 4.1.0** — работа с датами
- **zod 4.3.6** — валидация
- **lucide-react 0.563.0** — иконки
- **sonner 2.0.7** — toast notifications
- **clsx / tailwind-merge** — классы

---

## 🗄️ База данных Supabase

### Полная схема таблиц:

---

#### 1. `organizations` — Организации (клиенты SaaS)

**Назначение:** Мультитенантность, каждая организация изолирована

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `name` | TEXT | Название организации |
| `email` | TEXT | Email организации |
| `phone` | TEXT | Телефон |
| `category` | TEXT | salon/carwash/clinic/restaurant/gym/other |
| `plan` | TEXT | basic/pro/enterprise |
| `is_active` | BOOLEAN | Активна ли (для блокировки) |
| `features` | JSONB | {"sms": true, "payments": true, "analytics": true} |
| `billing_status` | TEXT | trial/paid/overdue/cancelled |
| `billing_due_date` | DATE | Дата следующей оплаты |
| `created_at` | TIMESTAMPTZ | Дата создания |

**Используется в:**
- Middleware для проверки `is_active`
- `useOrganization()` hook
- Админ-панель для управления
- AdBanner для категории

---

#### 2. `org_users` — Пользователи организаций

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `org_id` | UUID | FK → organizations(id) |
| `user_id` | UUID | FK → auth.users(id) |
| `email` | TEXT | Email пользователя |
| `role` | TEXT | owner/admin/staff |
| `invited_at` | TIMESTAMPTZ | Дата приглашения |
| `joined_at` | TIMESTAMPTZ | Дата присоединения |

**Используется в:**
- Middleware для определения org_id пользователя
- Админка для управления командой

---

#### 3. `admin_users` — Суперадмины системы

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `user_id` | UUID | FK → auth.users(id) |
| `email` | TEXT | Email админа |
| `full_name` | TEXT | Полное имя админа ⭐ (v2.3) |
| `role` | TEXT | admin/moderator ⭐ (v2.4) |
| `created_at` | TIMESTAMPTZ | Дата добавления |

**Роли:**
- **admin** — полный доступ ко всему
- **moderator** — ограниченный доступ (просмотр, без удаления)

**Используется в:**
- Middleware для проверки админских прав
- `/api/admin/check` для клиентской проверки
- `useIsAdmin()` hook

---

#### 4. `ad_campaigns` — Рекламные кампании

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `advertiser_name` | TEXT | Название рекламодателя |
| `banner_url` | TEXT | URL баннера (Supabase Storage) |
| `link_url` | TEXT | Ссылка при клике |
| `target_categories` | TEXT[] | Массив категорий ['salon', 'gym'] |
| `start_date` | DATE | Дата начала |
| `end_date` | DATE | Дата окончания |
| `is_active` | BOOLEAN | Активна ли кампания |
| `clicks` | INTEGER | Количество кликов |
| `impressions` | INTEGER | Количество показов |
| `created_at` | TIMESTAMPTZ | Дата создания |

**Используется в:**
- `AdBanner` компонент
- `/partners` страница
- API routes для трекинга
- Админка для управления

---

#### 5. `clients` — Клиенты организаций

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `org_id` | UUID | FK → organizations(id) |
| `first_name` | TEXT | Имя |
| `last_name` | TEXT | Фамилия |
| `phone` | TEXT | Телефон |
| `email` | TEXT | Email (опц) |
| `address` | TEXT | Адрес (опц) |
| `date_of_birth` | DATE | Дата рождения (опц) |
| `notes` | TEXT | Заметки |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `updated_at` | TIMESTAMPTZ | Дата обновления |

**RLS:** Пользователь видит только клиентов своей организации

---

#### 6. `visits` — Визиты клиентов

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `client_id` | UUID | FK → clients(id) |
| `visit_date` | TIMESTAMPTZ | Дата визита |
| `service_description` | TEXT | Описание услуги |
| `amount` | NUMERIC(10,2) | Стоимость |
| `notes` | TEXT | Заметки |
| `created_at` | TIMESTAMPTZ | Дата создания |

---

#### 7. `payments` — Платежи

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `client_id` | UUID | FK → clients(id) |
| `visit_id` | UUID | FK → visits(id) (опц) |
| `amount` | NUMERIC(10,2) | Сумма |
| `currency` | TEXT | ILS/USD/EUR |
| `status` | TEXT | pending/completed/failed/refunded |
| `payment_method` | TEXT | credit_card/cash |
| `payment_link` | TEXT | Ссылка Tranzilla |
| `transaction_id` | TEXT | ID транзакции |
| `provider` | TEXT | tranzilla |
| `paid_at` | TIMESTAMPTZ | Дата оплаты |
| `created_at` | TIMESTAMPTZ | Дата создания |

---

#### 8. `sms_campaigns` — SMS кампании

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `org_id` | UUID | FK → organizations(id) |
| `name` | TEXT | Название кампании |
| `message` | TEXT | Текст SMS |
| `filter_type` | TEXT | all/single/inactive_days |
| `filter_value` | TEXT | Значение фильтра |
| `recipients_count` | INT | Количество получателей |
| `sent_count` | INT | Отправлено |
| `failed_count` | INT | Ошибок |
| `status` | TEXT | draft/sending/completed/failed |
| `created_at` | TIMESTAMPTZ | Дата создания |
| `sent_at` | TIMESTAMPTZ | Дата отправки |

---

#### 9. `sms_messages` — Отдельные SMS

**Поля:**

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | UUID | PRIMARY KEY |
| `campaign_id` | UUID | FK → sms_campaigns(id) |
| `client_id` | UUID | FK → clients(id) |
| `phone` | TEXT | Номер телефона |
| `message` | TEXT | Текст |
| `status` | TEXT | pending/sent/delivered/failed |
| `error` | TEXT | Текст ошибки |
| `sent_at` | TIMESTAMPTZ | Дата отправки |

---

### Views:

#### `client_summary` — Сводка по клиентам

```sql
SELECT 
  c.id,
  c.first_name,
  c.last_name,
  c.phone,
  c.email,
  MAX(v.visit_date) as last_visit,
  COUNT(v.id) as total_visits,
  COALESCE(SUM(p.amount), 0) as total_paid
FROM clients c
LEFT JOIN visits v ON v.client_id = c.id
LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'completed'
GROUP BY c.id
```

---

### RLS Functions:

#### `get_user_org_ids()`
Возвращает массив org_id для текущего пользователя

#### `is_admin()`
Проверяет наличие в `admin_users`

---

## 🔌 API Routes

### Payments API

#### `POST /api/payments/create-link`
Создание платёжной ссылки

**Request:**
```json
{
  "client_id": "uuid",
  "amount": 150.00,
  "description": "Оплата услуг",
  "visit_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "uuid",
  "payment_link": "https://...",
  "amount": 150.00,
  "currency": "ILS"
}
```

---

#### `POST /api/payments/webhook`
Webhook от Tranzilla

**Параметры:**
- `Response` — код ответа ('000' = успех)
- `ConfirmationCode` — ID транзакции
- `contact` — payment_id

**Обновляет:** status, transaction_id, paid_at

---

#### `GET /api/payments/callback`
Redirect после оплаты

**Query:**
- `status` — success/failed
- `contact` — payment_id

**Redirect:** `/payments?status=...&payment_id=...`

---

#### `POST /api/payments/stripe-checkout`
Создание Stripe Checkout Session

**Request:**
```json
{
  "amount": 150.00,
  "currency": "ILS",
  "clientName": "John Doe",
  "clientEmail": "john@example.com",
  "clientId": "uuid",
  "orgId": "uuid"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

**Процесс:**
1. Создаёт Stripe Checkout Session
2. Возвращает URL для оплаты
3. Frontend открывает URL в новом окне
4. После оплаты: redirect на success_url
5. Webhook обрабатывает платёж

---

#### `POST /api/payments/stripe-webhook`
Webhook от Stripe

**Events:**
- `checkout.session.completed` — успешная оплата

**Headers:**
- `stripe-signature` — подпись для верификации

**Процесс:**
1. Верификация через `stripe.webhooks.constructEvent`
2. Извлечение metadata (client_id, org_id)
3. Запись в таблицу `payments`:
   - `status: 'completed'`
   - `payment_method: 'stripe'`
   - `transaction_id: session.id`
   - `amount: session.amount_total / 100`

**⚠️ ВАЖНО:** Webhook должен быть в исключениях middleware!

---

### SMS API

#### `POST /api/sms/campaign`
Создание и запуск SMS кампании

**Request:**
```json
{
  "name": "תזכורת לביקור",
  "message": "שלום! זו תזכורת...",
  "filter_type": "all|single|inactive_days",
  "filter_value": "30"
}
```

**Response:**
```json
{
  "success": true,
  "campaign_id": "uuid",
  "recipients_count": 45,
  "sent_count": 43,
  "failed_count": 2
}
```

---

#### `POST /api/sms/send`
Прямая отправка SMS

**Request:**
```json
{
  "phones": ["+972501234567"],
  "message": "שלום!",
  "campaign_id": "uuid"
}
```

---

### Admin API

#### `POST /api/admin/check`
Проверка админских прав

**Response:**
```json
{
  "isAdmin": true,
  "email": "admin@example.com"
}
```

---

#### `POST /api/admin/assign` ⭐ (v2.4)
Назначить админом/модератором

**Request:**
```json
{
  "email": "user@example.com",
  "role": "admin" | "moderator"
}
```

**Response:**
```json
{
  "success": true,
  "message": "המשתמש מונה בהצלחה"
}
```

**Ошибки:**
- 401: Not authenticated
- 403: Not an admin
- 404: "המשתמש צריך להיכנס למערכת לפחות פעם אחת"
- 400: Invalid role

---

#### `DELETE /api/admin/assign` ⭐ (v2.4)
Снять админские полномочия

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ההרשאות הוסרו בהצלחה"
}
```

**Защита:** Нельзя удалить себя

---

### Ads API (⭐ Новое)

#### `GET /api/ads/active?category={category}`
Получение активных рекламных кампаний

**Query:**
- `category` — salon/carwash/clinic/etc

**Фильтры:**
- `is_active = true`
- `start_date <= today <= end_date`
- `target_categories` содержит категорию

**Response:**
```json
{
  "campaigns": [
    {
      "id": "uuid",
      "advertiser_name": "קוסמטיקה לי",
      "banner_url": "https://...",
      "link_url": "https://...",
      "target_categories": ["salon"],
      "clicks": 15,
      "impressions": 42
    }
  ]
}
```

---

#### `POST /api/ads/impression`
Трекинг показа баннера

**Request:**
```json
{
  "campaign_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "impressions": 43
}
```

---

#### `POST /api/ads/click`
Трекинг клика по баннеру

**Request:**
```json
{
  "campaign_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "clicks": 16
}
```

---

## 📄 Страницы приложения

### `/` — Dashboard (Главная)

**Файл:** `src/app/page.tsx`

**Функции:**
- ✅ Проверка `is_active` организации (редирект на `/blocked`)
- 4 карточки метрик:
  - סה״כ לקוחות (всегда)
  - ביקורים החודש (всегда)
  - ⭐ הכנסות החודש (если `hasPayments`)
  - ⭐ לקוחות לא פעילים (если `hasAnalytics`)
- ⭐ AdBanner справа от карточек (категория из `features.category`)
- Быстрые действия (ссылки)
- Руководство для начинающих

**Данные:** `useDashboardStats()`, `useFeatures()`

---

### `/clients` — Клиенты

**Функции:**
- ✅ Проверка `is_active`
- Таблица клиентов (client_summary view)
- Поиск по имени/телефону
- Клик на строку → ClientSheet
- Кнопка "הוסף לקוח"

**Компоненты:**
- `AddClientDialog`
- `ClientSheet` (табы: Визиты | Платежи | SMS)

---

### `/payments` — Платежи

**Функции:**
- ✅ Проверка `is_active` и `hasPayments` (редирект на `/`)
- Статистика за месяц
- Фильтры: статус, даты
- Таблица платежей
- Бейджи статусов (цветные)
- Действия: копировать ссылку, открыть

**Toast после оплаты:** Параметры `?status=success&payment_id=...`

---

### `/sms` — SMS рассылки

**Функции:**
- ✅ Проверка `is_active` и `hasSms` (редирект на `/`)
- Форма новой рассылки
- Подсчёт символов/SMS
- 3 типа фильтров (всем/одному/неактивным)
- История рассылок
- Клик → CampaignDetailsSheet

---

### `/stats` — Статистика

**Функции:**
- ✅ Проверка `is_active` и `hasAnalytics` (редирект на `/`)
- 4 карточки (те же что на главной)
- 3 графика:
  - Доходы по месяцам (Bar Chart)
  - Визиты по месяцам (Line Chart)
  - Топ-5 клиентов (Horizontal Bar)

---

### `/partners` — Партнёрские предложения (⭐ Новое)

**Файл:** `src/app/partners/page.tsx`

**Функции:**
- ✅ Проверка `is_active`
- Загрузка всех активных кампаний для категории
- Grid layout (1/2/3 колонки)
- Каждый баннер:
  - Картинка 250px
  - Название рекламодателя
  - Кнопка "לפרטים"
- Клик → трекинг + открытие ссылки
- Пустое состояние: "אין הצעות זמינות כרגע"

**Данные:** `/api/ads/active?category=...`, `useFeatures()`

---

### `/admin` — Админ-панель

**Защита:** Только для пользователей из `admin_users`

**Разделы:**
- Dashboard — метрики системы
- Organizations — CRUD организаций
- Billing — управление подписками
- Ads — рекламные кампании
- Settings — настройки

---

### `/blocked` — Страница блокировки

**Когда показывается:** `organizations.is_active = false`

**Содержимое:**
- Сообщение о блокировке
- Причина (неоплата, нарушение)
- Контакты поддержки

---

## 🧩 Компоненты

### Ads (⭐ Новое)

#### `AdBanner`
**Путь:** `src/components/ads/AdBanner.tsx`

**Props:**
```typescript
{
  category: string    // Категория организации
  className?: string
}
```

**Функции:**
- Загружает активную кампанию для категории
- Если несколько → выбирает случайную
- Трекает показ один раз при mount
- Клик → трекинг + открытие link_url
- Если нет кампаний → null (не рендерится)

**Стиль:**
- Скруглённые углы (rounded-lg)
- Тень (shadow-md)
- Hover: scale(1.02)
- Подпись "שותף עסקי" внизу

---

### Clients

#### `AddClientDialog`
Модалка добавления клиента

**Поля:** имя, фамилия, телефон (обязательные), email, адрес, дата рождения, заметки

#### `ClientSheet` ⭐ (v2.4)
Боковая панель с деталями клиента

**Секции:**
- Контакты
- Статистика
- Действия (создать платёж, отправить SMS, добавить визит)
- Табы (Визиты | Платежи | SMS)
- **⭐ Назначение админом:**
  - Кнопка "מנה כמנהל" (янтарная) — если НЕ админ
  - Badge "מנהל מערכת" + кнопка "הסר הרשאות" — если админ
  - Проверка email обязательна
  - Использует `useClientAdminStatus` hook

#### `AssignAdminDialog` ⭐ (v2.4)
**Путь:** `src/components/clients/AssignAdminDialog.tsx`

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `clientEmail: string`
- `onSuccess?: () => void`

**Функции:**
- Выбор роли (admin/moderator)
- Красивые карточки с иконками
- Описание прав на иврите
- POST /api/admin/assign

---

### Payments

#### `CreatePaymentDialog`
Создание платежа для конкретного клиента

#### `CreatePaymentLinkDialog`
Создание платежа с выбором клиента (Tranzilla)

**Результат:** Показ ссылки + кнопки (копировать, отправить SMS, открыть)

---

#### `CreateStripePaymentDialog`
Создание платежа через Stripe Checkout

**Процесс:**
1. Выбор клиента + сумма
2. Вызов `/api/payments/stripe-checkout`
3. Получение Checkout URL
4. Открытие в новом окне
5. Webhook обрабатывает успешную оплату

**Отличия от Tranzilla:**
- Не создаёт платёжную ссылку
- Мгновенный redirect на Stripe
- Оплата в Stripe UI (не на нашем сайте)
- Webhook автоматически записывает payment

**Стиль кнопки:** `bg-purple-600` (отличается от Tranzilla)

---

### SMS

#### `NewCampaignForm`
Форма создания SMS кампании

**Функции:**
- Подсчёт символов и SMS частей
- Live preview количества получателей
- 3 типа фильтров (радио + вложенные поля)
- Диалог подтверждения

#### `CampaignDetailsSheet`
Детали SMS кампании

**Секции:**
- Информация
- Статистика
- Текст
- Таблица отдельных SMS

---

### Layout

#### `Sidebar` (⭐ Обновлён)
**Путь:** `src/components/layout/Sidebar.tsx`

**Функции:**
- ⭐ Фильтрация пунктов меню на основе `features`:
  - "תשלומים" → если `hasPayments`
  - "הודעות SMS" → если `hasSms`
  - "סטטיסטיקה" → если `hasAnalytics`
  - "לקוחות" и "הצעות שותפים" → всегда
- Кнопка "אדמין" для админов
- Активный пункт подсвечивается
- RTL layout

**Данные:** `useFeatures()`, `useIsAdmin()`

#### `AdminSidebar`
Sidebar админ-панели (тёмный #1E293B)

---

### Error Handling (⭐ Новое)

#### `error.tsx`
**Путь:** `src/app/error.tsx`

Error Boundary для компонентных ошибок

**Функции:**
- Логирование в console.error
- Красивая карточка с иконкой ошибки
- Dev mode → показ сообщения
- Кнопки: "נסה שוב" (reset), "חזור לדף הבית"

#### `global-error.tsx`
**Путь:** `src/app/global-error.tsx`

Обработка критических ошибок (обходит root layout)

**Функции:**
- Inline HTML без layout
- RTL `dir="rtl"`
- Inline стили
- Кнопка "נסה שוב"

---

## 🎣 Hooks

### useOrganization() (⭐ Новое)
**Путь:** `src/hooks/useOrganization.ts`

**Назначение:** Получение данных текущей организации пользователя

**Алгоритм:**
1. `supabase.auth.getUser()`
2. SELECT org_id FROM org_users WHERE user_id = ...
3. SELECT * FROM organizations WHERE id = org_id
4. Возврат Organization объекта

**Возвращает:**
```typescript
interface Organization {
  id: string
  name: string
  category: string
  plan: string
  is_active: boolean
  features: {
    sms: boolean
    payments: boolean
    analytics: boolean
  }
  billing_status: string
  // ...
}
```

**Кэширование:**
- Query key: `['organization']`
- Stale time: 5 минут

---

### useFeatures() (⭐ Новое)
**Путь:** `src/hooks/useFeatures.ts`

**Назначение:** Удобный интерфейс для проверки фич

**Использует:** `useOrganization()`

**Возвращает:**
```typescript
interface Features {
  hasSms: boolean
  hasPayments: boolean
  hasAnalytics: boolean
  isActive: boolean
  category: string
  isLoading: boolean
}
```

**Fallback:** Если features не заполнено → все true

**Используется в:**
- Sidebar (фильтрация меню)
- Dashboard (скрытие карточек)
- Страницы (проверка доступа)
- AdBanner (категория)

---

### useClients()
Получение списка клиентов с поиском

### useClient(id)
Один клиент по ID

### useAddClient()
Добавление клиента

### useUpdateClient()
Обновление клиента

---

### usePayments(clientId?, filters?)
Список платежей с фильтрами

### usePaymentsStats()
Статистика за месяц

### useCreatePaymentLink()
Создание платёжной ссылки

---

### useSmsCampaigns()
Список SMS кампаний

### useSmsCampaign(id)
Одна кампания

### useSmsMessages(campaignId)
SMS сообщения кампании

### useCreateCampaign()
Создание и запуск кампании

### useRecipientsCount(filterType, filterValue?)
Количество получателей (preview)

---

### useDashboardStats()
Метрики для дашборда

### useRevenueByMonth()
Доходы по месяцам (6 месяцев)

### useVisitsByMonth()
Визиты по месяцам

### useTopClients()
Топ-5 клиентов

---

### useAuth()
Аутентификация (signIn, signOut, user)

### useIsAdmin()
Проверка админа через `/api/admin/check`

### useAdminProfile() (⭐ v2.3)
**Путь:** `src/hooks/useAdminProfile.ts`

**Назначение:** Получение профиля админа из таблицы `admin_users`

**Использует:** `useAuth()`

**Возвращает:**
```typescript
interface AdminProfile {
  id: string
  user_id: string
  email: string
  full_name: string | null
  created_at: string
}

{
  adminProfile: AdminProfile | null
  isLoading: boolean
  error: Error | null
}
```

**Кэширование:**
- Query key: `['admin-profile', userId]`
- Stale time: 5 минут

**Используется в:**
- AdminSidebar (отображение имени и email)

---

### useClientAdminStatus() ⭐ (v2.4)
**Путь:** `src/hooks/useClientAdminStatus.ts`

**Назначение:** Проверка является ли клиент админом

**Возвращает:**
```typescript
interface AdminStatus {
  isAdmin: boolean
  role: 'admin' | 'moderator' | null
}

{
  isAdmin: boolean
  role: 'admin' | 'moderator' | null
  isLoading: boolean
  refetch: () => void
}
```

**Кэширование:**
- Query key: `['client-admin-status', email]`
- Stale time: 30 секунд

**Используется в:**
- ClientSheet (отображение статуса и кнопок)

---

## 📚 Библиотеки и утилиты

### `src/lib/supabase.ts`
Supabase клиент (ANON KEY)

### `src/lib/supabase-browser.ts`
Browser-safe клиент

### `src/lib/tranzilla.ts`
Tranzilla API утилиты:
- `generateTranzillaPaymentLink()`
- `parseTranzillaWebhook()`
- `formatAmount()`
- `getPaymentStatus()`

### `src/lib/inforu.ts`
InforU SMS API утилиты:
- `sendSms()`
- `formatPhoneNumber()`
- `calculateSmsParts()`
- `isValidIsraeliPhone()`

### `src/lib/utils.ts`
shadcn/ui утилиты:
```typescript
import { cn } from '@/lib/utils'
```

---

## 🔐 Переменные окружения

**Файл:** `.env.local`

```env
# Supabase (обязательно)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Tranzilla (платежи)
TRANZILLA_TERMINAL_ID=your_terminal_id
TRANZILLA_API_KEY=your_api_key

# Stripe (платежи)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# InforU Mobile (SMS)
INFORU_API_TOKEN=your_api_token
INFORU_SENDER_NAME=YourBusiness
```

---

## 🏗 Архитектурные решения

### 1. Multi-Tenancy через organizations
- Каждая организация изолирована
- RLS на уровне БД
- org_id в большинстве таблиц

### 2. Система управления фичами (⭐ v2.2)
- JSONB поле `features` в organizations
- Хуки `useFeatures()` и `useOrganization()`
- Автоматическая фильтрация UI
- Middleware проверяет `is_active`
- ⭐ **API routes защищены:** `api-auth.ts` проверяет features перед выполнением
- 3 уровня защиты: middleware, компоненты, API routes
- Админы минуют проверку features

### 3. Баннерная реклама (⭐ v2.1)
- Хранение баннеров в Supabase Storage
- Таргетинг по категориям
- Фильтрация по датам
- Трекинг на клиенте (impressions/clicks)
- API без аутентификации (публичный)
- CTR расчёт в админке

### 4. Обработка ошибок (⭐ v2.1)
- Error Boundary на уровне страниц
- Global error handler для критических ошибок
- Кнопки recovery (reset, home)
- Dev mode показывает детали

### 5. React Query для state management
- Кэширование запросов (5 минут для организаций)
- Автоматическая инвалидация
- Оптимистичные обновления

### 6. Supabase как единственный источник данных
- Нет локального state
- Все через REST API
- Views для агрегации

### 7. RTL (Right-to-Left) Layout (⭐ v2.3 - исправлен!)
**Правильная архитектура:**
- `dir="rtl"` в root layout
- **Порядок элементов:** main → sidebar (sidebar автоматически справа)
- **НЕ используем `flex-row-reverse`** — RTL работает нативно
- **Desktop (≥1024px):**
  - `lg:flex lg:h-screen` — flex container на всю высоту
  - `<main className="flex-1 overflow-y-auto">` — контент прокручивается, занимает всё свободное место
  - `<aside className="sticky top-0 h-screen">` — sidebar фиксирован, не прокручивается
- **Mobile (<1024px):**
  - Sidebar скрыт (`hidden lg:block`)
  - MobileHeader с бургером
  - Drawer открывается справа (RTL)
- **Компоненты Sidebar:**
  - Используют `<div>` вместо `<aside>` для правильного flow
  - `h-full` вместо `h-screen` — заполняют контейнер layout
  - Весь текст на иврите
  - Recharts настроены под RTL

### 8. Мобильное меню (⭐ v2.2)
- `MobileHeader` + `MobileSidebar` для основной системы
- `MobileAdminHeader` + `MobileAdminSidebar` для админки
- Drawer открывается справа (Sheet component)
- Backdrop и body scroll lock
- Автоматическое закрытие при выборе пункта
- Кнопка "назад" на всех страницах кроме главной
- Показывается только на <1024px (`lg:hidden`)

### 9. Переключатель темы (⭐ v2.2)
- Dark/Light режим во всех компонентах
- localStorage для персистентности
- Иконки Moon/Sun
- `darkMode: ['class']` в tailwind.config.js
- CSS variables для цветов (`--background`, `--card`, etc.)
- Админ-панель по умолчанию в тёмной теме

### 10. shadcn/ui компоненты
- Полностью кастомизируемые
- Tailwind CSS стили
- Radix UI primitives
- Sheet для drawer меню

### 11. API Routes для внешних интеграций
- Tranzilla: серверная генерация ссылок
- InforU: серверная отправка SMS
- Ads: трекинг без аутентификации
- Webhook обработка асинхронная
- ⭐ Защита features через `api-auth.ts` (v2.2)

### 12. TypeScript строгая типизация
- Типы для всех сущностей БД
- Типы для API responses
- Типы для props компонентов

### 13. Loading states и Error handling
- `loading.tsx` для каждого route
- `error.tsx` для обработки ошибок
- `not-found.tsx` для 404

### 14. Middleware для авторизации
- Проверка session
- Проверка org membership
- Проверка admin rights
- Проверка is_active (редирект на /blocked)
- Публичные пути: /login, /unauthorized, /blocked

### 15. Tailwind 3.x
- Стабильная версия 3.4.17 (откат с 4.x beta)
- `darkMode: ['class']` для переключателя темы
- Кастомные цвета через CSS variables
- Плагин tailwindcss-animate
- PostCSS с autoprefixer

---

## 🚀 Команды для работы

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Запуск продакшен сервера
npm start

# Линтинг
npm run lint
```

---

## 📊 Статистика проекта v2.3.0

- **Страниц:** 13 (включая админку)
- **API Routes:** 13
- **Компонентов:** 36 (+6 layout компонентов)
  - Layout: 6 (Sidebar, MobileSidebar, MobileHeader, AdminSidebar, MobileAdminSidebar, MobileAdminHeader)
  - UI: 17 (shadcn/ui)
  - Features: 7 (clients, payments, sms)
  - Ads: 1 (AdBanner)
  - Providers: 1 (QueryProvider)
  - ErrorBoundary: 1
- **Хуков:** 9
- **Библиотек:** 7 (supabase, supabase-browser, tranzilla, inforu, utils, api-auth)
- **Таблиц БД:** 9
- **Views:** 1 (client_summary)
- **RLS Functions:** 2 (get_user_org_ids, is_admin)
- **Документации:** 12 файлов
- **Строк кода:** ~10000+

---

## 🐛 Известные ограничения

1. ~~**API Routes не защищены features**~~ ✅ ИСПРАВЛЕНО в v2.2 (api-auth.ts)
2. **Нет кэширования в middleware:** SELECT при каждом запросе (можно использовать Redis/cookies)
3. **features может быть null:** Нужен дефолт в миграциях (сейчас fallback в коде)
4. **Дедупликация показов баннера:** Impression трекается один раз за mount (можно добавить cookie/localStorage)

---

## 📝 Дополнительные файлы

### Документация (`docs/`):
- `ADMIN_SETUP.md` — настройка админ-панели
- `ADS_IMPLEMENTATION.md` ⭐ — баннерная реклама (v2.1)
- `FEATURES_SYSTEM.md` ⭐ — система управления фичами (v2.1)
- `SETUP.md` — установка и настройка
- `PAYMENTS_GUIDE.md` — работа с платежами
- `SMS_GUIDE.md` — работа с SMS
- `STORAGE_SETUP.md` — настройка Storage

### SQL миграции (`supabase/`):
- `schema-v2.sql` — полная схема v2.0
- `schema-v2-part1.sql` — таблицы
- `schema-v2-part2.sql` — RLS policies
- `schema-v2-part3.sql` — views
- `create-storage-bucket.sql` — Storage для баннеров
- `quick-fix-ad-campaigns.sql` — быстрое создание таблицы
- `URGENT_FIX_RLS.sql` — исправление RLS

---

## 🎯 Следующие шаги для разработки

### Краткосрочные:
- [ ] Защита API routes через features
- [ ] Кэширование данных организации (Redis/cookies)
- [ ] Экспорт данных (CSV/PDF)
- [ ] Email уведомления

### Среднесрочные:
- [ ] Геотаргетинг для рекламы
- [ ] A/B тестирование баннеров
- [ ] Лимиты использования (100 SMS/месяц)
- [ ] Feature flags (временное отключение)
- [ ] WhatsApp Business интеграция

### Долгосрочные:
- [ ] AI рекомендации
- [ ] Мобильное приложение
- [ ] API для партнёров
- [ ] Расширенная аналитика

---

## ⚠️ Для Production деплоя

### 1. База данных:
```bash
# Выполнить миграции в Supabase SQL Editor
cat supabase/schema-v2.sql | pbcopy
# Вставить в Supabase Dashboard → SQL Editor

# Создать Storage bucket
cat supabase/create-storage-bucket.sql | pbcopy
```

### 2. Переменные окружения:
```bash
# .env.local с реальными ключами
cp .env.example .env.local
# Заполнить SUPABASE_URL, KEYS, TRANZILLA, INFORU
```

### 3. Установка и билд:
```bash
npm install
npm run build
npm start
```

### 4. Тестирование:
- [ ] Регистрация пользователя
- [ ] Создание организации
- [ ] Добавление клиента
- [ ] Создание платёжной ссылки
- [ ] Отправка SMS
- [ ] Проверка блокировки (`is_active = false`)
- [ ] Отключение фич (features)
- [ ] Просмотр баннеров
- [ ] Админ-панель (добавить в admin_users)

---

**Последнее обновление:** 2026-02-14 13:36 UTC

**Версия проекта:** 2.29.4

**Статус:** ✅ Production Ready

**Основные достижения v2.29.4:**
- ✅ **Visit Creation UUID Fix** — корректная обработка UUID и legacy services
- ✅ **Product Sale Payment** — обязательный выбор способа оплаты
- ✅ **Toast Position** — bottom-center для видимости
- ✅ **Client Card Data** — исправлен SQL view, полная история визитов
- ✅ **Modal Close Buttons** — стрелка назад 44×44px на всех модалках
- ✅ **Dark Theme Fixes** — все кнопки и инпуты читаемы в тёмной теме
- ✅ **27 новых ключей перевода** — Hebrew + Russian

**Основные достижения v2.29:**
- ✅ **Mobile UX Optimization** — FAB buttons, centered layouts, responsive dialogs
- ✅ **Sidebar Consistency** — mobile = desktop (same items, order, icons)
- ✅ **Adaptive Button Text** — full text on desktop, short on mobile
- ✅ **Analytics PieChart** — white labels with text shadow for dark backgrounds
- ✅ **Payments Page Centered** — mobile-optimized with dropdown selects
- ✅ **Partners Page Animations** — CSS-only amber glow (@keyframes)

**Основные достижения v2.27-v2.28:**
- ✅ **Error Boundaries** — prevent white screens on mobile
- ✅ **Care Instructions PDF** — jspdf generator with WhatsApp integration
- ✅ **Sticky Sidebar Pattern** — admin layout sidebar fixed
- ✅ **Landing Page Updates** — WhatsApp/Email animated buttons

**Основные достижения v2.26:**
- ✅ **Active Visit System** — live timer, multi-service tracking
- ✅ **Visit Services Table** — with RLS and triggers
- ✅ **Service Dropdown Redesign** — Select instead of buttons
- ✅ **Compact ActiveVisitCard** — 80-100px height max

**Основные достижения v2.25:**
- ✅ **Services Management System** — customizable per-org services
- ✅ **Care Instructions** — bilingual PDF generation
- ✅ **Test Data Seeder Enhanced** — 25 Israeli clients, 80 visits, 13 products
- ✅ **Visit-Service Integration** — database-driven instead of hardcoded

**Основные достижения v2.23-v2.24:**
- ✅ **Inventory System** — barcode scanning, transaction tracking
- ✅ **Visit-Product Integration** — products in CompleteVisitPaymentDialog
- ✅ **Low Stock Alerts** — dashboard card, sidebar badges, banner

**Основные достижения v2.20-v2.22:**
- ✅ **Visits System** — full CRUD with payment integration
- ✅ **Analytics Dashboard** — PieChart + BarChart visualizations
- ✅ **Branded Loading Animations** — Trinity logo with amber orbit
- ✅ **Prism Login Button** — neumorphic design with rotating conic-gradient

**Основные достижения v2.17-v2.19:**
- ✅ **Stripe Payment Integration** — parallel to Tranzilla
- ✅ **User Invitation System** — auto-linking on first login
- ✅ **Landing Page** — Amber Solutions Systems standalone site
- ✅ **Test Data Seeder** — basic client/visit/payment generation

**Основные достижения v2.12-v2.16:**
- ✅ **Full Translation System** — 676+ keys per language (Hebrew/Russian)
- ✅ **Auto RTL ↔ LTR Switching** — based on language selection
- ✅ **Settings Reorganization** — Display + Language pages
- ✅ **Dark Mode Toggle** — persists across sessions

**Основные достижения v2.9-v2.11:**
- ✅ **Visual Theme System** — 6 color themes
- ✅ **Layout System** — 3 UI styles (Classic/Modern/Compact)
- ✅ **Advanced Customization** — 12+ granular settings

**Основные достижения v2.8:**
- ✅ **Auto-Link User ID System** — fixes "no access" errors
- ✅ **Database Signup Error Fix** — email normalization trigger
- ✅ **Dashboard Data Leak Fix** — added org_id filters to all stats

**Основные достижения v2.3:**
- ✅ **Правильный RTL Layout** — sidebar справа sticky, контент слева прокручивается
- ✅ Убран `flex-row-reverse` — RTL работает нативно
- ✅ Исправлены компоненты Sidebar (aside → div, h-screen → h-full)
- ✅ Dark mode улучшен для всех компонентов

**Основные достижения v2.2:**
- ✅ **API routes защищены features** — api-auth.ts проверяет доступ
- ✅ Мобильное меню с бургером (основная система + админка)
- ✅ Переключатель темы Dark/Light во всех компонентах
- ✅ Улучшенная страница логина с градиентами
- ✅ 3 уровня защиты: middleware → UI → API

**Основные достижения v2.1:**
- ✅ Система управления фичами
- ✅ Баннерная реклама с трекингом
- ✅ Полная обработка ошибок
- ✅ Tailwind 3.x (стабильная версия)
- ✅ Все страницы с loading states
- ✅ Middleware с проверкой is_active
- ✅ RTL интерфейс на иврите
- ✅ Подробная документация

**Последние коммиты (v2.29.4):**
- `64b3c97` (2026-02-14 12:07) — Fix missing language variable
- `a2af380` (2026-02-14 12:02) — Fix dark theme buttons
- `0628b89` (2026-02-14 11:52) — Fix modals close button, payment dialog layout
- `8ae6d35` (2026-02-14 11:46) — Fix visit creation UUID, product sale payment, toast position
- `c3987dc` (2026-02-14 11:45) — Fix dark theme buttons (payments page)
- `40b7403` (2026-02-14 03:55) — fix: Change payment method button text color to black
- `3431f2c` (2026-02-14 03:22) — fix: Client card improvements

---

## 📁 Структура проекта (v2.29.4)

### Основные директории

```
clientbase-pro/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/              # CRM Routes (protected)
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── clients/              # Clients page
│   │   │   ├── visits/               # Visits page
│   │   │   ├── inventory/            # Inventory page
│   │   │   ├── payments/             # Payments page
│   │   │   ├── sms/                  # SMS page
│   │   │   ├── stats/                # Statistics
│   │   │   ├── partners/             # Partners offers
│   │   │   ├── settings/             # Settings (display, language, customize)
│   │   │   └── layout.tsx            # CRM Layout (Sidebar + content)
│   │   ├── admin/                    # Admin Panel (protected)
│   │   │   ├── page.tsx              # Admin dashboard
│   │   │   ├── organizations/        # Orgs management
│   │   │   ├── billing/              # Billing management
│   │   │   ├── users/                # Users management
│   │   │   └── layout.tsx            # Admin Layout
│   │   ├── api/                      # API Routes
│   │   │   ├── admin/                # Admin endpoints
│   │   │   ├── clients/              # Client endpoints
│   │   │   ├── inventory/            # Inventory endpoints
│   │   │   ├── org/                  # Organization endpoints
│   │   │   ├── payments/             # Payment endpoints (Tranzilla + Stripe)
│   │   │   ├── services/             # Services endpoints
│   │   │   ├── visits/               # Visit endpoints
│   │   │   └── ...
│   │   ├── blocked/                  # Blocked page
│   │   ├── landing/                  # Landing page (Amber Solutions)
│   │   ├── login/                    # Login page
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   ├── components/                   # React components
│   │   ├── care-instructions/        # Care instructions components
│   │   ├── clients/                  # Client components (ClientSheet, etc.)
│   │   ├── inventory/                # Inventory components (dialogs, sheets)
│   │   ├── layout/                   # Layout components (Sidebar, MobileHeader)
│   │   ├── payments/                 # Payment dialogs (Tranzilla, Stripe, Cash)
│   │   ├── providers/                # React Query provider
│   │   ├── services/                 # Service management components
│   │   ├── ui/                       # shadcn/ui components
│   │   └── visits/                   # Visit components (dialogs, cards)
│   ├── contexts/                     # React contexts
│   │   ├── LanguageContext.tsx       # i18n (676+ keys Hebrew/Russian)
│   │   └── ThemeContext.tsx          # Theme + Layout + Customization
│   ├── hooks/                        # Custom hooks
│   │   ├── useAuth.ts                # Authentication
│   │   ├── useClients.ts             # Clients CRUD
│   │   ├── useFeatures.ts            # Feature flags
│   │   ├── useInventory.ts           # Inventory CRUD
│   │   ├── usePayments.ts            # Payments CRUD
│   │   ├── useProducts.ts            # Products CRUD
│   │   ├── useServices.ts            # Services CRUD
│   │   ├── useStats.ts               # Statistics
│   │   ├── useVisitServices.ts       # Visit-Service relations
│   │   └── ...
│   ├── lib/                          # Utilities
│   │   ├── supabase-browser.ts       # Browser Supabase client
│   │   ├── supabase-service.ts       # Service role client (bypasses RLS)
│   │   ├── stripe.ts                 # Stripe client
│   │   ├── tranzilla.ts              # Tranzilla utils
│   │   └── utils.ts                  # shadcn/ui utils
│   ├── types/                        # TypeScript types
│   │   ├── database.ts               # Supabase types
│   │   ├── inventory.ts              # Inventory types
│   │   ├── services.ts               # Services types
│   │   └── visits.ts                 # Visit types (single source of truth)
│   └── middleware.ts                 # Auth + features middleware
├── supabase/                         # SQL migrations
│   ├── create-services.sql           # Services table
│   ├── create-visit-services.sql     # Visit-service relations
│   ├── create-visits-table.sql       # Visits table
│   ├── fix-client-summary-view.sql   # Fixed view (scheduled_at)
│   ├── migrate-visits-to-services.sql
│   └── ...
├── public/                           # Static assets
│   ├── logo.png                      # Trinity logo
│   ├── logoload.png                  # Loading logo
│   └── ...
├── CLAUDE.md                         # This file
├── package.json                      # Dependencies
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── .env.local                        # Environment variables (gitignored)
```

### Ключевые файлы (недавно измененные)

**Bug Fixes (v2.29.2-v2.29.4):**
- `src/app/api/visits/route.ts` — UUID validation
- `src/app/layout.tsx` — Toaster position
- `src/components/inventory/SellProductDialog.tsx` — Payment method dropdown
- `src/components/clients/ClientSheet.tsx` — Visit history + translations
- `supabase/fix-client-summary-view.sql` — Fixed SQL view

**UI/UX (v2.29.3):**
- All 8 modal components — Arrow back button (44×44px)
- `src/components/visits/CompleteVisitPaymentDialog.tsx` — Sticky footer layout

**Dark Theme (v2.29.4):**
- `src/app/(dashboard)/payments/page.tsx` — Mobile dropdown + filters
- `src/app/(dashboard)/inventory/page.tsx` — Search + filters
- `src/components/inventory/ProductDetailSheet.tsx` — Language variable fix

**Translation System:**
- `src/contexts/LanguageContext.tsx` — 676+ keys (Hebrew + Russian)

**Core Systems:**
- `src/hooks/useAuth.ts` — Authentication hook (needs optimization - 40-60 parallel requests)
- `src/components/layout/Sidebar.tsx` — Main sidebar (desktop)
- `src/components/layout/MobileSidebar.tsx` — Mobile sidebar (identical to desktop)
- `middleware.ts` — Auth + features + public paths

### SQL Migrations (Manual Execution)

**Pending migrations (not executed automatically):**
1. `supabase/create-services.sql` — Create services table
2. `supabase/migrate-visits-to-services.sql` — Migrate visits to use service_id
3. `supabase/create-visit-services.sql` — Create visit_services table
4. `supabase/fix-client-summary-view.sql` — Fix client_summary view

**Instructions:**
- Execute in Supabase SQL Editor manually
- Check for existing tables before running
- All migrations are idempotent (safe to re-run)

---

## MeetingDetailCard — Единый компонент визита

**Файл:** `src/components/visits/MeetingDetailCard.tsx`

**Используется ВЕЗДЕ** где отображаются детали визита: календарь, список визитов, дашборд.

**Правило:** НИКОГДА не создавай отдельные карточки визита — используй `MeetingDetailCard`.

### Возможности:
- ✅ Отображение времени, даты, статуса, цены, длительности
- ✅ Заметки
- ✅ Быстрые действия: позвонить, WhatsApp
- ✅ Кнопки управления: Начать, Завершить, Отменить, Добавить услугу
- ✅ RTL поддержка (Hebrew/Russian)
- ✅ Адаптивный дизайн (TrinityBottomDrawer)

### Пример использования:
```tsx
import { MeetingDetailCard } from '@/components/visits/MeetingDetailCard'

<MeetingDetailCard
  visit={selectedVisit}
  isOpen={!!selectedVisit}
  onClose={() => setSelectedVisit(null)}
  locale={language === 'he' ? 'he' : 'ru'}
  clientName={getClientName(selectedVisit)}
  onStart={() => updateVisitStatus(selectedVisit.id, 'in_progress')}
  onComplete={() => handleCompleteVisit(selectedVisit)}
  onCancel={() => updateVisitStatus(selectedVisit.id, 'cancelled')}
  onAddService={() => handleAddService()}
/>
```

---

## Правило поиска на мобильном

**НА МОБИЛЬНОМ (< md)** результаты поиска **ВСЕГДА открываются ВВЕРХ** (`bottom-full mb-1`).  
**НА ДЕСКТОПЕ (>= md)** результаты поиска открываются **ВНИЗ** (`top-full mt-1`).

### Классы для dropdown:
```
bottom-full mb-1 md:bottom-auto md:top-full md:mb-0 md:mt-1
```

### Готовые компоненты:
- `TrinitySearchDropdown` — универсальный поиск с dropdown
- `TrinityMobileSearch` — с явным контролем направления (`dropDirection`)

### Правило:
**НИКОГДА** не создавай dropdown который на мобильном открывается вниз — клавиатура его закроет!

### Модальные окна поиска:
Для модальных окон с поиском используй **flex-col-reverse** на мобильном:
```tsx
<div className="flex flex-col-reverse md:flex-col">
  {/* Результаты - order-1 (сверху на мобильном) */}
  <div className="flex-1 overflow-y-auto order-1 md:order-2">
    {results}
  </div>
  
  {/* Инпут - order-2 (снизу на мобильном, sticky) */}
  <div className="order-2 md:order-1 sticky bottom-0 md:static">
    <input autoFocus />
  </div>
</div>
```

---

_Этот файл создан для AI-ассистентов (Claude, GPT, и др.) для быстрого понимания проекта._

_Powered by Amber Solutions Systems © 2026_
