'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export interface SettingsCardProps {
  title: string
  description: string
  icon: LucideIcon
  /** Tailwind classes for icon container bg + icon color */
  colorTint: string
  href: string
  /** Optional badge (e.g. 'Beta', 'New') */
  badge?: string
  /** Render as danger/security zone */
  danger?: boolean
  /** Text direction — passed from parent */
  isRTL?: boolean
}

export function SettingsCard({
  title,
  description,
  icon: Icon,
  colorTint,
  href,
  badge,
  danger,
  isRTL,
}: SettingsCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Link href={href} className="block h-full">
        <div
          className={`
            group relative h-full rounded-2xl border bg-white dark:bg-slate-900
            transition-colors duration-200 cursor-pointer overflow-hidden
            ${danger
              ? 'border-red-100 dark:border-red-900/40 hover:border-red-200 dark:hover:border-red-800'
              : 'border-gray-100 dark:border-slate-700/60 hover:border-gray-200 dark:hover:border-slate-600'
            }
          `}
        >
          {/* Danger zone top accent */}
          {danger && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 opacity-70" />
          )}

          <div className="p-5 flex flex-col gap-3 h-full">
            {/* Top row: icon + badge + arrow */}
            <div className="flex items-start justify-between gap-3">
              <div className={`p-2.5 rounded-xl ${colorTint} flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50">
                    {badge}
                  </span>
                )}
                {isRTL
                  ? <ArrowLeft className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
                  : <ArrowRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400 transition-colors" />
                }
              </div>
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className={`text-sm font-semibold mb-1 ${danger ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
                {title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
