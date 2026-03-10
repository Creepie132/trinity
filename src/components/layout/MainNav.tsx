import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Calendar, 
  CreditCard, 
  Package, 
  ListTodo,
  Settings
} from 'lucide-react'

const routes = [
  {
    href: '/clients',
    label: 'Клиенты',
    icon: Users
  },
  {
    href: '/visits',
    label: 'Визиты',
    icon: Calendar
  },
  {
    href: '/payments',
    label: 'Платежи',
    icon: CreditCard
  },
  {
    href: '/inventory',
    label: 'Склад',
    icon: Package
  },
  {
    href: '/diary',
    label: 'Дневник',
    icon: ListTodo
  },
  {
    href: '/settings',
    label: 'Настройки',
    icon: Settings
  }
]

export default function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-6">
      {routes.map(route => {
        const Icon = route.icon
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
              pathname === route.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden md:block">{route.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}