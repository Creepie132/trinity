'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useFeatures } from '@/hooks/useFeatures'
import { useDemoMode } from '@/hooks/useDemoMode'
import { SettingsCard } from '@/components/settings/SettingsCard'
import { SystemStatusWidget } from '@/components/settings/SystemStatusWidget'
import { SETTINGS_CATEGORIES } from '@/components/settings/settingsConfig'
import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'
import type { KiraWaveState } from '@/components/kira/KiraWave'

const KiraWave = dynamic(
  () => import('@/components/kira/KiraWave').then((m) => ({ default: m.KiraWave })),
  { ssr: false }
)

// ─── Мини-виджет Киры для правой панели ─────────────────────────────────────
function KiraWidgetMini() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: '#2a2d35' }}>
      <div className="relative flex items-center justify-center px-2 pt-4 pb-2" style={{ background: '#2a2d35' }}>
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 50% 80%, rgba(40,80,255,0.3) 0%, transparent 70%)'
        }} />
        <KiraWave state={'idle' as KiraWaveState} width={200} height={56} />
      </div>
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgba(100,160,255,0.7)' }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(140,180,255,0.6)' }}>
            AI Ассистент Кира
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Личный ИИ-помощник для вашего бизнеса
        </p>
      </div>
    </div>
  )
}

// ─── Таб-кнопка навигации ────────────────────────────────────────────────────
interface TabButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
  Icon: React.ComponentType<{ className?: string }>
}

function TabButton({ label, isActive, onClick, Icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 text-left
        ${isActive
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
        }
      `}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
      <span>{label}</span>
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"
        />
      )}
    </button>
  )
}

// ─── Основная страница ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { language } = useLanguage()
  const permissions = usePermissions()
  const features = useFeatures()
  const { isDemo } = useDemoMode()
  const isRTL = language === 'he'

  const [activeTab, setActiveTab] = useState('general')

  // Фильтрация категорий и карточек
  const filteredCategories = SETTINGS_CATEGORIES
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => {
        if (!features.isLoading) {
          if (item.featureFlag === 'hasBranches' && !features.hasBranches) return false
          if (item.featureFlag === 'hasBooking' && features.hasBooking === false) return false
        }
        if (item.permissionFlag === 'canManageServices' && permissions.canManageServices === false) return false
        if (item.permissionFlag === 'canManageCareInstructions' && permissions.canManageCareInstructions === false) return false
        if (item.permissionFlag === 'canManageBookingSettings' && permissions.canManageBookingSettings === false) return false
        if (item.permissionFlag === 'canManageUsers' && permissions.canManageUsers === false) return false
        if (isDemo && item.id === 'permissions') return false
        return true
      }),
    }))
    .filter((cat) => cat.items.length > 0)

  const activeCategory = filteredCategories.find((c) => c.id === activeTab) ?? filteredCategories[0]

  const pageTitle = isRTL ? 'הגדרות' : 'Настройки'
  const pageSubtitle = isRTL ? 'ניהול פרטי העסק, שילובים ואבטחה' : 'Управление бизнесом, интеграциями и безопасностью'

  return (
    <div id="demo-step-settings" className="h-full" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
          {pageTitle}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {pageSubtitle}
        </p>
      </div>

      {/* ── Mobile: horizontal scrollable chips (только < md) ── */}
      <div className="flex md:hidden gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none -mx-4 px-4">
        {filteredCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`
              flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all
              ${activeTab === cat.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
              }
            `}
          >
            <cat.icon className="w-3.5 h-3.5 flex-shrink-0" />
            {isRTL ? cat.label.he : cat.label.ru}
          </button>
        ))}
      </div>

      {/* Layout: sidebar tabs + content + right widgets */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Vertical tabs (только md+) ── */}
        <aside className="hidden md:flex flex-col gap-1 w-48 flex-shrink-0 sticky top-4">
          {filteredCategories.map((cat) => (
            <TabButton
              key={cat.id}
              label={isRTL ? cat.label.he : cat.label.ru}
              isActive={activeTab === cat.id}
              onClick={() => setActiveTab(cat.id)}
              Icon={cat.icon as React.ComponentType<{ className?: string }>}
            />
          ))}
        </aside>

        {/* ── Center: Bento grid ── */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeCategory && (
              <motion.div
                key={activeCategory.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {/* Category heading */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {isRTL ? activeCategory.label.he : activeCategory.label.ru}
                  </h2>
                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    {activeCategory.items.length}
                  </span>
                </div>

                {/* Bento grid */}
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  variants={{
                    show: { transition: { staggerChildren: 0.06 } },
                    hidden: {},
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {activeCategory.items.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={{
                        hidden: { opacity: 0, y: 12 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
                      }}
                    >
                      <SettingsCard
                        title={isRTL ? item.title_he : item.title_ru}
                        description={isRTL ? item.desc_he : item.desc_ru}
                        icon={item.icon}
                        colorTint={item.colorTint}
                        href={item.href}
                        badge={item.badge}
                        danger={item.danger}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right: Widgets ── */}
        <aside className="hidden xl:flex flex-col gap-4 w-56 flex-shrink-0 sticky top-4">
          <KiraWidgetMini />
          <SystemStatusWidget />
        </aside>

      </div>
    </div>
  )
}
