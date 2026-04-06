import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Trinity Mobile — скачать приложение',
  description: 'Мобильное приложение Trinity CRM для Android',
}

const CURRENT_VERSION = '1.9.0'
const APK_PATH = 'https://xltydzjvervudvn6.public.blob.vercel-storage.com/trinity-mobile-v1.9-Xw7dT01azE6SjDg96ukQ5xn9KfwxRZ.apk'
const APK_SIZE = '54.9 MB'
const RELEASE_DATE = '06.04.2026'

const CHANGELOG = [
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
    changes: ['Исправлено отображение экрана администратора'],
  },
  {
    version: '1.3.0',
    date: '06.04.2026',
    changes: ['Экран администратора: метрики, организации, действия, график'],
  },
  {
    version: '1.2.0',
    date: '05.04.2026',
    changes: ['Исправлено отображение названия организации в боковом меню'],
  },
  {
    version: '1.1.0',
    date: '05.04.2026',
    changes: [
      'Адаптивный интерфейс для планшетов (breakpoint 600px)',
      'Дашборд: 4 карточки в строку на tablet, 2x2 на mobile',
      'Клиенты и визиты: 2-колоночная сетка на tablet',
      'Масштабируемые шрифты и отступы (scaledFont / scaledPadding)',
      'Авторизация через Google',
      'Дашборд: визиты сегодня, выручка, новые клиенты',
      'Список клиентов с поиском',
      'Список визитов',
      'Push-уведомления',
    ],
  },
]

export default function MobilePage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4 py-16">

      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-4 mb-12">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <polygon points="20,4 36,13 36,27 20,36 4,27 4,13" fill="white" opacity="0.15"/>
            <polygon points="20,8 33,15.5 33,25.5 20,33 7,25.5 7,15.5" fill="white" opacity="0.3"/>
            <polygon points="20,13 28,17.5 28,22.5 20,27 12,22.5 12,17.5" fill="white"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Trinity Mobile</h1>
          <p className="text-gray-400 mt-1 text-sm">для Android · Amber Solutions</p>
        </div>
      </div>

      {/* Download Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Версия</p>
            <p className="text-2xl font-bold text-amber-400">v{CURRENT_VERSION}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Размер</p>
            <p className="text-lg font-semibold text-gray-300">{APK_SIZE}</p>
          </div>
        </div>

        <a
          href={APK_PATH}
          download
          className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-4 rounded-xl transition-colors text-base"
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"/>
          </svg>
          Скачать APK
        </a>

        <p className="text-center text-xs text-gray-500 mt-3">
          Обновлено {RELEASE_DATE}
        </p>
      </div>

      {/* Install Instructions */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Как установить</h2>
        <ol className="space-y-3 text-sm text-gray-300">
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

      {/* Changelog */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 mb-10 backdrop-blur">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Что нового</h2>
        <div className="space-y-5">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-400 font-semibold text-sm">v{entry.version}</span>
                <span className="text-xs text-gray-500">{entry.date}</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-300">
                {entry.changes.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600">
        <Link href="/" className="hover:text-gray-400 transition-colors">
          ambersol.co.il
        </Link>
        {' · '}
        <span>© {new Date().getFullYear()} Amber Solutions</span>
      </div>

    </main>
  )
}
