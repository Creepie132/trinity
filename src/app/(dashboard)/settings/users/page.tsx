'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { useLanguage } from '@/contexts/LanguageContext'
import { ArrowRight, ArrowLeft, Shield, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function UsersSettingsPage() {
  const router = useRouter()
  const permissions = usePermissions()
  const { t, dir } = useLanguage()
  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

  useEffect(() => {
    if (!permissions.canManageUsers) {
      toast.error(dir === 'rtl' ? 'אין לך הרשאה' : 'Нет разрешения')
      router.push('/dashboard')
    }
  }, [permissions.canManageUsers, router, dir])

  if (!permissions.canManageUsers) {
    return null // Prevent flash before redirect
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowIcon className="w-4 h-4" />
            {t('common.back')}
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {dir === 'rtl' ? 'ניהול משתמשים' : 'Управление пользователями'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {dir === 'rtl' 
              ? 'הוסף, ערוך ושנה הרשאות של משתמשי הארגון'
              : 'Добавляйте, редактируйте и изменяйте права пользователей организации'}
          </p>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 dark:bg-blue-950 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {dir === 'rtl' ? 'בקרוב!' : 'Скоро!'}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {dir === 'rtl'
                ? 'עמוד זה בפיתוח. תוכל להזמין משתמשים חדשים, לנהל הרשאות ולשנות תפקידים.'
                : 'Эта страница в разработке. Вы сможете приглашать новых пользователей, управлять правами и изменять роли.'}
            </p>

            {/* Role Descriptions */}
            <div className="space-y-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400 mt-2" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {dir === 'rtl' ? 'משתמש (user)' : 'Пользователь (user)'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dir === 'rtl'
                      ? 'ניהול ביקורים, לקוחות, תשלומים. שליחת ברכות יום הולדת'
                      : 'Управление визитами, клиентами, платежами. Отправка поздравлений'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-2" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {dir === 'rtl' ? 'מנהל משמרת (moderator)' : 'Модератор (moderator)'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dir === 'rtl'
                      ? 'כל הרשאות המשתמש + אנליטיקה, מלאי, SMS'
                      : 'Все права пользователя + аналитика, склад, SMS'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {dir === 'rtl' ? 'מנהל (owner)' : 'Администратор (owner)'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dir === 'rtl'
                      ? 'שליטה מלאה בארגון: שירותים, הזמנות, משתמשים'
                      : 'Полный контроль: услуги, бронирования, пользователи'}
                  </p>
                </div>
              </div>
            </div>

            <Button disabled className="gap-2">
              <UserPlus className="w-4 h-4" />
              {dir === 'rtl' ? 'הזמן משתמש' : 'Пригласить пользователя'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
