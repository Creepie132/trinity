'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'

const baseNavigation = [
  { name: 'דשבורד', href: '/', icon: Home, requireFeature: null },
  { name: 'לקוחות', href: '/clients', icon: Users, requireFeature: null },
  { name: 'תשלומים', href: '/payments', icon: CreditCard, requireFeature: 'payments' },
  { name: 'הודעות SMS', href: '/sms', icon: MessageSquare, requireFeature: 'sms' },
  { name: 'סטטיסטיקה', href: '/stats', icon: BarChart3, requireFeature: 'analytics' },
  { name: 'הצעות שותפים', href: '/partners', icon: Gift, requireFeature: null },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { data: isAdmin } = useIsAdmin()
  const features = useFeatures()

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.name as string) ||
    (user?.email ?? '—')

  const onLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  // Filter navigation based on features
  const navigation = baseNavigation.filter((item) => {
    if (!item.requireFeature) return true
    
    if (item.requireFeature === 'payments') return features.hasPayments
    if (item.requireFeature === 'sms') return features.hasSms
    if (item.requireFeature === 'analytics') return features.hasAnalytics
    
    return true
  })

  return (
    <aside className="w-64 bg-white border-l border-gray-200 flex flex-col">
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-center gap-3 border-b border-gray-200">
        <img
          src="/logo.png"
          alt="Trinity"
          className="w-8 h-8 object-contain"
          style={{ width: '32px', height: '32px' }}
        />
        <h1 className="text-xl font-bold text-blue-600">Trinity</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Admin Panel Link (only for admins) */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-gray-200"></div>
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-slate-800 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-slate-300'
              )}
            >
              <Shield className="w-5 h-5" />
              <span className="font-semibold">אדמין</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        {/* ✅ User + Logout */}
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-xs text-gray-500 mb-1">משתמש</div>
          <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>

          <button
            onClick={onLogout}
            className="mt-3 w-full rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            התנתק
          </button>
        </div>

        {/* Existing copyright */}
        <div className="flex items-center justify-center" style={{ gap: '6px' }}>
          <img
            src="/logo.png"
            alt="Amber Solutions Systems"
            className="object-contain"
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
            Amber Solutions Systems © 2026
          </span>
        </div>
      </div>
    </aside>
  )
}
