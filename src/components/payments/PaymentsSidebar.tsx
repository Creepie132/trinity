'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Terminal,
  Link2,
  History,
  Settings,
  Zap,
  CreditCard,
} from 'lucide-react'

const NAV = [
  { href: '/payments/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/payments/terminal',  label: 'Terminal',     icon: Terminal },
  { href: '/payments/links',     label: 'Payment Links',icon: Link2 },
  { href: '/payments/history',   label: 'History',      icon: History },
  { href: '/payments/settings',  label: 'Settings',     icon: Settings },
]

interface Props { orgName: string }

export function PaymentsSidebar({ orgName }: Props) {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
      {/* Brand */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <CreditCard className="w-4 h-4 text-zinc-950" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-100 truncate">{orgName}</p>
          <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">Payments</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }
              `}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-amber-400' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade CTA */}
      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-100">Upgrade to Trinity</span>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
            Get full CRM, clients, calendar & analytics.
          </p>
          <Link
            href="/pricing"
            className="block text-center text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-colors rounded-lg py-2"
          >
            See plans →
          </Link>
        </div>
      </div>
    </aside>
  )
}
