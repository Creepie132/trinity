import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Trinity Mobile — скачать приложение | Trinity CRM',
  description: 'Нативное приложение Trinity CRM для Android',
}

const CURRENT_VERSION = '2.9.0'
const APK_PATH = 'https://xltydzjvervudvn6.public.blob.vercel-storage.com/trinity-mobile-v2.9.0-gJGIiB7GE87n7452B37ZvRA3U6923f.apk'
const APK_SIZE = '21.6 MB'
const RELEASE_DATE = '12.04.2026'

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
    version: '2.9.0',
    date: '12.04.2026',
    changes: [
      'WhatsApp: автоматические сообщения — напоминания до визита, поздравления с днём рождения, сообщение после визита и покупки',
      'WhatsApp: напоминание клиентам с долгом и клиентам которые давно не приходили',
      'Настройки: новый раздел "Автоматические сообщения" с шаблонами и временными параметрами',
    ],
  },
  {
    version: '2.8.0',
    date: '12.04.2026',
    changes: [
      'Администратор: подключение WhatsApp-канала к организации — ввод Channel ID и токена прямо в приложении',
      'Администратор: статус подключения Whapi отображает номер телефона канала в реальном времени',
      'Администратор: кнопки "Изменить канал" и "Отключить WhatsApp" с подтверждением',
    ],
  },
  {
    version: '2.7.0',
    date: '11.04.2026',
    changes: [
      'Профиль: раздел "Безопасность" — список активных устройств, завершение других сессий',
      'Профиль: раздел "Система" — текущий план, подключённые модули, история платежей',
    ],
  },
  {
    version: '2.6.0',
    date: '11.04.2026',
    changes: [
      'Тумблеры модулей для каждой организации в разделе Администратор',
      'Защита от входа с двух устройств одновременно — выброс старой сессии',
      'Обновлён полный список модулей системы',
    ],
  },
  {
    version: '2.5.3',
    date: '10.04.2026',
    changes: [
      'Дашборд: исправлено отображение выручки сегодня (учёт временной зоны Израиля)',
      'Дашборд: долги теперь включают неоплаченные сделки, а не только визиты',
      'Дашборд: убраны приветствие, имя пользователя и аватар — интерфейс стал чище',
    ],
  },
  {
    version: '2.5.2',
    date: '10.04.2026',
    changes: [
      'Исправлено отображение названия организации в боковом меню',
      'Уточнены права доступа к разделу «Админка» (только Super Admin)',
      'Боковое меню: имя пользователя и название организации отображаются корректно',
      'Улучшена авторизация: имя пользователя теперь подтягивается из профиля',
    ],
  },
  {
    version: '2.5.1',
    date: '09.04.2026',
    changes: [
      'Исправлено создание визитов (NOT NULL constraint)',
      'Предупреждение о пересечении времени визитов',
      'Детали платежа и привязанная сделка',
      'Экран способов оплаты в настройках',
      'Редизайн: Склад (сетка), Продажи (сводка), Клиенты (CRM Power)',
      'Календарь визитов: Месяц / Неделя / День',
      'Исправления графа платежей',
    ],
  },
  {
    version: '2.5.0',
    date: '08.04.2026',
    changes: [
      'Типы визита: иконки типа контакта (WA, звонок, Meet) — на карточке и в форме. Автообновление.',
      'Кнопки "Принять" / "Отменить" с кастомными стилями (min 80px) — удобно нажимать',
      'Новый статус визита "Переименовать" — BottomSheet с подтверждением',
      'Исправлены двойные уведомления. Анимация отключена до перезагрузки визитов',
    ],
  },
  {
    version: '2.4.0',
    date: '08.04.2026',
    changes: [
      'Тип контакта в карточке встречи: "Online — Zoom" (синий) или "Offline — адрес" (зелёный)',
      'Кнопка "Открыть [App]" в action row — поддержка Zoom, Meet, Teams, Telegram и др.',
      'В детальном контакте: новый тип в hero-карточке под именем клиента',
      'Добавлена "Быстрый контакт" с подходящей иконкой встречи в детальном визите',
      'Исправлен баг: добавление услуг возвращало 500 (пустой service_name)',
    ],
  },
  {
    version: '2.3.0',
    date: '08.04.2026',
    changes: [
      'Мгновенное обновление статуса визита (Принято / Отменено / Завершено)',
      'Новый визит подсвечивается в списке сразу после создания',
      'Кнопка WhatsApp в списке визитов — открывает переписку с клиентом',
      'Детали визита показываются сохранёнными данными со статусом',
      'Детали визита не пропадают при обновлении (устранён race condition)',
      'Исправлен крах при обновлении "Завершение" в детальном визите (GoRouter context)',
    ],
  },
  {
    version: '2.2.3',
    date: '07.04.2026',
    changes: [
      'Новый стиль уведомлений TSnackBar — адаптивный размер, жирные иконки',
      'Исправлено добавление услуг из экрана визита — окно открывается нормально',
      'Исправлено добавление услуг нативными кнопками, другой текст',
      'Все 26 уведомлений в приложении переведены в единый стандарт',
    ],
  },
  {
    version: '2.2.2',
    date: '06.04.2026',
    changes: [
      'Настройки услуг корректно отображаются в добавленном модуле',
      'Кнопка + в описании "Добавить" видна только для добавления новой услуги',
      'Исправлено добавление услуги: пример ответа / создание / ошибка проверки',
      'Empty state в добавлении для новой услуги',
    ],
  },
  {
    version: '2.2.1',
    date: '06.04.2026',
    changes: [
      'Исправлен визит: Bearer-аутентификация через токен мобильный endpoint',
      'Исправлено получение услуг из добавления организации',
      'Добавление услуги из добавления / отмена / обратная ссылка',
    ],
  },
  {
    version: '2.2.0',
    date: '06.04.2026',
    changes: [
      'Создание визита: новый тип (визит / встреча) с удобными кнопками',
      'Поиск клиентов и услуг с пагинацией при создании визита',
      'Автоматические часы и длительность из выбранной услуги',
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
    changes: ['Исправлена двойная переменная навигации в обоих экранах'],
  },
  {
    version: '1.8.0',
    date: '06.04.2026',
    changes: ['Единый GoldBottomBar для обычного и admin интерфейса'],
  },
  {
    version: '1.7.0',
    date: '06.04.2026',
    changes: ['Глобальный BottomNavigationBar: обычный и admin интерфейс на всех экранах'],
  },
  {
    version: '1.6.0',
    date: '06.04.2026',
    changes: ['Глобальный тип системной навигации Android (edge-to-edge, SafeArea)'],
  },
  {
    version: '1.5.0',
    date: '06.04.2026',
    changes: ['Расширенный Drawer с навигацией для super_admin'],
  },
  {
    version: '1.4.0',
    date: '06.04.2026',
    changes: ['Исправлено отображение экрана администратора'],
  },
  {
    version: '1.3.0',
    date: '06.04.2026',
    changes: ['Экран администратора: метрики, организации, пагинация, графики'],
  },
  {
    version: '1.2.0',
    date: '05.04.2026',
    changes: ['Исправлена системная навигация в боковой навигации'],
  },
  {
    version: '1.1.0',
    date: '05.04.2026',
    changes: [
      'Адаптивный интерфейс для планшетов (breakpoint 600px)',
      'Оптимизация: 4 колонки в сетке на tablet, 2x2 на mobile',
      'Шрифты и отступы: 2-колоночные карточки на tablet',
      'Push-уведомления',
    ],
  },
  {
    version: '1.0.0',
    date: '05.04.2026',
    changes: [
      'Первый публичный релиз Trinity Mobile',
      'Подписан release-ключом (trinity-release.jks), APK в Vercel Blob',
      'Страница скачивания ambersol.co.il/mobile добавлена в production',
    ],
  },
  {
    version: '0.13.0',
    date: '05.04.2026',
    changes: [
      'Клиент добавления/редактирования на DraggableScrollableSheet',
      'По умолчанию: 48% — начальная высота, 95% — максимальная',
      'Единый showClientFormSheet для создания и редактирования',
    ],
  },
  {
    version: '0.12.0',
    date: '05.04.2026',
    changes: [
      'FAB и BottomSheet корректно учитывают системную навигацию Android',
      'MediaQuery.padding.bottom учтена для экранов: Визиты, Клиенты, Продажи, Платежи, Товары',
    ],
  },
  {
    version: '0.11.0',
    date: '05.04.2026',
    changes: [
      'Добавлен детальный экран товара: Hero-секция, KPI-карточки, поле SKU / штрихкод со сканером',
      'Картинка товара при добавлении: выбор из галереи, upload в Supabase bucket',
      'Поиск товаров при создании только из галереи',
    ],
  },
  {
    version: '0.10.0',
    date: '05.04.2026',
    changes: [
      'Исправлен крах при обработке двойной цены (double ≠ int cast)',
      'Корректная загрузка организации в Drawer (запрос к /api/mobile/auth)',
    ],
  },
  {
    version: '0.9.0',
    date: '04.04.2026',
    changes: [
      'EditClientScreen + экран Редактирования в детальном клиенте',
      'Исправлен баг: экран создания/редактирования клиента открывался дважды на iPad',
      'Роуты /clients/add и /clients/:id/edit добавлены в GoRouter',
    ],
  },
  {
    version: '0.8.0',
    date: '04.04.2026',
    changes: [
      'ClientDetailScreen: Gold Hero, карточки, действия, звонок / WhatsApp / Инстаграм',
      'Поиск клиентов при создании визита из детального',
      'Добавление визита с выбором клиента в подтверждении',
    ],
  },
  {
    version: '0.7.0',
    date: '04.04.2026',
    changes: [
      'Добавлен экран Задачи: Bucket-логика (Входящие/Сегодня/Позже/Готово), swipe-to-complete',
      'SettingsScreen: профиль, 4 секции настроек, выход из аккаунта',
      'Рефакторинг навигации: отдельная управляемая навигация через NavSettingsScreen',
    ],
  },
  {
    version: '0.6.0',
    date: '04.04.2026',
    changes: [
      'Добавлен экран Продаж: KPI, типы карточек/услуги, создание продажи с позициями',
      'SaleDetailScreen: позиции, добавление товаров, выбор услуги',
      'ProductPickerDialog и ServicePickerDialog с пагинацией',
    ],
  },
  {
    version: '0.5.0',
    date: '04.04.2026',
    changes: [
      'Добавлен экран Платежей: KPI, графики, топ-услуги, входящий контент',
      'Периоды: 7д / 30д / 90д с единой конфигурацией',
      'Линейные bar-chart нарастающего периода',
    ],
  },
  {
    version: '0.4.0',
    date: '04.04.2026',
    changes: [
      'Добавлен экран Склада: KPI (Доходы/Расходы/Прибыль), навигация до позиций',
      'Добавлен экран Товаров: карточки товаров, быстрый приход/расход, история транзакций',
      'Добавлен экран Настройки: отдельный экран настроек, добавление нового склада',
    ],
  },
  {
    version: '0.3.0',
    date: '04.04.2026',
    changes: [
      'TrinitySidebar: боковой Drawer со списком функций, поле логина, Visa AI',
      'AddClientScreen: FAB в списке клиентов, создание клиента',
      'Детальный визит: KPI Strip, Next Visit Banner, статус, типы, дозапрос по дате',
    ],
  },
  {
    version: '0.2.0',
    date: '04.04.2026',
    changes: [
      'GoldTabBar: liquid gold bottom nav с анимацией и shimmer-анимацией',
      'Применена схема темы TTheme.dark, токены TColors, все экраны обновлены',
      'Настроена кнопка Назад: TrinityBackDispatcher (RootBackButtonDispatcher)',
      'Шрифты Inter через google_fonts',
    ],
  },
  {
    version: '0.1.0',
    date: '03.04.2026',
    changes: [
      'Инициализация приложения: 5 экранов, bottom nav, иконки',
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
                Нативное приложение Trinity CRM для Android. Управляйте клиентами, визитами и финансами прямо с телефона.
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
                    'Откройте файл — Android может попросить разрешение устанавливать из неизвестных источников',
                    'Разрешите установку',
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
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">История версий</h2>
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
                      <span className="text-amber-400 mt-0.5 flex-shrink-0">›</span>
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
