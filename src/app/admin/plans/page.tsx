'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { PLANS, type PlanKey } from '@/lib/subscription-plans'
import { MODULES } from '@/lib/modules-config'
import { toast } from 'sonner'
import { 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Building2, 
  Zap, 
  Crown,
  Settings2,
  Users,
  DollarSign,
  Shield
} from 'lucide-react'

export default function AdminPlansPage() {
  const { language } = useLanguage()

  const translations = {
    he: {
      title: 'ניהול תוכניות תמחור',
      subtitle: 'הגדרות תוכניות מנוי - מודולים, מחירים, מגבלות',
      modules: 'מודולים',
      price: 'מחיר',
      clientLimit: 'מגבלת לקוחות',
      unlimited: 'ללא הגבלה',
      perMonth: 'לחודש',
      free: 'חינם',
      custom: 'מותאם אישית',
      note: 'הערה: נכון לעכשיו התוכניות מוגדרות בקוד. בעתיד יתווספו כאן כפתורי עריכה ושמירה בבסיס נתונים.',
    },
    ru: {
      title: 'Управление тарифными планами',
      subtitle: 'Настройки планов подписки - модули, цены, лимиты',
      modules: 'Модули',
      price: 'Цена',
      clientLimit: 'Лимит клиентов',
      unlimited: 'Безлимит',
      perMonth: 'в месяц',
      free: 'Бесплатно',
      custom: 'Кастомный',
      note: 'Примечание: в данный момент планы определены в коде. В будущем здесь появятся кнопки редактирования и сохранения в базе данных.',
    },
  }

  const t = translations[language]

  const planIcons: Record<PlanKey, any> = {
    demo: Sparkles,
    basic: Building2,
    professional: Zap,
    corporate: Crown,
    custom: Settings2,
  }

  const getColorClass = (color: string) => {
    const classes: Record<string, string> = {
      red: 'border-red-500/30 bg-red-500/5',
      blue: 'border-blue-500/30 bg-blue-500/5',
      amber: 'border-amber-500/30 bg-amber-500/5',
      green: 'border-green-500/30 bg-green-500/5',
      purple: 'border-purple-500/30 bg-purple-500/5',
    }
    return classes[color] || 'border-gray-500/30 bg-gray-500/5'
  }

  const getBadgeColor = (color: string) => {
    const classes: Record<string, string> = {
      red: 'bg-red-500/10 text-red-600 border-red-500/20',
      blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      green: 'bg-green-500/10 text-green-600 border-green-500/20',
      purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    }
    return classes[color] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-amber-600" />
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* Note about future DB integration */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ℹ️ {t.note}
          </p>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = planIcons[plan.key]
          const enabledModules = Object.entries(plan.modules).filter(([_, enabled]) => enabled)
          const disabledModules = Object.entries(plan.modules).filter(([_, enabled]) => !enabled)

          return (
            <Card 
              key={plan.key} 
              className={`border-2 ${getColorClass(plan.color)}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getBadgeColor(plan.color)}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {language === 'he' ? plan.name_he : plan.name_ru}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {language === 'he' ? plan.desc_he : plan.desc_ru}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-2xl font-bold">
                      {plan.price_monthly !== null ? `₪${plan.price_monthly}` : t.custom}
                    </span>
                    {plan.price_monthly !== null && (
                      <span className="text-sm text-muted-foreground mr-1">/{t.perMonth}</span>
                    )}
                  </div>
                </div>

                {/* Client Limit */}
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">
                    {t.clientLimit}: {plan.client_limit !== null ? plan.client_limit : t.unlimited}
                  </span>
                </div>

                {/* Modules */}
                <div>
                  <p className="text-sm font-medium mb-2">{t.modules}:</p>
                  <div className="space-y-1.5">
                    {/* Enabled modules */}
                    {enabledModules.map(([key, _]) => {
                      const module = MODULES.find(m => m.key === key)
                      if (!module) return null
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-green-700 dark:text-green-400">
                            {language === 'he' ? module.name_he : module.name_ru}
                          </span>
                        </div>
                      )
                    })}

                    {/* Disabled modules (show first 3) */}
                    {disabledModules.slice(0, 3).map(([key, _]) => {
                      const module = MODULES.find(m => m.key === key)
                      if (!module) return null
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm opacity-50">
                          <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-500 dark:text-gray-400">
                            {language === 'he' ? module.name_he : module.name_ru}
                          </span>
                        </div>
                      )
                    })}

                    {disabledModules.length > 3 && (
                      <p className="text-xs text-muted-foreground ml-6">
                        +{disabledModules.length - 3} {language === 'he' ? 'נוספים' : 'ещё'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Future: Edit button */}
                {/* <Button variant="outline" className="w-full mt-4">
                  Редактировать план
                </Button> */}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* SQL Migration Notice */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span>⚠️</span>
            <span>{language === 'he' ? 'מיגרציית SQL נדרשת' : 'Требуется SQL миграция'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono bg-black/5 dark:bg-white/5 p-4 rounded">
          <p className="text-amber-700 dark:text-amber-300 font-sans mb-2">
            {language === 'he' 
              ? 'להפעלת עריכת תוכניות ישירות מהממשק, הרץ את המיגרציה הבאה ב-Supabase SQL Editor:' 
              : 'Для включения редактирования планов из интерфейса, выполните следующую миграцию в Supabase SQL Editor:'}
          </p>
          <pre className="text-xs overflow-x-auto text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
{`-- CREATE TABLE subscription_plans (
--   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   key text NOT NULL UNIQUE,
--   name_he text NOT NULL,
--   name_ru text NOT NULL,
--   desc_he text,
--   desc_ru text,
--   color text DEFAULT 'gray',
--   modules jsonb DEFAULT '{}',
--   client_limit integer,
--   price_monthly numeric(10,2),
--   price_yearly numeric(10,2),
--   is_active boolean DEFAULT true,
--   sort_order integer DEFAULT 0,
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now()
-- );

-- ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Admins manage plans" ON subscription_plans FOR ALL
--   USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));`}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
