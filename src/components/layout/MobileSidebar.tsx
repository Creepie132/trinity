'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Users, CreditCard, MessageSquare, BarChart3, Shield, Gift, Home, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useIsAdmin } from '@/hooks/useIsAdmin'
import { useFeatures } from '@/hooks/useFeatures'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

const baseNavigation = [
  { name: 'דשבורד', href: '/', icon: Home, requireFeature: null },
  { name: 'לקוחות', href: '/clients', icon: Users, requireFeature: null },
  { name: 'תשלומים', href: '/payments', icon: CreditCard, requireFeature: 'payments' },
  { name: 'הודעות SMS', href: '/sms', icon: MessageSquare, requireFeature: 'sms' },
  { name: 'סטטיסטיקה', href: '/stats', icon: BarChart3, requireFeature: 'analytics' },
  { name: 'הצעות שותפים', href: '/partners', icon: Gift, requireFeature: null },
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-80 p-0 bg-gradient-to-b from-white to-gray-50">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <img
                  src="/logo.png"
                  alt="Trinity"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Trinity
                </SheetTitle>
                <p className="text-xs text-gray-500 mt-0.5">Amber Solutions Systems</p>
              </div>
            </div>
          </SheetHeader>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                      : 'text-gray-700 hover:bg-white hover:shadow-md active:scale-[0.98]'
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <div className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-blue-50'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-blue-600'
                    )} />
                  </div>
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
                  )}
                </Link>
              )
            })}

            {/* Admin Link */}
            {isAdmin && (
              <>
                <Separator className="my-4" />
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 hover:border-purple-300 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="p-1.5 rounded-lg bg-purple-100">
                    <Shield className="w-5 h-5 flex-shrink-0 text-purple-600" />
                  </div>
                  <span className="flex-1 text-purple-700 font-semibold">פאנל ניהול</span>
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                </Link>
              </>
            )}
          </nav>

          {/* User Profile + Logout */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg text-lg">
                {displayName[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  מחובר
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all duration-200 border border-red-200 hover:border-red-300"
            >
              <LogOut className="w-4 h-4" />
              יציאה מהמערכת
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
