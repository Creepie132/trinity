import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Trinity Mobile — скачать приложение',
  description: 'Скачайте приложение Trinity CRM для Android',
}

const CURRENT_VERSION = '2.4.0'
const APK_PATH = 'https://xltydzjvervudvn6.public.blob.vercel-storage.com/trinity-mobile-v2.4.0.apk'
const APK_SIZE = '56.2 MB'
const RELEASE_DATE = '08.04.2026'

const HexLogo = () => (
  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
    <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
      <polygon points="20,4 36,13 36,27 20,36 4,27 4,13" fill="white" opacity="0.15"/>
      <polygon points="20,8 33,15.5 33,25.5 20,33 7,25.5 7,15.5" fill="white" opacity="0.3"/>
      <polygon points="20,13 28,17.5 28,22.5 20,27 12,22.5 12,17.5" fill="white"/>
    </svg>
  </div>
)

const BackButton = () => (
  <Link
    href="/"
    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors group"
  >
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round"
      className="group-hover:-translate-x-0.5 transition-transform"
    >
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
    На главную
  </Link>
)


const CHANGELOG = [
  {
    version: '2.4.0',
    date: '08.04.2026',
    changes: [
      'Чип типа встречи в карточке списка: "Online · Zoom" (синий) или "Offline · адрес" (золотой)',
      'Кнопка "Открыть [App]" в action row — запускает Zoom, Meet, Teams, Telegram и др.',
      'В деталях встречи: бейдж типа в hero-карточке под именем клиента',
      'Секция "Онлайн встреча" с кнопкой открытия приложения в деталях визита',
      'Исправлен баг: создание оффлайн/онлайн встречи возвращало 500 (неверный ключ service_name)',
    ],
  },
  {
    version: '2.3.0',
    date: '08.04.2026',
    changes: [
      'Мгновенное отображение изменений статуса визита (Начать / Завершить / Отменить)',
      'Новый визит появляется в списке моментально без промаргивания',
      'Кнопка WhatsApp в списке визитов — открывает переписку с клиентом',
      'Детали визита закрываются автоматически после отмены',
      'Детали визита не моргают при открытии (устранён race condition с сервером)',
      'Исправлен краш при нажатии "Отменить" в списке визитов (GoRouter context)',
    ],
  },
  {
    version: '2.2.3',
    date: '07.04.2026',
    changes: [
      'Единый стиль уведомлений TSnackBar — контрастный текст, цветные иконки',
      'Исправлено создание услуги из окна визита — ошибка теперь видна',
      'Успешное создание услуги показывает зелёный тост',
      'Все 26 уведомлений в приложении приведены к единому стандарту',
    ],
  },
  {
    version: '2.2.2',
    date: '06.04.2026',
    changes: [
      'Каталог услуг открывается в отдельном окне со списком и поиском',
      'Кнопка + в заголовке "Услуги" появляется только после добавления первой услуги',
      'Исправлено создание услуги: кнопка реагирует, loading-индикатор работает',
      'Empty state в каталоге с кнопкой создания первой услуги',
    ],
  },
  {
    version: '2.2.1',
    date: '06.04.2026',
    changes: [
      'Исправлено создание визита: Bearer-авторизация через мобильный endpoint',
      'Исправлена загрузка услуг из каталога организации',
      'Меню добавления услуги: из каталога / создать новую / одноразовая',
    ],
  },
  {
    version: '2.2.0',
    date: '06.04.2026',
    changes: [
      'Создание визита: выбор типа (визит / встреча) с отдельными формами',
      'Поиск клиентов и услуг с пагинацией при создании визита',
      'Автозаполнение цены и длительности из выбранной услуги',
    ],
  },
  {
    version: '2.1.0',
    date: '06.04.2026',
    changes: ['Theme color tokens migration: все экраны используют TColorTokens'],
  },
  {
    version: '2.0.0',
    date: '06.04.2026',
    changes: ['Theme System: 4 темы с синхронизацией через Supabase'],
  },
  {
    version: '1.9.0',
    date: '06.04.2026',
    changes: ['Исправлено лишнее пространство под навбаром в админ режиме'],
  },
  {
    version: '1.8.0',
    date: '06.04.2026',
    changes: ['Единый GoldBottomBar для обычного и админ режимов'],
  },
  {
    version: '1.7.0',
    date: '06.04.2026',
    changes: ['Глобальный BottomNavigationBar: обычный и админ режимы на всех экранах'],
  },
  {
    version: '1.6.0',
    date: '06.04.2026',
    changes: ['Глобальный фикс системной навигации Android (edge-to-edge, SafeArea)'],
  },
  {
    version: '1.5.0',
    date: '06.04.2026',
    changes: ['Административный Drawer с навигацией для super_admin'],
  },
  {
    version: '1.4.0',
    date: '06.04.2026',
    changes: ['Исправлено отображение страниц администратора'],
  },
  {
    version: '1.3.0',
    date: '06.04.2026',
    changes: ['Страна администратора: клиенты, организации, финансы, графики'],
  },
  {
    version: '1.2.0',
    date: '05.04.2026',
    changes: ['Исправлено отображение русского языка в системной навигации'],
  },
  {
    version: '1.1.0',
    date: '05.04.2026',
    changes: [
      'Адаптивный интерфейс для планшетов (breakpoint 600px)',
      'Статистика: 4 метрики в строку на tablet, 2x2 на mobile',
      'Шрифты и отступы: 2-колоночные блоки на tablet',
      'Push-уведомления',
    ],
  },
  {
    version: '1.0.0',
    date: '05.04.2026',
    changes: [
      'Первый публичный релиз Trinity Mobile',
      'Подписан release-ключом (trinity-release.jks), APK в Vercel Blob',
      'Страница скачивания ambersol.co.il/mobile запущена в production',
    ],
  },
  {
    version: '0.13.0',
    date: '05.04.2026',
    changes: [
      'Форма клиента переведена на DraggableScrollableSheet (снизу)',
      'Два состояния: 48% — базовые поля, 95% — полная форма',
      'Единый showClientFormSheet для создания и редактирования',
    ],
  },
  {
    version: '0.12.0',
    date: '05.04.2026',
    changes: [
      'Исправлен FAB и BottomSheet перекрываются системной навигацией Android',
      'MediaQuery.padding.bottom учитывается везде: Финансы, Визиты, Продажи, Платежи, Склад',
    ],
  },
  {
    version: '0.11.0',
    date: '05.04.2026',
    changes: [
      'Карточка деталей товара: Hero-блок, KPI-плашки, поля SKU / штрихкод с копированием',
      'Аватар товара при создании: выбор из галереи, upload в Supabase bucket',
      'История транзакций на экране товара',
    ],
  },
  {
    version: '0.10.0',
    date: '05.04.2026',
    changes: [
      'Исправлен краш при открытии модальных окон склада (double → int cast)',
      'Реальное название организации в Drawer (запрос к /api/mobile/auth)',
    ],
  },
  {
    version: '0.9.0',
    date: '04.04.2026',
    changes: [
      'EditClientScreen + кнопка Изменить в карточке клиента',
      'Исправлен баг: после создания/редактирования клиента выкидывало на дашборд',
      'Роуты /clients/add и /clients/:id/edit переведены на GoRouter',
    ],
  },
  {
    version: '0.8.0',
    date: '04.04.2026',
    changes: [
      'ClientDetailScreen: Gold Hero, аватар, бейджи, звонок / WhatsApp / Маршрут',
      'История визитов клиента с пагинацией и статусами',
      'Удаление клиента с подтверждением',
    ],
  },
  {
    version: '0.7.0',
    date: '04.04.2026',
    changes: [
      'Модуль задач: Bucket-логика (Горит/Сегодня/Позже/Готово), swipe-to-complete',
      'SettingsScreen: профиль, 4 секции настроек, выход из аккаунта',
      'Динамический навбар: пользователь настраивает вкладки через NavSettingsScreen',
    ],
  },
  {
    version: '0.6.0',
    date: '04.04.2026',
    changes: [
      'Модуль продаж: KPI, фильтры периода/статуса, создание продажи с позициями',
      'SaleDetailScreen: позиции, кнопка оплаты, смена статуса',
      'ProductPickerDialog и ServicePickerDialog с пагинацией при добавлении позиций',
    ],
  },
  {
    version: '0.5.0',
    date: '04.04.2026',
    changes: [
      'Модуль аналитики: KPI, графики выручки и визитов, топ-услуги, рейтинг сотрудников',
      'Периоды: 7д / 30д / 90д с кнопкой обновления',
      'Нативные bar-chart без внешних зависимостей',
    ],
  },
  {
    version: '0.4.0',
    date: '04.04.2026',
    changes: [
      'Модуль финансов: KPI (Доходы/Расходы/Прибыль), навигация по месяцам, расходы по категориям',
      'Модуль склада: карточки товаров, быстрый приход/расход, история транзакций',
      'Модуль платежей: список платежей, добавление нового платежа',
    ],
  },
  {
    version: '0.3.0',
    date: '04.04.2026',
    changes: [
      'TrinitySidebar: правый Drawer со всеми разделами, роль-теги, Кира AI',
      'AddClientScreen: FAB в списке клиентов, создание клиента',
      'Редизайн визитов: KPI Strip, Next Visit Banner, поиск, фильтры, группировка по датам',
    ],
  },
  {
    version: '0.2.0',
    date: '04.04.2026',
    changes: [
      'GoldTabBar: liquid gold bottom nav с пружинной физикой и shimmer-анимацией',
      'Тёмная тема TTheme.dark, токены TColors, все экраны переписаны',
      'Аппаратная кнопка Назад: TrinityBackDispatcher (RootBackButtonDispatcher)',
      'Шрифт Inter через google_fonts',
    ],
  },
  {
    version: '0.1.0',
    date: '03.04.2026',
    changes: [
      'Инициализация приложения: 5 экранов, bottom nav, иконка',
      'Google Sign-In: Bearer token flow через /api/mobile/auth/google',
      'Bearer поддержка в middleware Trinity (bypass для /api/*)',
      'Единый endpoint /api/mobile/dashboard: {today, stats}',
    ],
  },
]


