'use client'

import { useState, useEffect } from 'react'
import { Activity, Wifi, Database, CheckCircle2, AlertCircle } from 'lucide-react'

interface ServiceStatus {
  label: string
  status: 'online' | 'degraded' | 'offline'
  latency?: string
}

const MOCK_SERVICES: ServiceStatus[] = [
  { label: 'Supabase DB', status: 'online', latency: '12ms' },
  { label: 'WhatsApp API', status: 'online' },
  { label: 'Tranzila API', status: 'online' },
]

function StatusDot({ status }: { status: ServiceStatus['status'] }) {
  const colors = {
    online: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    offline: 'bg-red-400',
  }
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status]} ${status === 'online' ? 'animate-pulse' : ''}`} />
  )
}

export function SystemStatusWidget() {
  const [dbUsage] = useState(12)
  const [uptime] = useState('99.98%')

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-slate-700/60 bg-white dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-50 dark:border-slate-800 flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
          <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Статус системы
        </span>
        <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Все в норме
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* DB Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Загрузка БД</span>
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{dbUsage}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"
              style={{ width: `${dbUsage}%` }}
            />
          </div>
        </div>

        {/* Services list */}
        <div className="space-y-2">
          {MOCK_SERVICES.map((service) => (
            <div key={service.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusDot status={service.status} />
                <span className="text-xs text-gray-600 dark:text-gray-300">{service.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {service.latency && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{service.latency}</span>
                )}
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div className="pt-2 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">Uptime (30d)</span>
          <span className="text-xs font-bold text-emerald-500">{uptime}</span>
        </div>
      </div>
    </div>
  )
}
