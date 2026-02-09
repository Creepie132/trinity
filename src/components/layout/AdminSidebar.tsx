'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Building2, CreditCard, Megaphone, Settings, ArrowLeft } from 'lucide-react'

const navigation = [
  {
    name: 'לוח בקרה',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    name: 'ארגונים',
    href: '/admin/organizations',
    icon: Building2,
  },
  {
    name: 'חיובים',
    href: '/admin/billing',
    icon: CreditCard,
  },
  {
    name: 'פרסום',
    href: '/admin/ads',
    icon: Megaphone,
  },
  {
    name: 'הגדרות',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 flex flex-col text-white" style={{ backgroundColor: '#1E293B' }}>
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-center gap-3 border-b border-slate-700">
        <img 
          src="/logo.png" 
          alt="Trinity Admin" 
          className="w-8 h-8 object-contain"
          style={{ width: '32px', height: '32px' }}
        />
        <h1 className="text-xl font-bold text-white">Trinity Admin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 flex flex-col">
        <div className="flex-1 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Кнопка возврата в систему */}
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors border-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
          חזרה למערכת
        </Link>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-center" style={{ gap: '6px' }}>
          <img 
            src="/logo.png" 
            alt="Amber Solutions Systems" 
            className="object-contain"
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            Amber Solutions Systems © 2026
          </span>
        </div>
      </div>
    </aside>
  )
}