export default function MobilePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Sticky nav */}
      <nav className="sticky top-0 z-10 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-14 flex items-center justify-between">
          <BackButton />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse"></span>
            Trinity Mobile
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 md:py-16">

        {/* === HERO + DOWNLOAD === */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16 mb-12 md:mb-16">

          {/* Left: branding */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-8 lg:mb-0 flex-1 min-w-0">
            <HexLogo />
            <div className="text-center sm:text-left">
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-bold tracking-tight">Trinity Mobile</h1>
              <p className="text-gray-400 mt-1 text-sm md:text-base">для Android · Amber Solutions</p>
              <div className="flex items-center gap-3 mt-3 justify-center sm:justify-start flex-wrap">
                <span className="text-2xl font-bold text-amber-400">v{CURRENT_VERSION}</span>
                <span className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">{APK_SIZE}</span>
                <span className="text-xs text-gray-500">· {RELEASE_DATE}</span>
              </div>
              <p className="hidden md:block text-gray-500 text-sm mt-4 max-w-md leading-relaxed">
                Нативное приложение Trinity CRM для Android. Управляйте записями, клиентами и финансами прямо с телефона.
              </p>
              {/* Desktop back button */}
              <div className="hidden lg:block mt-8">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-amber-400 border border-white/10 hover:border-amber-400/30 rounded-lg px-4 py-2 transition-all group"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                  </svg>
                  Вернуться на сайт
                </Link>
              </div>
            </div>
          </div>


          {/* Right: download card */}
          <div className="w-full lg:w-96 xl:w-[420px] flex-shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Версия</p>
                  <p className="text-2xl font-bold text-amber-400">v{CURRENT_VERSION}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Размер</p>
                  <p className="text-lg font-semibold text-white">{APK_SIZE}</p>
                </div>
              </div>
              <a
                href={APK_PATH}
                download
                className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-4 rounded-xl transition-colors text-base shadow-lg shadow-amber-500/20"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"/>
                </svg>
                Скачать APK
              </a>
              <p className="text-center text-xs text-gray-500 mt-3">Обновлено {RELEASE_DATE}</p>
              <div className="mt-5 pt-5 border-t border-white/10">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Как установить</p>
                <ol className="space-y-2.5 text-sm text-gray-300">
                  {[
                    'Скачайте APK на телефон',
                    'Откройте файл — Android может попросить разрешить установку из неизвестных источников',
                    'Разрешите → Установить',
                    'Войдите через Google аккаунт',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>


        {/* === CHANGELOG === */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Что нового</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="bg-black/20 border border-white/5 rounded-xl p-4 hover:border-amber-400/20 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-amber-400 font-bold text-sm">v{entry.version}</span>
                  <span className="text-xs text-gray-600">{entry.date}</span>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  {entry.changes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pb-4 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-amber-400 border border-white/10 hover:border-amber-400/30 rounded-lg px-4 py-2 transition-all group"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            На главную
          </Link>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-600">© {new Date().getFullYear()} Amber Solutions</span>
        </div>

      </main>
    </div>
  )
}
