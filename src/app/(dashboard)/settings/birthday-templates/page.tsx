'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/contexts/LanguageContext'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'sonner'

export default function BirthdayTemplatesPage() {
  const router = useRouter()
  const { t, dir } = useLanguage()
  const { orgId } = useAuth()
  const supabase = createSupabaseBrowserClient()

  const [templates, setTemplates] = useState({
    greeting_he: 'שלום {name}! 🎂🎉 צוות {org} מאחל/ת לך יום הולדת שמח! מחכים לראות אותך בקרוב 💛',
    greeting_ru: 'Привет {name}! 🎂🎉 Команда {org} поздравляет тебя с днём рождения! Ждём тебя в гости 💛',
    gift_he: 'שלום {name}! 🎂 לכבוד יום ההולדת שלך, קבל/י {discount}% הנחה על הביקור הבא! ההטבה בתוקף עד {expiry_date} 🎁',
    gift_ru: 'Привет {name}! 🎂 В честь дня рождения дарим тебе скидку {discount}% на следующий визит! Действует до {expiry_date} 🎁',
    discount: 15,
    expiry_days: 7
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!orgId) return

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', orgId)
          .single()

        if (error) throw error

        if (data?.settings?.birthday_templates) {
          setTemplates({ ...templates, ...data.settings.birthday_templates })
        }
      } catch (error) {
        console.error('Error loading birthday templates:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [orgId])

  // Save templates
  const handleSave = async () => {
    if (!orgId) return

    setSaving(true)
    try {
      // Get current settings
      const { data: currentData } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = currentData?.settings || {}

      // Update with new templates
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            birthday_templates: templates
          }
        })
        .eq('id', orgId)

      if (error) throw error

      toast.success(t('settings.saved'))
    } catch (error) {
      console.error('Error saving birthday templates:', error)
      toast.error(t('settings.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowRight className={`w-6 h-6 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t('birthdays.templatesTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('birthdays.templatesSubtitle')}
          </p>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-6">
        {/* Greeting Template Hebrew */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎉 {t('birthdays.greetingTemplateHe')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('birthdays.greetingDesc')}
          </p>
          <Textarea
            value={templates.greeting_he}
            onChange={(e) => setTemplates({ ...templates, greeting_he: e.target.value })}
            rows={3}
            className="font-sans"
            dir="rtl"
          />
        </div>

        {/* Greeting Template Russian */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎉 {t('birthdays.greetingTemplateRu')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('birthdays.greetingDesc')}
          </p>
          <Textarea
            value={templates.greeting_ru}
            onChange={(e) => setTemplates({ ...templates, greeting_ru: e.target.value })}
            rows={3}
            className="font-sans"
            dir="ltr"
          />
        </div>

        {/* Gift Template Hebrew */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎁 {t('birthdays.giftTemplateHe')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('birthdays.giftDesc')}
          </p>
          <Textarea
            value={templates.gift_he}
            onChange={(e) => setTemplates({ ...templates, gift_he: e.target.value })}
            rows={3}
            className="font-sans"
            dir="rtl"
          />
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                {t('birthdays.discount')}
              </label>
              <Input
                type="number"
                value={templates.discount}
                onChange={(e) => setTemplates({ ...templates, discount: parseInt(e.target.value) || 0 })}
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                {t('birthdays.expiryDays')}
              </label>
              <Input
                type="number"
                value={templates.expiry_days}
                onChange={(e) => setTemplates({ ...templates, expiry_days: parseInt(e.target.value) || 0 })}
                min={1}
                max={365}
              />
            </div>
          </div>
        </div>

        {/* Gift Template Russian */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            🎁 {t('birthdays.giftTemplateRu')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('birthdays.giftDesc')}
          </p>
          <Textarea
            value={templates.gift_ru}
            onChange={(e) => setTemplates({ ...templates, gift_ru: e.target.value })}
            rows={3}
            className="font-sans"
            dir="ltr"
          />
        </div>
      </div>

      {/* Variables Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          {t('birthdays.availableVariables')}
        </h4>
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p><code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">{'{ name}'}</code> - {t('birthdays.varName')}</p>
          <p><code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">{'{ org}'}</code> - {t('birthdays.varOrg')}</p>
          <p><code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">{'{ discount}'}</code> - {t('birthdays.varDiscount')}</p>
          <p><code className="bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">{'{ expiry_date}'}</code> - {t('birthdays.varExpiryDate')}</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </div>
  )
}
